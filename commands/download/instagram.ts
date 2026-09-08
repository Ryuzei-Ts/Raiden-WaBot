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

const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const getInstagramData = async (url: string) => {
    try {
        const endpoint = `https://api.delirius.online/download/instagramv2?url=${encodeURIComponent(url)}`;
        const res = await axios.get(endpoint, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json'
            }
        });
        
        if (res.data?.status && res.data?.data) {
            return { success: true, data: res.data.data, source: 'v2' };
        }
        return { success: false };
    } catch {
        return { success: false };
    }
};

const getInstagramDataFallback = async (url: string) => {
    try {
        const endpoint = `https://api.delirius.online/download/instagram?url=${encodeURIComponent(url)}`;
        const res = await axios.get(endpoint, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json'
            }
        });
        
        if (res.data?.status && res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
            return { success: true, data: res.data.data, source: 'v1' };
        }
        return { success: false };
    } catch {
        return { success: false };
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

            let result = await getInstagramData(url);
            let isV2 = result.success;
            
            if (!result.success) {
                result = await getInstagramDataFallback(url);
            }

            if (!result.success) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', url });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo obtener el contenido de Instagram. Verifica el enlace.` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_media' });

            let mediaItems = [];
            let title = '';
            let username = '';
            let fullname = '';
            let likes = 0;
            let comments = 0;

            if (isV2) {
                const data = result.data;
                username = data.username || 'Desconocido';
                fullname = data.fullname || 'Desconocido';
                likes = data.likes || 0;
                comments = data.comments || 0;
                title = data.caption ? data.caption.trim() : 'Sin título';
                
                if (data.download && Array.isArray(data.download)) {
                    for (const item of data.download) {
                        if (item?.url) {
                            try {
                                const buffer = await getBuffer(item.url, 30000);
                                mediaItems.push({
                                    type: item.type || 'image',
                                    buffer: buffer
                                });
                            } catch (err) {
                                continue;
                            }
                        }
                    }
                }
            } else {
                const data = result.data;
                if (Array.isArray(data)) {
                    for (const item of data) {
                        if (item?.url) {
                            try {
                                const buffer = await getBuffer(item.url, 30000);
                                mediaItems.push({
                                    type: item.type || 'image',
                                    buffer: buffer
                                });
                            } catch (err) {
                                continue;
                            }
                        }
                    }
                }
            }

            if (mediaItems.length === 0) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo descargar ningún archivo multimedia.` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_media' });

            let captionText = '';
            if (isV2) {
                const titlePreview = title.length > 200 ? title.substring(0, 200) + '...' : title;
                captionText = `﹒𝜗ৎ      ࣪  *${titlePreview}*\n\nׅ  ׄ  ✿ *Usuario* » ${fullname} (@${username})\nׅ  ׄ  ✿ *Likes* » ${formatNumber(likes)}\nׅ  ׄ  ✿ *Comentarios* » ${formatNumber(comments)}\n\nׅ  ׄ  ✿ Made with love By *Ryuzei*`.trim();
            }

            let lastResult;
            for (const media of mediaItems) {
                if (media.type === 'video') {
                    lastResult = await sock.sendMessage(chat, { 
                        video: media.buffer,
                        caption: captionText || undefined,
                        gifPlayback: false
                    }, { quoted: m });
                } else {
                    lastResult = await sock.sendMessage(chat, { 
                        image: media.buffer,
                        caption: captionText || undefined
                    }, { quoted: m });
                }
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

            return lastResult;

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
