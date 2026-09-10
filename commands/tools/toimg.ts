import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import pino from 'pino';

export default {
    command: ['toimg', 'toimage', 'img'],
    description: 'Convierte un sticker en imagen.',
    category: 'tools',
    group: true,
    run: async ({ chat, m, sock, args }: any) => {
        const msgId = m?.id || m?.key?.id;

        try {
            const quoted = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'no_quoted' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  Debes responder a un sticker para convertirlo en imagen.'
                }, { quoted: m });
            }

            const stickerMsg = quoted.stickerMessage;
            if (!stickerMsg) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'not_sticker' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  El mensaje citado no es un sticker.'
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading' });

            const buffer = await downloadMediaMessage(
                {
                    key: {
                        remoteJid: chat,
                        id: m?.message?.extendedTextMessage?.contextInfo?.stanzaId,
                        participant: m?.message?.extendedTextMessage?.contextInfo?.participant
                    },
                    message: quoted
                } as any,
                'buffer',
                {},
                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            );

            if (!buffer) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'download_failed' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  No se pudo descargar el sticker.'
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'converting' });

            // Convertir el sticker (webp) a imagen (png/jpg)
            const sticker = new Sticker(buffer, {
                pack: 'Bot',
                author: 'Bot',
                type: StickerTypes.FULL,
                quality: 100
            });

            const imageBuffer = await sticker.toBuffer();

            global.broadcast?.('cmd_progress', { id: msgId, step: 'uploading' });

            const result = await sock.sendMessage(chat, {
                image: imageBuffer,
                caption: '   ׄ  ✿  Aquí tienes tu imagen.'
            }, { quoted: m });

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

            return result;

        } catch (error: any) {
            console.error(error);
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message || String(error) });
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Ocurrió un error al convertir el sticker.'
            }, { quoted: m });
        }
    }
};
