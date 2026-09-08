import axios from 'axios';
import config from '#config';
import { imageToWebp, videoToWebp, writeExif } from '#sticker';
import fs from 'fs';

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
    command: ['ssearch', 'stickerly', 'stickers'],
    description: 'Busca stickers en Sticker.ly',
    category: 'download',
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';
        const msgId = m?.id || m?.key?.id;

        try {
            const query = args.join(' ').trim();
            if (!query) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  ¿Qué sticker deseas buscar?\n\n✿ *Ejemplo:* ${p}stickers my melody` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'search_started', query });

            const endpoint = `https://api.delirius.online/search/stickerly?query=${encodeURIComponent(query)}`;

            const res = await axios.get(endpoint, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            const data = res.data?.data;

            if (!res.data?.status || !data || !Array.isArray(data) || data.length === 0) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', query });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se encontraron stickers para *${query}*.` 
                }, { quoted: m });
            }

            const usedIndexes = new Set<number>();
            let selectedPack: any = null;
            let attempts = 0;
            const maxAttempts = Math.min(data.length, 5);

            while (attempts < maxAttempts) {
                const randomIndex = Math.floor(Math.random() * data.length);
                if (!usedIndexes.has(randomIndex)) {
                    usedIndexes.add(randomIndex);
                    const pack = data[randomIndex];
                    if (pack?.preview) {
                        selectedPack = pack;
                        break;
                    }
                }
                attempts++;
            }

            if (!selectedPack) {
                selectedPack = data.find((pack: any) => pack?.preview) || data[0];
            }

            const stickerName = selectedPack.name || 'Sin nombre';
            const authorName = 'Raiden WaBot 🍰';
            const isAnimated = selectedPack.isAnimated || false;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_sticker' });

            const previewBuffer = await getBuffer(selectedPack.preview, 15000);

            global.broadcast?.('cmd_progress', { id: msgId, step: 'converting_sticker' });

            let webpBuffer: Buffer;
            let stickerFile: string;

            try {
                if (isAnimated) {
                    webpBuffer = await videoToWebp(previewBuffer);
                } else {
                    webpBuffer = await imageToWebp(previewBuffer);
                }

                stickerFile = await writeExif(
                    { data: webpBuffer, mimetype: 'image/webp' },
                    { packname: stickerName, author: authorName, categories: ['🤩', '🎉'] }
                );

                // Verificar que el archivo existe
                if (!fs.existsSync(stickerFile)) {
                    throw new Error('El archivo de sticker no se creó correctamente');
                }

                const stickerData = await getBuffer(stickerFile);

                // Limpiar archivo temporal
                try {
                    fs.unlinkSync(stickerFile);
                } catch {}

                global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_sticker' });

                const result = await sock.sendMessage(chat, { 
                    sticker: stickerData,
                    contextInfo: {
                        externalAdReply: {
                            title: stickerName,
                            body: `By ${authorName}`,
                            thumbnail: stickerData,
                            sourceUrl: selectedPack.url || 'https://sticker.ly/',
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m });

                global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

                return result;

            } catch (convertError: any) {
                console.error('Error en conversión:', convertError);
                throw new Error(`Error al convertir sticker: ${convertError.message}`);
            }

        } catch (error: any) {
            console.error('Error completo:', error);
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message || String(error) });
            
            let errorMsg = '   ׄ  ✿  Ocurrió un error al procesar tu solicitud.';
            if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
                errorMsg = '   ׄ  ✿  El servidor tardó demasiado en responder. Intenta de nuevo.';
            } else if (error.response?.status === 429) {
                errorMsg = '   ׄ  ✿  Demasiadas solicitudes. Espera un momento e intenta de nuevo.';
            } else if (error.message?.includes('ffmpeg') || error.message?.includes('libwebp')) {
                errorMsg = '   ׄ  ✿  Error al procesar el sticker. Asegúrate de tener ffmpeg instalado.';
            }
            
            return sock.sendMessage(chat, { 
                text: errorMsg
            }, { quoted: m });
        }
    }
};
