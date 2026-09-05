export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'info',
    group: true,
    run: async ({ sock, chat, m, edit }) => {
        const start = Date.now();

        const initMsg = await sock.sendMessage(chat, { 
            text: '⚡ Calculando...' 
        }, { 
            quoted: m 
        });

        const latency = Date.now() - start;

        await edit(`🏓 *Pong!*\n\n⏱️ *Latencia:* \`${latency} ms\``, initMsg.key);
    }
};
