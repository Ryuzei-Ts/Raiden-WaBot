import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path, { join } from 'path';
import { pathToFileURL } from 'url';
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

export interface Command {
    command: string | string[];
    description?: string;
    category?: string;
    group?: boolean;
    owner?: boolean;
    admin?: boolean;
    botAdmin?: boolean;
    run: (ctx: any) => Promise<any> | any;
}

export const commands = new Map<string, Command>();

export const loadCommands = async (dir = './commands') => {
    const cmdDir = path.resolve(dir);
    if (!fs.existsSync(cmdDir)) return;

    async function getAllFiles(directory: string): Promise<string[]> {
        const entries = await fsPromises.readdir(directory, { withFileTypes: true });
        const files = await Promise.all(entries.map(e => {
            const res = join(directory, e.name);
            return e.isDirectory() ? getAllFiles(res) : Promise.resolve([res]);
        }));
        return files.flat();
    }

    const allFiles = await getAllFiles(cmdDir);
    const files = allFiles.filter(f => 
        (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts')
    );

    const ts = Date.now();
    await Promise.all(
        files.map(async (fullPath) => {
            try {
                const fileUrl = pathToFileURL(fullPath).href;
                const cmd = await import(`${fileUrl}?update=${ts}`);
                const cFile = cmd.default?.default || cmd.default || cmd;

                if (cFile?.command && cFile?.run) {
                    const aliases = Array.isArray(cFile.command) ? cFile.command : [cFile.command];
                    aliases.forEach((alias: string) => {
                        commands.set(alias.toLowerCase(), cFile);
                    });
                }
            } catch (e) {
                console.error(`[ ERROR COMANDO ] No se pudo cargar: ${fullPath}`, e);
            }
        })
    );
};
