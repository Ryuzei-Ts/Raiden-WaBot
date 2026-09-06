export default {
    command: ['promote', 'daradmin', 'promover'],
    description: 'Promueve a un usuario a administrador',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, msg, args }: any) => {
        const q = args[0];
        let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     m.mentionedJid?.[0] ||
                     msg.message?.extendedTextMessage?.contextInfo?.participant || 
                     m.quoted?.sender ||
                     (q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);

        if (!target || target === '@s.whatsapp.net') {
            return msg.reply('✰ Etiqueta o responde al mensaje del usuario que deseas promover a admin.');
        }

        await sock.groupParticipantsUpdate(chat, [target], 'promote').catch(() => {});
        return sock.sendMessage(chat, { 
            text: `✰ El usuario @${target.split('@')[0]} ahora es *administrador*.`, 
            mentions: [target] 
        }, { quoted: m });
    }
};
