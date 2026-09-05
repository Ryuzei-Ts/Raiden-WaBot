export default {
    command: ['ping', 'p', 'ms'],
    description: 'Muestra la velocidad de respuesta del bot',
    category: 'main',
    run: (ctx: any) => {
        const start = Date.now();
        ctx.reply('⏳').then((statusMsg: any) => {
            const latency = Date.now() - start;
            if (statusMsg?.key && ctx.sock?.sendMessage) {
                ctx.sock.sendMessage(ctx.chat, {
                    text: `⚡ ${latency}ms`,
                    edit: statusMsg.key
                });
            } else {
                ctx.reply(`⚡ ${latency}ms`);
            }
        });
    }
};
