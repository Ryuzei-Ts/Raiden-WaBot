import { broadcast } from '#index';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: async ({ chat, m, sock }: any) => {
        const start = performance.now();

        const sent = await sock.sendMessage(chat, { 
            text: '✰ Calculando...', 
        }, { quoted: m }).catch(() => null);

        if (!sent?.key) return;

        const latency = (performance.now() - start).toFixed(5);

        sock.sendMessage(chat, { 
            text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`,
            edit: sent.key 
        }).catch(() => {});

        queueMicrotask(() => {
            broadcast('ping_measured', {
                chat,
                latency: Number(latency),
                timestamp: Date.now()
            });
        });
    }
};
