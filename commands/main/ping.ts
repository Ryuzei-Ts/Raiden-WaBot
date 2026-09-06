import { performance } from 'perf_hooks';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;

        const start = performance.now();

        ctx.sock.sendMessage(jid, { text: '✰ ¡Pong!\n> Tiempo ⴵ ...ms' }, { quoted: ctx.m })
            .then((sentMsg: any) => {
                if (sentMsg?.key) {
                    const latency = (performance.now() - start).toFixed(2);
                    ctx.sock.sendMessage(jid, { text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`, edit: sentMsg.key });
                }
            })
            .catch(() => {});
    }
};
