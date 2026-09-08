import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x: string) => {
    if (!x) return '';
    let cleaned = String(x).split('@')[0].split(':').pop() || '';
    cleaned = cleaned.replace(/[^\d]/g, '');
    return cleaned;
};

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
            
            let mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            let quotedSender = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.key?.sender;
            let participant = m.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetJid: string;
            let targetNumber: string;
            
            if (mentionedJid && mentionedJid !== '') {
                const resolvedMention = await UserJid(sock, chat, mentionedJid);
                targetJid = resolvedMention;
                targetNumber = normalizeNumber(resolvedMention);
            } else if (quotedSender) {
                const resolvedQuoted = await UserJid(sock, chat, quotedSender);
                targetJid = resolvedQuoted;
                targetNumber = normalizeNumber(resolvedQuoted);
            } else if (participant) {
                const resolvedParticipant = await UserJid(sock, chat, participant);
                targetJid = resolvedParticipant;
                targetNumber = normalizeNumber(resolvedParticipant);
            } else if (q && q.trim() !== '' && !q.startsWith('@')) {
                const cleanNumber = q.replace(/[^0-9]/g, '');
                if (cleanNumber) {
                    targetJid = cleanNumber + '@s.whatsapp.net';
                    targetNumber = cleanNumber;
                } else {
                    targetJid = realSender;
                    targetNumber = normalizeNumber(realSender);
                }
            } else if (q && q.trim() === '@') {
                targetJid = realSender;
                targetNumber = normalizeNumber(realSender);
            } else {
                targetJid = realSender;
                targetNumber = normalizeNumber(realSender);
            }

            const usersDB = (global as any).db.data.users;
            let user = usersDB[targetJid];
            
            if (!user || ((user.exp || 0) === 0 && (user.usedcommands || 0) === 0)) {
                let foundUser = null;
                let foundKey = null;
                
                for (const [key, value] of Object.entries(usersDB)) {
                    const keyNumber = normalizeNumber(key);
                    if (keyNumber === targetNumber) {
                        foundUser = value;
                        foundKey = key;
                        break;
                    }
                }
                
                if (foundUser) {
                    user = foundUser;
                    targetJid = foundKey;
                }
            }
            
            const chatData = (global as any).db.data.chats[chat] || {};
            const chatUsers = chatData.users || {};
            let userInChat = chatUsers[targetJid] || {};
            
            if (!userInChat || Object.keys(userInChat).length === 0) {
                for (const [key, value] of Object.entries(chatUsers)) {
                    const keyNumber = normalizeNumber(key);
                    if (keyNumber === targetNumber) {
                        userInChat = value;
                        break;
                    }
                }
            }
            
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
                const partnerName = usersDB[user.marry]?.name || user.marry.split('@')[0];
                const gender = (user.genre || '').toLowerCase();
                let term = 'Casad@';
                if (gender === 'mujer' || gender === 'femenino') term = 'Casada';
                else if (gender === 'hombre' || gender === 'masculino') term = 'Casado';
                else term = 'Casade';
                statusMarry = `♡ ${term} con » *${partnerName}*\n`;
            }

            const formatGenre = (user.genre || 'Sin especificar').charAt(0).toUpperCase() + (user.genre || 'Sin especificar').slice(1);

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;
            const bank = userInChat.bank || 0;

            let birthFormatted = 'Sin especificar';
            if (user.birth) {
                const parts = user.birth.split('/');
                const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                
                if (parts.length === 2) {
                    const mes = parseInt(parts[0]);
                    const dia = parseInt(parts[1]);
                    const añoActual = new Date().getFullYear();
                    const fechaObj = new Date(añoActual, mes - 1, dia);
                    const diaSemana = diasSemana[fechaObj.getDay()];
                    birthFormatted = `${diaSemana}, ${dia} de ${mesesNombres[mes - 1]}`;
                } else if (parts.length === 3) {
                    const mes = parseInt(parts[0]);
                    const dia = parseInt(parts[1]);
                    const año = parts[2];
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
