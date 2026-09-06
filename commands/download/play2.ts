import yts from 'yt-search';
import { LRUCache } from 'lru-cache';
import axios from 'axios';
import config from '#config';

const cache = new LRUCache<string, any>({ max: 100, ttl: 3600000 });
const downloadCache = new LRUCache<string, string>({ max: 50, ttl: 120000 });

const LEMPI_KEYS = ['lem488', 'Midnight1', 'Midnight', 'lem691', 'lem678'];
const MAX_DURATION_SECONDS = 7 * 60;
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

const formatViews = (v: number) => 
    v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : 
    v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : 
    v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v.toString();

const emitProgress = (msgId: string, step: string, extraData: Record<string, any> = {}) => {
    queueMicrotask(() => {
        global.broadcast?.('cmd_progress', { id: msgId, step, ...extraData });
    });
};

const getBuffer = async (url: string, timeoutMs = 60000): Promise<Buffer> => {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: timeoutMs,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' 
            }
        });
        return Buffer.from(res.data);
    } catch {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    }
};

const extractVideoUrl = (data: any): string => {
    const candidate = data?.data?.dl_url || 
                      data?.url || 
                      data?.dl || 
                      data?.datos?.url || 
                      data?.result?.download || 
                      data?.result?.url || 
                      data?.data?.download || 
                      (typeof data?.download === 'object' ? data?.download?.url : data?.download);

    if (!candidate || typeof candidate !== 'string' || !candidate.startsWith('http')) {
        throw new Error('Respuesta de API sin URL de video válida');
    }
    return candidate;
};

const getVideoDownloadUrl = async (link: string, msgId?: string): Promise<string> => {
    const cacheKey = link.toLowerCase();
    const cached = downloadCache.get(cacheKey);
    if (cached) return cached;

    const encoded = encodeURIComponent(link);
    let lastError = '';

    const apis = [
        `https://api.starlights.uk/api/download/ytmp4?url=${encoded}`,
        `https://api.starlights.uk/api/download/ytmp4v3?url=${encoded}&quality=1080p`,
        `https://api.lempi.lat/dl/ytv?url=${encoded}&apikey=${LEMPI_KEYS[0]}`
    ];

    for (let i = 0; i < apis.length; i++) {
        const api = apis[i];
        if (msgId) emitProgress(msgId, 'requesting_api', { apiIndex: i + 1, totalApis: apis.length });
        try {
            const res = await axios.get(api, {
                timeout: 20000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                    "Accept": "application/json"
                }
            });
            const dlUrl = extractVideoUrl(res.data);
            downloadCache.set(cacheKey, dlUrl);
            return dlUrl;
        } catch (err: any) {
            lastError = err.message || String(err);
        }
    }
    throw new Error(`APIs inaccesibles: ${lastError}`);
};

export default {
    command: ['play2', 'ytmp4', 'video', 'playv'],
    description: 'Descarga y envía video de YouTube.',
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
                    text: `ꕤ Ingresa el título o enlace del video a buscar ✰\n\n> ꕤ *Ejemplo:* ${p}video Kamikaze - Víctor Mendivil` 
                }, { quoted: msg });
            }

            emitProgress(msgId, 'search_started', { query });

            let searchQuery = query;
            const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
            if (urlMatch) searchQuery = `https://youtu.be/${urlMatch[1]}`;

            const cacheKey = searchQuery.toLowerCase();
            let video = cache.get(cacheKey);

            if (!video) {
                const searchResult = await yts(searchQuery);
                if (!searchResult?.videos?.length) {
                    emitProgress(msgId, 'no_results', { query });
                    return sock.sendMessage(chat, { 
                        text: `   ׄ  ✿  No se encontraron resultados para *${query}*, por favor intenta con otro nombre o enlace.` 
                    }, { quoted: msg });
                }
                video = searchResult.videos[0];
                const videoId = video.videoId || (urlMatch ? urlMatch[1] : '');
                video = {
                    ...video,
                    link: `https://youtu.be/${videoId}`,
                    thumb: video.thumbnail || video.image || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
                };
                cache.set(cacheKey, video);
                if (videoId) { 
                    cache.set(videoId, video); 
                    cache.set(video.link.toLowerCase(), video); 
                }
            }

            if (video.seconds && video.seconds > MAX_DURATION_SECONDS) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿ El video dura *${video.timestamp}*, superando el límite máximo permitido de *7 minutos*.` 
                }, { quoted: msg });
            }

            const videoUrl = video.link || video.url;
            const title = (video.title || "").trim();
            const thumb = video.thumb || video.thumbnail || video.image;
            const channel = video.author?.name || video.author || "Desconocido";
            const views = video.views || 0;
            const duration = video.timestamp || video.duration || "";

            emitProgress(msgId, 'media_found', { title, duration, channel, videoUrl });

            const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Canal* » ${channel}\nׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}\nׅ  ׄ  ✿ *Tiempo* » ${duration}\nׅ  ׄ  ✿ *Link* » ${videoUrl}\n\nׅ  ׄ  ✿ *¡Enviando video, por favor espera!*`.trim();

            emitProgress(msgId, 'fetching_thumbnail');

            const downloadUrlPromise = getVideoDownloadUrl(videoUrl, msgId);
            const thumbBufferPromise = getBuffer(thumb, 10000).catch(() => null);

            const [thumbBuffer] = await Promise.all([thumbBufferPromise]);

            if (thumbBuffer) {
                await sock.sendMessage(chat, { image: thumbBuffer, caption }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, { text: caption }, { quoted: msg });
            }

            emitProgress(msgId, 'thumbnail_sent');

            const dlUrl = await downloadUrlPromise;

            emitProgress(msgId, 'downloading_video_stream');
            const videoBuffer = await getBuffer(dlUrl);

            if (videoBuffer.length > MAX_FILE_SIZE_BYTES) {
                const sizeMb = (videoBuffer.length / (1024 * 1024)).toFixed(1);
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿ El video pesa *${sizeMb} MB*, superando el peso máximo permitido de *30 MB*.` 
                }, { quoted: msg });
            }

            emitProgress(msgId, 'sending_video_to_whatsapp');
            const result = await sock.sendMessage(chat, { 
                video: videoBuffer, 
                mimetype: "video/mp4", 
                caption: `> ✦ *${title}*`,
                fileName: `${title}.mp4` 
            }, { quoted: msg });

            emitProgress(msgId, 'completed', { title });

            return result;
        } catch (error: any) {
            emitProgress(msgId, 'error', { error: error.message || String(error) });
            return sock.sendMessage(chat, { 
                text: `《✧》 Ocurrió un error:\n\n❒ *${error.message || error}*\n\n> *Error al procesar la solicitud*` 
            }, { quoted: msg });
        }
    }
};
