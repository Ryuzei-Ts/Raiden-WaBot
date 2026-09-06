import yts from 'yt-search';
import { spawn } from 'child_process';
import { LRUCache } from 'lru-cache';
import config from '#config';

const cache = new LRUCache<string, any>({ max: 100, ttl: 3600000 });
const downloadCache = new LRUCache<string, { url: string; isVideo: boolean }>({ max: 50, ttl: 120000 });
const LEMPI_KEYS = ['lem488', 'Midnight1', 'Midnight', 'lem691', 'lem678', 'lem957', 'lem293', 'lem144', 'lem459', 'lem501', 'lem141'];
const STELLAR_KEY = 'Midnight';

const formatViews = (v: number) => v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v.toString();

const emitProgress = (msgId: string, step: string, extraData: Record<string, any> = {}) => {
    queueMicrotask(() => {
        global.broadcast?.('cmd_progress', { id: msgId, step, ...extraData });
    });
};

const fetchBuffer = (url: string, timeoutMs = 90000): Promise<Buffer> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal })
        .then(res => {
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.arrayBuffer();
        })
        .then(Buffer.from)
        .catch(err => { clearTimeout(timeoutId); throw err; });
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
    const candidate = data?.datos?.url || data?.result?.download || data?.result?.dl || data?.result?.url || data?.result?.link || data?.data?.download || data?.data?.dl || data?.data?.url || data?.data?.link || (typeof data?.download === 'object' ? data?.download?.url || data?.download?.link : data?.download) || (typeof data?.result === 'string' && data.result.startsWith('http') ? data.result : null) || data?.url || data?.link || data?.dl;
    if (!candidate || typeof candidate !== 'string' || !candidate.startsWith('http')) throw new Error('Respuesta sin URL válida');
    return candidate;
};

const fetchWithTimeout = (url: string, timeoutMs = 35000): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json, text/plain, */*' }, signal: controller.signal })
        .then(res => {
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .catch(err => { clearTimeout(timeoutId); throw err; });
};

const getDownloadStreamSequential = async (link: string, msgId?: string): Promise<{ url: string; isVideo: boolean }> => {
    const cacheKey = link.toLowerCase();
    const cached = downloadCache.get(cacheKey);
    if (cached) return cached;

    const encoded = encodeURIComponent(link);
    let lastError = '';
    const apis = [
        { url: `https://api.lempi.lat/dl/yta?url=${encoded}&apikey=${LEMPI_KEYS[0]}`, isVideo: false },
        { url: `https://api.lempi.lat/dl/ytv?url=${encoded}&apikey=${LEMPI_KEYS[1]}`, isVideo: true },
        { url: `https://api.stellarwa.xyz/dl/ytmp3?url=${encoded}&key=${STELLAR_KEY}`, isVideo: false }
    ];

    for (let i = 0; i < apis.length; i++) {
        const api = apis[i];
        if (msgId) emitProgress(msgId, 'requesting_api', { apiIndex: i + 1, totalApis: apis.length });
        try {
            const data = await fetchWithTimeout(api.url);
            const result = { url: extractDownloadUrl(data), isVideo: api.isVideo };
            downloadCache.set(cacheKey, result);
            return result;
        } catch (err: any) {
            lastError = err.message;
        }
    }
    throw new Error(`APIs inaccesibles: ${lastError}`);
};

export default {
    command: ['play', 'playaudio', 'audio'],
    description: 'Descarga y envía audio de YouTube',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || config.prefix;
        const msgId = msg?.id || msg?.key?.id;

        try {
            const query = args.join(" ").trim();
            if (!query) return sock.sendMessage(chat, { text: `ꕤ Ingresa el título o enlace a buscar ✰\n\n> ꕤ *Ejemplo:* ${p}play Kamikaze - Víctor Mendivil` }, { quoted: msg });

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
                    return sock.sendMessage(chat, { text: `   ׄ  ✿  No se encontraron resultados para *${query}*, por favor intenta con otro nombre o enlace.` }, { quoted: msg });
                }
                video = searchResult.videos[0];
                const videoId = video.videoId || (urlMatch ? urlMatch[1] : '');
                video = {
                    ...video,
                    link: `https://youtu.be/${videoId}`,
                    thumb: video.thumbnail || video.image || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
                };
                cache.set(cacheKey, video);
                if (videoId) { cache.set(videoId, video); cache.set(video.link.toLowerCase(), video); }
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

            const thumbBuffer = await fetchBuffer(thumb).catch(() => null);

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
                const videoBuffer = await fetchBuffer(streamData.url);
                
                emitProgress(msgId, 'converting_video_to_audio');
                audioBuffer = await convertVideoToAudioBuffer(videoBuffer);
            } else {
                emitProgress(msgId, 'downloading_audio_stream');
                audioBuffer = await fetchBuffer(streamData.url);
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
            return sock.sendMessage(chat, { text: `《✧》 Ocurrió un error:\n\n❒ *${error.message || error}*\n\n> *Error al procesar la solicitud*` }, { quoted: msg });
        }
    }
};
