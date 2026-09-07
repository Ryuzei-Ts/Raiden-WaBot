import axios from 'axios';
import config from '#config';

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

interface LogoOptions {
    command: string | string[];
    description: string;
    effectUrl: string;
}

export default function maker(options: LogoOptions) {
    const cmdList = Array.isArray(options.command) ? options.command : [options.command];
    const primaryCmd = cmdList[0];

    return {
        command: cmdList,
        description: options.description,
        category: 'logo',
        group: true,
        run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
            const p = usedPrefix || prefix || config.prefix || '.';
            const msgId = m?.id || m?.key?.id;

            try {
                const text = args.join(' ').trim();
                if (!text) {
                    return sock.sendMessage(chat, { 
                        text: `    ׄ  ✿  Por favor, ingresa un texto para crear el logo.\n\n> *Ejemplo:* ${p}${primaryCmd} Ryuzei` 
                    }, { quoted: m });
                }

                global.broadcast?.('cmd_progress', { id: msgId, step: 'generating_logo', text });

                const endpoint = `https://api.delirius.online/tools/ephoto?effect=${encodeURIComponent(options.effectUrl)}&text=${encodeURIComponent(text)}`;

                const res = await axios.get(endpoint, {
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                        'Accept': 'application/json'
                    }
                });

                const imageUrl = res.data?.data?.image || res.data?.data?.url || res.data?.image || res.data?.url;

                if (!res.data?.status || !imageUrl || typeof imageUrl !== 'string') {
                    throw new Error('No se pudo generar el logo con el texto proporcionado');
                }

                global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_image' });

                const imageBuffer = await getBuffer(imageUrl);

                global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_image' });

                const caption = `  ׄ  ✿ *¡Logo generado con éxito!*`.trim();

                const result = await sock.sendMessage(chat, { 
                    image: imageBuffer, 
                    caption 
                }, { quoted: m });

                global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

                return result;

            } catch (error: any) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message || String(error) });
                return sock.sendMessage(chat, { 
                    text: '    ׄ  ✿  Ocurrió un error al generar el logo.' 
                }, { quoted: m });
            }
        }
    };
}
