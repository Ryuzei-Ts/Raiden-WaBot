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
    command: ['rob', 'robar'],
    description: 'Roba monedas a otro usuario',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, usedPrefix, prefix, sender }: any) => {
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
                    text: `「 ꕤ 」 Debes mencionar a quién quieres robarle *Coins*.`
                }, { quoted: m });
            }

            if (targetJid === realSender) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 No puedes robarte a ti mismo.`
                }, { quoted: m });
            }

            if (!chatUsers[realSender]) {
                chatUsers[realSender] = { coins: 0, bank: 0, lastRob: 0 };
            }
            const userInChat = chatUsers[realSender];

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;

            const now = Date.now();
            const cooldown = 10 * 60 * 1000;
            const last = userInChat.lastRob || 0;
            const diff = now - last;

            if (last && diff < cooldown) {
                const remaining = cooldown - diff;
                const minutos = Math.floor(remaining / (1000 * 60));
                const segundos = Math.floor((remaining % (1000 * 60)) / 1000);
                const tiempo = minutos > 0
                    ? `${minutos} minutos ${segundos} segundos`
                    : `${segundos} segundos`;
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 Debes esperar *${tiempo}* para usar *${p}rob* de nuevo.`
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

            const targetLastSeen = targetInChat.lastSeen || targetInChat.lastCommand || 0;
            const inactivo = targetLastSeen > 0 && (now - targetLastSeen) > 60 * 60 * 1000;

            if (!inactivo) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 Solo puedes robarle *Coins* a un usuario que lleve más de 1 hora inactivo.`
                }, { quoted: m });
            }

            const targetCoins = targetInChat.coins || 0;
            const targetName = dbData.users?.[targetKey]?.name || targetKey.split('@')[0];

            if (targetCoins < 100) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 *${targetName}* no tiene suficientes *Coins* fuera del banco como para que valga la pena intentar robar.`
                }, { quoted: m });
            }

            const exitoso = Math.random() < 0.5;

            if (exitoso) {
                const porcentaje = Math.random() * 0.3 + 0.1;
                const cantidadRobada = Math.min(Math.floor(targetCoins * porcentaje), targetCoins);

                userInChat.coins = coins + cantidadRobada;
                userInChat.lastRob = now;
                targetInChat.coins = targetCoins - cantidadRobada;

                saveDB(chat, realSender);
                saveDB(chat, targetKey);

                return await sock.sendMessage(chat, {
                    text: `✐ Le robaste *${cantidadRobada.toLocaleString()} ${coinName}* a *${targetName}*.`
                }, { quoted: m });
            }

            const perdida = Math.min(coins, Math.floor(Math.random() * 5000) + 1000);

            userInChat.coins = coins - perdida;
            userInChat.lastRob = now;

            saveDB(chat, realSender);

            return await sock.sendMessage(chat, {
                text: `✿ Te atraparon en el intento y perdiste *-${perdida.toLocaleString()} ${coinName}*.`
            }, { quoted: m });

        } catch (e) {
            console.error('Error en rob:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al intentar robar.' }, { quoted: m });
        }
    }
};