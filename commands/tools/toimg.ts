import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { spawn } from 'node:child_process';
import pino from 'pino';

const webpToPng = (webpBuffer: Buffer): Promise<Buffer> => new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-vframes', '1',
        '-f', 'image2',
        '-c:v', 'png',
        'pipe:1'
    ]);

    const chunks: Buffer[] = [];
    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.on('close', (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`FFmpeg error ${code}`)));
    ffmpeg.on('error', reject);
    ffmpeg.stdin.end(webpBuffer);
});

export default {
    command: ['toimg', 'toimage', 'img'],
    description: 'Convierte un sticker en imagen.',
    category: 'tools',
    group: true,
    run: async ({ chat, m, sock }: any) => {
        const msgId = m?.id || m?.key?.id;

        try {
            const contextInfo = m?.message?.extendedTextMessage?.contextInfo;
            const quoted = contextInfo?.quotedMessage;

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

            const webpBuffer = await downloadMediaMessage(
                {
                    key: {
                        remoteJid: chat,
                        id: contextInfo?.stanzaId,
                        participant: contextInfo?.participant
                    },
                    message: quoted
                } as any,
                'buffer',
                {},
                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            );

            if (!webpBuffer) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'download_failed' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  No se pudo descargar el sticker.'
                }, { quoted: msg });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'converting' });

            const imageBuffer = await webpToPng(webpBuffer);

            global.broadcast?.('cmd_progress', { id: msgId, step: 'uploading' });

            const result = await sock.sendMessage(chat, {
                image: imageBuffer
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
