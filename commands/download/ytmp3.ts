import yts from 'yt-search';
import axios from 'axios';

const max_duration_seconds = 7 * 60;

const cleanText = (text: any): string => {
    if (!text) return '';
    if (typeof text === 'string') return text.trim();
    if (typeof text === 'number') return String(text);
    return String(text).trim();
};

const formatViews = (v: number | string) => {
    if (typeof v === 'string') return v;
    return v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : 
           v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : 
           v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v);
};

const emitProgress = (msgId: string, step: string, extraData: Record<string, any> = {}) => {
    queueMicrotask(() => {
        global.broadcast?.('cmd_progress', { id: msgId, step, ...extraData });
    });
};

const downloadAudioBuffer = async (videoUrl: string): Promise<Buffer> => {
    const apis = [
        `https://api.ryuzei.xyz/download/ytmp3/v3?url=${encodeURIComponent(videoUrl)}`,
        `https://api.ryuzei.xyz/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
        `https://api.ryuzei.xyz/download/ytmp3/v2?url=${encodeURIComponent(videoUrl)}`
    ];

    let downloadUrl = '';

    for (const apiUrl of apis) {
        try {
            const response = await axios.get(apiUrl, { timeout: 15000 });
            const resData = response.data;

            if (resData?.status && resData?.data?.download) {
                downloadUrl = resData.data.download;
                break;
            }
        } catch (err) {
            continue;
        }
    }

    if (!downloadUrl) {
        throw new Error('No se pudo obtener el enlace de descarga de ninguna de las APIs');
    }

    const audioStream = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.youtube.com/'
        },
        timeout: 40000
    });

    return Buffer.from(audioStream.data);
};

export default {
    command: ['yta', 'ytmp3'],
    description: 'Descarga y envía audio de YouTube.',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        const msgId = msg?.id || msg?.key?.id;

        const query = args.join(" ").trim();
        if (!query) {
            return sock.sendMessage(chat, { text: `ꕤ *Ingresa el título o enlace a buscar* ✰` }, { quoted: msg });
        }

        emitProgress(msgId, 'search_started', { query });

        const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
        const searchQuery = urlMatch ? `https://www.youtube.com/watch?v=${urlMatch[1]}` : query;

        try {
            const searchResult = await yts(searchQuery);

            if (!searchResult?.videos?.length) {
                emitProgress(msgId, 'no_results', { query });
                return sock.sendMessage(chat, { text: `   ׄ  ✿ No se encontraron resultados para **${query}**.` }, { quoted: msg });
            }

            const video = searchResult.videos[0];
            const videoId = video.videoId || (urlMatch ? urlMatch[1] : '');
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const title = cleanText(video.title) || 'Sin título';
            const channel = cleanText(video.author?.name || video.author) || "Desconocido";
            const views = video.views ?? 0;
            const duration = cleanText(video.timestamp || video.duration) || "";

            if (video.seconds && video.seconds > max_duration_seconds) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿ El audio dura **${duration}**, superando el límite permitido de **7 minutos**.` 
                }, { quoted: msg });
            }

            const mqThumbUrl = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
            const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Canal* » ${channel}\nׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}\nׅ  ׄ  ✿ *Tiempo* » ${duration}\nׅ  ׄ  ✿ *Link* » ${videoUrl}\n\nׅ  ׄ  ✿ *Descargando audio...*`;

            sock.sendMessage(chat, { image: { url: mqThumbUrl }, caption }, { quoted: msg }).catch(() => {});

            emitProgress(msgId, 'fetching_audio_stream');

            const audioBuffer = await downloadAudioBuffer(videoUrl);

            emitProgress(msgId, 'sending_audio_to_whatsapp');
            await sock.sendMessage(chat, { 
                audio: audioBuffer, 
                mimetype: "audio/mp4", 
                fileName: `${title}.mp3`, 
                ptt: false 
            }, { quoted: msg });

        } catch (error: any) {
            console.error('Error en comando ytmp3/yta:', error?.message || error);
            sock.sendMessage(chat, { 
                text: `   ׄ  ✿ Ocurrió un error al procesar la descarga del audio.` 
            }, { quoted: msg });
        }
    }
};
