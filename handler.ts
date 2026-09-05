import { serialize, decodeJid, UserJid } from '#simple';
import { registerData } from '#db';
import config from '#config';
import chalk from 'chalk';

const groupMetaCache = new Map<string, { data: any; ttl: number }>();

const getGroupMeta = (from: string) => {
    const cached = groupMetaCache.get(from);
    if (cached && Date.now() < cached.ttl) {
        return cached.data;
    }
    return null;
};

const setGroupMeta = (from: string, data: any) => {
    groupMetaCache.set(from, {
        data,
        ttl: Date.now() + 5000
    });
};

const checkAdmin = async (sock: any, from: string, sender: string) => {
    if (!from || !from.endsWith('@g.us')) {
        return { isUserAdmin: false, isBotAdmin: false };
    }

    try {
        let metadata = getGroupMeta(from);
        if (!metadata) {
            metadata = await sock.groupMetadata(from).catch(() => null);
            if (metadata) setGroupMeta(from, metadata);
        }

        const participants = metadata?.participants || [];

        const adminSet = new Set(
            participants
                .filter((p: any) => p.admin === 'admin' || p.admin === 'superadmin')
                .flatMap((p: any) => [
                    p.id?.split('@')[0],
                    p.lid?.split('@')[0],
                    p.phoneNumber?.split('@')[0]
                ].filter(Boolean))
        );

        const botRawId = sock?.user?.id || '';
        const botJid = UserJid(sock, from, botRawId);
        const targetJid = UserJid(sock, from, sender);

        const senderBase = targetJid.split('@')[0];
        const botBase = botJid.split('@')[0];

        const isBotAdmin = adminSet.has(botBase);
        const isUserAdmin = adminSet.has(senderBase);

        return { isUserAdmin, isBotAdmin };
    } catch {
        return { isUserAdmin: false, isBotAdmin: false };
    }
};

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

        let isUserAdmin = false;
        let isBotAdmin = false;

        if (msg.isGroup && (cmd.admin || cmd.botAdmin)) {
            const adminStatus = await checkAdmin(sock, msg.chat, msg.sender);
            isUserAdmin = adminStatus.isUserAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (cmd.admin && !isUserAdmin && !isOwner) {
                msg.reply('❌ Necesitas ser administrador del grupo para usar este comando.');
                return;
            }

            if (cmd.botAdmin && !isBotAdmin) {
                msg.reply('❌ El bot necesita ser administrador del grupo para ejecutar este comando.');
                return;
            }
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
            admin: isUserAdmin,
            botAdmin: isBotAdmin,
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
