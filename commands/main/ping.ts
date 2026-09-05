export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'info',
    group: false,
    admin: false,
    owner: false,
    botAdmin: false,

    run: async (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat || ctx.from;
        if (!jid) return;

        const start = Date.now();

        const initMsg = await ctx.sock.sendMessage(jid, { 
            text: '⚡ Calculando...' 
        }, { 
            quoted: ctx.m 
        });

        const latency = Date.now() - start;

        if (initMsg?.key) {
            await ctx.sock.sendMessage(jid, {
                text: `🏓 *Pong!*\n\n⏱️ *Latencia:* \`${latency} ms\``,
                edit: initMsg.key
            });
        }
    }
};
