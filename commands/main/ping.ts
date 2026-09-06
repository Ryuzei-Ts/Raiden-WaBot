import { broadcast } from '#index';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: async ({ chat, m, sock }: any) => {
        const start = Date.now();
        const msgTime = m.messageTimestamp ? Number(m.messageTimestamp) * 1000 : start;
        const speedMs = Math.max(0, start - msgTime);

        const sent = await sock.sendMessage(chat, { 
            text: `✰ ¡Pong!\n> Tiempo ⴵ ${speedMs} ms` 
        }, { quoted: m }).catch(() => null);

        queueMicrotask(() => {
            broadcast('ping_measured', {
                chat,
                speedMs,
                executionMs: Date.now() - start,
                timestamp: Date.now()
            });
        });

        return sent;
    }
};
