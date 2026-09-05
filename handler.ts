import { serialize, UserJid } from '#simple';
import { registerData } from '#db';
import config from '#config';
import chalk from 'chalk';

const groupMetaCache = new Map<string, { metadata: any; ts: number }>();
const META_TTL = 5000;

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
    if (!metadata) {
        metadata = await sock.groupMetadata(chatId).catch(() => null);
        if (metadata) setCachedMeta(chatId, metadata);
    }
    return metadata;
}

function isUserAdmin(participants: any[], userId: string) {
    if (!participants || !Array.isArray(participants)) return false;
    const userBase = userId?.split('@')[0];
    if (!userBase) return false;

    return participants.some(p => {
        if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;

        const ids = [
            p.id?.split('@')[0],
            p.lid?.split('@')[0],
            p.phoneNumber?.split('@')[0]
        ].filter(Boolean);

        return ids.includes(userBase);
    });
}

function isBotAdmin(participants: any[], botJid: string) {
    if (!participants || !Array.isArray(participants)) return false;
    const botBase = botJid?.split('@')[0];
    if (!botBase) return false;

    return participants.some(p => {
        if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;

        const ids = [
            p.id?.split('@')[0],
            p.lid?.split('@')[0],
            p.phoneNumber?.split('@')[0]
        ].filter(Boolean);

        return ids.includes(botBase);
    });
}

export const handler = async (sock: any, rawMsg: any) => {
    try {
        const msg = serialize(sock, rawMsg);
        if (!msg || !msg.body) return;

        if (global.plugins && typeof global.plugins === 'object') {
            for (const name in global.plugins) {
                try {
                    const plugin = (global.plugins as any)[name];
                    if (plugin?.before && typeof plugin.before === "function") {
                        plugin.before.call(sock, msg, { sock }).then((handled: any) => {
                            if (handled) return;
                        }).catch(() => {});
                    }
                } catch {}
            }
        }

        const prefix = config.prefix || '.';
        if (!msg.body.startsWith(prefix)) return;

        const args = msg.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        let cmd: any = null;
        if (global.plugins && typeof global.plugins === 'object') {
            for (const name in global.plugins) {
                const plugin = (global.plugins as any)[name];
                if (!plugin?.command) continue;
                const aliases = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
                if (aliases.map((a: string) => a.toLowerCase()).includes(commandName)) {
                    cmd = plugin;
                    break;
                }
            }
        }

        if (!cmd) return;

        setImmediate(() => {
            registerData(sock, msg).catch(() => {});
        });

        const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();

        const realJid = UserJid(sock, msg.chat, msg.sender) || msg.sender;
        const normalizedSender = normalizeNumber(realJid);

        const ownerConfig = config.owner || (global as any)?.owner || [];
        const allOwnerNumbers = (Array.isArray(ownerConfig) ? ownerConfig : Object.values(ownerConfig).flat()) as string[];

        const isOwner = allOwnerNumbers.some((num: string) => {
            const cleanNum = normalizeNumber(num);
            return (
                normalizedSender === cleanNum ||
                normalizedSender.replace(/^521/, '52') === cleanNum.replace(/^521/, '52')
            );
        });

        if (cmd.owner && !isOwner) {
            msg.reply('❌ Este comando solo puede ser utilizado por el dueño del bot.');
            return;
        }

        if (cmd.group && !msg.isGroup) {
            msg.reply('❌ Este comando solo se puede usar en grupos.');
            return;
        }

        let groupMetadata = null;
        if (msg.isGroup) {
            groupMetadata = await getGroupMetadata(sock, msg.chat);
        }

        const participants = groupMetadata?.participants || [];

        const isAdmins = msg.isGroup ? isUserAdmin(participants, msg.sender) : false;
        
        const rawBotJid = sock.user?.id || sock.user?.jid || '';
        const botJid = rawBotJid.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmins = msg.isGroup ? isBotAdmin(participants, botJid) : false;

        if (cmd.admin && !isAdmins && !isOwner) {
            msg.reply('❌ Necesitas ser administrador del grupo para usar este comando.');
            return;
        }

        if (cmd.botAdmin && !isBotAdmins) {
            msg.reply('❌ El bot necesita ser administrador del grupo para ejecutar este comando.');
            return;
        }

        const ctx = {
            ...msg,
            sock,
            m: msg,
            msg,
            args,
            command: commandName,
            prefix,
            owner: isOwner,
            admin: isAdmins,
            botAdmin: isBotAdmins,
            type: msg.type,
            body: msg.body,
            chat: msg.chat,
            sender: msg.sender,
            from: msg.from,
            isGroup: msg.isGroup,
            quoted: msg.quoted,
            reply: msg.reply,
            edit: (text: string, key: any) => {
                if (!key) return Promise.resolve(null);
                return sock.sendMessage(msg.chat, { text, edit: key });
            }
        };

        const executeCommand = cmd.run || cmd.default || (typeof cmd === 'function' ? cmd : null);
        if (executeCommand) {
            await Promise.resolve(executeCommand(ctx));
        }

    } catch (e: any) {
        if (e?.message?.includes('rate-overlimit') || e?.status === 429) return;
        if (!e?.message?.includes('jidDecode')) {
            console.error(chalk.red('Error en handler:'), e);
        }
    }
};
