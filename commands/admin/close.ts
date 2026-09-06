export default {
    command: ['cerrar', 'close'],
    description: 'Cierra el grupo inmediatamente o con temporizador',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, args, msg }: any) => {
        const metadata = await sock.groupMetadata(chat).catch(() => null);
        if (!metadata) return;

        if (metadata.announce) {
            return msg.reply('✰ El grupo ya está *cerrado*.');
        }

        const timeStr = args?.[0];
        const match = timeStr?.match(/^(\d+)(s|m|h)$/i);

        if (!match) {
            await sock.groupSettingsUpdate(chat, 'announcement');
            return msg.reply('✰ El grupo ha sido *cerrado*. Solo los administradores pueden enviar mensajes.');
        }

        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const multiplier = unit === 's' ? 1000 : unit === 'm' ? 60000 : 3600000;
        const delay = value * multiplier;

        msg.reply(`✰ El grupo se *cerrará* automáticamente en *${value}${unit}*.`);

        setTimeout(() => {
            sock.groupSettingsUpdate(chat, 'announcement').catch(() => {});
        }, delay);
    }
};
