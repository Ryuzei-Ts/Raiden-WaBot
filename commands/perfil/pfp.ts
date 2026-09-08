import { UserJid } from '#simple';

export default {
    command: ['pfp', 'getpfp', 'foto', 'avatar'],
    description: 'Obtiene la foto de perfil de un usuario',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const q = args[0];
            
            let mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            let quotedSender = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.key?.sender;
            let participant = m.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetJid: string;
            
            if (mentionedJid && mentionedJid !== '') {
                targetJid = await UserJid(sock, chat, mentionedJid);
            } else if (quotedSender) {
                targetJid = await UserJid(sock, chat, quotedSender);
            } else if (participant) {
                targetJid = await UserJid(sock, chat, participant);
            } else if (q && q.trim() !== '' && !q.startsWith('@')) {
                const cleanNumber = q.replace(/[^0-9]/g, '');
                if (cleanNumber) {
                    targetJid = cleanNumber + '@s.whatsapp.net';
                } else {
                    targetJid = realSender;
                }
            } else {
                targetJid = realSender;
            }

            let imgUrl: string;
            try {
                imgUrl = await sock.profilePictureUrl(targetJid, 'image');
            } catch {
                return reply(`「 ꕤ 」 No se pudo obtener la foto de perfil del usuario.`);
            }

            await sock.sendMessage(chat, { 
                image: { url: imgUrl }
            }, { quoted: m });

        } catch (e) {
            console.error('Error en pfp:', e);
            return reply(`✿ Ocurrió un error al obtener la foto de perfil.`);
        }
    }
};
