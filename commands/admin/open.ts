export default {
    command: ['abrir', 'open'],
    description: 'Abre el grupo inmediatamente o con temporizador',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, sock, args, msg }: any) => {
        const timeStr = args?.[0];
        const match = timeStr?.match(/^(\d+)(s|m|h)$/i);

        if (!match) {
            await sock.groupSettingUpdate(chat, 'not_announcement').catch(() => {});
            return msg.reply('✰ El grupo ha sido *abierto*. Todos los participantes pueden enviar mensajes.');
        }

        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const delay = value * (unit === 's' ? 1000 : unit === 'm' ? 60000 : 3600000);

        msg.reply(`✰ El grupo se *abrirá* automáticamente en *${value}${unit}*.`);

        setTimeout(() => {
            sock.groupSettingUpdate(chat, 'not_announcement').catch(() => {});
        }, delay);
    }
};
