import { saveDB } from '#db';

const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

export default {
    command: ['mutelist', 'listmute', 'silenciados', 'muteds'],
    description: 'Muestra la lista de usuarios silenciados en el grupo',
    category: 'admin',
    group: true,
    admin: true,
    run: async ({ chat, m, sock }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const dbData = (global as any).db?.data;
            if (!dbData) return reply('✿ Error: La base de datos no está inicializada.');

            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};

            const chatDb = dbData.chats[chat];
            if (!Array.isArray(chatDb.muteds) || chatDb.muteds.length === 0) {
                return reply(`✰ No hay usuarios silenciados en este grupo.`);
            }

            let listText = `✰ *LISTA DE SILENCIADOS*\n\n`;
            const mentions: string[] = [];

            for (const user of chatDb.muteds) {
                listText += `✰ @${user}\n`;
                mentions.push(user + '@s.whatsapp.net');
            }

            listText += `\nTotal: ${chatDb.muteds.length} usuario(s)`;

            return sock.sendMessage(chat, {
                text: listText,
                mentions: mentions
            }, { quoted: m });

        } catch (e) {
            console.error('Error en mutelist:', e);
            return reply(`✿ Ocurrió un error al obtener la lista de silenciados.`);
        }
    }
};
