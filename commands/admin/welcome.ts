import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['welcome', 'bienvenida'],
    description: 'Activa o desactiva la bienvenida en el grupo',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: false,
    run: async ({ chat, m, sock, args, usedPrefix, command }: any) => {
        const reply = (txt: string) => {
            if (typeof m.reply === 'function') return m.reply(txt);
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

            const estado = chatDb.welcome ? 'Activado' : 'Desactivado';
            const estadoIcono = chatDb.welcome ? '✓' : '✗';

            const menuText = 
                `❒ Control de Bienvenida:\n\n` +
                `✐ _Activar_ » *${usedPrefix + command} on*\n` +
                `✐ _Desactivar_ » *${usedPrefix + command} off*\n` +
                `✐ _Probar mensaje_ » *${usedPrefix}testwelcome*\n\n` +
                `✦ Estado actual: *${estadoIcono} ${estado}*\n` +
                `> Si la *bienvenida* está activada, *${config.botName || 'Bot'}﹒* enviará un mensaje cuando un usuario se una al grupo.`;

            if (!input) return reply(menuText);

            if (enableValues.includes(input)) {
                if (chatDb.welcome) return reply(`✦ La *bienvenida* ya estaba activada.`);
                chatDb.welcome = true;
                saveDB(chat);
                return reply(`✐ ¡Has *activado* la *bienvenida*!`);
            }

            if (disableValues.includes(input)) {
                if (!chatDb.welcome) return reply(`✦ La *bienvenida* ya estaba desactivada.`);
                chatDb.welcome = false;
                saveDB(chat);
                return reply(`✐ ¡Has *desactivado* la *bienvenida*!`);
            }

            return reply(menuText);

        } catch (e) {
            console.error('Error en welcome:', e);
            return reply('✿ Ocurrió un error al ejecutar el comando.');
        }
    }
};
