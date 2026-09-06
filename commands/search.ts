import axios from 'axios';
import { LRUCache } from 'lru-cache';
import config from '#config';

const usedImagesCache = new LRUCache<string, Set<string>>({ max: 100, ttl: 3600000 });

const getBuffer = async (url: string, timeoutMs = 15000): Promise<Buffer> => {
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
    command: ['pinterest', 'pin'],
    description: 'Busca e imágen de Pinterest',
    category: 'search',
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';
        const msgId = m?.id || m?.key?.id;

        try {
            const query = args.join(' ').trim();
            if (!query) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  Por favor, ingresa un término de búsqueda.\n\n> *Ejemplo:* ${p}pinterest Twice` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'search_started', query });

            const endpoint = `https://api.delirius.online/search/pinterestv2?text=${encodeURIComponent(query)}`;

            const res = await axios.get(endpoint, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            const results = res.data?.data;

            if (!res.data?.status || !Array.isArray(results) || results.length === 0) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', query });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se encontraron resultados en Pinterest para *${query}*.` 
                }, { quoted: m });
            }

            const cacheKey = query.toLowerCase();
            if (!usedImagesCache.has(cacheKey)) {
                usedImagesCache.set(cacheKey, new Set<string>());
            }
            const usedSet = usedImagesCache.get(cacheKey)!;

            let availableResults = results.filter((item: any) => item?.image && !usedSet.has(item.image));

            if (availableResults.length === 0) {
                usedSet.clear();
                availableResults = results.filter((item: any) => item?.image);
            }

            const selected = availableResults[Math.floor(Math.random() * availableResults.length)];
            usedSet.add(selected.image);

            const title = (selected.title && selected.title !== '-' && selected.title !== '✿') ? selected.title.trim() : query;
            const author = selected.name || selected.username || 'Desconocido';
            const likes = selected.likes ?? 0;
            const pinUrl = `https://pinterest.com/pin/${selected.id}`;

            const caption = `﹒𝜗ৎ      ࣪  *${title}*\n\nׅ  ׄ  ✿ *Autor* » ${author}\nׅ  ׄ  ✿ *Likes* » ${likes}\nׅ  ׄ  ✿ *Link* » ${pinUrl}\n\nׅ  ׄ  ✿ *¡Enviando imagen, por favor espera!*`.trim();

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_image' });

            const imageBuffer = await getBuffer(selected.image);

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_image' });

            const result = await sock.sendMessage(chat, { 
                image: imageBuffer, 
                caption 
            }, { quoted: m });

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

            return result;

        } catch (error: any) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message || String(error) });
            return sock.sendMessage(chat, { 
                text: '   ׄ  ✿  Ocurrió un error al procesar tu solicitud.' 
            }, { quoted: m });
        }
    }
};
