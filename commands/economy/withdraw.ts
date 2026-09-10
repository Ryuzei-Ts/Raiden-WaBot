import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['with', 'withdraw', 'retirar', 'wd'],
    description: 'Retira monedas del banco a la cartera',
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
            const bank = userInChat.bank || 0;

            const input = (args[0] || '').toLowerCase().trim();

            const menuText =
`「 ꕤ 」 Debes retirar una cantidad válida.
> Ejemplo 1 » *${p}with 25000*
> Ejemplo 2 » *${p}with all*`;

            if (!input) {
                return await sock.sendMessage(chat, { text: menuText }, { quoted: m });
            }

            let cantidad = 0;

            if (input === 'all' || input === 'todo') {
                cantidad = bank;
            } else {
                const cleanNumber = input.replace(/[^0-9]/g, '');
                if (!cleanNumber) {
                    return await sock.sendMessage(chat, { text: menuText }, { quoted: m });
                }
                cantidad = parseInt(cleanNumber);
            }

            if (bank <= 0) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 No tienes suficientes *${coinName}* en el banco para retirar.`
                }, { quoted: m });
            }

            if (!cantidad || cantidad <= 0) {
                return await sock.sendMessage(chat, { text: menuText }, { quoted: m });
            }

            if (cantidad > bank) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 No tienes suficientes *${coinName}* en el banco para retirar.`
                }, { quoted: m });
            }

            userInChat.coins = coins + cantidad;
            userInChat.bank = bank - cantidad;

            saveDB(chat, realSender);

            await sock.sendMessage(chat, {
                text: `✿ Retiraste *${cantidad.toLocaleString()} ${coinName}* del banco, ahora podrás usarlo pero también podrán robártelo.`
            }, { quoted: m });

        } catch (e) {
            console.error('Error en with:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al retirar.' }, { quoted: m });
        }
    }
};