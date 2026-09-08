import { UserJid } from '#simple';
import { saveDB } from '#db';

export default {
    command: ['delmeta'],
    description: 'Elimina los metadatos guardados de stickers',
    category: 'stickers',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const user = (global as any).db.data.users[realSender] || {};

            if (!user.sPack && !user.sAuthor) {
                return await reply(`✿ No tienes metadatos guardados.`);
            }

            user.sPack = '';
            user.sAuthor = '';
            saveDB();
            return await reply(`✐ Se eliminaron todos los metadatos.`);

        } catch (e) {
            console.error('Error en delmeta:', e);
            return reply(`✿ Ocurrió un error al eliminar los metadatos.`);
        }
    }
};
