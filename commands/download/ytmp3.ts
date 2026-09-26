import yts from 'yt-search';
import axios from 'axios';
import config from '#config';

const max_duration_seconds = 7 * 60;
const api_base_url = 'https://vidkraken.com/api/v2';
const default_api_key = '2256fef5-9328-4582-8962-cb375378c8e0';

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

const downloadAudioWithVidkraken = async (videoUrl: string): Promise<string> => {
    const apiKey = config.vidkrakenKey || default_api_key;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const createRes = await axios.post(
        `${api_base_url}/download`,
        { url: videoUrl, format: 'mp3' },
        { headers, timeout: 15000 }
    );

    const { jobId, downloadUrl, status } = createRes.data || {};

    if (status === 'COMPLETED' && downloadUrl) {
        return downloadUrl;
    }

    if (!jobId) {
        throw new Error('No se pudo iniciar el proceso de descarga en VidKraken');
    }

    const maxRetries = 20;
    const delayMs = 3000;

    for (let i = 0; i < maxRetries; i++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        const statusRes = await axios.get(`${api_base_url}/download/${jobId}`, {
            headers,
            timeout: 10000
        });

        const jobData = statusRes.data || {};

        if (jobData.status === 'COMPLETED' && jobData.downloadUrl) {
            return jobData.downloadUrl;
        }

        if (jobData.status === 'FAILED') {
            throw new Error(jobData.errorCode || 'Error en el procesamiento de VidKraken');
        }
    }

    throw new Error('El tiempo de espera de descarga con VidKraken ha expirado');
};

export default {
    command: ['yta', 'ytmp3'],
    description: 'Descarga y envía audio de YouTube utilizando VidKraken.',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, prefix } = ctx;
        const msgId = msg?.id || msg?.key?.id;

        const query = args.join(" ").trim();
        if (!query) {
            return sock.sendMessage(chat, { text: `ꕤ *Ingresa el título o enlace a buscar* ✰` }, { quoted: msg });
        }

        emitProgress(msgId, 'search_started', { query });

        const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
        const searchQuery = urlMatch ? `https://youtu.be/${urlMatch[1]}` : query;

        try {
            const searchResult = await yts(searchQuery);

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

            if (video.seconds && video.seconds > max_duration_seconds) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿ El audio dura **${duration}**, superando el límite permitido de **7 minutos**.` 
                }, { quoted: msg });
            }

            const mqThumbUrl = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
            const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Canal* » ${channel}\nׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}\nׅ  ׄ  ✿ *Tiempo* » ${duration}\nׅ  ׄ  ✿ *Link* » ${videoUrl}\n\nׅ  ׄ  ✿ *Descargando audio (VidKraken)...*`;

            sock.sendMessage(chat, { image: { url: mqThumbUrl }, caption }, { quoted: msg }).catch(() => {});

            emitProgress(msgId, 'fetching_audio_stream');

            const downloadUrl = await downloadAudioWithVidkraken(videoUrl);

            emitProgress(msgId, 'sending_audio_to_whatsapp');
            await sock.sendMessage(chat, { 
                audio: { url: downloadUrl }, 
                mimetype: "audio/mpeg", 
                fileName: `${title}.mp3`, 
                ptt: false 
            }, { quoted: msg });

        } catch (error: any) {
            console.error('Error en comando ytmp3/yta:', error?.message || error);
            sock.sendMessage(chat, { 
                text: `   ׄ  ✿ Ocurrió un error al procesar la descarga con VidKraken.` 
            }, { quoted: msg });
        }
    }
};
