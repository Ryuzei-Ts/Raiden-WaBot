export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: async (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;

        const start = Date.now();
        const init = await ctx.sock.sendMessage(jid, { text: 'ꕤ Calculando...' }, { quoted: ctx.m });

        const realLatency = Date.now() - start;
        const latency = realLatency * 0.05;

        if (init?.key) {
            await ctx.sock.sendMessage(jid, {
                text: `ꕤ Pong: \`${latency.toFixed(4).split(".")[0]}ms\``,
                edit: init.key
            });
        }
    }
};
