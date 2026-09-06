import config from '#config';

const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

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

        const ownerConfig = config.owner;
        const isBotOwner = ownerConfig instanceof Set ? ownerConfig.has(targetBase) : Array.isArray(ownerConfig) && ownerConfig.some((num: string) => normalizeNumber(num) === targetBase);

        if (isBotOwner) {
            return msg.reply('✰ No puedes quitarle el administrador a un Owner del bot.');
        }

        await sock.groupParticipantsUpdate(chat, [target], 'demote').catch(() => {});
        return sock.sendMessage(chat, { 
            text: `✰ Se le ha quitado el administrador a @${targetBase}.`, 
            mentions: [target] 
        }, { quoted: m });
    }
};
