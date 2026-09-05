import fs from 'fs';
import path from 'path';
import { proto, getContentType, jidDecode, downloadContentFromMessage } from '@whiskeysockets/baileys';

export const lidCache = new Map<string, string>();

export const decodeJid = (jid: any): string => {
    if (!jid || typeof jid !== 'string') return '';
    if (jid.includes(':')) {
        const decoded = jidDecode(jid);
        return decoded?.user && decoded?.server ? `${decoded.user}@${decoded.server}` : jid;
    }
    return jid;
};

export const UserJid = (sock: any, chat?: string, jid?: string): string => {
    const targetJid = jid || chat;
    if (!targetJid || typeof targetJid !== 'string') return '';

    if (targetJid.endsWith('@s.whatsapp.net') || targetJid.endsWith('@g.us')) {
        return targetJid;
    }

    const lidMatch = targetJid.match(/^([^@]+)@lid$/);
    if (!lidMatch) return targetJid;

    const lidNumber = lidMatch[1];

    if (lidCache.has(lidNumber)) {
        return lidCache.get(lidNumber)!;
    }

    if (sock?.signalRepository?.lidMapping) {
        try {
            const cachedPn = sock.signalRepository.lidMapping.mappingCache?.get(`lid:${lidNumber}`);
            if (cachedPn) {
                const resolvedJid = `${cachedPn}@s.whatsapp.net`;
                lidCache.set(lidNumber, resolvedJid);
                return resolvedJid;
            }
        } catch (err) {}
    }

    const sessionDir = path.join(process.cwd(), 'Session');
    const mappingFile = path.join(sessionDir, `lid-mapping-${lidNumber}_reverse.json`);

    try {
        if (fs.existsSync(mappingFile)) {
            const phoneStr = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
            if (phoneStr) {
                const resolvedJid = `${phoneStr}@s.whatsapp.net`;
                lidCache.set(lidNumber, resolvedJid);
                return resolvedJid;
            }
        }
    } catch (err) {}

    return targetJid;
};

const messageCache = new WeakMap();

export function serialize(sock: any, m: proto.IWebMessageInfo) {
    if (!m?.message) return null;

    if (messageCache.has(m)) {
        return messageCache.get(m);
    }

    let rawMsg: any = m.message;

    if (rawMsg.ephemeralMessage) rawMsg = rawMsg.ephemeralMessage.message;
    if (rawMsg.viewOnceMessage) rawMsg = rawMsg.viewOnceMessage.message;
    if (rawMsg.viewOnceMessageV2) rawMsg = rawMsg.viewOnceMessageV2.message;
    if (rawMsg.viewOnceMessageV2Extension) rawMsg = rawMsg.viewOnceMessageV2Extension.message;
    if (rawMsg.documentWithCaptionMessage) rawMsg = rawMsg.documentWithCaptionMessage.message;

    const msgType = getContentType(rawMsg);
    if (!msgType) return null;

    const msg = rawMsg[msgType];

    const body = 
        rawMsg?.conversation ||
        msg?.text ||
        msg?.caption ||
        msg?.selectedButtonId ||
        msg?.singleSelectReply?.selectedRowId ||
        msg?.selectedId ||
        '';

    const key = m.key;
    const remoteJid = decodeJid(key.remoteJid || '');
    
    const chat = UserJid(sock, remoteJid);
    const rawSender = decodeJid(key.participant || remoteJid);
    const sender = UserJid(sock, chat, rawSender);

    const isGroup = chat.endsWith('@g.us');
    const isBot = !!key.fromMe;

    let quoted = null;
    const contextInfo = msg?.contextInfo || rawMsg?.contextInfo;
    if (contextInfo?.quotedMessage) {
        let quotedRaw = contextInfo.quotedMessage;
        if (quotedRaw.ephemeralMessage) quotedRaw = quotedRaw.ephemeralMessage.message;
        if (quotedRaw.viewOnceMessage) quotedRaw = quotedRaw.viewOnceMessage.message;
        if (quotedRaw.viewOnceMessageV2) quotedRaw = quotedRaw.viewOnceMessageV2.message;

        const quotedType = getContentType(quotedRaw);
        const quotedMsg = quotedType ? quotedRaw[quotedType] : null;

        const quotedBody = 
            quotedRaw?.conversation ||
            quotedMsg?.text ||
            quotedMsg?.caption ||
            '';

        const quotedParticipant = decodeJid(contextInfo.participant || '');

        quoted = {
            type: quotedType,
            msg: quotedMsg,
            key: {
                remoteJid: chat,
                fromMe: quotedParticipant === sock.user?.id,
                id: contextInfo.stanzaId,
                participant: UserJid(sock, chat, quotedParticipant)
            },
            sender: UserJid(sock, chat, quotedParticipant),
            body: quotedBody
        };
    }

    const result = {
        ...m,
        type: msgType,
        body,
        chat,
        sender,
        from: chat,
        isGroup,
        isBot,
        quoted,
        reply: (text: string) => {
            return sock.sendMessage(chat, { text }, { quoted: m });
        },
        download: async () => {
            const media = msg;
            if (!media) return null;

            const stream = await downloadContentFromMessage(
                media as any,
                msgType.replace('Message', '') as any
            );

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        }
    };

    messageCache.set(m, result);

    return result;
}
