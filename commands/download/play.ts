import yts from 'yt-search';
import { spawn } from 'child_process';
import axios from 'axios';
import config from '#config';

const LEMPI_KEYS = ['lem488', 'Midnight1', 'Midnight', 'lem691', 'lem678', 'lem957', 'lem293', 'lem144', 'lem459', 'lem501', 'lem141'];
const STELLAR_KEY = 'Midnight';

const MAX_DURATION_SECONDS = 7 * 60;
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

const cleanText = (text: any): string => {
    if (text === null || text === undefined) return '';
    if (typeof text === 'string') return text.replace(/^\s+|\s+$/g, '');
    if (typeof text === 'number') return String(text);
    if (typeof text === 'object') {
        try { return JSON.stringify(text).replace(/^\s+|\s+$/g, ''); } 
        catch { return ''; }
    }
    return String(text).replace(/^\s+|\s+$/g, '');
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

const getBufferFast = async (url: string, timeoutMs = 5000): Promise<Buffer> => {
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
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-vn',
        '-c:a', 'libmp3lame',
        '-b:a', '96k',
        '-preset', 'ultrafast',
        '-threads', '2',
        '-f', 'mp3',
        'pipe:1'
    ]);
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

const fetchWithTimeout = async (url: string, timeoutMs = 3000): Promise<any> => {
    try {
        const res = await axios.get(url, {
            timeout: timeoutMs,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*' 
            },
            validateStatus: () => true
        });
        
        if (res.status === 403 || res.status === 404 || res.status === 429 || res.status >= 500) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        if (res.status !== 200) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        return res.data;
    } catch (error: any) {
        if (error.response) {
            const status = error.response.status;
            if (status === 403 || status === 404 || status === 429 || status >= 500) {
                throw new Error(`HTTP ${status}`);
            }
        }
        throw error;
    }
};

const getAudioStream = async (link: string): Promise<{ url: string; isVideo: boolean }> => {
    const encoded = encodeURIComponent(link);
    
    const apis = [
        { url: `https://api.starlights.uk/api/download/ytmp3?url=${encoded}`, isVideo: false },
        { url: `https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`, isVideo: false },
        { url: `https://api.lempi.lat/dl/yta?url=${encoded}&apikey=${LEMPI_KEYS[0]}`, isVideo: false },
        { url: `https://api.lempi.lat/dl/ytv?url=${encoded}&apikey=${LEMPI_KEYS[1]}`, isVideo: true },
        { url: `https://api.stellarwa.xyz/dl/ytmp3?url=${encoded}&key=${STELLAR_KEY}`, isVideo: false }
    ];

    for (const api of apis) {
        try {
            const data = await fetchWithTimeout(api.url, 3000);
            const dlUrl = extractDownloadUrl(data);
            return { url: dlUrl, isVideo: api.isVideo };
        } catch (error) {
            continue;
        }
    }
    
    throw new Error('No se pudo obtener el audio de ninguna API');
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
            const query = args.join(" ").replace(/^\s+|\s+$/g, '');
            if (!query) {
                return sock.sendMessage(chat, { 
                    text: `ꕤ Ingresa el título o enlace a buscar ✰\n\n> ꕤ *Ejemplo:* ${p}play Kamikaze - Víctor Mendivil` 
                }, { quoted: msg });
            }

            emitProgress(msgId, 'search_started', { query });

            let searchQuery = query;
            const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
            if (urlMatch) searchQuery = `https://youtu.be/${urlMatch[1]}`;

            const searchResult = await yts(searchQuery);
            if (!searchResult?.videos?.length) {
                emitProgress(msgId, 'no_results', { query });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se encontraron resultados para *${query}*, por favor intenta con otro nombre o enlace.` 
                }, { quoted: msg });
            }

            const video = searchResult.videos[0];
            const videoId = video.videoId || (urlMatch ? urlMatch[1] : '');
            const videoUrl = `https://youtu.be/${videoId}`;
            const title = cleanText(video.title) || 'Sin título';
            const thumb = cleanText(video.thumbnail || video.image || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`);
            const channel = cleanText(video.author?.name || video.author || "Desconocido") || "Desconocido";
            const views = typeof video.views === 'number' ? video.views : 0;
            const duration = cleanText(video.timestamp || video.duration || "") || "";

            if (video.seconds && video.seconds > MAX_DURATION_SECONDS) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿ El audio dura *${duration}*, superando el límite máximo permitido de *7 minutos*.` 
                }, { quoted: msg });
            }

            const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Canal* » ${channel}\nׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}\nׅ  ׄ  ✿ *Tiempo* » ${duration}\nׅ  ׄ  ✿ *Link* » ${videoUrl}\n\nׅ  ׄ  ✿ *Descargando audio...*`;

            let thumbBuffer = null;
            if (thumb) {
                try { 
                    thumbBuffer = await getBufferFast(thumb, 3000); 
                } catch {}
            }

            if (thumbBuffer) {
                await sock.sendMessage(chat, { image: thumbBuffer, caption }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, { text: caption }, { quoted: msg });
            }

            emitProgress(msgId, 'media_found', { title, duration, channel, videoUrl });

            const streamData = await getAudioStream(videoUrl);

            let audioBuffer: Buffer;
            if (streamData.isVideo) {
                emitProgress(msgId, 'downloading_video_stream');
                const videoBuffer = await getBufferFast(streamData.url, 15000);
                emitProgress(msgId, 'converting_video_to_audio');
                audioBuffer = await convertVideoToAudioBuffer(videoBuffer);
            } else {
                emitProgress(msgId, 'downloading_audio_stream');
                audioBuffer = await getBufferFast(streamData.url, 15000);
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
