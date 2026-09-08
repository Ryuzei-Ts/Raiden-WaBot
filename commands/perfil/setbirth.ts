import { UserJid } from '#simple';
import { saveDB } from '#db';

export default {
    command: ['setbirth', 'setcumple', 'setbirthday'],
    description: 'Establece tu fecha de cumpleaños',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const user = (global as any).db.data.users[realSender] || {};

            const q = args.join(' ').trim();

            if (!q) {
                return reply(`「 ꕤ 」Debes ingresar una fecha válida para tu cumpleaños.\n\n> Nota: la fecha va en formato *mes/día*, no día/mes.\n\n> ✐ Ejemplo 1 » *${usedPrefix}setbirth 12/25/2000* (25 de diciembre de 2000)\n> ✐ Ejemplo 2 » *${usedPrefix}setbirth 12/25* (25 de diciembre)\n> ✐ Ejemplo 3 » *${usedPrefix}setbirth 1 january*\n> ✐ Ejemplo 4 » *${usedPrefix}setbirth 24 december*`);
            }

            const meses = {
                'january': 1, 'jan': 1, 'enero': 1,
                'february': 2, 'feb': 2, 'febrero': 2,
                'march': 3, 'mar': 3, 'marzo': 3,
                'april': 4, 'apr': 4, 'abril': 4,
                'may': 5, 'mayo': 5,
                'june': 6, 'jun': 6, 'junio': 6,
                'july': 7, 'jul': 7, 'julio': 7,
                'august': 8, 'aug': 8, 'agosto': 8,
                'september': 9, 'sep': 9, 'septiembre': 9,
                'october': 10, 'oct': 10, 'octubre': 10,
                'november': 11, 'nov': 11, 'noviembre': 11,
                'december': 12, 'dec': 12, 'diciembre': 12
            };

            const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

            let dia: number, mes: number, año: string | undefined;

            const lowerQ = q.toLowerCase();

            if (lowerQ.includes('/')) {
                const parts = q.split('/').map(p => p.trim());
                if (parts.length === 3) {
                    mes = parseInt(parts[0]);
                    dia = parseInt(parts[1]);
                    año = parts[2];
                } else if (parts.length === 2) {
                    mes = parseInt(parts[0]);
                    dia = parseInt(parts[1]);
                } else {
                    return reply(`「 ꕤ 」Formato inválido. Usa: *${usedPrefix}setbirth 12/25/2000* o *${usedPrefix}setbirth 12/25*`);
                }
            } else {
                const words = q.toLowerCase().split(' ').filter(w => w);
                let diaStr = words[0] || '';
                let mesStr = words.slice(1).join(' ') || '';
                
                if (diaStr && mesStr) {
                    if (meses[mesStr]) {
                        dia = parseInt(diaStr);
                        mes = meses[mesStr];
                    } else if (meses[diaStr]) {
                        dia = parseInt(mesStr);
                        mes = meses[diaStr];
                    } else {
                        const numDia = parseInt(diaStr);
                        const numMes = parseInt(mesStr);
                        if (!isNaN(numDia) && !isNaN(numMes) && numMes >= 1 && numMes <= 12) {
                            dia = numDia;
                            mes = numMes;
                        } else {
                            return reply(`「 ꕤ 」Formato inválido. Usa: *${usedPrefix}setbirth 24 december* o *${usedPrefix}setbirth 1 january*`);
                        }
                    }
                } else {
                    return reply(`「 ꕤ 」Formato inválido. Usa: *${usedPrefix}setbirth 24 december* o *${usedPrefix}setbirth 1 january*`);
                }
            }

            if (isNaN(dia) || isNaN(mes) || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
                return reply(`「 ꕤ 」Fecha inválida. Asegúrate de que el día sea entre 1-31 y el mes entre 1-12.`);
            }

            const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            
            let fechaFormateada = '';
            if (año) {
                const fechaObj = new Date(parseInt(año), mes - 1, dia);
                const diaSemana = diasSemana[fechaObj.getDay()];
                fechaFormateada = `${diaSemana}, ${dia} de ${mesesNombres[mes - 1]} de ${año}`;
                user.birth = `${mes}/${dia}/${año}`;
            } else {
                const añoActual = new Date().getFullYear();
                const fechaObj = new Date(añoActual, mes - 1, dia);
                const diaSemana = diasSemana[fechaObj.getDay()];
                fechaFormateada = `${diaSemana}, ${dia} de ${mesesNombres[mes - 1]}`;
                user.birth = `${mes}/${dia}`;
            }

            saveDB(chat, realSender);
            return reply(`「✐」Se ha establecido tu cumpleaños en *${fechaFormateada}*.`);

        } catch (e) {
            console.error('Error en setbirth:', e);
            return reply(`✿ Ocurrió un error al actualizar el cumpleaños.`);
        }
    }
};
