import fs from 'fs';
import path from 'path';
import { proto, getContentType, jidDecode, downloadContentFromMessage } from '@whiskeysockets/baileys';

const sessionDirConfig = path.join(process.cwd(), 'Session');
const maxLidCacheSize = 5000;

export const lidCache = new Map<string, string>();

function setLidCache(lid: string, jid: string): void {
    if (lidCache.size >= maxLidCacheSize) {
        const firstKey = lidCache.keys().next().value;
        if (firstKey) lidCache.delete(firstKey);
    }
    lidCache.set(lid, jid);
}

const messageCache = new WeakMap<object, any>();
const contentTypeCache = new WeakMap<object, string | undefined>();

export const decodeJid = (jid: any): string => {
    if (!jid || typeof jid !== 'string') return '';
    if (jid.includes(':')) {
        const decoded = jidDecode(jid);
        return decoded?.user && decoded?.server ? `${decoded.user}@${decoded.server}` : jid;
    }
    return jid;
};

function getCachedContentType(rawMsg: any): string | undefined {
    if (!rawMsg || typeof rawMsg !== 'object') return undefined;
    if (contentTypeCache.has(rawMsg)) {
        return contentTypeCache.get(rawMsg);
    }
    const type = getContentType(rawMsg);
    contentTypeCache.set(rawMsg, type);
    return type;
}

function unwrapMessage(message: any): any {
    if (!message || typeof message !== 'object') return message;
    let raw = message;

    if (raw.ephemeralMessage) raw = raw.ephemeralMessage.message;
    if (raw.viewOnceMessage) raw = raw.viewOnceMessage.message;
    if (raw.viewOnceMessageV2) raw = raw.viewOnceMessageV2.message;
    if (raw.viewOnceMessageV2Extension) raw = raw.viewOnceMessageV2Extension.message;
    if (raw.documentWithCaptionMessage) raw = raw.documentWithCaptionMessage.message;

    return raw;
}

function extractMessageBody(rawMsg: any, msgContent: any): string {
    if (!rawMsg) return '';
    return (
        rawMsg.conversation ||
        msgContent?.text ||
        msgContent?.caption ||
        msgContent?.selectedButtonId ||
        msgContent?.singleSelectReply?.selectedRowId ||
        msgContent?.selectedId ||
        ''
    );
}

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
                setLidCache(lidNumber, resolvedJid);
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
                setLidCache(lidNumber, resolvedJid);
                return resolvedJid;
            }
        }
    } catch (err) {}

    return targetJid;
};

function processQuotedMessage(sock: any, chatJid: string, contextInfo: any): any {
    if (!contextInfo?.quotedMessage) return null;

    try {
        const quotedRaw = unwrapMessage(contextInfo.quotedMessage);
        const quotedType = getCachedContentType(quotedRaw);
        const quotedMsg = quotedType ? quotedRaw[quotedType] : null;

        const quotedBody = 
            quotedRaw?.conversation ||
            quotedMsg?.text ||
            quotedMsg?.caption ||
            '';

        const quotedParticipant = decodeJid(contextInfo.participant || '');
        const resolvedParticipant = UserJid(sock, chatJid, quotedParticipant);

        return {
            type: quotedType,
            msg: quotedMsg,
            key: {
                remoteJid: chatJid,
                fromMe: quotedParticipant === sock.user?.id,
                id: contextInfo.stanzaId,
                participant: resolvedParticipant
            },
            sender: resolvedParticipant,
            body: quotedBody
        };
    } catch (error) {
        console.error('[SERIALIZE ERROR]:', error);
        return null;
    }
}

export function serialize(sock: any, m: proto.IWebMessageInfo): any {
    if (!m || typeof m !== 'object' || !m.message) {
        return null;
    }

    if (messageCache.has(m)) {
        return messageCache.get(m);
    }

    try {
        const rawMsg = unwrapMessage(m.message);
        const msgType = getCachedContentType(rawMsg);
        
        if (!msgType) return null;

        const msg = rawMsg[msgType];
        const body = extractMessageBody(rawMsg, msg);

        const key = m.key || {};
        const remoteJid = decodeJid(key.remoteJid || '');
        
        const chat = UserJid(sock, remoteJid);
        const rawSender = decodeJid(key.participant || remoteJid);
        const sender = UserJid(sock, chat, rawSender);

        const isGroup = chat.endsWith('@g.us');
        const isBot = !!key.fromMe;

        const contextInfo = msg?.contextInfo || rawMsg?.contextInfo;
        const quoted = processQuotedMessage(sock, chat, contextInfo);

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
                if (!chat) {
                    console.error('[SERIALIZE ERROR]: Chat JID missing');
                    return Promise.reject(new Error('Chat JID missing'));
                }
                return sock.sendMessage(chat, { text }, { quoted: m });
            },
            download: async (): Promise<Buffer | null> => {
                const media = msg;
                if (!media) return null;

                try {
                    const stream = await downloadContentFromMessage(
                        media as any,
                        msgType.replace('Message', '') as any
                    );

                    const chunks: Buffer[] = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    return Buffer.concat(chunks);
                } catch (downloadError) {
                    console.error('[SERIALIZE ERROR]:', downloadError);
                    return null;
                }
            }
        };

        messageCache.set(m, result);
        return result;

    } catch (error) {
        console.error('[SERIALIZE ERROR]:', error);
        return null;
    }
}
