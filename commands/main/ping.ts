import { broadcast } from '#index';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: async ({ chat, m, sock }: any) => {
        const start = performance.now();

        sock.sendMessage(chat, { 
            text: '✰ Calculando...', 
        }, { quoted: m }).then((sent: any) => {
            const latency = performance.now() - start;
            
            sock.sendMessage(chat, { 
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency.toFixed(2)}ms`,
                edit: sent.key 
            }).catch(() => {});
            
            queueMicrotask(() => {
                broadcast('ping_measured', {
                    chat,
                    latency: Number(latency.toFixed(2)),
                    timestamp: Date.now()
                });
            });
        }).catch(() => {});
    }
};
