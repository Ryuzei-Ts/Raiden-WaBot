import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';

const normalizeNumber = (x: string) => {
    if (!x) return '';
    let cleaned = String(x).split('@')[0].split(':').pop() || '';
    cleaned = cleaned.replace(/[^\d]/g, '');
    return cleaned;
};

export default {
    command: ['pay', 'transfer', 'give'],
    description: 'Transfiere monedas a otro usuario',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';

        try {
            const realSender = await UserJid(sock, chat, sender);

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

            const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const quotedSender = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.key?.sender;
            const participant = m.message?.extendedTextMessage?.contextInfo?.participant;

            let targetJid: string | null = null;
            if (mentionedJid && mentionedJid !== '') {
                targetJid = await UserJid(sock, chat, mentionedJid);
            } else if (quotedSender) {
                targetJid = await UserJid(sock, chat, quotedSender);
            } else if (participant) {
                targetJid = await UserJid(sock, chat, participant);
            }

            if (!targetJid) {
                return await sock.sendMessage(chat, {
                    text:
`「 ꕤ 」 Debes mencionar a quién quieres regalarle *Coins*.
> Ejemplo » *${p}pay 25000 @mencion*`
                }, { quoted: m });
            }

            if (targetJid === realSender) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 No puedes transferirte monedas a ti mismo.`
                }, { quoted: m });
            }

            if (!chatUsers[realSender]) {
                chatUsers[realSender] = { coins: 0, bank: 0 };
            }
            const userInChat = chatUsers[realSender];

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;

            const input = (args[0] || '').replace(/[^0-9]/g, '');
            if (!input) {
                return await sock.sendMessage(chat, {
                    text:
`「 ꕤ 」 Debes mencionar a quién quieres regalarle *Coins*.
> Ejemplo » *${p}pay 25000 @mencion*`
                }, { quoted: m });
            }

            const cantidad = parseInt(input);
            const minPay = 1000;

            if (!cantidad || cantidad <= 0) {
                return await sock.sendMessage(chat, {
                    text:
`「 ꕤ 」 Debes mencionar a quién quieres regalarle *Coins*.
> Ejemplo » *${p}pay 25000 @mencion*`
                }, { quoted: m });
            }

            if (cantidad < minPay) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 Debes regalar al menos *${minPay.toLocaleString()} ${coinName}*.`
                }, { quoted: m });
            }

            let targetInChat = chatUsers[targetJid];
            let targetKey = targetJid;
            const targetNumber = normalizeNumber(targetJid);

            if (!targetInChat) {
                for (const [key, value] of Object.entries(chatUsers)) {
                    if (normalizeNumber(key) === targetNumber) {
                        targetInChat = value;
                        targetKey = key;
                        break;
                    }
                }
            }

            if (!targetInChat) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 El usuario no tiene una cuenta de economía en este grupo.`
                }, { quoted: m });
            }

            const bank = userInChat.bank || 0;

            if (bank < cantidad) {
                return await sock.sendMessage(chat, {
                    text:
`「 ꕤ 」 No tienes suficientes *${coinName}* en el banco.
> Tienes *${bank.toLocaleString()} ${coinName}* en el banco.`
                }, { quoted: m });
            }

            userInChat.bank = bank - cantidad;
            targetInChat.bank = (targetInChat.bank || 0) + cantidad;

            saveDB(chat, realSender);
            saveDB(chat, targetKey);

            const targetName = dbData.users?.[targetKey]?.name || targetKey.split('@')[0];

            await sock.sendMessage(chat, {
                text:
`✿ Transferiste *${cantidad.toLocaleString()} ${coinName}* a *@${targetKey.split('@')[0]}*.
> Ahora tienes *${userInChat.bank.toLocaleString()} ${coinName}* en el banco.`,
                mentions: [targetKey]
            }, { quoted: m });

        } catch (e) {
            console.error('Error en pay:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al transferir.' }, { quoted: m });
        }
    }
};