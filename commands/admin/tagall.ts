import config from '#config';
import { broadcast } from '#index';

const countryFlags: [string, string][] = [
    ['1242', '🇧🇸'], ['1246', '🇧🇧'], ['1264', '🇦🇮'], ['1268', '🇦🇬'], ['1284', '🇻🇬'],
    ['1345', '🇰🇾'], ['1441', '🇧🇲'], ['1473', '🇬🇩'], ['1649', '🇹🇨'], ['1664', '🇲🇸'],
    ['1658', '🇯🇲'], ['1721', '🇸🇽'], ['1758', '🇱🇨'], ['1767', '🇩🇲'], ['1784', '🇻🇨'],
    ['1787', '🇵🇷'], ['1809', '🇩🇴'], ['1829', '🇩🇴'], ['1849', '🇩🇴'], ['1868', '🇹🇹'],
    ['1869', '🇰🇳'], ['1876', '🇯🇲'], ['1939', '🇵🇷'], ['1', '🇺🇸'], ['52', '🇲🇽'],
    ['53', '🇨🇺'], ['509', '🇭🇹'], ['51', '🇵🇪'], ['54', '🇦🇷'], ['55', '🇧🇷'],
    ['56', '🇨🇱'], ['57', '🇨🇴'], ['58', '🇻🇪'], ['297', '🇦🇼'], ['501', '🇧ℤ'],
    ['502', '🇬🇹'], ['503', '🇸🇻'], ['504', '🇭🇳'], ['505', '🇳🇮'], ['506', '🇨🇷'],
    ['507', '🇵🇦'], ['591', '🇧🇴'], ['592', '🇬🇾'], ['593', '🇪🇨'], ['594', '🇬🇫'],
    ['595', '🇵🇾'], ['597', '🇸🇷'], ['598', '🇺🇾'], ['599', '🇨🇼'], ['7', '🇷🇺'],
    ['30', '🇬🇷'], ['31', '🇳🇱'], ['32', '🇧🇪'], ['33', '🇫🇷'], ['34', '🇪🇸'],
    ['36', '🇭🇺'], ['39', '🇮🇹'], ['40', '🇷🇴'], ['41', '🇨🇭'], ['43', '🇦🇹'],
    ['44', '🇬🇧'], ['45', '🇩🇰'], ['46', '🇸🇪'], ['47', '🇳🇴'], ['48', '🇵🇱'],
    ['49', '🇩🇪'], ['351', '🇵🇹'], ['353', '🇮🇪'], ['358', '🇫🇮'], ['380', '🇺🇦'],
    ['60', '🇲🇾'], ['62', '🇮🇩'], ['63', '🇵🇭'], ['65', '🇸🇬'], ['66', '🇹🇭'],
    ['81', '🇯🇵'], ['82', '🇰🇷'], ['84', '🇻🇳'], ['86', '🇨🇳'], ['90', '🇹🇷'],
    ['91', '🇮🇳'], ['92', '🇵🇰'], ['93', '🇦🇫'], ['94', '🇱🇰'], ['95', '🇲🇲'],
    ['98', '🇮🇷'], ['886', '🇹🇼'], ['966', '🇸🇦'], ['971', '🇦🇪'], ['972', '🇮🇱'],
    ['20', '🇪🇬'], ['27', '🇿🇦'], ['212', '🇲🇦'], ['213', '🇩ℤ'], ['216', '🇹🇳'],
    ['234', '🇳🇬'], ['254', '🇰🇪'], ['255', '🇹ℤ'], ['256', '🇺🇬'], ['263', '🇿🇼'],
    ['61', '🇦🇺'], ['64', '🇳🇿']
];

const getFlag = (numberStr: string): string => {
    for (const [code, flag] of countryFlags) {
        if (numberStr.startsWith(code)) return flag;
    }
    return '🌍';
};

export default {
    command: ['tagall', 'todos', 'all'],
    description: 'Menciona a todos los participantes del grupo',
    category: 'group',
    group: true,
    admin: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        try {
            const groupMetadata = await sock.groupMetadata(chat).catch(() => null);
            if (!groupMetadata) return;

            const participantes = groupMetadata.participants || [];
            const textoExtra = args.length > 0 ? args.join(' ') : 'Sin mensaje';
            const botname = config.botName || 'Bot';

            const parsedParticipants = [];
            for (const u of participantes) {
                const jid = u.id || '';
                const numberOnly = jid.split('@')[0].split(':')[0].replace(/[^\d]/g, "");
                parsedParticipants.push({
                    id: jid,
                    number: numberOnly,
                    flag: getFlag(numberOnly)
                });
            }

            parsedParticipants.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

            let mensaje = `*!  MENCION GENERAL  !*\n`;
            mensaje += `  *PARA ${parsedParticipants.length} MIEMBROS* 🗣️\n\n`;
            mensaje += ` *» Mensaje :* ${textoExtra}\n\n`;
            mensaje += `╭  ┄ 𝅄 ۪꒰ \`⡞᪲=͟͟͞${botname}≼᳞ׄ\` ꒱ ۟ 𝅄 ┄\n`;

            const menciones = [];
            for (const p of parsedParticipants) {
                mensaje += `┊${p.flag} @${p.number}\n`;
                menciones.push(p.id);
            }

            mensaje += `╰⸼ ┄ ┄ ┄ ─  ꒰  ׅ୭ *VIP* ୧ ׅ ꒱  ┄  ─ ┄⸼`;

            queueMicrotask(() => {
                broadcast('tagall_executed', {
                    chat,
                    totalTagged: parsedParticipants.length,
                    triggeredBy: msg.sender
                });
            });

            await sock.sendMessage(chat, { 
                text: mensaje.trim(), 
                contextInfo: { mentionedJid: menciones } 
            }, { quoted: msg });
        } catch (e: any) {
            queueMicrotask(() => {
                broadcast('tagall_error', {
                    chat,
                    error: e?.message || 'Error en tagall'
                });
            });
        }
    }
};
