import { loadDB } from '#db';

export default {
    command: ['e', 'evaldb'],
    owner: true,
    run: async (ctx: any) => {
        const { msg, args, reply, chat, sender, prefix, usedPrefix } = ctx;
        const p = usedPrefix || prefix || '.';
        
        const subCmd = args[0]?.toLowerCase();
        const db = (await loadDB()) || (global as any).db || {};

        let targetData: any = null;

        if (subCmd === 'chat') {
            targetData = db?.chats?.[chat] || {};
        } else if (subCmd === 'user') {
            const targetUser = msg.mentionedJid?.[0] || msg.quoted?.sender || sender;
            targetData = db?.users?.[targetUser] || {};
        } else {
            return reply(
                ` Usa el comando de las siguientes formas:\n\n` +
                `• *${p}e chat* - Muestra los datos del chat actual.\n` +
                `• *${p}e user* - Muestra tus datos.\n` +
                `• *${p}e user @usuario* - Muestra los datos del usuario mencionado.`
            );
        }

        return reply(JSON.stringify(targetData, null, 2));
    }
};
