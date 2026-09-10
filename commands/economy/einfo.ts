import { UserJid } from '#simple';
import config from '#config';

const normalizeNumber = (x: string) => {
    if (!x) return '';
    let cleaned = String(x).split('@')[0].split(':').pop() || '';
    cleaned = cleaned.replace(/[^\d]/g, '');
    return cleaned;
};

const formatRemaining = (ms: number) => {
    if (ms <= 0) return 'Ahora.';
    const totalSeg = Math.ceil(ms / 1000);
    const dias = Math.floor(totalSeg / 86400);
    const horas = Math.floor((totalSeg % 86400) / 3600);
    const minutos = Math.floor((totalSeg % 3600) / 60);
    const segundos = totalSeg % 60;

    const partes: string[] = [];
    if (dias > 0) partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);
    if (horas > 0) partes.push(`${horas} ${horas === 1 ? 'hora' : 'horas'}`);
    if (minutos > 0) partes.push(`${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`);
    if (segundos > 0) partes.push(`${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`);

    return partes.join(' ');
};

export default {
    command: ['einfo', 'economyinfo', 'cooldowns'],
    description: 'Muestra el tiempo restante de cada comando de economía',
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

            if (!userInChat) {
                for (const [key, value] of Object.entries(chatUsers)) {
                    if (normalizeNumber(key) === targetNumber) {
                        userInChat = value;
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

            const now = Date.now();

            const cooldowns: { label: string; key: string; ms: number }[] = [
                { label: 'Work',  key: 'lastWork',  ms: 60 * 1000 },
                { label: 'Slut',  key: 'lastSlut',  ms: 5 * 60 * 1000 },
                { label: 'Crime', key: 'lastCrime', ms: 5 * 60 * 1000 },
                { label: 'Rob',   key: 'lastRob',   ms: 10 * 60 * 1000 },
                { label: 'Daily', key: 'lastDaily', ms: 24 * 60 * 60 * 1000 }
            ];

            let body = '';
            for (const c of cooldowns) {
                const last = userInChat[c.key] || 0;
                const remaining = last ? Math.max(0, c.ms - (now - last)) : 0;
                body += `ⴵ ${c.label} » *${formatRemaining(remaining)}*\n`;
            }

            const caption =
`✿ *》》Economía @${targetJid.split('@')[0]}《《* ✿

${body}
⛁ ${coinName} totales » ${total.toLocaleString()} ${coinName}`;

            await sock.sendMessage(chat, {
                text: caption,
                mentions: [targetJid]
            }, { quoted: m });

        } catch (e) {
            console.error('Error en einfo:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al obtener la información.' }, { quoted: m });
        }
    }
};