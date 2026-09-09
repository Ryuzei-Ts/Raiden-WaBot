import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x: string) => {
    if (!x) return '';
    let cleaned = String(x).split('@')[0].split(':').pop() || '';
    cleaned = cleaned.replace(/[^\d]/g, '');
    return cleaned;
};

export default {
    command: ['mute', 'silenciar', 'mutear'],
    description: 'Silencia a un usuario en el grupo eliminando sus mensajes',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, args, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const q = args[0];

            let mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            let quotedSender = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.key?.sender;
            let participant = m.message?.extendedTextMessage?.contextInfo?.participant;

            let targetJid: string | null = null;
            let targetNumber: string | null = null;

            if (mentionedJid && mentionedJid !== '') {
                const resolvedMention = await UserJid(sock, chat, mentionedJid);
                targetJid = resolvedMention;
                targetNumber = normalizeNumber(resolvedMention);
            } else if (quotedSender) {
                const resolvedQuoted = await UserJid(sock, chat, quotedSender);
                targetJid = resolvedQuoted;
                targetNumber = normalizeNumber(resolvedQuoted);
            } else if (participant) {
                const resolvedParticipant = await UserJid(sock, chat, participant);
                targetJid = resolvedParticipant;
                targetNumber = normalizeNumber(resolvedParticipant);
            } else if (q && q.trim() !== '' && !q.startsWith('@')) {
                const cleanNumber = q.replace(/[^0-9]/g, '');
                if (cleanNumber) {
                    targetJid = cleanNumber + '@s.whatsapp.net';
                    targetNumber = cleanNumber;
                }
            }

            if (!targetJid || !targetNumber) {
                return reply(`✿ Menciona a un usuario, responde a su mensaje o escribe su número para silenciarlo.`);
            }

            if (normalizeNumber(targetJid) === normalizeNumber(realSender)) {
                return reply(`✰ No puedes silenciarte a ti mismo.`);
            }

            const dbData = (global as any).db?.data;
            if (!dbData) return reply('✿ Error: La base de datos no está inicializada.');

            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};

            const chatDb = dbData.chats[chat];
            if (!Array.isArray(chatDb.muteds)) {
                chatDb.muteds = [];
            }

            if (chatDb.muteds.includes(targetNumber)) {
                return reply(`✰ El usuario @${targetNumber} ya se encuentra silenciado.`, { mentions: [targetJid] });
            }

            chatDb.muteds.push(targetNumber);
            saveDB(chat);

            return sock.sendMessage(chat, {
                text: `✰ El usuario @${targetNumber} ha sido silenciado en este grupo. Sus mensajes serán eliminados.`,
                mentions: [targetJid]
            }, { quoted: m });

        } catch (e) {
            console.error('Error en mute:', e);
            return reply(`✿ Ocurrió un error al intentar silenciar al usuario.`);
        }
    }
};
