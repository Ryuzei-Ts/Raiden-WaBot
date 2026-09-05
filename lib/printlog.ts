import chalk from 'chalk';
import { WAMessageStubType } from '@whiskeysockets/baileys';

export default async function printMessageLog(m: any, conn: any) {
    if (['protocolMessage', 'senderKeyDistributionMessage', 'keepAliveMessage'].includes(m.mtype)) return;
    if (m.chat === 'status@broadcast') return;

    const cyan = chalk.cyan;
    const lightCyan = chalk.hex('#E0FFFF');
    const darkCyan = chalk.hex('#008B8B');
    const white = chalk.white;

    const chatJid = m.chat;
    const chatName = m.isGroup ? (await conn.groupMetadata(chatJid).catch(() => ({ subject: 'Grupo' }))).subject : 'Privado';
    
    const botJid = conn.user?.jid || conn.user?.id || '';
    const botName = conn.user?.name || conn.user?.verifiedName || (global as any).botName || 'Bot';
    const me = '+' + botJid.split('@')[0].split(':')[0];
    
    if (m.sender === botJid) return;

    const date = new Date(m.messageTimestamp ? 1000 * (Number(m.messageTimestamp)) : Date.now())
        .toLocaleDateString("es-ES", { timeZone: "America/Mexico_City", day: 'numeric', month: 'long', year: 'numeric' });

    let rawType = m.mtype ? m.mtype.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'audio') : 'desconocido';
    const typeClean = rawType.charAt(0).toUpperCase() + rawType.slice(1);
    
    const pushName = m.pushName || m.msg?.pushName || 'Usuario';

    console.log(`${cyan.bold('╭────────────────────────────────···')}
${cyan.bold('│')} ${darkCyan('Bot:')} ${white(me)} ~ ${white(botName)}
${cyan.bold('│')} ${darkCyan('Fecha:')} ${white(date)}
${cyan.bold('│')} ${darkCyan('Usuario:')} ${white(m.sender)}
${cyan.bold('│')} ${darkCyan('Nombre:')} ${white(pushName)}
${cyan.bold('│')} ${darkCyan('Chat:')} ${white(m.isGroup ? 'Grupal ~ ' + chatName : 'Privado ~ ' + chatName)}
${cyan.bold('│')} ${darkCyan('Tipo:')} ${white(typeClean)}
${cyan.bold('╰───────────────────···')}`);

    const isMedia = ['image', 'video', 'sticker', 'audio', 'document'].includes(m.mtype?.replace(/message$/i, ''));
    
    if (isMedia) {
        const mediaKind = m.mtype?.replace(/message$/i, '').toLowerCase();
        console.log(`${darkCyan('  multimedia:')} ${white(mediaKind)}\n`);
    } else if (m.body) {
        console.log(`  ${white(m.body.trim())}\n`);
    }
}
