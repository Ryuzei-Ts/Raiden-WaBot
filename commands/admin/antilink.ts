import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['antilink', 'antilinks'],
    description: 'Activa o desactiva la protección antienlaces en el grupo',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ chat, m, sock, args, usedPrefix, command }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const chatDb = (global as any).db?.data?.chats?.[chat] ||= {};
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
                    `> ● _Habilitar ›_ *${usedPrefix + normalizedKey} enable*\n` +
                    `> ● _Deshabilitar ›_ *${usedPrefix + normalizedKey} disable*\n\n${dev}`;

                return reply(menuText);
            }

            if (enableValues.includes(input)) {
                if (chatDb.antilinks) {
                    return reply(`✰ El Antilink *ya se encuentra activado*.`);
                }
                chatDb.antilinks = true;
                saveDB(chat);
                return reply(`✰ El sistema *Antilink* ha sido *activado*. Los enlaces externos ya no están permitidos.`);
            }

            if (disableValues.includes(input)) {
                if (!chatDb.antilinks) {
                    return reply(`✰ El Antilink *ya se encuentra desactivado*.`);
                }
                chatDb.antilinks = false;
                saveDB(chat);
                return reply(`✰ El sistema *Antilink* ha sido *desactivado* correctamente.`);
            }

            const errorText = 
                `*✩ ${titulo} (✿❛◡❛)*\n` +
                `❒ *Estado ›* ${estado}\n\n` +
                `ꕥ Opción no válida. Un administrador puede utilizar:\n\n` +
                `> ● _Habilitar ›_ *${usedPrefix + normalizedKey} enable*\n` +
                `> ● _Deshabilitar ›_ *${usedPrefix + normalizedKey} disable*\n\n${dev}`;

            return reply(errorText);

        } catch (e) {
            console.error('Error en antilink:', e);
            return reply(`✿ Ocurrió un error al cambiar la configuración del AntiLink.`);
        }
    }
};
