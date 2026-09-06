import { broadcast } from '#index';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: async ({ chat, m, sock }: any) => {
        const start = performance.now();

        const s = await sock.sendMessage(chat, { 
            text: '✰ ¡Pong!\n> Tiempo ⴵ ..ms' 
        }, { quoted: m }).catch(() => null);

        if (!s?.key) return;

        const latency = (performance.now() - start).toFixed(2);

        sock.sendMessage(chat, { 
            text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`, 
            edit: s.key 
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
