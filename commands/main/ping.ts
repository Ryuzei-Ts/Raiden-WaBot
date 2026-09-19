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

            const latency = Math.max(1, Math.round(performance.now() - start));

            sock.sendMessage(chat, { 
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`,
                edit: sent.key 
            }).catch(() => {});

            queueMicrotask(() => {
                broadcast('ping_measured', {
                    chat,
                    latency,
                    rawLatency: latency,
                    timestamp: Date.now()
                });
            });
        }).catch(() => {});
    }
};
