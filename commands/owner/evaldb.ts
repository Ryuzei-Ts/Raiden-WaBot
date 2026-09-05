import { db } from '#db';

export default {
    command: ['e', 'evaldb'],
    owner: true,
    run: async (ctx: any) => {
        const { msg, args, reply, chat, sender, prefix, usedPrefix } = ctx;
        const p = usedPrefix || prefix || '.';
        
        const subCmd = args[0]?.toLowerCase();

        if (subCmd === 'chat') {
            const row = db.prepare('SELECT * FROM chats WHERE id = ?').get(chat);
            
            if (!row) return reply('{}');

            if ((row as any).muteds) {
                try { (row as any).muteds = JSON.parse((row as any).muteds); } catch {}
            }

            return reply(JSON.stringify(row, null, 2));
        } 
        
        if (subCmd === 'user') {
            const targetUser = msg.mentionedJid?.[0] || msg.quoted?.sender || sender;
            const cleanUser = targetUser.split('@')[0] + '@s.whatsapp.net';

            const userGlobal = db.prepare('SELECT * FROM users WHERE id = ?').get(cleanUser) as any || {};
            const userInChat = db.prepare('SELECT * FROM chat_users WHERE chat_id = ? AND user_id = ?').get(chat, cleanUser) as any || {};

            if (userInChat.characters) {
                try { userInChat.characters = JSON.parse(userInChat.characters); } catch {}
            }

            const mergedUserData = {
                ...userGlobal,
                ...userInChat
            };

            if (Object.keys(mergedUserData).length === 0) return reply('{}');

            return reply(JSON.stringify(mergedUserData, null, 2));
        }

        return reply(
            ` Usa el comando de las siguientes formas:\n\n` +
            `• *${p}e chat* - Muestra los datos del chat actual.\n` +
            `• *${p}e user* - Muestra tus datos.\n` +
            `• *${p}e user @usuario* - Muestra los datos del usuario mencionado.`
        );
    }
};
