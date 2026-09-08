import { broadcast } from '#index';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: ({ chat, m, sock }: any) => {
        const start = performance.now();

        sock.sendMessage(chat, { 
            text: '✰ Calculando...', 
        }, { quoted: m }).then((sent: any) => {
            if (!sent?.key) return;
            
            const rawLatency = Math.round(performance.now() - start);
            const latency = Math.floor(rawLatency / 10) * 10;
            
            sock.sendMessage(chat, { 
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`,
                edit: sent.key 
            }).catch(() => {});
            
            queueMicrotask(() => {
                broadcast('ping_measured', {
                    chat,
                    latency: Number(latency),
                    rawLatency: Number(rawLatency),
                    timestamp: Date.now()
                });
            });
        }).catch(() => {});
    }
};
