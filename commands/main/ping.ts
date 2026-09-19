export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: ({ chat, m, sock }: any) => {
        const start = performance.now();

        sock.sendMessage(chat, { 
            text: '✰ Calculando...' 
        }, { quoted: m }).then((sent: any) => {
            if (!sent?.key) return;

            const totalTime = performance.now() - start;
            const latency = Math.max(1, Math.round(totalTime * 0.2));

            sock.sendMessage(chat, { 
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`,
                edit: sent.key 
            }).catch(() => {});

            queueMicrotask(() => {
                broadcast('ping_measured', {
                    chat,
                    latency,
                    rawLatency: totalTime,
                    timestamp: Date.now()
                });
            });
        }).catch(() => {});
    }
};
