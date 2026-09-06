export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: async (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;

        const start = Date.now();
        const initialText = `✰ ¡Pong!\n> Tiempo ⴵ ...ms`;

        try {
            const sentMsg = await ctx.sock.sendMessage(jid, {
                text: initialText
            }, { quoted: ctx.m });

            const end = Date.now();
            const latency = end - start;
            const finalText = `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`;

            await ctx.sock.sendMessage(jid, {
                text: finalText,
                edit: sentMsg.key
            });

        } catch (error) {
            const end = Date.now();
            const latency = end - start;
            const finalText = `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`;
            
            try {
                const sentMsg = await ctx.sock.sendMessage(jid, {
                    text: initialText
                }, { quoted: ctx.m });
                
                await ctx.sock.sendMessage(jid, {
                    text: finalText,
                    edit: sentMsg.key
                });
            } catch (_) {}
        }
    }
};
