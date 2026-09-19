import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { spawn } from 'node:child_process';
import pino from 'pino';

const videoToMp3 = (videoBuffer: Buffer): Promise<Buffer> => new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-vn',
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        '-preset', 'ultrafast',
        '-f', 'mp3',
        'pipe:1'
    ]);

    const chunks: Buffer[] = [];
    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.on('close', (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`FFmpeg error ${code}`)));
    ffmpeg.on('error', reject);
    ffmpeg.stdin.end(videoBuffer);
});

export default {
    command: ['tomp3', 'toaudio', 'mp3'],
    description: 'Convierte un video o nota de video en audio MP3.',
    category: 'tools',
    group: true,
    run: async ({ chat, m, sock }: any) => {
        const msgId = m?.id || m?.key?.id;

        try {
            const contextInfo = m?.message?.extendedTextMessage?.contextInfo;
            const quoted = contextInfo?.quotedMessage;

            const targetMsg = quoted || m?.message;
            const videoMsg = targetMsg?.videoMessage || targetMsg?.ptvMessage;

            if (!videoMsg) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'no_video' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  Debes enviar o responder a un video para convertirlo en audio.'
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading' });

            const downloadOptions = quoted ? {
                key: {
                    remoteJid: chat,
                    id: contextInfo?.stanzaId,
                    participant: contextInfo?.participant
                },
                message: quoted
            } : m;

            const videoBuffer = await downloadMediaMessage(
                downloadOptions as any,
                'buffer',
                {},
                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            );

            if (!videoBuffer) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: 'download_failed' });
                return sock.sendMessage(chat, {
                    text: '   ׄ  ✿  No se pudo descargar el video.'
                }, { quoted: m });
            }

            global.broadcast?.('cmd_progress', { id: msgId, step: 'converting' });

            const audioBuffer = await videoToMp3(videoBuffer);

            global.broadcast?.('cmd_progress', { id: msgId, step: 'uploading' });

            const result = await sock.sendMessage(chat, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });

            return result;

        } catch (error: any) {
            console.error(error);
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message || String(error) });
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Ocurrió un error al convertir el video a MP3.'
            }, { quoted: m });
        }
    }
};
