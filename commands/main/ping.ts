export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'info',
    group: false,
    admin: false,
    owner: false,
    botAdmin: false,

    run: async (ctx: any) => {
        const start = Date.now();

        const initMsg = await ctx.sock.sendMessage(ctx.chat, { 
            text: '⚡ Calculando...' 
        }, { 
            quoted: ctx.m 
        });

        const latency = Date.now() - start;

        if (typeof ctx.edit === 'function' && initMsg?.key) {
            await ctx.edit(`🏓 *Pong!*\n\n⏱️ *Latencia:* \`${latency} ms\``, initMsg.key);
        } else {
            await ctx.sock.sendMessage(ctx.chat, {
                text: `🏓 *Pong!*\n\n⏱️ *Latencia:* \`${latency} ms\``,
                edit: initMsg?.key
            });
        }
    }
};
