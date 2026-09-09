import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

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
            let displayName: string | null = null;

            if (mentionedJid && mentionedJid !== '') {
                const resolvedMention = await UserJid(sock, chat, mentionedJid);
                targetJid = resolvedMention;
                targetNumber = normalizeNumber(resolvedMention);
                displayName = resolvedMention.split('@')[0];
            } else if (quotedSender) {
                const resolvedQuoted = await UserJid(sock, chat, quotedSender);
                targetJid = resolvedQuoted;
                targetNumber = normalizeNumber(resolvedQuoted);
                displayName = resolvedQuoted.split('@')[0];
            } else if (participant) {
                const resolvedParticipant = await UserJid(sock, chat, participant);
                targetJid = resolvedParticipant;
                targetNumber = normalizeNumber(resolvedParticipant);
                displayName = resolvedParticipant.split('@')[0];
            } else if (q && q.trim() !== '' && !q.startsWith('@')) {
                const cleanNumber = q.replace(/[^0-9]/g, '');
                if (cleanNumber) {
                    targetJid = cleanNumber + '@s.whatsapp.net';
                    targetNumber = cleanNumber;
                    displayName = cleanNumber;
                }
            }

            if (!targetJid || !targetNumber) {
                return reply(`✿ Menciona a un usuario, responde a su mensaje o escribe su número para silenciarlo.`);
            }

            const rawBotJid = sock.user?.id || sock.user?.jid || '';
            const botBase = normalizeNumber(rawBotJid);
            const targetBase = normalizeNumber(targetJid);
            const senderBase = normalizeNumber(realSender);

            if (targetBase === botBase) {
                return reply(`✰ No puedes silenciar al bot.`);
            }

            if (targetBase === senderBase) {
                return reply(`✰ No puedes silenciarte a ti mismo.`);
            }

            const metadata = await sock.groupMetadata(chat).catch(() => null);
            const participants = metadata?.participants || [];
            
            const targetParticipant = participants.find((p: any) => {
                const pId = normalizeNumber(p.id);
                const pLid = normalizeNumber(p.lid);
                const pPhone = normalizeNumber(p.phoneNumber);
                return pId === targetBase || pLid === targetBase || pPhone === targetBase ||
                       (pId && (pId.endsWith(targetBase) || targetBase.endsWith(pId)));
            });

            if (targetParticipant) {
                const pId = normalizeNumber(targetParticipant.id);
                const pPhone = normalizeNumber(targetParticipant.phoneNumber);
                if (pId === botBase || pPhone === botBase) {
                    return reply(`✰ No puedes silenciar al bot.`);
                }
            }

            const resolvedBase = targetParticipant ? normalizeNumber(targetParticipant.id) : targetBase;
            const ownerSet = config.owner;
            if (ownerSet instanceof Set && (ownerSet.has(targetBase) || ownerSet.has(resolvedBase))) {
                return reply(`✰ No puedes silenciar a un Owner del bot.`);
            }

            if (targetParticipant?.admin === 'superadmin' || metadata?.owner === targetJid || metadata?.owner === targetParticipant?.id) {
                return reply(`✰ No puedes silenciar al creador/superadmin del grupo.`);
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
                return sock.sendMessage(chat, {
                    text: `✰ El usuario @${displayName} ya se encuentra silenciado.`,
                    mentions: [targetJid]
                }, { quoted: m });
            }

            chatDb.muteds.push(targetNumber);
            saveDB(chat);

            return sock.sendMessage(chat, {
                text: `✰ El usuario @${displayName} ha sido silenciado en este grupo. Sus mensajes serán eliminados.`,
                mentions: [targetJid]
            }, { quoted: m });

        } catch (e) {
            console.error('Error en mute:', e);
            return reply(`✿ Ocurrió un error al intentar silenciar al usuario.`);
        }
    }
};
