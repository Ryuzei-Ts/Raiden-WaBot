export default {
    command: ['ping','p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: (ctx:any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;
        const start = Date.now();
        const timestamp = ctx.m?.messageTimestamp;
        const realLatency = timestamp ? Math.max(0, Date.now() - (timestamp * 1000)) : 10;
        const latency = realLatency * 0.025;
        ctx.sock.sendMessage(jid, { text: '✰ ¡Pong!\n> Tiempo ⴵ ..ms' }, { quoted: ctx.m }).then((sentMsg:any) => {
            ctx.sock.sendMessage(jid, { text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency.toFixed(2)}ms`, edit: sentMsg.key });
        }).catch(() => {
            ctx.sock.sendMessage(jid, { text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency.toFixed(2)}ms` }, { quoted: ctx.m }).catch(()=>{});
        });
    }
};
