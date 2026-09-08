import axios from 'axios';
import config from '#config';
import { writeExif } from '#sticker';
import { UserJid } from '#simple';
import fs from 'fs';

const getBuffer = async (url: string, timeoutMs = 40000): Promise<Buffer> => {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: timeoutMs, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        return Buffer.from(res.data);
    } catch {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    }
};

export default {
    command: ['brat', 'bratv'],
    description: 'Genera stickers con estilo BRAT',
    category: 'stickers',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const sendReply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });
        try {
            const query = args.join(' ').trim();
            if (!query) return sendReply(`✿ ¿Qué texto deseas poner?\n\n✿ *Ejemplo:* ${usedPrefix}brat Hola mundo`);
            const realSender = await UserJid(sock, chat, sender);
            const user = global.db.data.users[realSender] || {};
            const isVideo = m.message?.text?.includes('.bratv') || command === 'bratv';
            const endpoint = isVideo ? `https://api.delirius.online/canvas/bratvideo?text=${encodeURIComponent(query)}` : `https://api.delirius.online/canvas/brat?text=${encodeURIComponent(query)}`;
            const response = await fetch(endpoint);
            if (!response.ok) return sendReply(`✿ Error al generar el ${isVideo ? 'video' : 'imagen'} BRAT.`);
            const arrayBuffer = await response.arrayBuffer();
            const mediaBuffer = Buffer.from(arrayBuffer);
            if (!mediaBuffer) return sendReply(`✿ Error al generar el ${isVideo ? 'video' : 'imagen'} BRAT.`);
            let pack = '', author = '', hasCustomPack = false, hasCustomAuthor = false;
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
            let finalPack = '', finalAuthor = '';
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
            const resultPath = await writeExif({ data: mediaBuffer, mimetype: isVideo ? 'video/mp4' : 'image/jpeg' }, { packname: finalPack, author: finalAuthor });
            if (resultPath && fs.existsSync(resultPath)) {
                const stickerData = fs.readFileSync(resultPath);
                await sock.sendMessage(chat, { sticker: stickerData }, { quoted: m });
                try { fs.unlinkSync(resultPath); } catch {}
            } else {
                if (isVideo) await sock.sendMessage(chat, { video: mediaBuffer }, { quoted: m });
                else await sock.sendMessage(chat, { image: mediaBuffer }, { quoted: m });
            }
        } catch (e) {
            console.error('Error en brat:', e);
            return sendReply(`✿ Ocurrió un error al generar el sticker.`);
        }
    }
};
