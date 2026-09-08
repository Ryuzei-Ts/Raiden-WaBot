import axios from 'axios';
import config from '#config';

export default {
    command: ['lyrics', 'letra', 'lyric'],
    description: 'Busca la letra de una canción',
    category: 'download',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';
        const msgId = m?.id || m?.key?.id;

        try {
            const query = args.join(' ').trim();
            if (!query) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  Por favor, ingresa el nombre de una canción.` 
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'search_started', query });

            const endpoint = `https://api.delirius.online/search/lyrics?query=${encodeURIComponent(query)}`;

            const res = await axios.get(endpoint, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            const data = res.data?.data;

            if (!res.data?.status || !data || !data.lyrics) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', query });
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  No se encontraron letras para *${query}*.` 
                }, { quoted: m });
            }

            const lyrics = data.lyrics || 'Sin letra disponible';

            const caption = `﹒𝜗ৎ      ࣪  *${data.title || 'Sin título'}*\n\n\`\`\`${lyrics}\`\`\`\n\nׅ  ׄ  ✿ Made with love By *Ryuzei*`.trim();

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_lyrics' });

            const result = await sock.sendMessage(chat, { 
                text: caption
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
