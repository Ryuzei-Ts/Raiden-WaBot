import { saveDB } from '#db';

export default {
    command: ['setwelcome'],
    description: 'Configura el texto del mensaje de bienvenida',
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
                `✐ Ingresa el texto para la bienvenida.\n\n` +
                `*Variables disponibles:*\n` +
                `• \`@user\` : Menciona al usuario que entra\n` +
                `• \`@grupo\` : Nombre del grupo\n` +
                `• \`@desc\` : Descripción del grupo\n\n` +
                `*Ejemplo:*\n` +
                `*${usedPrefix + command}* ¡Hola @user, bienvenido a @grupo! Disfruta tu estadía.`
            );
        }

        dbData.chats[chat].sWelcome = text;
        saveDB(chat);

        return reply(`✐ ¡El mensaje de *bienvenida* ha sido actualizado con éxito!`);
    }
};
