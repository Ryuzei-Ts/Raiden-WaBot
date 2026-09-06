import axios from 'axios';
import yts from 'yt-search';
import config from '#config';

const LEMPI_KEYS = ['lem488', 'Midnight1', 'Midnight', 'lem691', 'lem678', 'lem957', 'lem293', 'lem144', 'lem459', 'lem501', 'lem141'];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const extractDownloadUrl = (data: any): string => {
    const candidate =
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
        data?.link ||
        data?.dl;

    if (!candidate || typeof candidate !== 'string' || !candidate.startsWith('http')) {
        throw new Error(`Respuesta sin URL válida`);
    }

    return candidate;
};

const fetchWithTimeout = async (url: string, timeoutMs = 45000): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
};

const getLempiDownload = async (videoUrl: string): Promise<string> => {
    const encoded = encodeURIComponent(videoUrl);
    let lastError = '';

    for (const key of LEMPI_KEYS) {
        try {
            const url = `https://api.lempi.lat/dl/yta?url=${encoded}&apikey=${key}`;
            console.log(`Intentando con key: ${key}...`);
            const data = await fetchWithTimeout(url, 35000);
            const downloadUrl = extractDownloadUrl(data);
            console.log(`✅ Key ${key} funcionó`);
            return downloadUrl;
        } catch (err: any) {
            console.log(`❌ Key ${key} falló: ${err.message}`);
            lastError = err.message;
            await sleep(500);
        }
    }

    throw new Error(`Todas las keys de Lempi fallaron. Último error: ${lastError}`);
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

            if (!query) {
                return await sock.sendMessage(chat, {
                    text: `ꕤ Ingresa el título o enlace a buscar ✰\n\n> ꕤ *Ejemplo:* ${p}play Kamikaze - Víctor Mendivil`
                }, { quoted: msg });
            }

            let searchQuery = query;
            const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
            if (urlMatch) {
                searchQuery = `https://youtu.be/${urlMatch[1]}`;
            }

            const searchResult = await yts(searchQuery);
            if (!searchResult || !searchResult.videos || !searchResult.videos.length) {
                return await sock.sendMessage(chat, {
                    text: "《✧》 No se encontró información del video."
                }, { quoted: msg });
            }

            const video = searchResult.videos[0];
            const videoUrl = video.url;
            const title = (video.title || "").trim();
            const thumb = video.thumbnail || video.image || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
            const channel = video.author?.name || video.author || "Desconocido";
            const views = video.views || 0;
            const duration = video.timestamp || video.duration || "";

            const thumbBuffer = await axios.get(thumb, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data));

            const caption = `﹒𝜗ৎ      ࣪  \`${title}\`

ׅ  ׄ  ✿ *Canal* » ${channel}
ׅ  ׄ  ✿ *Vistas* » ${(views || 0).toLocaleString()}
ׅ  ׄ  ✿ *Tiempo* » ${duration}
ׅ  ׄ  ✿ *Link* » ${videoUrl}

ׅ  ׄ  ✿ *¡Enviando audio, por favor espera!*`.trim();

            await sock.sendMessage(chat, { image: thumbBuffer, caption }, { quoted: msg });

            let audioBuffer: Buffer | null = null;

            try {
                const downloadUrl = await getLempiDownload(videoUrl);
                const audioRes = await axios.get(downloadUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 90000
                });
                audioBuffer = Buffer.from(audioRes.data);
            } catch (error: any) {
                console.error("Error en descarga:", error);
                return await sock.sendMessage(chat, {
                    text: `《✧》 Error al descargar el audio:\n\n❒ *${error.message || error}*\n\n> *Intenta con otro video o más tarde*`
                }, { quoted: msg });
            }

            if (!audioBuffer) {
                return await sock.sendMessage(chat, {
                    text: "《✧》 No se pudo descargar el *audio*, intenta más tarde."
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`,
                ptt: false
            }, { quoted: msg });

        } catch (error: any) {
            console.error(error);
            await sock.sendMessage(chat, {
                text: `《✧》 Ocurrió un error:\n\n❒ *${error.message || error}*\n\n> *Error al procesar la solicitud*`
            }, { quoted: msg });
        }
    }
};
