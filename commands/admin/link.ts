import { saveDB } from '#db';
import config from '#config';
import { prepareWAMessageMedia } from '#utils';

export default {
    command: ['link', 'grouplink', 'enlace'],
    description: 'Obtiene el enlace de invitación del grupo',
    category: 'group',
    group: true,
    admin: true,
    botAdmin: true,
    run: async (ctx: any) => {
        const { chat, m, sock, usedPrefix, command } = ctx;

        const reply = (txt: string) => {
            if (typeof m.reply === 'function') {
                return m.reply(txt);
            }
            return sock.sendMessage(chat, { text: txt }, { quoted: m });
        };

        try {
            const code = await sock.groupInviteCode(chat);
            if (!code) {
                return reply(`✐ No se pudo generar el enlace de invitación.`);
            }

            const groupLink = `https://chat.whatsapp.com/${code}`;
            const groupMetadata = await sock.groupMetadata(chat);
            const groupname = groupMetadata.subject || 'Grupo';
            
            const banner = await sock.profilePictureUrl(chat, 'image').catch(() => null);
            
            let linkPreviewData = undefined;
            
            if (banner) {
                try {
                    const media = await prepareWAMessageMedia(
                        { image: { url: banner } },
                        { 
                            upload: sock.waUploadToServer, 
                            mediaTypeOverride: 'thumbnail-link' 
                        }
                    );
                    
                    linkPreviewData = {
                        'canonical-url': groupLink,
                        'matched-text': groupLink,
                        title: groupname,
                        description: `🔗 Enlace de invitación al grupo`,
                        jpegThumbnail: media.imageMessage?.jpegThumbnail ? Buffer.from(media.imageMessage.jpegThumbnail) : undefined,
                        highQualityThumbnail: media.imageMessage || undefined
                    };
                } catch (e) {
                    console.error('Error preparando vista previa:', e);
                }
            }
            
            await sock.sendMessage(chat, {
                text: `🔗 ${groupLink}`,
                linkPreview: linkPreviewData,
                contextInfo: {
                    isForwarded: false
                }
            });

        } catch (e) {
            console.error('Error en link:', e);
            return reply(`✿ Ocurrió un error al obtener el enlace del grupo.`);
        }
    }
};
