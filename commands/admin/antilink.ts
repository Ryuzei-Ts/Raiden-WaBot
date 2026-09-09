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

            const titulo = 'ANTILINK';
            const estado = chatDb.antilinks ? 'Activado' : 'Desactivado';
            const nombreBonito = 'el antilink';
            const normalizedKey = command;
            const dev = `> *${config.botName || 'Bot'}*`;

            if (!input) {
                const menuText = 
                    `*✩ ${titulo} (✿❛◡❛)*\n` +
                    `❒ *Estado ›* ${estado}\n\n` +
                    `ꕥ Un administrador puede activar o desactivar ${nombreBonito} utilizando:\n\n` +
                    `> ● _Habilitar ›_ *${usedPrefix + normalizedKey} on*\n` +
                    `> ● _Deshabilitar ›_ *${usedPrefix + normalizedKey} off*\n\n${dev}`;

                return reply(menuText);
            }

            if (enableValues.includes(input)) {
                if (chatDb.antilinks) {
                    return reply(`✰ El Antilink ya estaba activado.`);
                }
                chatDb.antilinks = true;
                saveDB(chat);
                return reply(`✰ El sistema *Antilink* ha sido *activado*. Los enlaces externos ya no están permitidos.`);
            }

            if (disableValues.includes(input)) {
                if (!chatDb.antilinks) {
                    return reply(`✰ El Antilink ya estaba desactivado.`);
                }
                chatDb.antilinks = false;
                saveDB(chat);
                return reply(`✰ El sistema *Antilink* ha sido *desactivado*.`);
            }

            const errorText = 
                `*✩ ${titulo} (✿❛◡❛)*\n` +
                `❒ *Estado ›* ${estado}\n\n` +
                `ꕥ Opción no válida. Un administrador puede utilizar:\n\n` +
                `> ● _Habilitar ›_ *${usedPrefix + normalizedKey} on*\n` +
                `> ● _Deshabilitar ›_ *${usedPrefix + normalizedKey} off*\n\n${dev}`;

            return reply(errorText);

        } catch (e) {
            console.error('Error en antilink:', e);
            return reply(`✿ Ocurrió un error al cambiar la configuración del AntiLink.`);
        }
    }
};
