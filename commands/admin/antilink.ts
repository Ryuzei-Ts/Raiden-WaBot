import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['antilink', 'antilinks'],
    description: 'Activa o desactiva la protección antienlaces en el grupo',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,
    run: async (ctx: any) => {
        const { chat, m, sock, args, usedPrefix, command } = ctx;

        const reply = (txt: string) => {
            if (typeof m.reply === 'function') {
                return m.reply(txt);
            }
            return sock.sendMessage(chat, { text: txt }, { quoted: m });
        };

        try {
            const dbData = (global as any).db?.data;
            if (!dbData) return reply('✿ Error: La base de datos no está inicializada.');

            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};

            const chatDb = dbData.chats[chat];
            const input = args[0]?.toLowerCase()?.trim();

            const enableValues = ['on', '1', 'enable', 'encendido', 'encender', 'activar'];
            const disableValues = ['off', '0', 'disable', 'apagado', 'apagar', 'desactivar'];

            const estado = chatDb.antilinks ? 'Activado' : 'Desactivado';
            const estadoIcono = chatDb.antilinks ? '✓' : '✗';

            const menuText = 
                `❒ Un administrador puede activar o desactivar el antilink utilizando:\n\n` +
                `✐ _Activar_ » *${usedPrefix + command} on*\n` +
                `✐ _Desactivar_ » *${usedPrefix + command} off*\n\n` +
                `✦ Estado actual: *${estadoIcono} ${estado}*\n` +
                `> Si el *antilink* está activado, *${config.botName || 'Bot'}﹒* expulsará a todos los usuarios que envíen enlaces de otros grupos.`;

            if (!input) {
                return reply(menuText);
            }

            if (enableValues.includes(input)) {
                if (chatDb.antilinks) {
                    return reply(`✦ El *antilink* ya estaba activado.`);
                }
                chatDb.antilinks = true;
                saveDB(chat);
                return reply(`✐ ¡Has *activado* el *antilink*!`);
            }

            if (disableValues.includes(input)) {
                if (!chatDb.antilinks) {
                    return reply(`✦ El *antilink* ya estaba desactivado.`);
                }
                chatDb.antilinks = false;
                saveDB(chat);
                return reply(`✐ ¡Has *desactivado* el *antilink*!`);
            }

            return reply(menuText);

        } catch (e) {
            console.error('Error en antilink:', e);
            const estado = (global as any).db?.data?.chats?.[chat]?.antilinks ? 'Activado' : 'Desactivado';
            const estadoIcono = (global as any).db?.data?.chats?.[chat]?.antilinks ? '✓' : '✗';
            const menuText = 
                `❒ Un administrador puede activar o desactivar el antilink utilizando:\n\n` +
                `✐ _Activar_ » *${usedPrefix + command} on*\n` +
                `✐ _Desactivar_ » *${usedPrefix + command} off*\n\n` +
                `✦ Estado actual: *${estadoIcono} ${estado}*\n` +
                `> Si el *antilink* está activado, *${config.botName || 'Bot'}﹒* expulsará a todos los usuarios que envíen enlaces de otros grupos.`;

            return reply(menuText);
        }
    }
};
