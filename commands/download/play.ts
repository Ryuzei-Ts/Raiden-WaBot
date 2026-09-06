import axios from 'axios';
import yts from 'yt-search';
import { spawn } from 'child_process';
import { LRUCache } from 'lru-cache';
import config from '#config';

const cache = new LRUCache<string, any>({ max: 100, ttl: 1000 * 60 * 60 });
const LEMPI_KEYS = ['lem488', 'Midnight1', 'Midnight', 'lem691', 'lem678', 'lem957', 'lem293', 'lem144', 'lem459', 'lem501', 'lem141'];
const STELLAR_KEY = 'Midnight';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const convertVideoToAudioBuffer = (videoBuffer: Buffer): Promise<Buffer> => new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-i', 'pipe:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1']);
    const chunks: Buffer[] = [];
    let error = '';
    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr.on('data', (err: Buffer) => error += err.toString());
    ffmpeg.on('close', (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`FFmpeg error (code ${code}): ${error.slice(-150)}`)));
    ffmpeg.on('error', reject);
    ffmpeg.stdin.write(videoBuffer);
    ffmpeg.stdin.end();
});

const extractDownloadUrl = (data: any): string => {
    const candidate = data?.datos?.url || data?.result?.download || data?.result?.dl || data?.result?.url || data?.result?.link || data?.data?.download || data?.data?.dl || data?.data?.url || data?.data?.link || (typeof data?.download === 'object' ? data?.download?.url || data?.download?.link : data?.download) || (typeof data?.result === 'string' && data.result.startsWith('http') ? data.result : null) || data?.url || data?.link || data?.dl;
    if (!candidate || typeof candidate !== 'string' || !candidate.startsWith('http')) throw new Error('Respuesta sin URL válida');
    return candidate;
};

const fetchWithTimeout = async (url: string, timeoutMs = 45000): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json, text/plain, */*' }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) { clearTimeout(timeoutId); throw err; }
};

const fetchEndpoint = async (url: string, retries = 1): Promise<string> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try { const data = await fetchWithTimeout(url, 35000); return extractDownloadUrl(data); } 
        catch (err) { if (attempt === retries) throw err; await sleep(1000); }
    }
    throw new Error('Timeout agotado tras reintentos.');
};

const getDownloadStreamSequential = async (link: string): Promise<{ url: string; isVideo: boolean }> => {
    const encoded = encodeURIComponent(link);
    let lastError = '';
    const apis = [
        { name: 'Lempi YTA', url: `https://api.lempi.lat/dl/yta?url=${encoded}&apikey=${LEMPI_KEYS[0]}`, isVideo: false },
        { name: 'Lempi YTV', url: `https://api.lempi.lat/dl/ytv?url=${encoded}&apikey=${LEMPI_KEYS[1]}`, isVideo: true },
        { name: 'Stellar', url: `https://api.stellarwa.xyz/dl/ytmp3?url=${encoded}&key=${STELLAR_KEY}`, isVideo: false }
    ];
    for (const api of apis) {
        try { const result = await fetchEndpoint(api.url); return { url: result, isVideo: api.isVideo }; } 
        catch (err: any) { lastError = err.message; await sleep(500); }
    }
    throw new Error(`Todas las APIs fallaron. Último error: ${lastError}`);
};

export default {
    command: ['play', 'playaudio', 'audio'],
    description: 'Descarga y envía audio de YouTube',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || config.prefix;
        try {
            const query = args.join(" ").trim();
            if (!query) return await sock.sendMessage(chat, { text: `ꕤ Ingresa el título o enlace a buscar ✰\n\n> ꕤ *Ejemplo:* ${p}play Kamikaze - Víctor Mendivil` }, { quoted: msg });

            let searchQuery = query;
            const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
            if (urlMatch) searchQuery = `https://youtu.be/${urlMatch[1]}`;

            const cacheKey = searchQuery.toLowerCase();
            let video = cache.get(cacheKey);
            if (!video) {
                const searchResult = await yts(searchQuery);
                if (!searchResult?.videos?.length) return await sock.sendMessage(chat, { text: "《✧》 No se encontró información del video." }, { quoted: msg });
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

            const thumbBuffer = await axios.get(thumb, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data));
            const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Canal* » ${channel}\nׅ  ׄ  ✿ *Vistas* » ${(views || 0).toLocaleString()}\nׅ  ׄ  ✿ *Tiempo* » ${duration}\nׅ  ׄ  ✿ *Link* » ${videoUrl}\n\nׅ  ׄ  ✿ *¡Enviando audio, por favor espera!*`.trim();
            await sock.sendMessage(chat, { image: thumbBuffer, caption }, { quoted: msg });

            let audioBuffer: Buffer | null = null;
            try {
                const result = await getDownloadStreamSequential(videoUrl);
                if (result.isVideo) {
                    const videoRes = await axios.get(result.url, { responseType: 'arraybuffer', timeout: 90000 });
                    audioBuffer = await convertVideoToAudioBuffer(Buffer.from(videoRes.data));
                } else {
                    const audioRes = await axios.get(result.url, { responseType: 'arraybuffer', timeout: 90000 });
                    audioBuffer = Buffer.from(audioRes.data);
                }
            } catch (error: any) {
                return await sock.sendMessage(chat, { text: `《✧》 Error al descargar el audio:\n\n❒ *${error.message || error}*\n\n> *Intenta con otro video o más tarde*` }, { quoted: msg });
            }
            if (!audioBuffer) return await sock.sendMessage(chat, { text: "《✧》 No se pudo descargar el *audio*, intenta más tarde." }, { quoted: msg });
            await sock.sendMessage(chat, { audio: audioBuffer, mimetype: "audio/mpeg", fileName: `${title}.mp3`, ptt: false }, { quoted: msg });
        } catch (error: any) {
            await sock.sendMessage(chat, { text: `《✧》 Ocurrió un error:\n\n❒ *${error.message || error}*\n\n> *Error al procesar la solicitud*` }, { quoted: msg });
        }
    }
};
