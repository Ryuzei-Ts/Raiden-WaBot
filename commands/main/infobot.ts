import { prepareWAMessageMedia } from '@whiskeysockets/baileys';
import os from 'os';
import config from '#config';

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

export default {
    command: ['infobot', 'botinfo'],
    description: 'Muestra la información general y del servidor del bot',
    category: 'main',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || config.prefix;

        const link = 'https://api.ryuzei.xyz';
        const bannerUrl = config.banner;

        const botUptime = formatUptime(process.uptime());
        
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const cpus = os.cpus();
        const cpuModel = cpus[0]?.model.trim() || 'Desconocido';
        const cpuCores = cpus.length;
        const platformName = os.type() + ' ' + os.release();
        const arch = os.arch();

        const textMessage = 
            `✿ Información del Bot *${config.botName}*\n\n` +
            `✿ *Nombre:* ${config.botName}\n` +
            `✿ *Desarrollador:* ${config.devName}\n` +
            `✦ *Moneda:* ${config.coin || '¥enes'}\n` +
            `✦ *Prefijo:* ${p}\n\n` +
            `❒ *Entorno:* ${platformName} (${arch})\n` +
            `❒ *Procesador:* ${cpuModel}\n` +
            `❒ *Núcleos:* ${cpuCores} vCPU\n` +
            `❒ *Memoria RAM:* ${freeMem} GB / ${totalMem} GB\n` +
            `❒ *Uptime:* ${botUptime}\n\n` +
            `> *Enlace:* ${link}`;

        await sock.sendMessage(chat, {
            text: textMessage,
            linkPreview: link && bannerUrl ? (await prepareWAMessageMedia({ image: { url: bannerUrl } }, { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }).then(({ imageMessage }) => ({
                'canonical-url': link,
                'matched-text': link,
                title: config.botName,
                description: `Made with love by ${config.devName}`,
                jpegThumbnail: imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : undefined,
                highQualityThumbnail: imageMessage || undefined
            })).catch(() => undefined)) : undefined,
            contextInfo: {
                isForwarded: false
            }
        }, { quoted: msg });
    }
};
