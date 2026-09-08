import { UserJid } from '#simple';
import { saveDB } from '#db';

export default {
    command: ['history', 'historial', 'historialmatrimonial', 'marryhistory'],
    description: 'Muestra el historial matrimonial de un usuario',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const usersDB = (global as any).db.data.users;
            
            let q = args[0];
            let mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            let quotedSender = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.key?.sender;
            let participant = m.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetJid: string;
            
            if (mentionedJid && mentionedJid !== '') {
                targetJid = await UserJid(sock, chat, mentionedJid);
            } else if (quotedSender) {
                targetJid = await UserJid(sock, chat, quotedSender);
            } else if (participant) {
                targetJid = await UserJid(sock, chat, participant);
            } else if (q && q.trim() !== '' && !q.startsWith('@')) {
                const cleanNumber = q.replace(/[^0-9]/g, '');
                if (cleanNumber) {
                    targetJid = cleanNumber + '@s.whatsapp.net';
                } else {
                    targetJid = realSender;
                }
            } else {
                targetJid = realSender;
            }

            const user = usersDB[targetJid];
            
            if (!user || ((user.exp || 0) === 0 && (user.usedcommands || 0) === 0)) {
                return reply(`✿ El usuario no está registrado en la base de datos.`);
            }

            const history = user.marryHistory || [];
            const currentPartner = user.marry;

            let statusText = '';
            if (currentPartner) {
                const partnerName = usersDB[currentPartner]?.name || currentPartner.split('@')[0];
                const gender = (user.genre || '').toLowerCase();
                let term = 'Casad@';
                if (gender === 'mujer' || gender === 'femenino') term = 'Casada';
                else if (gender === 'hombre' || gender === 'masculino') term = 'Casado';
                else if (gender === 'otro') term = 'Casade';
                else term = 'Casade';
                
                const currentMarriage = history.find((h: any) => h.fin === 'presente');
                const fechaInicio = currentMarriage ? currentMarriage.fecha : 'fecha desconocida';
                statusText = `♡ Estado actual » *${term} con ${partnerName}* _(desde ${fechaInicio})_`;
            } else {
                statusText = `♡ Estado actual » *Sin pareja actualmente*`;
            }

            const previousMarriages = history.filter((h: any) => h.fin !== 'presente');
            
            let historyText = '';
            if (previousMarriages.length > 0) {
                historyText = `✐ Matrimonios anteriores _(${previousMarriages.length})_:\n`;
                previousMarriages.forEach((h: any, index: number) => {
                    const partnerName = usersDB[h.partner]?.name || h.partner.split('@')[0];
                    const duracion = h.duracion || 'desconocida';
                    historyText += `${index + 1}. Con *${partnerName}* » ${h.inicio} → ${h.fin} _(${duracion})_\n`;
                });
            } else {
                historyText = `> Sin matrimonios anteriores.`;
            }

            const caption = `❏ *Historial matrimonial* ◢ @${targetJid.split('@')[0]} ◤\n\n${statusText}\n\n${historyText}`;

            await sock.sendMessage(chat, {
                text: caption,
                mentions: [targetJid]
            }, { quoted: m });

        } catch (e) {
            console.error('Error en marryhistory:', e);
            return reply(`✿ Ocurrió un error al cargar el historial.`);
        }
    }
};
