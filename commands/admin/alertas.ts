import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['alerts', 'alertas', 'avisos'],
    description: 'Activa o desactiva las alertas y notificaciones del grupo',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: false,
    run: async ({ chat, m, sock, args, usedPrefix, command }: any) => {
        const reply = (txt: string) => {
            if (typeof m.reply === 'function') return m.reply(txt);
            return sock.sendMessage(chat, { text: txt }, { quoted: m });
        };

        const dbData = (global as any).db?.data;
        if (!dbData) return reply('「 ꕤ 」 Error: Base de datos no disponible.');

        if (!dbData.chats) dbData.chats = {};
        if (!dbData.chats[chat]) dbData.chats[chat] = {};

        const chatConfig = dbData.chats[chat];
        const option = args[0]?.toLowerCase();
        const senderId = m.sender?.split('@')[0] + '@s.whatsapp.net';

        if (option === 'on' || option === 'enable' || option === '1') {
            if (chatConfig.alerts) {
                return reply('「 ꕤ 」 Las alertas ya estaban activadas.');
            }
            chatConfig.alerts = true;
            saveDB(chat, senderId);
            return reply('✐ ¡Has *activado* las alertas!');
        }

        if (option === 'off' || option === 'disable' || option === '0') {
            if (!chatConfig.alerts) {
                return reply('「 ꕤ 」 Las alertas ya estaban desactivadas.');
            }
            chatConfig.alerts = false;
            saveDB(chat, senderId);
            return reply('✐ ¡Has *desactivado* las alertas!');
        }

        const estadoStr = chatConfig.alerts ? '✓ Activado' : '✗ Desactivado';
        const botName = config.botName || 'Bot';

        return reply(
            `❒ Un administrador puede activar o desactivar las alertas utilizando:\n\n` +
            `✐ _Activar_ » *${usedPrefix + command} on*\n` +
            `✐ _Desactivar_ » *${usedPrefix + command} off*\n\n` +
            `✦ Estado actual: *${estadoStr}*\n` +
            `> Si las alertas están activadas, *${botName}* avisará en el grupo cuando se promueva o degrade a un administrador.`
        );
    }
};
