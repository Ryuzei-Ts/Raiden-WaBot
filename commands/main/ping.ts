export default {
    command: ['ping', 'p', 'ms'],
    description: 'Muestra la velocidad de respuesta del bot',
    category: 'main',
    run: (ctx: any) => {
        const start = Date.now();
        const latency = Date.now() - start;
        ctx.reply(`⚡ ${latency}ms`);
    }
};
