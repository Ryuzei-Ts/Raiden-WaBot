import { saveDB } from '#db';

export default {
    command: ['setbye', 'setdespedida'],
    description: 'Configura el texto del mensaje de despedida',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: false,
    run: async ({ chat, m, sock, args, usedPrefix, command }: any) => {
        const reply = (txt: string) => {
            if (typeof m.reply === 'function') return m.reply(txt);
            return sock.sendMessage(chat, { text: txt }, { quoted: m });
        };

        const dbData = (global as any).db?.data;
        if (!dbData) return reply('✿ Error: Base de datos no disponible.');

        if (!dbData.chats) dbData.chats = {};
        if (!dbData.chats[chat]) dbData.chats[chat] = {};

        const text = args.join(' ').trim();

        if (!text) {
            return reply(
                `✐ Ingresa el texto para la despedida.\n\n` +
                `*Variables disponibles:*\n` +
                `• \`@user\` : Menciona al usuario que sale\n` +
                `• \`@grupo\` : Nombre del grupo\n` +
                `• \`@desc\` : Descripción del grupo\n\n` +
                `*Ejemplo:*\n` +
                `*${usedPrefix + command}* Adiós @user, te esperamos pronto en @grupo.`
            );
        }

        dbData.chats[chat].sGoodbye = text;
        const senderId = m.sender?.split('@')[0] + '@s.whatsapp.net';
        saveDB(chat, senderId);

        return reply(`✐ ¡El mensaje de *despedida* ha sido actualizado con éxito!`);
    }
};
