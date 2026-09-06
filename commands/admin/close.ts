export default {
    command: ['cerrar', 'close'],
    description: 'Cierra el grupo (inmediato o con temporizador)',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, args, msg }: any) => {
        const metadata = await sock.groupMetadata(chat);
        const isClosed = metadata.announce === true;
        
        if (!args || args.length === 0) {
            if (isClosed) {
                return msg.reply('✰ El grupo ya estaba *cerrado*.');
            }
            await sock.groupSettingsUpdate(chat, { annouce: true });
            return msg.reply('✰ El grupo ha sido *cerrado*. Ahora solo los administradores pueden enviar mensajes.');
        }

        const timeStr = args[0];
        const timeRegex = /^(\d+)(s|m|h)$/;
        const match = timeStr.match(timeRegex);
        
        if (!match) {
            if (isClosed) {
                return msg.reply('✰ El grupo ya estaba *cerrado*.');
            }
            await sock.groupSettingsUpdate(chat, { annouce: true });
            return msg.reply('✰ El grupo ha sido *cerrado*. Ahora solo los administradores pueden enviar mensajes.');
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        if (isClosed) {
            return msg.reply('✰ El grupo ya estaba *cerrado*.');
        }

        await sock.groupSettingsUpdate(chat, { annouce: true });
        msg.reply(`✰ El grupo se *cerrará* en *${value}${unit}*`);
    }
};
