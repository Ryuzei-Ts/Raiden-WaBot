import yts from 'yt-search';
import { PassThrough } from 'node:stream';
import axios from 'axios';
import config from '#config';

const MAX_DURATION_SECONDS = 7 * 60;

const cleanText = (text: unknown): string => {
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

const extractDownloadUrl = (data: any): string | null => {
    return data?.data?.download || data?.download || data?.dl || data?.data?.dl_url ||
           data?.data?.download?.url || data?.result?.download || data?.result?.dl ||
           data?.result?.url || data?.result?.link || data?.url || data?.link || null;
};

const getDirectAudioStream = async (link: string): Promise<PassThrough> => {
    const encoded = encodeURIComponent(link);
    const apis = [
        `https://api.delirius.online/download/ytmp3?url=${encoded}`,
        `https://api.starlights.uk/api/download/ytmp3?url=${encoded}`,
        `https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`
    ];

    const promises = apis.map(async (url) => {
        const res = await axios.get(url, { timeout: 4000 });
        const dlUrl = extractDownloadUrl(res.data);
        if (!dlUrl) throw new Error('Sin URL');

        const streamRes = await axios.get(dlUrl, {
            responseType: 'stream',
            timeout: 10000
        });

        const passThrough = new PassThrough();
        streamRes.data.pipe(passThrough);
        return passThrough;
    });

    return await Promise.any(promises);
};

export default {
    command: ['play', 'playaudio', 'audio'],
    description: 'Descarga y envía audio de YouTube.',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || config.prefix;
        const msgId = msg?.id || msg?.key?.id;

        try {
            const query = args.join(" ").trim();
            if (!query) {
                return sock.sendMessage(chat, { 
                    text: `ꕤ Ingresa el título o enlace a buscar ✰` 
                }, { quoted: msg });
            }

            emitProgress(msgId, 'search_started', { query });

            const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
            const searchQuery = urlMatch ? `https://youtu.be/${urlMatch[1]}` : query;

            const searchResult = await yts(searchQuery);
            if (!searchResult?.videos?.length) {
                emitProgress(msgId, 'no_results', { query });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿ No se encontraron resultados para **${query}**.` 
                }, { quoted: msg });
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
            const caption = `﹒𝜗ৎ      ࣪  **${title}**\n\nׅ  ׄ  ✿ **Canal** » ${channel}\nׅ  ׄ  ✿ **Vistas** » ${formatViews(views)}\nׅ  ׄ  ✿ **Tiempo** » ${duration}\nׅ  ׄ  ✿ **Link** » ${videoUrl}\n\nׅ  ׄ  ✿ **Descargando audio...**`;

            const audioStreamPromise = getDirectAudioStream(videoUrl);

            sock.sendMessage(chat, { 
                image: { url: mqThumbUrl }, 
                caption 
            }, { quoted: msg }).catch(() => {});

            emitProgress(msgId, 'fetching_audio_stream');
            const audioStream = await audioStreamPromise;

            emitProgress(msgId, 'sending_audio_to_whatsapp');
            return await sock.sendMessage(chat, { 
                audio: { stream: audioStream }, 
                mimetype: "audio/mpeg", 
                fileName: `${title}.mp3`, 
                ptt: false 
            }, { quoted: msg });

        } catch (error: any) {
            emitProgress(msgId, 'error', { error: error.message || String(error) });
            return sock.sendMessage(chat, { 
                text: `《✧》 Ocurrió un error:\n\n❒ **${error.message || error}**\n\n> **Error al procesar la solicitud**` 
            }, { quoted: msg });
        }
    }
};
