export default {
    command: ['cerrar', 'close'],
    description: 'Cierra el grupo inmediatamente o con temporizador',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, sock, args, msg }: any) => {
        const timeStr = args?.[0];
        const match = timeStr?.match(/^(\d+)(s|m|h)$/i);

        if (!match) {
            await sock.groupSettingUpdate(chat, 'announcement').catch(() => {});
            return msg.reply('✰ El grupo ha sido *cerrado*. Solo los administradores pueden enviar mensajes.');
        }

        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const delay = value * (unit === 's' ? 1000 : unit === 'm' ? 60000 : 3600000);

        msg.reply(`✰ El grupo se *cerrará* automáticamente en *${value}${unit}*.`);

        setTimeout(() => {
            sock.groupSettingUpdate(chat, 'announcement').catch(() => {});
        }, delay);
    }
};
