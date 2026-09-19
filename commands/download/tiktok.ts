import { PassThrough } from 'node:stream';
import axios from 'axios';
import config from '#config';

const extractVideoUrl = (data: any): string | null => {
    const media = data?.data?.meta?.media?.[0] || data?.meta?.media?.[0];
    if (media) {
        const candidate = media.hd && media.hd !== '0 B' ? media.hd : media.org || media.wm;
        if (candidate && candidate.startsWith('http')) return candidate;
    }
    const rawUrl = data?.data?.play || data?.play || data?.url || data?.data?.url;
    return typeof rawUrl === 'string' && rawUrl.startsWith('http') ? rawUrl : null;
};

const fetchTikTokData = async (url: string) => {
    const encoded = encodeURIComponent(url);
    const apis = [
        `https://api.delirius.online/download/tiktok?url=${encoded}`,
        `https://api.starlights.uk/api/download/tiktok?url=${encoded}`
    ];

    const promises = apis.map(async (apiUrl) => {
        const res = await axios.get(apiUrl, {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7)' }
        });
        if (!res.data) throw new Error('Sin datos');
        return res.data;
    });

    return await Promise.any(promises);
};

const getVideoStream = async (videoUrl: string): Promise<PassThrough> => {
    const res = await axios.get(videoUrl, {
        responseType: 'stream',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const passThrough = new PassThrough();
    res.data.pipe(passThrough);
    return passThrough;
};

export default {
    command: ['tiktok', 'tt', 'tk'],
    description: 'Descarga videos de TikTok',
    category: 'download',
    group: true,
    run: async ({ chat, m, sock, args }: any) => {
        const msgId = m?.id || m?.key?.id;

        try {
            const url = args.join(' ').trim();
            if (!url) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  Por favor, ingresa un enlace de TikTok.` 
                }, { quoted: m });
            }

            const tiktokRegex = /(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com|t\.co)/i;
            if (!tiktokRegex.test(url)) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  El enlace no parece ser de TikTok.` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'search_started', url });

            const responseData = await fetchTikTokData(url);
            const data = responseData?.data || responseData;

            const videoUrl = extractVideoUrl(responseData);
            if (!videoUrl) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', url });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo obtener el video de TikTok. Verifica el enlace.` 
                }, { quoted: m });
            }

            const duration = data.duration || data.meta?.duration || 0;
            if (duration > 900) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  El video excede los 15 minutos de duración.` 
                }, { quoted: m });
            }

            const title = (data.title || 'Sin título').trim();
            const author = data.author?.nickname || 'Desconocido';
            const rawUsername = data.author?.username || 'desconocido';
            const username = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
            
            const rawLikes = data.like || data.digg_count || 0;
            const likes = typeof rawLikes === 'number' ? rawLikes : parseInt(String(rawLikes).replace(/\D/g, '')) || 0;

            const musicTitle = data.music?.title || data.music_info?.title || 'Sin música';
            const musicAuthor = data.music?.author || data.music_info?.author || 'Desconocido';

            const formatNumber = (num: number) => {
                if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
                if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
                return num.toString();
            };

            const devName = config.devName || 'Ryuzei';
            const caption = `﹒𝜗ৎ      ࣪  **${title}**\n\nׅ  ׄ  ✿ **Autor** » ${author} (@${username})\nׅ  ׄ  ✿ **Likes** » ${formatNumber(likes)}\nׅ  ׄ  ✿ **Duración** » ${duration}s\nׅ  ׄ  ✿ **Música** » ${musicTitle} - ${musicAuthor}\n\nׅ  ׄ  ✿ Made with love By **${devName}**`.trim();

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_video' });

            const videoStream = await getVideoStream(videoUrl);

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_video' });

            const result = await sock.sendMessage(chat, { 
                video: { stream: videoStream }, 
                caption,
                gifPlayback: false
            }, { quoted: m });

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

            return result;

        } catch (error: any) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message || String(error) });
            return sock.sendMessage(chat, { 
                text: `   ׄ  ✿  Ocurrió un error al procesar tu solicitud.`
            }, { quoted: m });
        }
    }
};
