import yts from 'yt-search';
import axios from 'axios';
import config from '#config';

const MAX_DURATION_SECONDS = 7 * 60;

const cleanText = (text: any): string => {
    if (!text) return '';
    if (typeof text === 'string') return text.trim();
    if (typeof text === 'number') return String(text);
    return String(text).trim();
};

const formatViews = (v: number) => 
    v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : 
    v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : 
    v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v);

const emitProgress = (msgId: string, step: string, extraData: Record<string, any> = {}) => {
    queueMicrotask(() => {
        global.broadcast?.('cmd_progress', { id: msgId, step, ...extraData });
    });
};

const extractDownloadUrl = (data: any): string => {
    const candidate = data?.data?.download || data?.download || data?.dl || data?.data?.dl_url || 
                      data?.data?.download?.url || data?.datos?.url || data?.result?.download || 
                      data?.result?.dl || data?.result?.url || data?.result?.link || 
                      data?.data?.dl || data?.data?.url || data?.data?.link || 
                      (typeof data?.download === 'object' ? data?.download?.url || data?.download?.link : null) || 
                      data?.url || data?.link;
    return (typeof candidate === 'string' && candidate.startsWith('http')) ? candidate : '';
};

const fetchApiUrl = (apiUrl: string): Promise<string> => {
    return axios.get(apiUrl, { 
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }).then(res => {
        const dlUrl = extractDownloadUrl(res.data);
        if (!dlUrl) throw new Error('Sin URL');
        return dlUrl;
    });
};

const getAudioUrlWithRetry = (videoUrl: string): Promise<string> => {
    const encoded = encodeURIComponent(videoUrl);
    const apis = [
        `https://api.delirius.online/download/ytmp3?url=${encoded}`,
        `https://api.starlights.uk/api/download/ytmp3?url=${encoded}`,
        `https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`
    ];

    return fetchApiUrl(apis[0])
        .catch(() => fetchApiUrl(apis[1]))
        .catch(() => fetchApiUrl(apis[2]));
};

export default {
    command: ['play', 'playaudio', 'audio'],
    description: 'Descarga y envía audio de YouTube.',
    category: 'download',
    group: true,
    run: (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || config.prefix;
        const msgId = msg?.id || msg?.key?.id;

        const query = args.join(" ").trim();
        if (!query) {
            return sock.sendMessage(chat, { text: `ꕤ *Ingresa el título o enlace a buscar* ✰` }, { quoted: msg });
        }

        emitProgress(msgId, 'search_started', { query });

        const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
        const searchQuery = urlMatch ? `https://youtu.be/${urlMatch[1]}` : query;

        yts(searchQuery)
            .then(searchResult => {
                if (!searchResult?.videos?.length) {
                    emitProgress(msgId, 'no_results', { query });
                    return sock.sendMessage(chat, { text: `   ׄ  ✿ No se encontraron resultados para **${query}**.` }, { quoted: msg });
                }

                const video = searchResult.videos[0];
                const videoId = video.videoId || (urlMatch ? urlMatch[1] : '');
                const videoUrl = `https://youtu.be/${videoId}`;
                const title = cleanText(video.title) || 'Sin título';
                const channel = cleanText(video.author?.name || video.author) || "Desconocido";
                const views = typeof video.views === 'number' ? video.views : 0;
                const duration = cleanText(video.timestamp || video.duration) || "";

                if (video.seconds && video.seconds > MAX_DURATION_SECONDS) {
                    return sock.sendMessage(chat, { 
                        text: `   ׄ  ✿ El audio dura **${duration}**, superando el límite permitido de **7 minutos**.` 
                    }, { quoted: msg });
                }

                const mqThumbUrl = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
                const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Canal* » ${channel}\nׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}\nׅ  ׄ  ✿ *Tiempo* » ${duration}\nׅ  ׄ  ✿ *Link* » ${videoUrl}\n\nׅ  ׄ  ✿ *Descargando audio...*`;

                sock.sendMessage(chat, { image: { url: mqThumbUrl }, caption }, { quoted: msg }).catch(() => {});

                emitProgress(msgId, 'fetching_audio_stream');

                return getAudioUrlWithRetry(videoUrl).then(downloadUrl => {
                    emitProgress(msgId, 'sending_audio_to_whatsapp');
                    return sock.sendMessage(chat, { 
                        audio: { url: downloadUrl }, 
                        mimetype: "audio/mpeg", 
                        fileName: `${title}.mp3`, 
                        ptt: false 
                    }, { quoted: msg });
                });
            })
            .catch(() => {});
    }
};
