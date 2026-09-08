import axios from 'axios';
import config from '#config';

const getBuffer = async (url: string, timeoutMs = 30000): Promise<Buffer> => {
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

export default {
    command: ['tiktok', 'tt', 'tk'],
    description: 'Descarga videos de TikTok',
    category: 'download',
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';
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

            const endpoint = `https://api.delirius.online/download/tiktok?url=${encodeURIComponent(url)}`;

            const res = await axios.get(endpoint, {
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            const data = res.data?.data;

            if (!res.data?.status || !data || !data.meta?.media?.length) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', url });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo obtener el video de TikTok. Verifica el enlace.` 
                }, { quoted: m });
            }

            const duration = data.duration || 0;
            if (duration > 900) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  El video excede los 15 minutos de duración (${Math.round(duration/60)} minutos).` 
                }, { quoted: m });
            }

            const media = data.meta.media[0];
            let videoUrl = media.hd && media.hd !== '0 B' ? media.hd : media.org || media.wm;

            if (!videoUrl || videoUrl === '0 B') {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se encontró un enlace de video válido.` 
                }, { quoted: m });
            }

            let title = (data.title || 'Sin título').trim();
            const author = data.author?.nickname || data.author?.username || 'Desconocido';
            const username = data.author?.username || 'Desconocido';
            const likes = parseInt(String(data.like || 0).replace(/\./g, ''));
            const durationFormatted = data.duration || 0;
            const musicTitle = data.music?.title || 'Sin música';
            const musicAuthor = data.music?.author || 'Desconocido';

            const formatNumber = (num: number) => {
                if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                return num.toString();
            };

            const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Autor* » ${author} (@${username})\nׅ  ׄ  ✿ *Likes* » ${formatNumber(likes)}\nׅ  ׄ  ✿ *Duración* » ${durationFormatted}s\nׅ  ׄ  ✿ *Música* » ${musicTitle} - ${musicAuthor}\n\nׅ  ׄ  ✿ Made with love By *Ryuzei*`.trim();

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_video' });

            const videoBuffer = await getBuffer(videoUrl, 30000);

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_video' });

            const result = await sock.sendMessage(chat, { 
                video: videoBuffer, 
                caption,
                gifPlayback: false
            }, { quoted: m });

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

            return result;

        } catch (error: any) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message || String(error) });
            
            let errorMsg = '   ׄ  ✿  Ocurrió un error al procesar tu solicitud.';
            if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
                errorMsg = '   ׄ  ✿  El servidor tardó demasiado en responder. Intenta de nuevo.';
            } else if (error.response?.status === 429) {
                errorMsg = '   ׄ  ✿  Demasiadas solicitudes. Espera un momento e intenta de nuevo.';
            }
            
            return sock.sendMessage(chat, { 
                text: errorMsg
            }, { quoted: m });
        }
    }
};
