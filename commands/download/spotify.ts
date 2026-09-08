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
    group: true,
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

            const infoEndpoint = `https://api.delirius.online/download/spotifyinfo?url=${encodeURIComponent(url)}`;
            const infoRes = await axios.get(infoEndpoint, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            const infoData = infoRes.data?.data;

            if (!infoRes.data?.status || !infoData) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo obtener información de la canción.` 
                }, { quoted: m });
            }

            const downloadEndpoint = `https://api.delirius.online/download/spotifydl?url=${encodeURIComponent(url)}`;
            const downloadRes = await axios.get(downloadEndpoint, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            const downloadData = downloadRes.data?.data;

            if (!downloadRes.data?.status || !downloadData?.download) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo descargar el audio.` 
                }, { quoted: m });
            }

            const title = infoData.title || 'Sin título';
            const artist = infoData.artist || 'Desconocido';
            const album = infoData.album || 'Desconocido';
            const duration = infoData.duration || '0:00';
            const publish = infoData.publish || 'Fecha desconocida';
            const popularity = infoData.popularity || '';
            const imageUrl = infoData.image;
            const audioUrl = downloadData.download;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_media' });

            let imageBuffer = null;
            if (imageUrl) {
                try {
                    imageBuffer = await getBuffer(imageUrl, 15000);
                } catch (err) {}
            }

            const audioBuffer = await getBuffer(audioUrl, 60000);

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_media' });

            let caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Artista* » ${artist}\nׅ  ׄ  ✿ *Álbum* » ${album}\nׅ  ׄ  ✿ *Duración* » ${duration}\nׅ  ׄ  ✿ *Publicado* » ${publish}`;

            if (popularity && popularity !== 'undefined %' && popularity !== 'undefined') {
                caption += `\nׅ  ׄ  ✿ *Popularidad* » ${popularity}`;
            }

            caption += `\n\nׅ  ׄ  ✿ Made with love By *Ryuzei*`;
            caption = caption.trim();

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
