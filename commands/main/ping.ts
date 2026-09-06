import { performance } from 'perf_hooks';

const pingCache = new Map<string, number>();

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;

        const tStart = performance.now();

        ctx.sock.sendMessage(jid, { text: '✰ ¡Pong!\n> Tiempo ⴵ ..ms' }, { quoted: ctx.m }).then((sentMsg: any) => {
            if (!sentMsg?.key) return;

            const latency = (performance.now() - tStart).toFixed(2);
            pingCache.set(sentMsg.key.id, tStart);

            ctx.sock.sendMessage(jid, { 
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`, 
                edit: sentMsg.key 
            }).then(() => {
                pingCache.delete(sentMsg.key.id);
            }).catch(() => {
                pingCache.delete(sentMsg.key.id);
            });
        }).catch(() => {});
    }
};
