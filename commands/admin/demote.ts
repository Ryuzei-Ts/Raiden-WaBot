import config from '#config';

const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

function isOwnerNumber(targetBase: string): boolean {
    if (!targetBase) return false;
    const ownerSet = config.owner;
    if (!(ownerSet instanceof Set)) return false;

    if (ownerSet.has(targetBase)) return true;

    for (const ownerNum of ownerSet) {
        const cleanOwner = normalizeNumber(ownerNum);
        if (cleanOwner && (cleanOwner === targetBase || cleanOwner.endsWith(targetBase) || targetBase.endsWith(cleanOwner))) {
            return true;
        }
    }
    return false;
}

export default {
    command: ['demote', 'quitaradmin', 'degradar'],
    description: 'Quita el rango de administrador a un usuario',
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
            return msg.reply('✰ Etiqueta o responde al mensaje del usuario que deseas degradar.');
        }

        const rawBotJid = sock.user?.id || sock.user?.jid || '';
        const botBase = normalizeNumber(rawBotJid);
        const targetBase = normalizeNumber(target);

        if (targetBase === botBase) {
            return msg.reply('✰ No puedes quitarle el administrador al bot.');
        }

        if (isOwnerNumber(targetBase)) {
            return msg.reply('✰ No puedes quitarle el administrador a un Owner del bot.');
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

        const isAdmin = targetParticipant?.admin === 'admin' || targetParticipant?.admin === 'superadmin';

        if (!isAdmin) {
            return sock.sendMessage(chat, { 
                text: `✰ El usuario @${targetBase} no está en la lista de administradores.`, 
                mentions: [target] 
            }, { quoted: m });
        }

        if (targetParticipant?.admin === 'superadmin' || metadata?.owner === target) {
            return msg.reply('✰ No puedes quitarle el administrador al creador/superadmin del grupo.');
        }

        await sock.groupParticipantsUpdate(chat, [target], 'demote').catch(() => {});
        return sock.sendMessage(chat, { 
            text: `✰ Se le ha quitado el administrador a @${targetBase}.`, 
            mentions: [target] 
        }, { quoted: m });
    }
};
