export default {
    command: ['ping', 'p', 'ms'],
    description: 'Muestra la velocidad de respuesta del bot',
    category: 'main',
    run: (ctx: any) => {
        const start = Date.now();

        ctx.reply('*𝖢𝗈𝗆𝗉𝗋𝗈𝖻𝖺𝗇𝖽𝗈...*').then((sent: any) => {
            const ms = Date.now() - start;
            if (sent?.key) {
                ctx.edit(`⚡ *PONG:* \`${ms}ms\``, sent.key);
            }
        }).catch(() => {});
    }
};
