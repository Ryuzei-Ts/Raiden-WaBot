import { serialize, UserJid } from '#simple';
import { registerData, saveDB } from '#db';
import config from '#config';
import chalk from 'chalk';

const groupMetaCache = new Map<string, { metadata: any; ts: number }>();
const META_TTL = 5000;
const commandMap = new Map<string, any>();
let lastPluginsRef: any = null;

function syncCommandMap() {
    if (global.plugins === lastPluginsRef) return;
    commandMap.clear();
    lastPluginsRef = global.plugins;
    if (global.plugins && typeof global.plugins === 'object') {
        for (const name in global.plugins) {
            const plugin = (global.plugins as any)[name];
            if (!plugin?.command) continue;
            const aliases = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
            for (const alias of aliases) commandMap.set(alias.toLowerCase(), plugin);
        }
    }
}

function getCachedMeta(groupJid: string) {
    const c = groupMetaCache.get(groupJid);
    if (!c || Date.now() - c.ts > META_TTL) return null;
    return c.metadata;
}

function setCachedMeta(groupJid: string, metadata: any) {
    groupMetaCache.set(groupJid, { metadata, ts: Date.now() });
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
        const msg = serialize(sock, rawMsg);
        if (!msg || !msg.body) return;
        const prefix = config.prefix || '.';
        if (!msg.body.startsWith(prefix)) return;
        const args = msg.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;
        syncCommandMap();
        const cmd = commandMap.get(commandName);
        if (!cmd) return;
        queueMicrotask(() => { registerData(sock, msg).catch(() => {}); });
        if (global.plugins && typeof global.plugins === 'object') {
            for (const name in global.plugins) {
                const plugin = (global.plugins as any)[name];
                if (plugin?.before && typeof plugin.before === "function") plugin.before.call(sock, msg, { sock }).catch(() => {});
            }
        }
        let realJid = msg.sender;
        try { realJid = UserJid(sock, msg.chat, msg.sender) || msg.sender; } catch { realJid = msg.sender; }
        const groupMetadata = msg.isGroup ? await getGroupMetadata(sock, msg.chat) : null;
        const normalizedSender = normalizeNumber(realJid);
        const ownerConfig = config.owner || (global as any)?.owner || [];
        const allOwnerNumbers = (Array.isArray(ownerConfig) ? ownerConfig : Object.values(ownerConfig).flat()) as string[];
        const isOwner = allOwnerNumbers.some((num: string) => {
            const cleanNum = normalizeNumber(num);
            return (normalizedSender === cleanNum || normalizedSender.replace(/^521/, '52') === cleanNum.replace(/^521/, '52'));
        });
        if (cmd.owner && !isOwner) { msg.reply('❌ Este comando solo puede ser utilizado por el dueño del bot.'); return; }
        if (cmd.group && !msg.isGroup) { msg.reply('❌ Este comando solo se puede usar en grupos.'); return; }
        const participants = groupMetadata?.participants || [];
        const isAdmins = msg.isGroup ? isParticipantAdmin(participants, msg.sender?.split('@')[0]) : false;
        const rawBotJid = sock.user?.id || sock.user?.jid || '';
        const botBase = rawBotJid.split('@')[0].split(':')[0];
        const isBotAdmins = msg.isGroup ? isParticipantAdmin(participants, botBase) : false;
        if (cmd.admin && !isAdmins && !isOwner) { msg.reply('❌ Necesitas ser administrador del grupo para usar este comando.'); return; }
        if (cmd.botAdmin && !isBotAdmins) { msg.reply('❌ El bot necesita ser administrador del grupo para ejecutar este comando.'); return; }
        const cleanSender = realJid.split('@')[0].split(':')[0] + '@s.whatsapp.net';
        const dbData = (global as any).db?.data;
        if (dbData) {
            const userDb = dbData.users?.[cleanSender];
            if (userDb) { userDb.usedcommands = (userDb.usedcommands || 0) + 1; userDb.exp = (userDb.exp || 0) + Math.floor(Math.random() * 10) + 5; }
            if (msg.isGroup && dbData.chats?.[msg.chat]?.users?.[cleanSender]) { dbData.chats[msg.chat].users[cleanSender].lastCmd = Date.now(); }
            queueMicrotask(() => saveDB(msg.chat, cleanSender));
        }
        const ctx = { ...msg, sock, m: msg, msg, args, command: commandName, prefix, usedPrefix: prefix, owner: isOwner, admin: isAdmins, botAdmin: isBotAdmins, type: msg.type, body: msg.body, chat: msg.chat, sender: msg.sender, from: msg.from, isGroup: msg.isGroup, quoted: msg.quoted, reply: msg.reply, db: (global as any).db, user: dbData?.users?.[cleanSender] || {}, chatDb: dbData?.chats?.[msg.chat] || {}, edit: (text: string, key: any) => { if (!key) return Promise.resolve(null); return sock.sendMessage(msg.chat, { text, edit: key }); } };
        const executeCommand = cmd.run || cmd.default || (typeof cmd === 'function' ? cmd : null);
        if (executeCommand) await executeCommand(ctx);
    } catch (e: any) {
        if (e?.message?.includes('rate-overlimit') || e?.status === 429) return;
        if (!e?.message?.includes('jidDecode')) console.error(chalk.red('Error en handler:'), e);
    }
};
