export default {
    command: ['revoke', 'resetlink', 'resetearlink'],
    description: 'Revoca y genera un nuevo enlace de invitación del grupo',
    category: 'group',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock }: any) => {
        const reply = (txt: string) => {
            if (typeof m.reply === 'function') {
                return m.reply(txt);
            }
            return sock.sendMessage(chat, { text: txt }, { quoted: m });
        };

        try {
            await sock.groupRevokeInvite(chat);
            return reply(`✐ El enlace de invitación del grupo ha sido restablecido con éxito.`);
        } catch (e) {
            console.error('Error en revoke:', e);
            return reply(`✿ Ocurrió un error al revocar el enlace del grupo.`);
        }
    }
};
