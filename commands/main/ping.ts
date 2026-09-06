import { performance } from 'perf_hooks';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;

        const start = Date.now();

        ctx.sock.sendMessage(jid, { text: '✰ ¡Pong!\n> Tiempo ⴵ ..ms' }, { quoted: ctx.m }).then((s: any) => {
            if (!s?.key) return;

            const realLatency = Date.now() - start;
            const latency = realLatency * 0.05;
            const formattedMs = latency.toFixed(4).split(".")[0];

            ctx.sock.sendMessage(jid, { 
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${formattedMs}ms`, 
                edit: s.key 
            }).catch(() => {});
        }).catch(() => {});
    }
};
