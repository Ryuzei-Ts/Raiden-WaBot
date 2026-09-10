import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';

export default {
    command: ['ver', 'read', 'view', 'readviewonce'],
    description: 'Abre y reenvía mensajes de una sola vez (view once) como imagen, video o audio.',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const msgId = m?.id || m?.key?.id;

        try {
            const quoted = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'no_quoted' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  Debes responder a un mensaje de una sola vez.'
                }, { quoted: m });
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
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'not_view_once' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  El mensaje citado no es de una sola vez.'
                }, { quoted: m });
            }

            const type = Object.keys(rawContent).find(k => k.endsWith('Message'));
            if (!type) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'no_media' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  No se encontró contenido multimedia válido.'
                }, { quoted: m });
            }

            const media = rawContent[type];

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading' });

            const buffer = await downloadMediaMessage(
                {
                    key: {
                        remoteJid: chat,
                        id: m?.message?.extendedTextMessage?.contextInfo?.stanzaId,
                        participant: m?.message?.extendedTextMessage?.contextInfo?.participant
                    },
                    message: rawContent
                } as any,
                'buffer',
                {},
                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            );

            if (!buffer) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'download_failed' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  Parece que hay un error.\n> Repórtalo al grupo oficial.'
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'uploading' });

            let result;

            if (type === 'videoMessage') {
                result = await sock.sendMessage(chat, {
                    video: buffer,
                    caption: media.caption || '',
                    mimetype: 'video/mp4'
                }, { quoted: m });
            } else if (type === 'imageMessage') {
                result = await sock.sendMessage(chat, {
                    image: buffer,
                    caption: media.caption || ''
                }, { quoted: m });
            } else if (type === 'audioMessage') {
                result = await sock.sendMessage(chat, {
                    audio: buffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: media.ptt || false
                }, { quoted: m });
            } else {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'unsupported_type' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  Tipo de multimedia no soportado.'
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

            return result;

        } catch (error: any) {
            console.error(error);
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message || String(error) });
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Ocurrió un error al intentar descargar el mensaje.'
            }, { quoted: m });
        }
    }
};
