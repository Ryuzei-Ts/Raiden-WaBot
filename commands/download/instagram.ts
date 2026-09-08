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
    command: ['instagram', 'ig', 'igdl'],
    description: 'Descarga contenido de Instagram',
    category: 'download',
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';
        const msgId = m?.id || m?.key?.id;

        try {
            const url = args.join(' ').trim();
            if (!url) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  Por favor, ingresa un enlace de Instagram.` 
                }, { quoted: m });
            }

            const instagramRegex = /(?:instagram\.com|instagr\.am|ig\.me)/i;
            if (!instagramRegex.test(url)) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  El enlace no parece ser de Instagram.` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'search_started', url });

            const endpoint = `https://api.delirius.online/download/instagram?url=${encodeURIComponent(url)}`;

            const res = await axios.get(endpoint, {
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            const data = res.data?.data;

            if (!res.data?.status || !data || !Array.isArray(data) || data.length === 0) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', url });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo obtener el contenido de Instagram. Verifica el enlace.` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_media' });

            const mediaResults = [];
            for (const item of data) {
                if (item?.url) {
                    try {
                        const buffer = await getBuffer(item.url, 30000);
                        mediaResults.push({
                            type: item.type || 'image',
                            buffer: buffer
                        });
                    } catch (err) {
                        continue;
                    }
                }
            }

            if (mediaResults.length === 0) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo descargar ningún archivo multimedia.` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_media' });

            let result;
            for (const media of mediaResults) {
                if (media.type === 'video') {
                    result = await sock.sendMessage(chat, { 
                        video: media.buffer,
                        gifPlayback: false
                    }, { quoted: m });
                } else {
                    result = await sock.sendMessage(chat, { 
                        image: media.buffer
                    }, { quoted: m });
                }
            }

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
