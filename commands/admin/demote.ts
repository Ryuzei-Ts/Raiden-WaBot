const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

export default {
    command: ['demote', 'quitaradmin', 'degradar'],
    description: 'Quita el rango de administrador a un usuario',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, msg }: any) => {
        const target = m.quoted?.sender || (m.mentionedJid && m.mentionedJid[0]);
        if (!target) return msg.reply('✰ Etiqueta o responde al mensaje del usuario que deseas degradar.');

        const rawBotJid = sock.user?.id || sock.user?.jid || '';
        const botBase = normalizeNumber(rawBotJid);
        const targetBase = normalizeNumber(target);

        if (targetBase === botBase) {
            return msg.reply('✰ No puedes quitarle el administrador al bot.');
        }

        await sock.groupParticipantsUpdate(chat, [target], 'demote').catch(() => {});
        return msg.reply(`✰ Se le ha quitado el administrador a @${target.split('@')[0]}.`, { mentions: [target] });
    }
};
