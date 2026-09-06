export default {
    command: ['promote', 'daradmin', 'promover'],
    description: 'Promueve a un usuario a administrador',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, msg }: any) => {
        const target = m.quoted?.sender || (m.mentionedJid && m.mentionedJid[0]);
        if (!target) return msg.reply('✰ Etiqueta o responde al mensaje del usuario que deseas promover a admin.');

        await sock.groupParticipantsUpdate(chat, [target], 'promote').catch(() => {});
        return msg.reply(`✰ El usuario @${target.split('@')[0]} ahora es *administrador*.`, { mentions: [target] });
    }
};
