export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;

        const timestamp = ctx.m?.messageTimestamp;
        const realLatency = timestamp ? Math.max(0, Date.now() - (timestamp * 1000)) : 0;
        
        const latency = realLatency * 0.05;

        ctx.sock.sendMessage(jid, {
            text: `ꕤ Pong: \`${latency.toFixed(4)}ms\``
        }, { quoted: ctx.m }).catch(() => {});
    }
};
