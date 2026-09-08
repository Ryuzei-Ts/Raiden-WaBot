import { UserJid } from '#simple';
import { saveDB } from '#db';

export default {
    command: ['marry', 'casar'],
    description: 'Cásate con otro usuario',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const usersDB = (global as any).db.data.users;
            const user = usersDB[realSender] || {};

            sock.marry = sock.marry || {};

            if (user.marry) {
                const partnerName = usersDB[user.marry]?.name || user.marry.split('@')[0];
                const gender = (user.genre || '').toLowerCase();
                let status = 'casad@';
                if (gender === 'mujer' || gender === 'femenino') status = 'casada';
                else if (gender === 'hombre' || gender === 'masculino') status = 'casado';
                else status = 'casade';
                return reply(`✿ Ya estás ${status} con *${partnerName}*\n> Puedes divorciarte con: *${usedPrefix}divorce*`);
            }

            const q = args[0];
            let mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            let quotedSender = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.key?.sender;
            let participant = m.message?.extendedTextMessage?.contextInfo?.participant;

            let targetJid: string;

            if (mentionedJid && mentionedJid !== '') {
                targetJid = await UserJid(sock, chat, mentionedJid);
            } else if (quotedSender) {
                targetJid = await UserJid(sock, chat, quotedSender);
            } else if (participant) {
                targetJid = await UserJid(sock, chat, participant);
            } else if (q && q.trim() !== '' && !q.startsWith('@')) {
                const cleanNumber = q.replace(/[^0-9]/g, '');
                if (cleanNumber) {
                    targetJid = cleanNumber + '@s.whatsapp.net';
                } else {
                    return reply(`✿ Debes mencionar o responder al usuario con el que te quieres casar.\n> Ejemplo » *${usedPrefix}marry @usuario*`);
                }
            } else {
                return reply(`✿ Debes mencionar o responder al usuario con el que te quieres casar.\n> Ejemplo » *${usedPrefix}marry @usuario*`);
            }

            if (targetJid === realSender) {
                return reply(`✰ No puedes casarte contigo mism@.`);
            }

            const targetUser = usersDB[targetJid] || {};

            if (targetUser.marry) {
                return reply(`✿ Esa persona ya está casada.`);
            }

            if (sock.marry[targetJid] === realSender) {
                const fechaActual = new Date();
                const fechaStr = fechaActual.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                const fechaCompleta = fechaActual.toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                if (!user.marryHistory) user.marryHistory = [];
                if (!targetUser.marryHistory) targetUser.marryHistory = [];

                user.marryHistory.push({
                    partner: targetJid,
                    inicio: fechaCompleta,
                    fin: 'presente',
                    fecha: fechaStr
                });

                targetUser.marryHistory.push({
                    partner: realSender,
                    inicio: fechaCompleta,
                    fin: 'presente',
                    fecha: fechaStr
                });

                user.marry = targetJid;
                targetUser.marry = realSender;
                
                saveDB(chat, realSender);
                saveDB(chat, targetJid);

                const gen1 = (targetUser.genre || '').toLowerCase();
                const gen2 = (user.genre || '').toLowerCase();

                let label1 = 'Espos@';
                if (gen1 === 'mujer' || gen1 === 'femenino') label1 = 'Esposa';
                else if (gen1 === 'hombre' || gen1 === 'masculino') label1 = 'Esposo';
                else if (gen1 === 'otro') label1 = 'Espose';
                else label1 = 'Espose';

                let label2 = 'Espos@';
                if (gen2 === 'mujer' || gen2 === 'femenino') label2 = 'Esposa';
                else if (gen2 === 'hombre' || gen2 === 'masculino') label2 = 'Esposo';
                else if (gen2 === 'otro') label2 = 'Espose';
                else label2 = 'Espose';

                const weddingMsg = `✩.･:｡≻───── ⋆♡⋆ ─────.•:｡✩\n¡Se han Casado! ฅ^•ﻌ•^ฅ*:･ﾟ✧\n\n*•.¸♡ ${label1} @${targetJid.split('@')[0]} ♡¸.•*\n*•.¸♡ ${label2} @${realSender.split('@')[0]} ♡¸.•*\n\n\`Disfruten de su luna de miel\`\n✩.･:｡≻───── ⋆♡⋆ ─────.•:｡✩`;

                await sock.sendMessage(chat, { text: weddingMsg, mentions: [targetJid, realSender] }, { quoted: m });
                delete sock.marry[targetJid];
                return;
            }

            sock.marry[realSender] = targetJid;

            const proposal = `♡ @${targetJid.split('@')[0]}, @${realSender.split('@')[0]} te ha propuesto matrimonio, ¿aceptas? •(=^●ω●^=)•\n> ✐ Responde a este mensaje o menciona al usuario con *${usedPrefix}marry* para aceptar.`;

            await sock.sendMessage(chat, { text: proposal, mentions: [targetJid, realSender] }, { quoted: m });

            setTimeout(() => {
                if (sock.marry[realSender]) delete sock.marry[realSender];
            }, 1800000);

        } catch (e) {
            console.error('Error en marry:', e);
            return reply(`✿ Ocurrió un error al procesar la boda.`);
        }
    }
};
