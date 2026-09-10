import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';

export default {
    command: ['ver', 'read', 'view', 'readviewonce'],
    category: 'tools',
    description: 'Abre y reenvía mensajes de una sola vez (view once) como imagen, video o audio.',
    group: false,
    admin: false,
    botAdmin: false,
    run: async (sock: any, msg: any, { from, isGroup }: any) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
            return await sock.sendMessage(from, { text: '✐ Debes responder a un mensaje de una sola vez.' });
        }

        const rawContent = quoted.viewOnceMessageV2?.message || 
                           quoted.viewOnceMessage?.message || 
                           quoted.viewOnceMessageV2Extension?.message || 
                           quoted;

        const isVo = Boolean(
            quoted.viewOnceMessageV2 || 
            quoted.viewOnceMessage || 
            quoted.viewOnceMessageV2Extension ||
            Object.values(rawContent || {}).some((v: any) => v?.viewOnce)
        );

        if (!isVo) {
            return await sock.sendMessage(from, { text: '✐ El mensaje citado no es de una sola vez.' });
        }

        try {
            const type = Object.keys(rawContent).find(k => k.endsWith('Message'));
            if (!type) {
                return await sock.sendMessage(from, { text: '✐ No se encontró contenido multimedia válido.' });
            }

            const media = rawContent[type];

            const buffer = await downloadMediaMessage(
                {
                    key: {
                        remoteJid: from,
                        id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId,
                        participant: msg.message?.extendedTextMessage?.contextInfo?.participant
                    },
                    message: rawContent
                } as any,
                'buffer',
                {},
                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            );

            if (!buffer) {
                return await sock.sendMessage(from, { text: '✐ Parece que hay un error\n> Repórtalo al grupo oficial' });
            }

            if (type === 'videoMessage') {
                await sock.sendMessage(from, { video: buffer, caption: media.caption || '', mimetype: 'video/mp4' });
            } else if (type === 'imageMessage') {
                await sock.sendMessage(from, { image: buffer, caption: media.caption || '' });
            } else if (type === 'audioMessage') {
                await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: media.ptt || false });
            }
        } catch (e: any) {
            console.error(e);
            await sock.sendMessage(from, { text: '✐ Ocurrió un error al intentar descargar el mensaje.' });
        }
    }
};
