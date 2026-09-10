import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['daily'],
    description: 'Reclama tu recompensa diaria',
    category: 'economy',
    group: true,
    run: async (ctx: any) => {
        const { chat, m, sock, sender, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || config.prefix || '.';
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);

            const dbData = (global as any).db?.data;
            if (!dbData) return reply('✿ Error: La base de datos no está inicializada.');

            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};
            if (!dbData.users) dbData.users = {};

            const chatDb = dbData.chats[chat];
            const chatUsers = chatDb.users || (chatDb.users = {});

            if (chatDb.adminonly) {
                return reply(
`「 ꕤ 」 Para utilizar comandos de *Economía* en este grupo, se requiere desactivar el modo *solo administradores*.

> Un *administrador* puede desactivarlo con el comando » *${p}onlyadmin off*`
                );
            }

            if (!chatUsers[realSender]) {
                chatUsers[realSender] = { coins: 0, bank: 0, lastDaily: 0, streak: 0 };
            }
            const userInChat = chatUsers[realSender];

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;
            const bank = userInChat.bank || 0;

            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;
            const last = userInChat.lastDaily || 0;
            const diff = now - last;

            if (last && diff < cooldown) {
                const remaining = cooldown - diff;
                const horas = Math.floor(remaining / (1000 * 60 * 60));
                const minutos = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const segundos = Math.floor((remaining % (1000 * 60)) / 1000);

                return reply(
`「 ꕤ 」 Ya has reclamado tu recompensa diaria de hoy.
> Puedes reclamarlo de nuevo en *${horas} horas ${minutos} minutos ${segundos} segundos*`
                );
            }

            const perdiRacha = last > 0 && diff > (48 * 60 * 60 * 1000);
            let streak = perdiRacha ? 0 : (userInChat.streak || 0);

            streak += 1;

            const baseReward = 30000;
            const reward = baseReward + ((streak - 1) * 5000);
            const nextStreak = streak + 1;
            const nextReward = baseReward + ((nextStreak - 1) * 5000);

            userInChat.coins = coins + reward;
            userInChat.streak = streak;
            userInChat.lastDaily = now;

            saveDB(chat, realSender);

            let msg =
`「✿」¡Has reclamado tu recompensa diaria de *${reward.toLocaleString()} ${coinName}*! (Día *${streak}*)
> Día *${nextStreak}* » *+${nextReward.toLocaleString()} ${coinName}*`;

            if (perdiRacha) {
                msg += `\n> ☆ ¡Has perdido tu racha de días!`;
            }

            return reply(msg);

        } catch (e) {
            console.error('Error en daily:', e);
            return reply('「 ꕤ 」 Ocurrió un error al reclamar la recompensa diaria.');
        }
    }
};