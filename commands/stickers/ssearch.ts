import axios from 'axios';
import config from '#config';
import { writeExif } from '#sticker';
import fs from 'fs';
import { UserJid } from '#simple';

const usedPreviews = new Map<string, Set<string>>();

const getBuffer = async (url: string, timeoutMs = 20000): Promise<Buffer> => {
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
    category: 'stickers',
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';
        const msgId = m?.id || m?.key?.id;

        try {
            const realSender = await UserJid(sock, chat, sender);
            const userName = m.pushName || 'Usuario';

            const query = args.join(' ').trim();
            if (!query) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  ¿Qué sticker deseas buscar?\n\n✿ *Ejemplo:* ${p}stickers my melody` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'search_started', query });

            const endpoint = `https://api.delirius.online/search/stickerly?query=${encodeURIComponent(query)}`;

            let data;
            try {
                const res = await axios.get(endpoint, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                        'Accept': 'application/json'
                    }
                });
                data = res.data?.data;
            } catch (err: any) {
                console.error('Error en API:', err.message);
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se pudo conectar con el servidor. Intenta de nuevo.` 
                }, { quoted: m });
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', query });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se encontraron stickers para *${query}*.` 
                }, { quoted: m });
            }

            const cacheKey = `${realSender}_${query.toLowerCase()}`;
            if (!usedPreviews.has(cacheKey)) {
                usedPreviews.set(cacheKey, new Set<string>());
            }
            const usedSet = usedPreviews.get(cacheKey)!;

            let selectedPack: any = null;
            let index = 0;

            while (index < data.length) {
                const pack = data[index];
                if (pack?.preview && !pack.isAnimated && !usedSet.has(pack.preview)) {
                    selectedPack = pack;
                    usedSet.add(pack.preview);
                    break;
                }
                index++;
            }

            if (!selectedPack) {
                usedSet.clear();
                const fallbackPack = data.find((pack: any) => pack?.preview && !pack.isAnimated) || data.find((pack: any) => pack?.preview) || data[0];
                if (fallbackPack) {
                    selectedPack = fallbackPack;
                    usedSet.add(fallbackPack.preview);
                }
            }

            if (!selectedPack) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se encontraron stickers disponibles para *${query}*.` 
                }, { quoted: m });
            }

            const stickerName = selectedPack.name || 'Sin nombre';
            const authorName = userName;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_sticker' });

            let previewBuffer;
            try {
                previewBuffer = await getBuffer(selectedPack.preview, 15000);
            } catch (err: any) {
                console.error('Error descargando preview:', err.message);
                usedSet.delete(selectedPack.preview);
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  Error al descargar el sticker. Intenta de nuevo.` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'converting_sticker' });

            let stickerFile: string;
            try {
                stickerFile = await writeExif(
                    { data: previewBuffer, mimetype: 'image/png' },
                    { packname: stickerName, author: authorName, categories: ['🤩', '🎉'] }
                );
            } catch (convertError: any) {
                console.error('Error en conversión:', convertError);
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  Error al convertir el sticker. Intenta de nuevo.` 
                }, { quoted: m });
            }

            if (!fs.existsSync(stickerFile)) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  Error al crear el sticker. Intenta de nuevo.` 
                }, { quoted: m });
            }

            const stickerData = fs.readFileSync(stickerFile);

            try {
                fs.unlinkSync(stickerFile);
            } catch {}

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_sticker' });

            const result = await sock.sendMessage(chat, { 
                sticker: stickerData
            }, { quoted: m });

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

            return result;

        } catch (error: any) {
            console.error('Error completo:', error);
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message || String(error) });
            
            return sock.sendMessage(chat, { 
                text: `   ׄ  ✿  Ocurrió un error al procesar tu solicitud.`
            }, { quoted: m });
        }
    }
};
