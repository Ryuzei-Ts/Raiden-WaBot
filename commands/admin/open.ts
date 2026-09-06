export default {
    command: ['abrir', 'open'],
    description: 'Abre el grupo inmediatamente o con temporizador',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, sock, args, msg }: any) => {
        const groupMetadata = await sock.groupMetadata(chat).catch(() => null);

        if (groupMetadata && !groupMetadata.announce) {
            return msg.reply('✰ El grupo *ya se encuentra abierto*.');
        }

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

        setTimeout(async () => {
            const currentMeta = await sock.groupMetadata(chat).catch(() => null);
            if (currentMeta?.announce) {
                await sock.groupSettingUpdate(chat, 'not_announcement').catch(() => {});
                await msg.reply('✰ El temporizador ha finalizado. El grupo ha sido *abierto*.');
            }
        }, delay);
    }
};
