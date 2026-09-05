import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { UserJid } from '#simple';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = join(__dirname, '../database');
const dbPath = join(dbDir, 'database.db');

export let db: Database.Database;

let stmtGetUser: Database.Statement;
let stmtInsertUser: Database.Statement;
let stmtUpdateUserName: Database.Statement;

let stmtGetChat: Database.Statement;
let stmtInsertChat: Database.Statement;

let stmtGetChatUser: Database.Statement;
let stmtInsertChatUser: Database.Statement;
let stmtUpdateChatUser: Database.Statement;

let processRegistration: (sender: string, pushName: string, chat: string, now: number) => void;

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

    stmtGetUser = db.prepare('SELECT name FROM users WHERE id = ?');
    stmtInsertUser = db.prepare(`
        INSERT INTO users (id, name, exp, level, usedcommands, description, marry, genre, birth)
        VALUES (?, ?, 0, 0, 0, '', '', '', '')
    `);
    stmtUpdateUserName = db.prepare('UPDATE users SET name = ? WHERE id = ?');

    stmtGetChat = db.prepare('SELECT id FROM chats WHERE id = ?');
    stmtInsertChat = db.prepare(`
        INSERT INTO chats (id, muteds, isBanned, welcome, bye, nsfw, alerts, gacha, economy, adminonly, antilinks)
        VALUES (?, '[]', 0, 0, 0, 0, 0, 1, 0, 0, 0)
    `);

    stmtGetChatUser = db.prepare('SELECT messageCount FROM chat_users WHERE chat_id = ? AND user_id = ?');
    stmtInsertChatUser = db.prepare(`
        INSERT INTO chat_users (chat_id, user_id, messageCount, lastSeen, usedTime, lastCmd, coins, bank, afk, afkReason, characters)
        VALUES (?, ?, 1, ?, NULL, 0, 0, 0, -1, '', '[]')
    `);
    stmtUpdateChatUser = db.prepare(`
        UPDATE chat_users 
        SET messageCount = messageCount + 1, lastSeen = ?
        WHERE chat_id = ? AND user_id = ?
    `);

    processRegistration = db.transaction((sender: string, pushName: string, chat: string, now: number) => {
        const existingUser = stmtGetUser.get(sender) as { name?: string } | undefined;
        if (!existingUser) {
            stmtInsertUser.run(sender, pushName);
        } else if (pushName && pushName !== 'Usuario' && existingUser.name !== pushName) {
            stmtUpdateUserName.run(pushName, sender);
        }

        const existingChat = stmtGetChat.get(chat);
        if (!existingChat) {
            stmtInsertChat.run(chat);
        }

        const chatUser = stmtGetChatUser.get(chat, sender);
        if (!chatUser) {
            stmtInsertChatUser.run(chat, sender, now);
        } else {
            stmtUpdateChatUser.run(now, chat, sender);
        }
    });
};

export const isNumber = (x: any): boolean => typeof x === 'number' && !isNaN(x);

export const registerData = async (sock: any, m: any) => {
    try {
        if (!m.sender || !m.chat || m.chat === 'undefined' || m.chat === 'status@broadcast') return;

        let rawSender = await UserJid(sock, m.chat, m.sender);
        if (!rawSender) return;

        let sender = rawSender.split('@')[0] + '@s.whatsapp.net';
        let pushName = m.pushName || m.verifiedBizName || 'Usuario';

        processRegistration(sender, pushName, m.chat, Date.now());
    } catch (e) {
        console.error('Error en registerData:', e);
    }
};
