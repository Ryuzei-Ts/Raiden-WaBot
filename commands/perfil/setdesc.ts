import { UserJid } from '#simple';
import { saveDB } from '#db';

export default {
    command: ['setdesc', 'setdescription', 'setbiografia'],
    description: 'Establece o elimina tu descripción de perfil',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const user = (global as any).db.data.users[realSender] || {};

            const q = args.join(' ').trim();

            if (!q) {
                if (user.description) {
                    user.description = '';
                    saveDB(chat, realSender);
                    return reply(`✐ Se ha eliminado tu descripción.`);
                }
                return reply(`✿ Debes ingresar el texto para tu descripción.\n> ✐ Ejemplo » *${usedPrefix}setdesc Hola, ¿Jugamos Roblox?*`);
            }

            if (q.length > 180) {
                return reply(`✰ La descripción es muy larga. Máximo *180* caracteres.`);
            }

            let userDesc = q.replace(/name/gi, m.pushName || 'Usuario');
            user.description = userDesc;
            saveDB(chat, realSender);

            return reply(`✐ Se ha establecido tu descripción.`);

        } catch (e) {
            console.error('Error en setdesc:', e);
            return reply(`✿ Ocurrió un error al actualizar la descripción.`);
        }
    }
};
