const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

export default {
    command: ['demote', 'quitaradmin', 'degradar'],
    description: 'Quita el rango de administrador a un usuario',
    category: 'grupo',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, msg, args }: any) => {
        const q = args[0];
        let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     m.mentionedJid?.[0] ||
                     msg.message?.extendedTextMessage?.contextInfo?.participant || 
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

        const metadata = await sock.groupMetadata(chat).catch(() => null);
        const participants = metadata?.participants || [];
        const targetParticipant = participants.find((p: any) => 
            normalizeNumber(p.id) === targetBase || normalizeNumber(p.lid) === targetBase
        );

        if (targetParticipant?.admin === 'superadmin' || metadata?.owner === target) {
            return msg.reply('✰ No puedes quitarle el administrador al creador/superadmin del grupo.');
        }

        await sock.groupParticipantsUpdate(chat, [target], 'demote').catch(() => {});
        return sock.sendMessage(chat, { 
            text: `✰ Se le ha quitado el administrador a @${target.split('@')[0]}.`, 
            mentions: [target] 
        }, { quoted: m });
    }
};
