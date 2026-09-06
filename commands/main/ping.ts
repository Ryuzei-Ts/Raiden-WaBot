export default {
    command: ['ping','p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: async (ctx:any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;
        const start = Date.now();
        try {
            const sentMsg = await ctx.sock.sendMessage(jid, { text: '✰ ¡Pong!\n> Tiempo ⴵ ...ms' }, { quoted: ctx.m });
            const latency = Date.now() - start;
            await ctx.sock.sendMessage(jid, { text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`, edit: sentMsg.key });
        } catch (_) {
            const latency = Date.now() - start;
            await ctx.sock.sendMessage(jid, { text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms` }, { quoted: ctx.m }).catch(()=>{});
        }
    }
};
