import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['cf', 'coinflip', 'flip'],
    description: 'Apuesta monedas al cara o cruz',
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
`「 ꕤ 」 Debes apostar una cantidad válida.
> Ejemplo » *${p}cf 25000*`;

            const input = (args[0] || '').replace(/[^0-9]/g, '');
            if (!input) {
                return await sock.sendMessage(chat, { text: menuText }, { quoted: m });
            }

            const apuesta = parseInt(input);
            const minApuesta = 200;

            if (!apuesta || apuesta <= 0) {
                return await sock.sendMessage(chat, { text: menuText }, { quoted: m });
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

            const eleccionUsuario = 'Cara';
            const resultado = Math.random() < 0.5 ? 'Cara' : 'Cruz';
            const gano = eleccionUsuario === resultado;

            if (gano) {
                userInChat.coins = coins + apuesta;
                saveDB(chat, realSender);
                return await sock.sendMessage(chat, {
                    text:
`「✿」¡La moneda ha caído en *${resultado}* y has ganado *${apuesta.toLocaleString()} ${coinName}*!
> Tu elección fue *${eleccionUsuario}*`
                }, { quoted: m });
            }

            userInChat.coins = coins - apuesta;
            saveDB(chat, realSender);
            return await sock.sendMessage(chat, {
                text:
`「✿」¡La moneda ha caído en *${resultado}* y has perdido *${apuesta.toLocaleString()} ${coinName}*!
> Tu elección fue *${eleccionUsuario}*`
            }, { quoted: m });

        } catch (e) {
            console.error('Error en cf:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al ejecutar la apuesta.' }, { quoted: m });
        }
    }
};