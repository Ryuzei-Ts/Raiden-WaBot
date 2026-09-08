import { downloadMediaMessage } from '@whiskeysockets/baileys';
import P from 'pino';
import fs from 'fs';
import { writeExif } from '#sticker';
import { UserJid } from '#simple';
import config from '#config';

export default {
    command: ['s', 'sticker', 'stiker', 'wm'],
    category: 'stickers',
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const sendReply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const user = global.db.data.users[realSender] || {};

            const msg = m.message;
            const quoted = msg?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            const isImage = msg?.imageMessage || quoted?.imageMessage;
            const isVideo = msg?.videoMessage || quoted?.videoMessage;
            const isSticker = msg?.stickerMessage || quoted?.stickerMessage;

            if (!isImage && !isVideo && !isSticker) {
                return sendReply(`✿ Responde o envía una imagen, video o sticker.`);
            }

            let pack = '';
            let author = '';
            let hasCustomPack = false;
            let hasCustomAuthor = false;

            const fullText = args.join(' ');

            if (fullText) {
                const separator = fullText.match(/[|/\\•]/);
                if (separator) {
                    const parts = fullText.split(/[|/\\•]/);
                    pack = parts[0]?.trim();
                    author = parts[1]?.trim();
                    if (pack) hasCustomPack = true;
                    if (author) hasCustomAuthor = true;
                } else {
                    pack = fullText.trim();
                    hasCustomPack = true;
                }
            } else {
                pack = user.sPack || '';
                author = user.sAuthor || '';
                if (pack) hasCustomPack = true;
                if (author) hasCustomAuthor = true;
            }

            const botName = (config as any)?.botName || 'Raiden WaBot';
            let finalPack = '';
            let finalAuthor = '';

            if (hasCustomPack && hasCustomAuthor) {
                finalPack = pack;
                finalAuthor = author;
            } else if (hasCustomPack && !hasCustomAuthor) {
                finalPack = pack;
                finalAuthor = '';
            } else if (!hasCustomPack && hasCustomAuthor) {
                finalPack = '';
                finalAuthor = author;
            } else {
                finalPack = botName;
                finalAuthor = m.pushName || 'User';
            }

            const media = quoted ? { message: quoted } : m;
            
            const buffer = await downloadMediaMessage(media, 'buffer', {}, { 
                logger: P({ level: 'silent' }), 
                reuploadRequest: sock.updateMediaMessage 
            }).catch(() => null);

            if (!buffer) return sendReply(`✿ Error al obtener el archivo multimedia.`);

            const resultPath = await writeExif({ 
                data: Buffer.from(buffer), 
                mimetype: isImage ? 'image/jpeg' : isVideo ? 'video/mp4' : 'image/webp'
            }, { packname: finalPack, author: finalAuthor });

            if (resultPath && fs.existsSync(resultPath)) {
                await sock.sendMessage(chat, { sticker: fs.readFileSync(resultPath) }, { quoted: m });
                if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath);
            }

        } catch (e) {
            console.error('Error:', e);
        }
    }
};
