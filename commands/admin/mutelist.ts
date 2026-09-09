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

            const metadata = await sock.groupMetadata(chat).catch(() => null);
            const participants = metadata?.participants || [];

            let mutedList = '';
            const mentions: string[] = [];

            for (const mutedNumber of chatDb.muteds) {
                const participant = participants.find((p: any) => {
                    const pId = normalizeNumber(p.id);
                    const pPhone = normalizeNumber(p.phoneNumber);
                    return pId === mutedNumber || pPhone === mutedNumber;
                });

                let jid: string;
                let displayName: string;

                if (participant) {
                    jid = participant.id;
                    displayName = participant.name || participant.notify || mutedNumber;
                } else {
                    jid = mutedNumber + '@s.whatsapp.net';
                    displayName = mutedNumber;
                }

                mutedList += `✰ @${displayName}\n`;
                mentions.push(jid);
            }

            const text = `✰ *LISTA DE SILENCIADOS*\n\n${mutedList}\nTotal: ${chatDb.muteds.length} usuario(s)`;

            return sock.sendMessage(chat, {
                text: text,
                mentions: mentions
            }, { quoted: m });

        } catch (e) {
            console.error('Error en mutelist:', e);
            return reply(`✿ Ocurrió un error al obtener la lista de silenciados.`);
        }
    }
};
