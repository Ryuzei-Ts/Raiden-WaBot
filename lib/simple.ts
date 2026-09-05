import fs from 'fs';
import path from 'path';
import { proto, getContentType, jidDecode, downloadContentFromMessage } from '@whiskeysockets/baileys';

export const lidCache = new Map<string, string>();

export const UserJid = (sock: any, chat?: string, jid?: string): string => {
    const targetJid = jid || chat;
    if (!targetJid) return '';

    if (targetJid.endsWith('@s.whatsapp.net') || targetJid.endsWith('@g.us')) {
        return targetJid;
    }

    const lidMatch = targetJid.match(/^([^@]+)@lid$/);
    if (!lidMatch) return targetJid;

    const lidNumber = lidMatch[1];

    if (lidCache.has(lidNumber)) {
        return lidCache.get(lidNumber)!;
    }

    if (sock && sock.signalRepository && sock.signalRepository.lidMapping) {
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

export const decodeJid = (jid: string): string => {
    if (!jid) return jid;
    if (jid.includes(':')) {
        const decoded = jidDecode(jid);
        return decoded ? `${decoded.user}@${decoded.server}` : jid;
    }
    return jid;
};

const messageCache = new WeakMap();

export function serialize(sock: any, m: proto.IWebMessageInfo) {
    if (!m?.message) return null;

    if (messageCache.has(m)) {
        return messageCache.get(m);
    }

    const msgType = getContentType(m.message);
    if (!msgType) return null;

    let msg = m.message[msgType];

    if (msgType === 'viewOnceMessage' || msgType === 'ephemeralMessage') {
        msg = (msg as any)?.message || msg;
    }

    const body = 
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        msg?.videoMessage?.caption ||
        msg?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
        msg?.buttonsResponseMessage?.selectedButtonId ||
        msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg?.templateButtonReplyMessage?.selectedId ||
        '';

    const key = m.key;
    const remoteJid = key.remoteJid || '';
    const chat = decodeJid(remoteJid);
    const sender = decodeJid(key.participant || remoteJid);
    const isGroup = chat.endsWith('@g.us');
    const isBot = !!key.fromMe;

    let quoted = null;
    const contextInfo = msg?.contextInfo;
    if (contextInfo?.quotedMessage) {
        const quotedMsg = contextInfo.quotedMessage;
        const quotedType = getContentType(quotedMsg);
        const quotedBody = 
            quotedMsg?.conversation ||
            quotedMsg?.extendedTextMessage?.text ||
            '';

        quoted = {
            type: quotedType,
            msg: quotedMsg,
            key: {
                remoteJid: chat,
                fromMe: contextInfo.participant === sock.user?.id,
                id: contextInfo.stanzaId,
                participant: contextInfo.participant
            },
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
        }
    };

    messageCache.set(m, result);

    return result;
}

export interface Command {
    command: string[];
    description?: string;
    category?: string;
    group?: boolean;
    owner?: boolean;
    admin?: boolean;
    botAdmin?: boolean;
    run: (ctx: any) => Promise<void> | void;
}

export const commands = new Map<string, Command>();

export const loadCommands = async (dir = './commands') => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            await loadCommands(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            try {
                const resolvedPath = path.resolve(fullPath);
                const fileUrl = process.platform === 'win32' 
                    ? `file:///${resolvedPath.replace(/\\/g, '/')}` 
                    : `file://${resolvedPath}`;

                const commandModule = await import(`${fileUrl}?v=${Date.now()}`);
                const command: Command = commandModule.default || commandModule;

                if (command && Array.isArray(command.command) && command.command.length > 0) {
                    for (const alias of command.command) {
                        commands.set(alias.toLowerCase(), command);
                    }
                }
            } catch (err) {
                console.error(`Error cargando comando en ${fullPath}:`, err);
            }
        }
    }
};
