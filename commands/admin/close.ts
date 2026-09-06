export default {
    command: ['cerrar', 'close'],
    description: 'Cierra el grupo inmediatamente o con temporizador',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, args, msg }: any) => {
        const metadata = await sock.groupMetadata(chat).catch(() => null);
        
        if (metadata && metadata.announce) {
            return msg.reply('✰ El grupo ya está *cerrado*.');
        }

        const setGroupState = async (close: boolean) => {
            const action = close ? 'announcement' : 'not_announcement';
            if (typeof sock.groupSettingUpdate === 'function') {
                return sock.groupSettingUpdate(chat, action);
            }
            if (typeof sock.groupSettingsUpdate === 'function') {
                return sock.groupSettingsUpdate(chat, action);
            }
        };

        const timeStr = args?.[0];
        const match = timeStr?.match(/^(\d+)(s|m|h)$/i);

        if (!match) {
            await setGroupState(true).catch(() => {});
            return msg.reply('✰ El grupo ha sido *cerrado*. Solo los administradores pueden enviar mensajes.');
        }

        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const delay = value * (unit === 's' ? 1000 : unit === 'm' ? 60000 : 3600000);

        msg.reply(`✰ El grupo se *cerrará* automáticamente en *${value}${unit}*.`);

        setTimeout(() => {
            setGroupState(true).catch(() => {});
        }, delay);
    }
};
