import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['work', 'w'],
    description: 'Trabaja para ganar monedas',
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
                chatUsers[realSender] = { coins: 0, bank: 0, lastWork: 0 };
            }
            const userInChat = chatUsers[realSender];

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;

            const now = Date.now();
            const cooldown = 60 * 1000;
            const last = userInChat.lastWork || 0;
            const diff = now - last;

            if (last && diff < cooldown) {
                const remaining = Math.ceil((cooldown - diff) / 1000);
                return reply(`「 ꕤ 」 Debes esperar *${remaining} segundos* para usar *${p}work* de nuevo.`);
            }

            const ganoFrases = [
                'Trabajaste para el gran sistema capitalista y fuiste recompensado con',
                'Cargaste cajas en el mercado toda la tarde y ganaste',
                'Repartiste pizzas bajo la lluvia y recibiste',
                'Programaste toda la noche y tu jefe te pagó',
                'Limpiaste oficinas a escondidas y conseguiste',
                'Vendiste limonada en el parque y juntaste',
                'Ayudaste a una anciana a cruzar y te dio',
                'Ganaste un mini torneo de barrio y te llevaste',
                'Hiciste un mandado urgente y te pagaron',
                'Tradujiste un texto aburrido y cobraste'
            ];

            const perdioFrases = [
                'Intentaste trabajar pero tu jefe te estafó y perdiste',
                'Te robaron la cartera camino al trabajo y perdiste',
                'Invertiste en un negocio trucho y perdiste',
                'Te multaron por estacionar mal y perdiste',
                'Compraste material defectuoso y perdiste',
                'Un cliente no te pagó y perdiste',
                'Te hackearon la cuenta y perdiste',
                'Tropezaste y se te cayeron las monedas, perdiste',
                'El banco te cobró comisiones y perdiste',
                'Te salió mal el trabajo y perdiste'
            ];

            const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

            const perder = Math.random() < 0.25;

            if (perder) {
                const cantidad = Math.floor(Math.random() * 5000) + 1000;
                const perdida = Math.min(coins, cantidad);
                const frase = random(perdioFrases);

                userInChat.coins = coins - perdida;
                userInChat.lastWork = now;

                saveDB(chat, realSender);

                return reply(`✿ ${frase} *${perdida.toLocaleString()} ${coinName}*.`);
            }

            const ganancia = Math.floor(Math.random() * 10000) + 1;
            const frase = random(ganoFrases);

            userInChat.coins = coins + ganancia;
            userInChat.lastWork = now;

            saveDB(chat, realSender);

            return reply(`✿ ${frase} *${ganancia.toLocaleString()} ${coinName}*.`);

        } catch (e) {
            console.error('Error en work:', e);
            return reply('「 ꕤ 」 Ocurrió un error al ejecutar el comando.');
        }
    }
};