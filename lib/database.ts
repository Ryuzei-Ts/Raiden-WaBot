import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { UserJid } from '#simple';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = join(__dirname, '../database');
const dbPath = join(dbDir, 'database.db');

export let db: Database.Database;

if (!(global as any).db) {
    (global as any).db = { data: { users: {}, chats: {} } };
}

let stmtSaveUser: Database.Statement;
let stmtSaveChat: Database.Statement;
let stmtSaveChatUser: Database.Statement;

export const loadDB = () => {
    if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT DEFAULT 'Usuario',
            exp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            usedcommands INTEGER DEFAULT 0,
            description TEXT DEFAULT '',
            marry TEXT DEFAULT '',
            genre TEXT DEFAULT '',
            birth TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            muteds TEXT DEFAULT '[]',
            isBanned INTEGER DEFAULT 0,
            welcome INTEGER DEFAULT 0,
            bye INTEGER DEFAULT 0,
            nsfw INTEGER DEFAULT 0,
            alerts INTEGER DEFAULT 0,
            gacha INTEGER DEFAULT 1,
            economy INTEGER DEFAULT 0,
            adminonly INTEGER DEFAULT 0,
            antilinks INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS chat_users (
            chat_id TEXT,
            user_id TEXT,
            messageCount INTEGER DEFAULT 0,
            lastSeen INTEGER DEFAULT 0,
            usedTime INTEGER DEFAULT NULL,
            lastCmd INTEGER DEFAULT 0,
            coins INTEGER DEFAULT 0,
            bank INTEGER DEFAULT 0,
            afk INTEGER DEFAULT -1,
            afkReason TEXT DEFAULT '',
            characters TEXT DEFAULT '[]',
            PRIMARY KEY (chat_id, user_id)
        );
    `);

    try { db.exec("ALTER TABLE chats ADD COLUMN characters TEXT DEFAULT '{}'"); } catch {}
    try { db.exec("ALTER TABLE chats ADD COLUMN rolls TEXT DEFAULT '{}'"); } catch {}
    try { db.exec("ALTER TABLE chat_users ADD COLUMN stats TEXT DEFAULT '{}'"); } catch {}

    stmtSaveUser = db.prepare(`
        INSERT INTO users (id, name, exp, level, usedcommands, description, marry, genre, birth)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            exp = excluded.exp,
            level = excluded.level,
            usedcommands = excluded.usedcommands,
            description = excluded.description,
            marry = excluded.marry,
            genre = excluded.genre,
            birth = excluded.birth
    `);

    stmtSaveChat = db.prepare(`
        INSERT INTO chats (id, muteds, isBanned, welcome, bye, nsfw, alerts, gacha, economy, adminonly, antilinks, characters, rolls)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            muteds = excluded.muteds,
            isBanned = excluded.isBanned,
            welcome = excluded.welcome,
            bye = excluded.bye,
            nsfw = excluded.nsfw,
            alerts = excluded.alerts,
            gacha = excluded.gacha,
            economy = excluded.economy,
            adminonly = excluded.adminonly,
            antilinks = excluded.antilinks,
            characters = excluded.characters,
            rolls = excluded.rolls
    `);

    stmtSaveChatUser = db.prepare(`
        INSERT INTO chat_users (chat_id, user_id, messageCount, lastSeen, usedTime, lastCmd, coins, bank, afk, afkReason, characters, stats)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(chat_id, user_id) DO UPDATE SET
            messageCount = excluded.messageCount,
            lastSeen = excluded.lastSeen,
            usedTime = excluded.usedTime,
            lastCmd = excluded.lastCmd,
            coins = excluded.coins,
            bank = excluded.bank,
            afk = excluded.afk,
            afkReason = excluded.afkReason,
            characters = excluded.characters,
            stats = excluded.stats
    `);

    const usersRows = db.prepare('SELECT * FROM users').all() as any[];
    for (const u of usersRows) {
        (global as any).db.data.users[u.id] = { ...u };
    }

    const chatsRows = db.prepare('SELECT * FROM chats').all() as any[];
    for (const c of chatsRows) {
        (global as any).db.data.chats[c.id] ||= {};
        const chatObj = (global as any).db.data.chats[c.id];
        chatObj.muteds = JSON.parse(c.muteds || '[]');
        chatObj.isBanned = Boolean(c.isBanned);
        chatObj.welcome = Boolean(c.welcome);
        chatObj.bye = Boolean(c.bye);
        chatObj.nsfw = Boolean(c.nsfw);
        chatObj.alerts = Boolean(c.alerts);
        chatObj.gacha = Boolean(c.gacha);
        chatObj.economy = Boolean(c.economy);
        chatObj.adminonly = Boolean(c.adminonly);
        chatObj.antilinks = Boolean(c.antilinks);
        chatObj.characters = JSON.parse(c.characters || '{}');
        chatObj.rolls = JSON.parse(c.rolls || '{}');
        chatObj.users ||= {};
    }

    const chatUsersRows = db.prepare('SELECT * FROM chat_users').all() as any[];
    for (const cu of chatUsersRows) {
        if (!(global as any).db.data.chats[cu.chat_id]) {
            (global as any).db.data.chats[cu.chat_id] = { users: {} };
        }
        const chatObj = (global as any).db.data.chats[cu.chat_id];
        chatObj.users ||= {};
        chatObj.users[cu.user_id] = {
            ...cu,
            characters: JSON.parse(cu.characters || '[]'),
            stats: JSON.parse(cu.stats || '{}')
        };
        delete chatObj.users[cu.user_id].chat_id;
        delete chatObj.users[cu.user_id].user_id;
    }
};

export const saveDB = (chatId?: string, senderId?: string) => {
    try {
        if (!db) return;

        if (senderId && (global as any).db.data.users[senderId]) {
            const u = (global as any).db.data.users[senderId];
            stmtSaveUser.run(
                senderId,
                u.name || 'Usuario',
                u.exp || 0,
                u.level || 0,
                u.usedcommands || 0,
                u.description || '',
                u.marry || '',
                u.genre || '',
                u.birth || ''
            );
        }

        if (chatId && (global as any).db.data.chats[chatId]) {
            const c = (global as any).db.data.chats[chatId];
            stmtSaveChat.run(
                chatId,
                JSON.stringify(c.muteds || []),
                c.isBanned ? 1 : 0,
                c.welcome ? 1 : 0,
                c.bye ? 1 : 0,
                c.nsfw ? 1 : 0,
                c.alerts ? 1 : 0,
                c.gacha ? 1 : 0,
                c.economy ? 1 : 0,
                c.adminonly ? 1 : 0,
                c.antilinks ? 1 : 0,
                JSON.stringify(c.characters || {}),
                JSON.stringify(c.rolls || {})
            );

            if (senderId && c.users?.[senderId]) {
                const cu = c.users[senderId];
                stmtSaveChatUser.run(
                    chatId,
                    senderId,
                    cu.messageCount || 0,
                    cu.lastSeen || Date.now(),
                    cu.usedTime ?? null,
                    cu.lastCmd || 0,
                    cu.coins || 0,
                    cu.bank || 0,
                    cu.afk ?? -1,
                    cu.afkReason || '',
                    JSON.stringify(cu.characters || []),
                    JSON.stringify(cu.stats || {})
                );
            }
        }
    } catch (e) {
        console.error('Error en saveDB:', e);
    }
};

export const isNumber = (x: any): boolean => typeof x === 'number' && !isNaN(x);

export const registerData = async (sock: any, m: any) => {
    try {
        if (!m.sender || !m.chat || m.chat === 'undefined' || m.chat === 'status@broadcast') return;

        let rawSender = await UserJid(sock, m.chat, m.sender);
        if (!rawSender) return;

        let sender = rawSender.split('@')[0] + '@s.whatsapp.net';

        const user = (global as any).db.data.users[sender] ||= {};
        if (m.pushName && user.name !== m.pushName) user.name = m.pushName;
        user.name ??= 'Usuario';
        user.exp = isNumber(user.exp) ? user.exp : 0;
        user.level = isNumber(user.level) ? user.level : 0;
        user.usedcommands = isNumber(user.usedcommands) ? user.usedcommands : 0;
        user.description ??= '';
        user.marry ??= '';
        user.genre ??= '';
        user.birth ??= '';

        const chat = (global as any).db.data.chats[m.chat] ||= {};
        chat.users ||= {};
        chat.characters ||= {};
        chat.rolls ||= {};
        chat.muteds ??= [];
        chat.isBanned ??= false;
        chat.welcome ??= false;
        chat.bye ??= false;
        chat.nsfw ??= false;
        chat.alerts ??= false;
        chat.gacha ??= true;
        chat.economy ??= false;
        chat.adminonly ??= false;
        chat.antilinks ??= false;

        chat.users[sender] ||= {};
        chat.users[sender].messageCount = (chat.users[sender].messageCount || 0) + 1;
        chat.users[sender].lastSeen = Date.now();
        chat.users[sender].stats ||= {};
        chat.users[sender].usedTime ??= null;
        chat.users[sender].lastCmd = isNumber(chat.users[sender].lastCmd) ? chat.users[sender].lastCmd : 0;
        chat.users[sender].coins = isNumber(chat.users[sender].coins) ? chat.users[sender].coins : 0;
        chat.users[sender].bank = isNumber(chat.users[sender].bank) ? chat.users[sender].bank : 0;
        chat.users[sender].afk = isNumber(chat.users[sender].afk) ? chat.users[sender].afk : -1;
        chat.users[sender].afkReason ??= '';
        chat.users[sender].characters = Array.isArray(chat.users[sender].characters) ? chat.users[sender].characters : [];

        saveDB(m.chat, sender);
    } catch (e) {
        console.error('Error en registerData:', e);
    }
};
