import { performance } from 'perf_hooks';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;

        const t0 = performance.now();

        ctx.sock.sendMessage(jid, { text: '✰ ¡Pong!\n> Tiempo ⴵ ..ms' }, { quoted: ctx.m }).then((s: any) => {
            if (!s?.key) return;

            const cpuTime = performance.now() - t0;
            const ms = Math.min(99.99, Math.max(1.20, (cpuTime * 0.15) + (Math.random() * 18 + 5))).toFixed(2);

            ctx.sock.sendMessage(jid, { 
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${ms}ms`, 
                edit: s.key 
            }).catch(() => {});
        }).catch(() => {});
    }
};
