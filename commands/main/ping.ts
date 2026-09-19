export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: async ({ chat, m, sock }: any) => {
        const start = performance.now();

        try {
            const sent = await sock.sendMessage(chat, { text: '✰ Calculando...' }, { quoted: m });
            if (!sent?.key) return;

            const executionTime = Math.round(performance.now() - start);
            const latency = Math.min(Math.max(Math.floor(executionTime / 10), 2), 999);

            await sock.sendMessage(chat, { 
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`,
                edit: sent.key 
            });

            queueMicrotask(() => {
                broadcast('ping_measured', {
                    chat,
                    latency,
                    rawLatency: executionTime,
                    timestamp: Date.now()
                });
            });
        } catch {}
    }
};
