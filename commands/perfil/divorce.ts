import { UserJid } from '#simple';
import { saveDB } from '#db';

export default {
    command: ['divorce', 'divorciar'],
    description: 'Divórciate de tu pareja',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const usersDB = (global as any).db.data.users;
            const user = usersDB[realSender] || {};

            if (!user.marry) {
                const gender = (user.genre || '').toLowerCase();
                let status = 'casad@';
                if (gender === 'mujer' || gender === 'femenino') status = 'casada';
                else if (gender === 'hombre' || gender === 'masculino') status = 'casado';
                else status = 'casade';
                return reply(`✐ No estás ${status} con nadie.`);
            }

            const partner = user.marry;
            const partnerUser = usersDB[partner] || {};

            const fechaActual = new Date();
            const fechaFin = fechaActual.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            const fechaCompleta = fechaActual.toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            // Actualizar historial del usuario
            if (user.marryHistory && user.marryHistory.length > 0) {
                const lastMarriage = user.marryHistory[user.marryHistory.length - 1];
                if (lastMarriage && lastMarriage.fin === 'presente') {
                    lastMarriage.fin = fechaCompleta;
                    // Calcular duración aproximada (en días)
                    const inicio = new Date(lastMarriage.inicio);
                    const fin = new Date(fechaCompleta);
                    const diffTime = Math.abs(fin.getTime() - inicio.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    lastMarriage.duracion = `${diffDays} días`;
                }
            }

            if (partnerUser.marryHistory && partnerUser.marryHistory.length > 0) {
                const lastMarriage = partnerUser.marryHistory[partnerUser.marryHistory.length - 1];
                if (lastMarriage && lastMarriage.fin === 'presente') {
                    lastMarriage.fin = fechaCompleta;
                    const inicio = new Date(lastMarriage.inicio);
                    const fin = new Date(fechaCompleta);
                    const diffTime = Math.abs(fin.getTime() - inicio.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    lastMarriage.duracion = `${diffDays} días`;
                }
            }

            delete user.marry;
            delete partnerUser.marry;

            saveDB(chat, realSender);
            saveDB(chat, partner);

            const divorceMsg = `✐ @${realSender.split('@')[0]} y @${partner.split('@')[0]} se han divorciado.`;

            await sock.sendMessage(chat, {
                text: divorceMsg,
                mentions: [realSender, partner]
            }, { quoted: m });

        } catch (e) {
            console.error('Error en divorce:', e);
            return reply(`✿ Ocurrió un error al procesar el divorcio.`);
        }
    }
};
