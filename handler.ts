import { serialize, UserJid } from '#simple';
import { registerData, saveDB } from '#db';
import config from '#config';
import chalk from 'chalk';
import { broadcast } from '#index';
import { LRUCache } from 'lru-cache';
import * as linkify from 'linkifyjs';

const handlerConfig = (config as any)?.handler || {};
const metaTtlMs = handlerConfig.metaTtl || 300000;
const msgTtlMs = handlerConfig.msgTtl || 10000;
const maxGroupCache = handlerConfig.maxGroupCache || 500;
const maxProcessedMsgs = handlerConfig.maxProcessedMsgs || 2000;
const rateLimitWindowMs = handlerConfig.rateLimitWindow || 3000;
const maxCmdsPerWin = handlerConfig.maxCommandsPerWindow || 5;

const groupMetaCache = new LRUCache<string, { metadata: any; ts: number }>({
    max: maxGroupCache,
    ttl: metaTtlMs,
});

const processedMsgIds = new LRUCache<string, boolean>({
    max: maxProcessedMsgs,
    ttl: msgTtlMs,
});

const userRateLimits = new Map<string, { count: number; resetTime: number }>();
const commandMap = new Map<string, any>();
let lastPluginsRef: any = null;

export function invalidateGroupCache(chatId: string): void {
    if (chatId) groupMetaCache.delete(chatId);
}

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of userRateLimits.entries()) {
        if (now > value.resetTime) {
            userRateLimits.delete(key);
        }
    }
}, 60000);

const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function getAdminSet(participants: any[]): Set<string> {
    const adminSet = new Set<string>();
    if (!participants || !participants.length) return adminSet;
    for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (p.admin === 'admin' || p.admin === 'superadmin') {
            if (p.id) adminSet.add(normalizeNumber(p.id));
            if (p.lid) adminSet.add(normalizeNumber(p.lid));
            if (p.phoneNumber) adminSet.add(normalizeNumber(p.phoneNumber));
        }
    }
    return adminSet;
}

function syncCommandMapIfNeeded(): void {
    const currentPlugins = (global as any).plugins;
    if (currentPlugins === lastPluginsRef) return;
    lastPluginsRef = currentPlugins;
    commandMap.clear();
    if (currentPlugins && typeof currentPlugins === 'object') {
        const entries = Object.values(currentPlugins);
        for (let i = 0; i < entries.length; i++) {
            const plugin: any = entries[i];
            if (!plugin?.command) continue;
            if (plugin.eval || plugin.exec || plugin.require || plugin.fs) {
                continue;
            }
            const execFn = plugin.run || plugin.default || (typeof plugin === 'function' ? plugin : null);
            if (!execFn) continue;
            plugin._exec = execFn;
            const cmd = plugin.command;
            if (Array.isArray(cmd)) {
                for (let j = 0; j < cmd.length; j++) {
                    const cmdStr = String(cmd[j]).toLowerCase().trim();
                    commandMap.set(cmdStr, plugin);
                    commandMap.set(normalizeString(cmdStr), plugin);
                }
            } else {
                const cmdStr = String(cmd).toLowerCase().trim();
                commandMap.set(cmdStr, plugin);
                commandMap.set(normalizeString(cmdStr), plugin);
            }
        }
    }
}

async function getGroupMetadata(sock: any, chatId: string): Promise<any> {
    const cached = groupMetaCache.get(chatId);
    if (cached?.metadata) {
        return cached.metadata;
    }
    try {
        const freshMeta = await sock.groupMetadata(chatId);
        if (freshMeta) {
            groupMetaCache.set(chatId, { metadata: freshMeta, ts: Date.now() });
            return freshMeta;
        }
    } catch {}
    return null;
}

function checkRateLimit(sender: string): boolean {
    const now = Date.now();
    let record = userRateLimits.get(sender);
    if (!record || now > record.resetTime) {
        userRateLimits.set(sender, { count: 1, resetTime: now + rateLimitWindowMs });
        return false;
    }
    record.count++;
    return record.count > maxCmdsPerWin;
}

function logHandlerError(e: any): void {
    if (e?.message?.includes('rate-overlimit') || e?.status === 429) return;
    if (!e?.message?.includes('jidDecode')) {
        console.error(chalk.red('[HANDLER ERROR]:'), e);
        queueMicrotask(() => {
            broadcast('handler_error', {
                error: e?.message || 'Unknown error',
                stack: e?.stack
            });
        });
    }
}

export const handler = async (sock: any, rawMsg: any): Promise<any> => {
    const startTime = Date.now();
    
    const msgId = rawMsg?.key?.id;
    if (msgId) {
        if (processedMsgIds.has(msgId)) return;
        processedMsgIds.set(msgId, true);
    }

    const chat = rawMsg?.key?.remoteJid;
    if (!chat) return;

    let realJidResult = rawMsg?.key?.participant || rawMsg?.participant || rawMsg?.key?.fromMe ? sock.user?.id : chat;
    try {
        realJidResult = UserJid(sock, chat, realJidResult) || realJidResult;
    } catch {}

    const normalizedSender = normalizeNumber(realJidResult);
    if (checkRateLimit(normalizedSender)) return;

    const altSender = normalizedSender.startsWith('521') 
        ? normalizedSender.replace(/^521/, '52') 
        : (normalizedSender.startsWith('52') ? normalizedSender.replace(/^52/, '521') : normalizedSender);

    const isGroup = chat.endsWith('@g.us');
    const groupMetadata = isGroup ? await getGroupMetadata(sock, chat) : null;

    const ownerConfig = (config as any)?.owner;
    let isOwner = false;
    if (ownerConfig instanceof Set) { 
        isOwner = ownerConfig.has(normalizedSender) || ownerConfig.has(altSender); 
    } else if (Array.isArray(ownerConfig)) { 
        isOwner = ownerConfig.some((num: string) => { 
            const cleanNum = normalizeNumber(num); 
            return normalizedSender === cleanNum || altSender === cleanNum; 
        }); 
    }

    let isAdmins = false;
    let isBotAdmins = false;

    if (isGroup && groupMetadata?.participants) {
        const adminSet = getAdminSet(groupMetadata.participants);
        isAdmins = adminSet.has(normalizedSender) || adminSet.has(altSender);

        const rawBotJid = sock.user?.id || sock.user?.jid || '';
        const botBase = normalizeNumber(rawBotJid);
        const altBot = botBase.startsWith('521') 
            ? botBase.replace(/^521/, '52') 
            : (botBase.startsWith('52') ? botBase.replace(/^52/, '521') : botBase);

        isBotAdmins = adminSet.has(botBase) || adminSet.has(altBot);
    }

    const dbData = (global as any).db?.data;
    const currentChatDb = dbData?.chats?.[chat] || {};

    if (isGroup && chat && Array.isArray(currentChatDb.muteds)) {
        if ((currentChatDb.muteds.includes(normalizedSender) || currentChatDb.muteds.includes(altSender)) && !isOwner) {
            if (isBotAdmins) {
                sock.sendMessage(chat, { delete: rawMsg.key }).catch(() => null);
            }
            return;
        }
    }

    const msg = serialize(sock, rawMsg);
    if (!msg || !msg.body) return;

    const prefix = (config as any)?.prefix || '.';
    const isCommand = msg.body.charCodeAt(0) === prefix.charCodeAt(0);

    if (isGroup && chat && currentChatDb.antilinks && !isCommand) {
        const detectedLinks = linkify.find(msg.body);
        if (detectedLinks && detectedLinks.length > 0) {
            if (!isOwner && !isAdmins && isBotAdmins) {
                sock.sendMessage(chat, { delete: rawMsg.key }).catch(() => null);
                sock.groupParticipantsUpdate(chat, [msg.sender], 'remove').catch(() => null);
                sock.sendMessage(chat, {
                    text: `✰ @${normalizedSender} fue eliminado por enviar un link.`,
                    mentions: [msg.sender]
                }).catch(() => null);
                return;
            }
        }
    }

    if (!isCommand) return;

    const bodyWithoutPrefix = msg.body.slice(prefix.length).trim();
    if (!bodyWithoutPrefix) return;

    const spaceIndex = bodyWithoutPrefix.indexOf(' ');
    const rawCommand = spaceIndex === -1 ? bodyWithoutPrefix : bodyWithoutPrefix.slice(0, spaceIndex);
    if (!rawCommand) return;

    syncCommandMapIfNeeded();
    const cmd = commandMap.get(rawCommand.toLowerCase()) || commandMap.get(normalizeString(rawCommand));
    if (!cmd) return;

    if (cmd.owner && !isOwner) {
        queueMicrotask(() => {
            broadcast('security_event', {
                type: 'unauthorized_access',
                command: rawCommand,
                sender: normalizedSender,
                chat
            });
        });
        return msg.reply('ׅ  ׄ  ✿ Este comando solo puede ser utilizado por el dueño del bot.');
    }
    if (cmd.group && !isGroup) {
        return msg.reply('ׅ  ׄ  ✿ Este comando solo se puede usar en grupos.');
    }

    if (cmd.admin && !isAdmins && !isOwner) {
        queueMicrotask(() => {
            broadcast('security_event', {
                type: 'unauthorized_admin_command',
                command: rawCommand,
                sender: normalizedSender,
                chat
            });
        });
        return msg.reply('ׅ  ׄ  ✿ Necesitas ser administrador del grupo para usar este comando.');
    }
    if (cmd.botAdmin && !isBotAdmins) {
        return msg.reply('ׅ  ׄ  ✿ El bot necesita ser administrador del grupo para ejecutar este comando.');
    }

    const cleanSender = normalizedSender + '@s.whatsapp.net';

    const rawArgs = spaceIndex === -1 ? [] : bodyWithoutPrefix.slice(spaceIndex + 1).trim().split(/ +/);
    const args = rawArgs.map(arg => arg.replace(/[&;|$`]/g, ''));

    const ctx = {
        ...msg,
        sock,
        m: msg,
        msg,
        args,
        command: rawCommand,
        prefix,
        usedPrefix: prefix,
        owner: isOwner,
        admin: isAdmins,
        botAdmin: isBotAdmins,
        chat,
        db: (global as any).db,
        user: dbData?.users?.[cleanSender] || {},
        chatDb: currentChatDb,
        edit: (text: string, key: any) => {
            if (!key) return Promise.resolve(null);
            return sock.sendMessage(chat, { text, edit: key });
        }
    };

    if (cmd._exec) {
        queueMicrotask(() => {
            broadcast('command_received', {
                msgId,
                command: rawCommand,
                chat,
                sender: msg.sender,
                isGroup,
                timestamp: startTime
            });
            registerData(sock, msg).catch(() => {});
        });

        if (dbData) {
            queueMicrotask(() => {
                if (!dbData.users) dbData.users = {};
                if (!dbData.users[cleanSender]) dbData.users[cleanSender] = {};
                const userDb = dbData.users[cleanSender];
                userDb.usedcommands = (userDb.usedcommands || 0) + 1;
                userDb.exp = (userDb.exp || 0) + Math.floor(Math.random() * 10) + 5;
                if (isGroup && dbData.chats?.[chat]?.users?.[cleanSender]) {
                    dbData.chats[chat].users[cleanSender].lastCmd = Date.now();
                }
                saveDB(chat, cleanSender);
                broadcast('db_updated', {
                    chat,
                    user: cleanSender,
                    exp: userDb.exp,
                    usedcommands: userDb.usedcommands
                });
            });
        }

        queueMicrotask(() => {
            broadcast('command_executing', {
                command: rawCommand,
                chat,
                sender: cleanSender
            });
        });

        try {
            const result = await cmd._exec(ctx);
            
            queueMicrotask(() => {
                broadcast('command_executed', {
                    command: rawCommand,
                    chat,
                    sender: cleanSender,
                    executionTimeMs: Date.now() - startTime
                });
            });

            return result;
        } catch (e: any) {
            logHandlerError(e);
        }
    }
};
