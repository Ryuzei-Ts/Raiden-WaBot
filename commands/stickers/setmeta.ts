import { UserJid } from '#simple';

export default {
    command: ['setmeta'],
    category: 'stickers',
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const user = (global as any).db.data.users[realSender] || {};

            const q = args.join(' ');

            if (!q) {
                return await reply(`✿ Formatos válidos:\n> *${usedPrefix}setmeta | Autor*\n> *${usedPrefix}setmeta Pack*\n> *${usedPrefix}setmeta Pack | Autor*`);
            }

            if (q.startsWith('|') || q.startsWith('/') || q.startsWith('\\') || q.startsWith('•')) {
                const author = q.slice(1).trim();
                user.sAuthor = author;
                (global as any).saveDB();
                return await reply(`✐ Se actualizó el autor por defecto para tus stickers: *${author}*`);
            }

            if (q.includes('|') || q.includes('/') || q.includes('\\') || q.includes('•')) {
                const parts = q.split(/[|/\\•]/);
                user.sPack = parts[0]?.trim();
                user.sAuthor = parts[1]?.trim();
                (global as any).saveDB();
                return await reply(`✐ Se actualizó el pack y autor por defecto para tus stickers.`);
            }

            user.sPack = q.trim();
            (global as any).saveDB();
            return await reply(`✐ Se actualizó el pack por defecto para tus stickers: *${user.sPack}*`);

        } catch (e) {
            console.error('Error en setmeta:', e);
            return reply(`✿ Ocurrió un error al actualizar los metadatos.`);
        }
    }
};
