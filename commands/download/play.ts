import yts from 'yt-search';
import { spawn } from 'child_process';
import { LRUCache } from 'lru-cache';
import axios from 'axios';
import config from '#config';

const cache = new LRUCache<string, any>({ max: 100, ttl: 3600000 });
const downloadCache = new LRUCache<string, { url: string; isVideo: boolean }>({ max: 50, ttl: 120000 });
const LEMPI_KEYS = ['lem488', 'Midnight1', 'Midnight', 'lem691', 'lem678', 'lem957', 'lem293', 'lem144', 'lem459', 'lem501', 'lem141'];
const STELLAR_KEY = 'Midnight';

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

const getBuffer = async (url: string, timeoutMs = 45000): Promise<Buffer> => {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: timeoutMs,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
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

const convertVideoToAudioBuffer = (videoBuffer: Buffer): Promise<Buffer> => new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-i', 'pipe:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '128k', '-preset', 'ultrafast', '-f', 'mp3', 'pipe:1']);
    const chunks: Buffer[] = [];
    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.on('close', (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`FFmpeg error (${code})`)));
    ffmpeg.on('error', reject);
    ffmpeg.stdin.end(videoBuffer);
});

const extractDownloadUrl = (data: any): string => {
    const candidate = data?.dl || 
                      data?.data?.dl_url || 
                      data?.data?.download?.url || 
                      data?.datos?.url || 
                      data?.result?.download || 
                      data?.result?.dl || 
                      data?.result?.url || 
                      data?.result?.link || 
                      data?.data?.download || 
                      data?.data?.dl || 
                      data?.data?.url || 
                      data?.data?.link || 
                      (typeof data?.download === 'object' ? data?.download?.url || data?.download?.link : data?.download) || 
                      (typeof data?.result === 'string' && data.result.startsWith('http') ? data.result : null) || 
                      data?.url || 
                      data?.link;

    if (!candidate || typeof candidate !== 'string' || !candidate.startsWith('http')) {
        throw new Error('Respuesta sin URL válida');
    }
    return candidate;
};

const fetchWithTimeout = async (url: string, timeoutMs = 15000): Promise<any> => {
    const res = await axios.get(url, {
        timeout: timeoutMs,
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*' 
        }
    });
    return res.data;
};

const getDownloadStreamSequential = async (link: string, msgId?: string): Promise<{ url: string; isVideo: boolean }> => {
    const cacheKey = link.toLowerCase();
    const cached = downloadCache.get(cacheKey);
    if (cached) return cached;

    const encoded = encodeURIComponent(link);
    let lastError = '';
    
    const apis = [
        { url: `https://api.starlights.uk/api/download/ytmp3?url=${encoded}`, isVideo: false },
        { url: `https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`, isVideo: false },
        { url: `https://api.lempi.lat/dl/yta?url=${encoded}&apikey=${LEMPI_KEYS[0]}`, isVideo: false },
        { url: `https://api.lempi.lat/dl/ytv?url=${encoded}&apikey=${LEMPI_KEYS[1]}`, isVideo: true },
        { url: `https://api.stellarwa.xyz/dl/ytmp3?url=${encoded}&key=${STELLAR_KEY}`, isVideo: false }
    ];

    for (let i = 0; i < apis.length; i++) {
        const api = apis[i];
        if (msgId) emitProgress(msgId, 'requesting_api', { apiIndex: i + 1, totalApis: apis.length });
        try {
            const data = await fetchWithTimeout(api.url);
            const dlUrl = extractDownloadUrl(data);
            const result = { url: dlUrl, isVideo: api.isVideo };
            downloadCache.set(cacheKey, result);
            return result;
        } catch (err: any) {
            lastError = err.message || String(err);
        }
    }
    throw new Error(`APIs inaccesibles: ${lastError}`);
};

export default {
    command: ['play', 'playaudio', 'audio'],
    description: 'Descarga y envía audio de YouTube (Máx. 7 min / 30 MB)',
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
                    text: `ꕤ Ingresa el título o enlace a buscar ✰\n\n> ꕤ *Ejemplo:* ${p}play Kamikaze - Víctor Mendivil` 
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
                    text: `   ׄ  ✿ El audio dura *${video.timestamp}*, superando el límite máximo permitido de *7 minutos*.` 
                }, { quoted: msg });
            }

            const videoUrl = video.link || video.url;
            const title = (video.title || "").trim();
            const thumb = video.thumb || video.thumbnail || video.image;
            const channel = video.author?.name || video.author || "Desconocido";
            const views = video.views || 0;
            const duration = video.timestamp || video.duration || "";

            emitProgress(msgId, 'media_found', { title, duration, channel, videoUrl });

            const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Canal* » ${channel}\nׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}\nׅ  ׄ  ✿ *Tiempo* » ${duration}\nׅ  ׄ  ✿ *Link* » ${videoUrl}\n\nׅ  ׄ  ✿ *¡Enviando audio, por favor espera!*`.trim();

            emitProgress(msgId, 'fetching_thumbnail');

            const streamPromise = getDownloadStreamSequential(videoUrl, msgId);
            const thumbBufferPromise = getBuffer(thumb, 10000).catch(() => null);

            const [thumbBuffer] = await Promise.all([thumbBufferPromise]);

            if (thumbBuffer) {
                await sock.sendMessage(chat, { image: thumbBuffer, caption }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, { text: caption }, { quoted: msg });
            }

            emitProgress(msgId, 'thumbnail_sent');

            const streamData = await streamPromise;

            let audioBuffer: Buffer;
            if (streamData.isVideo) {
                emitProgress(msgId, 'downloading_video_stream');
                const videoBuffer = await getBuffer(streamData.url);
                
                emitProgress(msgId, 'converting_video_to_audio');
                audioBuffer = await convertVideoToAudioBuffer(videoBuffer);
            } else {
                emitProgress(msgId, 'downloading_audio_stream');
                audioBuffer = await getBuffer(streamData.url);
            }

            if (audioBuffer.length > MAX_FILE_SIZE_BYTES) {
                const sizeMb = (audioBuffer.length / (1024 * 1024)).toFixed(1);
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿ El audio pesa *${sizeMb} MB*, superando el peso máximo permitido de *30 MB*.` 
                }, { quoted: msg });
            }

            emitProgress(msgId, 'sending_audio_to_whatsapp');
            const result = await sock.sendMessage(chat, { 
                audio: audioBuffer, 
                mimetype: "audio/mpeg", 
                fileName: `${title}.mp3`, 
                ptt: false 
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
