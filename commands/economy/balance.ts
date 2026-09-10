import { UserJid } from '#simple';
import config from '#config';

const normalizeNumber = (x: string) => {
    if (!x) return '';
    let cleaned = String(x).split('@')[0].split(':').pop() || '';
    cleaned = cleaned.replace(/[^\d]/g, '');
    return cleaned;
};

export default {
    command: ['bal', 'balance', 'coins'],
    description: 'Muestra el balance de un usuario',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';

        try {
            const realSender = await UserJid(sock, chat, sender);
            const q = args[0];

            const dbData = (global as any).db?.data;
            if (!dbData) {
                return await sock.sendMessage(chat, { text: '「 ꕤ 」 Error: La base de datos no está inicializada.' }, { quoted: m });
            }

            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};
            if (!dbData.users) dbData.users = {};

            const chatDb = dbData.chats[chat];
            const chatUsers = chatDb.users || (chatDb.users = {});

            if (chatDb.adminonly) {
                return await sock.sendMessage(chat, {
                    text:
`「 ꕤ 」 Para utilizar comandos de *Economía* en este grupo, se requiere desactivar el modo *solo administradores*.

> Un *administrador* puede desactivarlo con el comando » *${p}onlyadmin off*`
                }, { quoted: m });
            }

            let mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            let quotedSender = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.key?.sender;
            let participant = m.message?.extendedTextMessage?.contextInfo?.participant;

            let targetJid: string;
            let targetNumber: string;

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
                } else {
                    targetJid = realSender;
                    targetNumber = normalizeNumber(realSender);
                }
            } else {
                targetJid = realSender;
                targetNumber = normalizeNumber(realSender);
            }

            let userInChat = chatUsers[targetJid];
            let foundKey = targetJid;

            if (!userInChat) {
                for (const [key, value] of Object.entries(chatUsers)) {
                    if (normalizeNumber(key) === targetNumber) {
                        userInChat = value;
                        foundKey = key;
                        break;
                    }
                }
            }

            if (!userInChat) {
                return await sock.sendMessage(chat, { text: '「 ꕤ 」 El usuario no tiene una cuenta de economía en este grupo.' }, { quoted: m });
            }

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;
            const bank = userInChat.bank || 0;
            const total = coins + bank;

            const fmt = (n: number) => `${coinName}${n.toLocaleString()} Coins`;

            const userName = dbData.users?.[foundKey]?.name || foundKey.split('@')[0];

            const caption =
`✿ *》》Economía @${userName}《《* ✿

⛀ Dinero » *${fmt(coins)}*
⚿ Banco » *${fmt(bank)}*
⛁ Total » *${fmt(total)}*

> _Para proteger tu dinero, ¡deposítalo en el banco usando ${p}deposit!_`;

            await sock.sendMessage(chat, {
                text: caption,
                mentions: [targetJid]
            }, { quoted: m });

        } catch (e) {
            console.error('Error en bal:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al obtener el balance.' }, { quoted: m });
        }
    }
};