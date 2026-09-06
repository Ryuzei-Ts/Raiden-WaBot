import { serialize, UserJid } from '#simple';
import { registerData, saveDB } from '#db';
import config from '#config';
import chalk from 'chalk';
import { broadcast } from '#index';

const groupMetaCache = new Map<string, { metadata: any; ts: number }>();
const metaTtl = 5000;
const commandMap = new Map<string, any>();
let lastPluginsRef: any = null;
const processedMsgIds = new Set<string>();
const msgTtl = 10000;

function syncCommandMap() {
    if (global.plugins === lastPluginsRef) return;
    lastPluginsRef = global.plugins;
    commandMap.clear();
    if (lastPluginsRef && typeof lastPluginsRef === 'object') {
        const keys = Object.keys(lastPluginsRef);
        for (let i = 0; i < keys.length; i++) {
            const plugin = lastPluginsRef[keys[i]];
            if (!plugin?.command) continue;
            if (plugin.run || plugin.default) { plugin._exec = plugin.run || plugin.default; } 
            else if (typeof plugin === 'function') { plugin._exec = plugin; }
            const cmd = plugin.command;
            if (Array.isArray(cmd)) { for (let j = 0; j < cmd.length; j++) commandMap.set(String(cmd[j]).toLowerCase(), plugin); } 
            else { commandMap.set(String(cmd).toLowerCase(), plugin); }
        }
    }
}

function getCachedMeta(groupJid: string) {
    const c = groupMetaCache.get(groupJid);
    if (!c || Date.now() - c.ts > metaTtl) { if (c) groupMetaCache.delete(groupJid); return null; }
    return c.metadata;
}

function setCachedMeta(groupJid: string, metadata: any) {
    groupMetaCache.set(groupJid, { metadata, ts: Date.now() });
    setTimeout(() => { const c = groupMetaCache.get(groupJid); if (c && Date.now() - c.ts >= metaTtl) groupMetaCache.delete(groupJid); }, metaTtl);
}

async function getGroupMetadata(sock: any, chatId: string) {
    let metadata = getCachedMeta(chatId);
    if (!metadata) { metadata = await sock.groupMetadata(chatId).catch(() => null); if (metadata) setCachedMeta(chatId, metadata); }
    return metadata;
}

function isParticipantAdmin(participants: any[], userBase: string) {
    if (!participants || !userBase) return false;
    return participants.some(p => {
        if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
        return (p.id?.split('@')[0] === userBase || p.lid?.split('@')[0] === userBase || p.phoneNumber?.split('@')[0] === userBase);
    });
}

const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

export const handler = async (sock: any, rawMsg: any) => {
    try {
        const msgId = rawMsg?.key?.id;
        if (msgId) {
            if (processedMsgIds.has(msgId)) return;
            processedMsgIds.add(msgId);
            setTimeout(() => processedMsgIds.delete(msgId), msgTtl);
        }
        const msg = serialize(sock, rawMsg);
        if (!msg || !msg.body) return;
        const chat = msg.chat || msg.from || rawMsg?.key?.remoteJid;
        if (!chat) return;
        const prefix = config.prefix || '.';
        if (!msg.body.startsWith(prefix)) return;
        const args = msg.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;
        syncCommandMap();
        const cmd = commandMap.get(commandName);
        if (!cmd) return;

        broadcast('command_received', {
            msgId,
            command: commandName,
            chat,
            sender: msg.sender,
            isGroup: msg.isGroup
        });

        queueMicrotask(() => { registerData(sock, msg).catch(() => {}); });
        let realJid = msg.sender;
        try { realJid = UserJid(sock, chat, msg.sender) || msg.sender; } catch { realJid = msg.sender; }
        const normalizedSender = normalizeNumber(realJid);
        const altSender = normalizedSender.startsWith('521') ? normalizedSender.replace(/^521/, '52') : (normalizedSender.startsWith('52') ? normalizedSender.replace(/^52/, '521') : normalizedSender);
        const groupMetadata = msg.isGroup ? await getGroupMetadata(sock, chat) : null;
        const ownerConfig = config.owner;
        let isOwner = false;
        if (ownerConfig instanceof Set) { isOwner = ownerConfig.has(normalizedSender) || ownerConfig.has(altSender); } 
        else if (Array.isArray(ownerConfig)) { isOwner = ownerConfig.some((num: string) => { const cleanNum = normalizeNumber(num); return normalizedSender === cleanNum || altSender === cleanNum; }); }
        if (cmd.owner && !isOwner) { msg.reply('ׅ  ׄ  ✿ Este comando solo puede ser utilizado por el dueño del bot.'); return; }
        if (cmd.group && !msg.isGroup) { msg.reply('ׅ  ׄ  ✿ Este comando solo se puede usar en grupos.'); return; }
        const participants = groupMetadata?.participants || [];
        const isAdmins = msg.isGroup ? (isParticipantAdmin(participants, normalizedSender) || isParticipantAdmin(participants, altSender)) : false;
        const rawBotJid = sock.user?.id || sock.user?.jid || '';
        const botBase = normalizeNumber(rawBotJid);
        const isBotAdmins = msg.isGroup ? isParticipantAdmin(participants, botBase) : false;
        if (cmd.admin && !isAdmins && !isOwner) { msg.reply('ׅ  ׄ  ✿ Necesitas ser administrador del grupo para usar este comando.'); return; }
        if (cmd.botAdmin && !isBotAdmins) { msg.reply('ׅ  ׄ  ✿ El bot necesita ser administrador del grupo para ejecutar este comando.'); return; }
        const cleanSender = realJid.split('@')[0].split(':')[0] + '@s.whatsapp.net';
        const dbData = (global as any).db?.data;
        queueMicrotask(() => {
            if (dbData) {
                if (!dbData.users) dbData.users = {};
                if (!dbData.users[cleanSender]) {
                    dbData.users[cleanSender] = { exp: 0, usedcommands: 0 };
                }
                const userDb = dbData.users[cleanSender];
                userDb.usedcommands = (userDb.usedcommands || 0) + 1; 
                userDb.exp = (userDb.exp || 0) + Math.floor(Math.random() * 10) + 5; 
                if (msg.isGroup && dbData.chats?.[chat]?.users?.[cleanSender]) { dbData.chats[chat].users[cleanSender].lastCmd = Date.now(); }
                saveDB(chat, cleanSender);

                broadcast('db_updated', {
                    chat,
                    user: cleanSender,
                    exp: userDb?.exp,
                    usedcommands: userDb?.usedcommands
                });
            }
        });
        const ctx = { ...msg, sock, m: msg, msg, args, command: commandName, prefix, usedPrefix: prefix, owner: isOwner, admin: isAdmins, botAdmin: isBotAdmins, chat, db: (global as any).db, user: dbData?.users?.[cleanSender] || {}, chatDb: dbData?.chats?.[chat] || {}, edit: (text: string, key: any) => { if (!key) return Promise.resolve(null); return sock.sendMessage(chat, { text, edit: key }); } };
        
        if (cmd._exec) {
            broadcast('command_executing', { command: commandName, chat, sender: cleanSender });
            return await cmd._exec(ctx);
        }
    } catch (e: any) {
        if (e?.message?.includes('rate-overlimit') || e?.status === 429) return;
        if (!e?.message?.includes('jidDecode')) {
            console.error(chalk.red('Error en handler:'), e);
            broadcast('handler_error', { error: e?.message || 'Unknown error' });
        }
    }
};
