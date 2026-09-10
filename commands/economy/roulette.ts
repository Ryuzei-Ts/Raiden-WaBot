import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['rt', 'ruleta', 'roulette', 'rtl'],
    description: 'Apuesta monedas a la ruleta (rojo o negro)',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';

        try {
            const realSender = await UserJid(sock, chat, sender);

            const dbData = (global as any).db?.data;
            if (!dbData) {
                return await sock.sendMessage(chat, { text: '「 ꕤ 」 Error: La base de datos no está inicializada.' }, { quoted: m });
            }

            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};
            if (!dbData.users) dbData.users = {};

            const chatDb = dbData.chats[chat];
            const chatUsers = chatDb.users || (chatDb.users = {});

            if (chatDb.adminonly) {
                return await sock.sendMessage(chat, {
                    text:
`「 ꕤ 」 Para utilizar comandos de *Economía* en este grupo, se requiere desactivar el modo *solo administradores*.

> Un *administrador* puede desactivarlo con el comando » *${p}onlyadmin off*`
                }, { quoted: m });
            }

            if (!chatUsers[realSender]) {
                chatUsers[realSender] = { coins: 0, bank: 0 };
            }
            const userInChat = chatUsers[realSender];

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;

            const menuText =
`「 ꕤ 」 Debes especificar el color: *red* (rojo) o *black* (negro).
> Ejemplo » *${p}rt 25000 red*`;

            const menuApuesta =
`「 ꕤ 」 Debes apostar una cantidad válida.
> Ejemplo » *${p}rt 25000 red*`;

            let colorInput = '';
            let cantidadInput = '';

            const arg1 = (args[0] || '').toLowerCase().trim();
            const arg2 = (args[1] || '').toLowerCase().trim();

            const esColor = (x: string) => ['red', 'rojo', 'black', 'negro'].includes(x);

            if (esColor(arg1)) {
                colorInput = arg1;
                cantidadInput = arg2;
            } else if (esColor(arg2)) {
                colorInput = arg2;
                cantidadInput = arg1;
            } else if (arg1) {
                colorInput = arg1;
                cantidadInput = arg2;
            }

            if (!colorInput || !['red', 'rojo', 'black', 'negro'].includes(colorInput)) {
                return await sock.sendMessage(chat, { text: menuText }, { quoted: m });
            }

            const eleccion = (colorInput === 'red' || colorInput === 'rojo') ? 'rojo' : 'negro';

            const cleanNumber = cantidadInput.replace(/[^0-9]/g, '');
            if (!cleanNumber) {
                return await sock.sendMessage(chat, { text: menuApuesta }, { quoted: m });
            }

            const apuesta = parseInt(cleanNumber);
            const minApuesta = 200;

            if (!apuesta || apuesta <= 0) {
                return await sock.sendMessage(chat, { text: menuApuesta }, { quoted: m });
            }

            if (apuesta < minApuesta) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 Debes apostar al menos *${minApuesta.toLocaleString()} ${coinName}*.`
                }, { quoted: m });
            }

            if (apuesta > coins) {
                return await sock.sendMessage(chat, {
                    text:
`「 ꕤ 」 No tienes suficientes *${coinName}* fuera del banco.
> Tienes *${coins.toLocaleString()} ${coinName}* en efectivo.`
                }, { quoted: m });
            }

            const resultado = Math.random() < 0.5 ? 'rojo' : 'negro';
            const gano = resultado === eleccion;

            if (gano) {
                userInChat.coins = coins + (apuesta * 2);
                saveDB(chat, realSender);
                return await sock.sendMessage(chat, {
                    text: `「✿」¡La ruleta cayó en *${resultado}* y has ganado *${(apuesta * 2).toLocaleString()} ${coinName}*!`
                }, { quoted: m });
            }

            userInChat.coins = coins - apuesta;
            saveDB(chat, realSender);
            return await sock.sendMessage(chat, {
                text: `「✿」¡La ruleta cayó en *${resultado}* y has perdido *${apuesta.toLocaleString()} ${coinName}*!`
            }, { quoted: m });

        } catch (e) {
            console.error('Error en rt:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al ejecutar la ruleta.' }, { quoted: m });
        }
    }
};