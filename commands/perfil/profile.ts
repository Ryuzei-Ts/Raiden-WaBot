import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

export default {
    command: ['perfil', 'profile', 'user'],
    description: 'Muestra el perfil de un usuario',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const q = args[0];
            const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const participant = m.message?.extendedTextMessage?.contextInfo?.participant;
            const quotedSender = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.key?.sender;
            
            let targetJid: string;
            if (mentionedJid) {
                targetJid = mentionedJid;
            } else if (quotedSender) {
                targetJid = quotedSender;
            } else if (participant) {
                targetJid = participant;
            } else if (q) {
                const cleanNumber = q.replace(/[^0-9]/g, '');
                targetJid = cleanNumber + '@s.whatsapp.net';
            } else {
                targetJid = realSender;
            }

            const user = (global as any).db.data.users[targetJid];
            const chatData = (global as any).db.data.chats[chat] || {};
            const chatUsers = chatData.users || {};
            const userInChat = chatUsers[targetJid] || {};
            
            if (!user || ((user.exp || 0) === 0 && (user.usedcommands || 0) === 0)) {
                return reply(`✿ El usuario no está registrado en la base de datos.`);
            }

            let level = user.level || 1;
            let xp = user.exp || 0;
            let nextLevelXp = level * 500;
            let percent = Math.min(Math.floor((xp / nextLevelXp) * 100), 100);
            
            if (xp >= nextLevelXp) {
                level = Math.floor(xp / 500) + 1;
                user.level = level;
                nextLevelXp = level * 500;
                percent = Math.min(Math.floor((xp / nextLevelXp) * 100), 100);
                saveDB(chat, targetJid);
            }
            
            let imgUrl: string;
            try {
                imgUrl = await sock.profilePictureUrl(targetJid, 'image');
            } catch {
                imgUrl = 'https://cdn.ryuzei.xyz/files/cv46xgk.jpeg';
            }

            let statusMarry = '';
            if (user.marry) {
                const partnerName = (global as any).db.data.users[user.marry]?.name || user.marry.split('@')[0];
                const gender = (user.genre || '').toLowerCase();
                let term = 'Casad@';
                if (gender === 'mujer' || gender === 'femenino') term = 'Casada';
                else if (gender === 'hombre' || gender === 'masculino') term = 'Casado';
                statusMarry = `♡ ${term} con » *${partnerName}*\n`;
            }

            const formatGenre = (user.genre || 'Sin especificar').charAt(0).toUpperCase() + (user.genre || 'Sin especificar').slice(1);

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;
            const bank = userInChat.bank || 0;

            let birthFormatted = 'Sin especificar';
            if (user.birth) {
                const parts = user.birth.split('/');
                if (parts.length === 2) {
                    const mes = parseInt(parts[0]);
                    const dia = parseInt(parts[1]);
                    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                    const añoActual = new Date().getFullYear();
                    const fechaObj = new Date(añoActual, mes - 1, dia);
                    const diaSemana = diasSemana[fechaObj.getDay()];
                    birthFormatted = `${diaSemana}, ${dia} de ${mesesNombres[mes - 1]}`;
                } else if (parts.length === 3) {
                    const mes = parseInt(parts[0]);
                    const dia = parseInt(parts[1]);
                    const año = parts[2];
                    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                    const fechaObj = new Date(parseInt(año), mes - 1, dia);
                    const diaSemana = diasSemana[fechaObj.getDay()];
                    birthFormatted = `${diaSemana}, ${dia} de ${mesesNombres[mes - 1]} de ${año}`;
                }
            }

            let caption = `✿ Perfil de \`${user.name || 'Usuario'}\`\n\n`;
            if (user.description && user.description.trim() !== '') {
                caption += `${user.description}\n\n`;
            }
            
            caption += `✰ Cumpleaños: *${birthFormatted}*\n`;
            caption += `✰ Género: *${formatGenre}*\n`;
            caption += statusMarry + `\n`;
            caption += `❖ Nivel: *${level}*\n`;
            caption += `☆ Experiencia: *${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP*\n`;
            caption += `# Progreso: *${percent}%*\n\n`;
            caption += `⛁ Monedas: *${coins === 0 ? '0' : coins.toLocaleString()} ${coinName}*\n`;
            caption += `⛁ Banco: *${bank === 0 ? '0' : bank.toLocaleString()} ${coinName}*\n`;
            caption += `❒ Harem: *${(userInChat.characters || []).length === 0 ? '0' : (userInChat.characters || []).length} personajes*\n`;
            caption += `✐ Comandos usados: *${(user.usedcommands || 0).toLocaleString()}*`;

            await sock.sendMessage(chat, { 
                image: { url: imgUrl },
                caption: caption
            }, { quoted: m });

        } catch (e) {
            console.error('Error en perfil:', e);
            return reply(`✿ Ocurrió un error al cargar el perfil.`);
        }
    }
};
