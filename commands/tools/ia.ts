import axios from 'axios';
import config from '#config';

export default {
    command: ['ia', 'chat', 'bot', 'gpt'],
    description: 'Responde preguntas usando la API de Delirius',
    category: 'tools',
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';

        try {
            const text = args.join(' ').trim();
            if (!text) {
                return sock.sendMessage(chat, { 
                    text: `   ׄ  ✿  Por favor, ingresa una pregunta o mensaje para continuar.` 
                }, { quoted: m });
            }

            const systemPrompt = `Eres ${config.botName}, la Raiden Shogun e Inazuma de Genshin Impact, un bot creado por ${config.devName}. Eres elegante, serena y amable. Responde de forma corta, directa y sin usar ningún emoji.`;

            const endpoint = `https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(systemPrompt)}`;

            const res = await axios.get(endpoint, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            let responseText = res.data?.data || res.data?.result || res.data?.response || res.data?.data?.response;

            if (!responseText && typeof res.data === 'string') {
                responseText = res.data;
            }

            if (!responseText) {
                throw new Error('No se obtuvo respuesta de la API');
            }

            const cleanResponse = String(responseText)
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F6D0}-\u{1F6FF}\u{1F170}-\u{1F251}]/gu, '')
                .trim();

            return sock.sendMessage(chat, { text: cleanResponse }, { quoted: m });

        } catch (error: any) {
            return sock.sendMessage(chat, { 
                text: '   ׄ  ✿  Ocurrió un error al procesar tu solicitud.' 
            }, { quoted: m });
        }
    }
};
