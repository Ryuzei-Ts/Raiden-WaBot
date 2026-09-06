import config from '#config';

const getDigits = (x: string) => String(x || "").replace(/[^\d]/g, "").trim();

function isOwnerNumber(targetDigits: string): boolean {
    if (!targetDigits) return false;
    const ownerSet = config.owner;
    if (!(ownerSet instanceof Set)) return false;

    for (const ownerNum of ownerSet) {
        const cleanOwner = getDigits(ownerNum);
        if (!cleanOwner) continue;
        if (targetDigits === cleanOwner || targetDigits.endsWith(cleanOwner) || cleanOwner.endsWith(targetDigits)) {
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
        let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     m.mentionedJid?.[0] || 
                     m.quoted?.sender || 
                     (q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);

        if (!target || target === '@s.whatsapp.net') {
            return msg.reply('✰ Etiqueta o responde al mensaje del usuario que deseas degradar.');
        }

        const rawBotJid = sock.user?.id || sock.user?.jid || '';
        const botDigits = getDigits(rawBotJid);
        const targetDigits = getDigits(target);

        if (targetDigits && botDigits && (targetDigits === botDigits || botDigits.endsWith(targetDigits) || targetDigits.endsWith(botDigits))) {
            return msg.reply('✰ No puedes quitarle el administrador al bot.');
        }

        if (isOwnerNumber(targetDigits)) {
            return msg.reply('✰ No puedes quitarle el administrador a un Owner del bot.');
        }

        const metadata = await sock.groupMetadata(chat).catch(() => null);
        const participants = metadata?.participants || [];
        
        const targetParticipant = participants.find((p: any) => {
            const pId = getDigits(p.id);
            const pLid = getDigits(p.lid);
            const pPhone = getDigits(p.phoneNumber);
            return pId === targetDigits || pLid === targetDigits || pPhone === targetDigits ||
                   (pId && targetDigits.endsWith(pId)) || (targetDigits && pId.endsWith(targetDigits));
        });

        const isAdmin = targetParticipant?.admin === 'admin' || targetParticipant?.admin === 'superadmin';

        if (!isAdmin) {
            return sock.sendMessage(chat, { 
                text: `✰ El usuario @${targetDigits} no está en la lista de administradores.`, 
                mentions: [target] 
            }, { quoted: m });
        }

        if (targetParticipant?.admin === 'superadmin' || metadata?.owner === target) {
            return msg.reply('✰ No puedes quitarle el administrador al creador/superadmin del grupo.');
        }

        await sock.groupParticipantsUpdate(chat, [target], 'demote').catch(() => {});
        return sock.sendMessage(chat, { 
            text: `✰ Se le ha quitado el administrador a @${targetDigits}.`, 
            mentions: [target] 
        }, { quoted: m });
    }
};
