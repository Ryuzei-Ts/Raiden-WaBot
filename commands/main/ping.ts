export default {
    command: ['ping', 'p', 'ms'],
    description: 'Muestra la velocidad de respuesta del bot',
    category: 'main',
    run: async (ctx: any) => {
        const start = Date.now();

        const sent = await ctx.reply('*𝖢𝗈𝗆𝗉𝗋𝗈𝖻𝖺𝗇𝖽𝗈...*');
        const ms = Date.now() - start;

        if (sent?.key) {
            await ctx.edit(`⚡ *PONG:* \`${ms}ms\``, sent.key);
        }
    }
};
