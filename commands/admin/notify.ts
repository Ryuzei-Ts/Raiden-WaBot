import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import config from '#config';

export default {
    command: ['notify', 'tag', 'n', 'avisar', 'hidetag'],
    description: 'Notifica y menciona a todos los miembros del grupo con un texto, imagen o mensaje citado.',
    category: 'admin',
    group: true,
    admin: true,
    run: async ({ chat, sock, args, msg }: any) => {
        try {
            const groupMetadata = await sock.groupMetadata(chat).catch(() => null);
            if (!groupMetadata) return;

            let botname = groupMetadata.subject;
            if (!botname || botname.length > 25) {
                botname = config.botName;
            }

            const users = groupMetadata.participants.map((u: any) => u.id);

            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const q = contextInfo?.quotedMessage;
            
            let htextos = args.join(' ').trim().replace(new RegExp(`> \\*${botname}\\*`, 'g'), '').trim();

            const isPoll = q?.pollCreationMessage || q?.pollCreationMessageV2 || q?.pollCreationMessageV3;
            if (isPoll && !htextos) {
                return msg.reply('✐ Debes añadir un texto si quieres notificar respondiendo a una encuesta.');
            }

            const type = msg.message?.imageMessage 
                ? 'imageMessage' 
                : msg.message?.videoMessage 
                ? 'videoMessage' 
                : msg.message?.audioMessage 
                ? 'audioMessage' 
                : null;

            const imgCaption = msg.message?.imageMessage?.caption || '';
            if (imgCaption.toLowerCase().includes('.n')) {
                htextos = imgCaption.replace(/\.n/gi, '').trim();
            }

            if (!htextos && !q && !type) {
                return msg.reply('✐ Debes enviar un texto o responder a un mensaje.');
            }

            if (type) {
                if (msg.message[type].viewOnce) {
                    msg.message[type].viewOnce = false;
                }
                const mediaType = type.replace('Message', '');
                const stream = await downloadContentFromMessage(msg.message[type], mediaType as any);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                const finalCaption = htextos ? `${htextos}\n\n> *${botname}*` : `> *${botname}*`;

                await sock.sendMessage(chat, { 
                    [mediaType]: buffer, 
                    caption: finalCaption, 
                    contextInfo: { mentionedJid: users }
                });

            } else if (q) {
                const qType = Object.keys(q)[0];
                if (q[qType]?.viewOnce) {
                    q[qType].viewOnce = false;
                }

                if (htextos) {
                    const finalWithBot = `${htextos}\n\n> *${botname}*`;
                    await sock.sendMessage(chat, { 
                        text: finalWithBot, 
                        contextInfo: { mentionedJid: users }
                    }, { 
                        quoted: { 
                            key: { 
                                remoteJid: chat, 
                                fromMe: false, 
                                id: contextInfo.stanzaId, 
                                participant: contextInfo.participant 
                            }, 
                            message: q 
                        } 
                    });
                } else {
                    const quotedText = (
                        q.conversation || 
                        q.extendedTextMessage?.text || 
                        q.imageMessage?.caption || 
                        q.videoMessage?.caption || 
                        ""
                    ).replace(new RegExp(`> \\*${botname}\\*`, 'g'), '').trim();
                    
                    if (q.imageMessage || q.videoMessage || q.audioMessage || q.stickerMessage) {
                        await sock.sendMessage(chat, { 
                            forward: { 
                                key: { 
                                    remoteJid: chat, 
                                    fromMe: false, 
                                    id: contextInfo.stanzaId, 
                                    participant: contextInfo.participant 
                                }, 
                                message: q 
                            }, 
                            contextInfo: { 
                                mentionedJid: users, 
                                isForwarded: false 
                            } 
                        });
                    } else {
                        const finalQuoted = quotedText ? `${quotedText}\n\n> *${botname}*` : `> *${botname}*`;
                        await sock.sendMessage(chat, { 
                            text: finalQuoted, 
                            contextInfo: { mentionedJid: users }
                        });
                    }
                }

            } else {
                let finalTexto = htextos || 'Notificación de grupo';
                if (finalTexto.length > 500) {
                    const more = String.fromCharCode(8206);
                    const masss = more.repeat(850);
                    finalTexto = `${finalTexto.slice(0, 100)}${masss}${finalTexto.slice(100)}`;
                }
                
                const finalMessage = `${finalTexto}\n\n> *${botname}*`;
                await sock.sendMessage(chat, { 
                    text: finalMessage, 
                    contextInfo: { mentionedJid: users } 
                });
            }
        } catch (e) {
            try {
                const groupMetadata = await sock.groupMetadata(chat).catch(() => null);
                let botname = groupMetadata?.subject;
                if (!botname || botname.length > 25) {
                    botname = config.botName;
                }
                const users = groupMetadata?.participants?.map((u: any) => u.id) || [];
                const fallbackText = args.join(' ').trim().replace(new RegExp(`> \\*${botname}\\*`, 'g'), '').trim() || 'Hola';
                
                await sock.sendMessage(chat, { 
                    text: `${fallbackText}\n\n> *${botname}*`, 
                    contextInfo: { mentionedJid: users } 
                });
            } catch (err) {}
        }
    }
};
