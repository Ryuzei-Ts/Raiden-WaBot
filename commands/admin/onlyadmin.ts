import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['onlyadmin', 'adminonly'],
    description: 'Activa o desactiva el modo solo administradores para comandos del bot',
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

            const estado = chatDb.adminonly ? 'Activado' : 'Desactivado';
            const estadoIcono = chatDb.adminonly ? '✓' : '✗';

            const menuText = 
                `❒ Un administrador puede activar o desactivar el modo *Solo Admin* utilizando:\n\n` +
                `✐ _Activar_ » *${usedPrefix + command} on*\n` +
                `✐ _Desactivar_ » *${usedPrefix + command} off*\n\n` +
                `✦ Estado actual: *${estadoIcono} ${estado}*\n` +
                `> ✧ Si el modo *Solo Admin* está activado, solo los administradores podrán utilizar los comandos de *${config.botName || 'Bot'}﹒*.`;

            if (!input) {
                return reply(menuText);
            }

            if (enableValues.includes(input)) {
                if (chatDb.adminonly) {
                    return reply(`「 ꕤ 」 El *modo Solo Admin* ya estaba activado.`);
                }
                chatDb.adminonly = true;
                saveDB(chat);
                return reply(`✐ ¡Has *activado* el *modo Solo Admin*!`);
            }

            if (disableValues.includes(input)) {
                if (!chatDb.adminonly) {
                    return reply(`「 ꕤ 」 El *modo Solo Admin* ya estaba desactivado.`);
                }
                chatDb.adminonly = false;
                saveDB(chat);
                return reply(`✐ ¡Has *desactivado* el *modo Solo Admin*!`);
            }

            return reply(menuText);

        } catch (e) {
            console.error('Error en onlyadmin:', e);
            const estado = (global as any).db?.data?.chats?.[chat]?.adminonly ? 'Activado' : 'Desactivado';
            const estadoIcono = (global as any).db?.data?.chats?.[chat]?.adminonly ? '✓' : '✗';
            const menuText = 
                `❒ Un administrador puede activar o desactivar el modo *Solo Admin* utilizando:\n\n` +
                `✐ _Activar_ » *${usedPrefix + command} on*\n` +
                `✐ _Desactivar_ » *${usedPrefix + command} off*\n\n` +
                `✦ Estado actual: *${estadoIcono} ${estado}*\n` +
                `> ✧ Si el modo *Solo Admin* está activado, solo los administradores podrán utilizar los comandos de *${config.botName || 'Bot'}﹒*.`;

            return reply(menuText);
        }
    }
};
