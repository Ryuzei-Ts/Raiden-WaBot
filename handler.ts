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

const checkAdmin = (sock: any, from: string, sender: string) => {
    if (!from || !from.endsWith('@g.us')) {
        return Promise.resolve({ isUserAdmin: false, isBotAdmin: false });
    }

    const cachedMeta = getGroupMeta(from);
    const metaPromise = cachedMeta 
        ? Promise.resolve(cachedMeta)
        : sock.groupMetadata(from)
            .then((metadata: any) => {
                if (metadata) setGroupMeta(from, metadata);
                return metadata;
            })
            .catch(() => null);

    return metaPromise.then((metadata: any) => {
        if (!metadata || !Array.isArray(metadata.participants)) {
            return { isUserAdmin: false, isBotAdmin: false };
        }

        const admins = getAdmins(metadata.participants);
        const botRawId = sock?.user?.id || '';
        
        const botJid = UserJid(sock, from, botRawId);
        const targetJid = UserJid(sock, from, sender);

        const botId = decodeJid(botJid);
        const botLid = sock?.user?.lid ? decodeJid(sock.user.lid) : null;
        const targetSender = decodeJid(targetJid);

        const isUserAdmin = admins.some(admin => admin === targetSender);
        const isBotAdmin = admins.some(admin => admin === botId || (botLid && admin === botLid));

        return { isUserAdmin, isBotAdmin };
    }).catch(() => ({ isUserAdmin: false, isBotAdmin: false }));
};

export const handler = (sock: any, rawMsg: any) => {
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
            msg.reply('❌ Este comando solo puede ser utilizado por el dueño del bot.');
            return;
        }

        if (cmd.group && !msg.isGroup) {
            msg.reply('❌ Este comando solo se puede usar en grupos.');
            return;
        }

        const executeCommand = (isUserAdmin = false, isBotAdmin = false) => {
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
                    return sock.sendMessage(msg.chat, { text, edit: key });
                }
            };

            try {
                const res = cmd.run(ctx);
                if (res && typeof res.catch === 'function') {
                    res.catch((err: any) => console.error('Error en comando async:', err));
                }
            } catch (err) {
                console.error('Error en comando sync:', err);
            }
        };

        if (msg.isGroup && (cmd.admin || cmd.botAdmin)) {
            checkAdmin(sock, msg.chat, msg.sender).then(({ isUserAdmin, isBotAdmin }) => {
                if (cmd.admin && !isUserAdmin && !isOwner) {
                    msg.reply('❌ Necesitas ser administrador del grupo para usar este comando.');
                    return;
                }

                if (cmd.botAdmin && !isBotAdmin) {
                    msg.reply('❌ El bot necesita ser administrador del grupo para ejecutar este comando.');
                    return;
                }

                executeCommand(isUserAdmin, isBotAdmin);
            });
        } else {
            executeCommand();
        }

    } catch (e) {
        console.error('Error en handler:', e);
    }
};
