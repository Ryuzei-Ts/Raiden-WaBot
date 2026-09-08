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
    command: ['spotify', 'sp', 'spotifydl'],
    description: 'Descarga música de Spotify',
    category: 'download',
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';
        const msgId = m?.id || m?.key?.id;

        try {
            const url = args.join(' ').trim();
            if (!url) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  Por favor, ingresa un enlace de Spotify.` 
                }, { quoted: m });
            }

            const spotifyRegex = /(?:spotify\.com|open\.spotify\.com)/i;
            if (!spotifyRegex.test(url)) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  El enlace no parece ser de Spotify.` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'search_started', url });

            const endpoint = `https://api.delirius.online/download/spotifydl?url=${encodeURIComponent(url)}`;

            const res = await axios.get(endpoint, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            const data = res.data?.data;

            if (!res.data?.status || !data || !data.download) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', url });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo obtener la canción de Spotify. Verifica el enlace.` 
                }, { quoted: m });
            }

            const title = data.title || 'Sin título';
            const author = data.author || 'Desconocido';
            const imageUrl = data.image;
            const audioUrl = data.download;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_media' });

            let imageBuffer = null;
            if (imageUrl) {
                try {
                    imageBuffer = await getBuffer(imageUrl, 15000);
                } catch (err) {
                    // Si falla la imagen, continuamos sin ella
                }
            }

            const audioBuffer = await getBuffer(audioUrl, 60000);

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_media' });

            const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Artista* » ${author}\n\nׅ  ׄ  ✿ Made with love By *Ryuzei*`.trim();

            if (imageBuffer) {
                await sock.sendMessage(chat, { 
                    image: imageBuffer,
                    caption: caption
                }, { quoted: m });
            } else {
                await sock.sendMessage(chat, { 
                    text: caption
                }, { quoted: m });
            }

            const result = await sock.sendMessage(chat, { 
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false
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
