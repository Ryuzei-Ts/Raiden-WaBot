import { UserJid } from '#simple';
import { saveDB } from '#db';

export default {
    command: ['setmeta'],
    category: 'stickers',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const user = (global as any).db.data.users[realSender] || {};

            const q = args.join(' ').trim();

            if (!q) {
                return await reply(`✿ Formatos válidos:\n> *${usedPrefix}setmeta | Autor*\n> *${usedPrefix}setmeta Pack*\n> *${usedPrefix}setmeta Pack | Autor*`);
            }

            if (q.startsWith('|') || q.startsWith('/') || q.startsWith('\\') || q.startsWith('•')) {
                const author = q.slice(1).trim();
                if (author) {
                    user.sPack = '';
                    user.sAuthor = author;
                    saveDB();
                    return await reply(`✐ Se actualizó el autor por defecto para tus stickers: *${author}*`);
                }
                return await reply(`✿ Debes escribir un autor.`);
            }

            if (q.includes('|') || q.includes('/') || q.includes('\\') || q.includes('•')) {
                const parts = q.split(/[|/\\•]/).map(p => p.trim());
                const pack = parts[0] || '';
                const author = parts[1] || '';
                
                if (pack && author) {
                    user.sPack = pack;
                    user.sAuthor = author;
                } else if (pack && !author) {
                    user.sPack = pack;
                    user.sAuthor = '';
                } else if (!pack && author) {
                    user.sPack = '';
                    user.sAuthor = author;
                }
                
                saveDB();
                
                if (pack && author) {
                    return await reply(`✐ Se actualizó el pack y autor por defecto para tus stickers.\n✿ Pack: *${pack}*\n✿ Autor: *${author}*`);
                } else if (pack) {
                    return await reply(`✐ Se actualizó el pack por defecto para tus stickers: *${pack}*`);
                } else if (author) {
                    return await reply(`✐ Se actualizó el autor por defecto para tus stickers: *${author}*`);
                }
            }

            user.sPack = q;
            user.sAuthor = '';
            saveDB();
            return await reply(`✐ Se actualizó el pack por defecto para tus stickers: *${user.sPack}*`);

        } catch (e) {
            console.error('Error en setmeta:', e);
            return reply(`✿ Ocurrió un error al actualizar los metadatos.`);
        }
    }
};
