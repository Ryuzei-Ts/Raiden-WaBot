import { serialize, commands, decodeJid, UserJid } from '#simple';
import { registerData } from '#db';
import config from '#config';

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

const getAdmins = (participants: any[] = []) => {
    try {
        return participants
            .filter(p => p?.admin === 'admin' || p?.admin === 'superadmin')
            .map(p => decodeJid(p?.id || ''));
    } catch {
        return [];
    }
};

const checkAdmin = async (sock: any, from: string, sender: string) => {
    try {
        if (!from || !from.endsWith('@g.us')) return { isUserAdmin: false, isBotAdmin: false };

        let metadata: any = getGroupMeta(from);
        if (!metadata) {
            metadata = await sock.groupMetadata(from).catch((e: any) => {
                if (e?.message?.includes('rate-overlimit') || e?.status === 429) return null;
                return null;
            });
            if (metadata) setGroupMeta(from, metadata);
        }

        if (!metadata || !Array.isArray(metadata.participants)) return { isUserAdmin: false, isBotAdmin: false };

        const admins = getAdmins(metadata.participants);
        const botRawId = sock?.user?.id || '';
        const botId = decodeJid(await UserJid(sock, from, botRawId));
        const botLid = sock?.user?.lid ? decodeJid(sock.user.lid) : null;
        const targetSender = decodeJid(await UserJid(sock, from, sender));

        const isUserAdmin = admins.some(admin => admin === targetSender);
        const isBotAdmin = admins.some(admin => admin === botId || (botLid && admin === botLid));
        return { isUserAdmin, isBotAdmin };
    } catch {
        return { isUserAdmin: false, isBotAdmin: false };
    }
};

export const handler = async (sock: any, rawMsg: any) => {
    try {
        const msg = serialize(sock, rawMsg);
        if (!msg || !msg.body) return;

        registerData(sock, msg).catch(() => {});

        const prefix = config.prefix || '.';
        if (!msg.body.startsWith(prefix)) return;

        const args = msg.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const cmd = commands.get(commandName);
        if (!cmd) return;

        const owners = Array.isArray(config.owner) ? config.owner : [config.owner];
        const isOwner = owners.some((num: string) => msg.sender.includes(num));

        if (cmd.owner && !isOwner) {
            return msg.reply('❌ Este comando solo puede ser utilizado por el dueño del bot.');
        }

        if (cmd.group && !msg.isGroup) {
            return msg.reply('❌ Este comando solo se puede usar en grupos.');
        }

        let isUserAdmin = false;
        let isBotAdmin = false;

        if (msg.isGroup && (cmd.admin || cmd.botAdmin)) {
            const adminStatus = await checkAdmin(sock, msg.chat, msg.sender);
            isUserAdmin = adminStatus.isUserAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (cmd.admin && !isUserAdmin && !isOwner) {
                return msg.reply('❌ Necesitas ser administrador del grupo para usar este comando.');
            }

            if (cmd.botAdmin && !isBotAdmin) {
                return msg.reply('❌ El bot necesita ser administrador del grupo para ejecutar este comando.');
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
            reply: msg.reply
        };

        await cmd.run(ctx);

    } catch (e) {
        console.error('Error en handler:', e);
    }
};
