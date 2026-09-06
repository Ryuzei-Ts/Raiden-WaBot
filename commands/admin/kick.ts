import config from '#config';

const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

export default {
    command: ['kick', 'ban', 'expulsar', 'eular'],
    description: 'Expulsa a un participante del grupo',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, msg, args }: any) => {
        const q = args?.[0];
        const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                       m.mentionedJid?.[0] || 
                       m.quoted?.sender || 
                       (q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);

        if (!target || target === '@s.whatsapp.net') {
            return msg.reply('✰ Etiqueta o responde al mensaje del usuario que deseas expulsar.');
        }

        const rawBotJid = sock.user?.id || sock.user?.jid || '';
        const botBase = normalizeNumber(rawBotJid);
        const targetBase = normalizeNumber(target);

        if (targetBase === botBase) {
            return msg.reply('✰ No puedes expulsar al bot.');
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
                return msg.reply('✰ No puedes expulsar al bot.');
            }
        }

        const resolvedBase = targetParticipant ? normalizeNumber(targetParticipant.id) : targetBase;
        const ownerSet = config.owner;
        if (ownerSet instanceof Set && (ownerSet.has(targetBase) || ownerSet.has(resolvedBase))) {
            return msg.reply('✰ No puedes expulsar a un Owner del bot.');
        }

        if (targetParticipant?.admin === 'superadmin' || metadata?.owner === target || metadata?.owner === targetParticipant?.id) {
            return msg.reply('✰ No puedes expulsar al creador/superadmin del grupo.');
        }

        await sock.groupParticipantsUpdate(chat, [target], 'remove').catch(() => {});
    }
};
