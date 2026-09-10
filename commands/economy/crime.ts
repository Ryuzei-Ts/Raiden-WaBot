import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['crime'],
    description: 'Comete un crimen para ganar o perder monedas',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, usedPrefix, prefix, sender }: any) => {
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
                chatUsers[realSender] = { coins: 0, bank: 0, lastCrime: 0 };
            }
            const userInChat = chatUsers[realSender];

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;

            const now = Date.now();
            const cooldown = 5 * 60 * 1000;
            const last = userInChat.lastCrime || 0;
            const diff = now - last;

            if (last && diff < cooldown) {
                const remaining = cooldown - diff;
                const minutos = Math.floor(remaining / (1000 * 60));
                const segundos = Math.floor((remaining % (1000 * 60)) / 1000);
                const tiempo = minutos > 0
                    ? `${minutos} minutos ${segundos} segundos`
                    : `${segundos} segundos`;
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 Debes esperar *${tiempo}* para usar *${p}crime* de nuevo.`
                }, { quoted: m });
            }

            const ganoFrases = [
                'Robaste una tienda de conveniencia y escapaste con',
                'Estafaste a un millonario distraído y conseguiste',
                'Hackeaste una cuenta bancaria y te llevaste',
                'Vendiste mercancía robada en el mercado negro y ganaste',
                'Asaltaste un banco sin disparos y huiste con',
                'Te intentaron robar, pero al no tener nada les diste pena y te dieron',
                'Participaste en una pelea clandestina y ganaste',
                'Falsificaste documentos y los vendiste por',
                'Secuestraste al perro de un vecino y cobraste el rescate de',
                'Traficaste con boletos falsos y juntaste'
            ];

            const perdioFrases = [
                'Intentaste vender a tu hermana pero te la quitaron y perdiste',
                'Te atraparon robando en una tienda y pagaste la fianza de',
                'La policía te detuvo y tuviste que sobornar con',
                'Un socio te traicionó y te robó',
                'Intentaste estafar al equivocado y te hizo pagar',
                'Te cayó la policía en plena operación y perdiste',
                'Compraste droga falsa y perdiste',
                'El negocio salió mal y tuviste que pagar',
                'Te hackearon de vuelta y perdiste',
                'Tu plan falló y terminaste pagando'
            ];

            const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

            const perder = Math.random() < 0.4;

            if (perder) {
                const cantidad = Math.floor(Math.random() * 15000) + 3000;
                const perdida = Math.min(coins, cantidad);
                const frase = random(perdioFrases);

                userInChat.coins = coins - perdida;
                userInChat.lastCrime = now;

                saveDB(chat, realSender);

                return await sock.sendMessage(chat, {
                    text: `✿ ${frase} *-${coinName}${perdida.toLocaleString()} Coins*.`
                }, { quoted: m });
            }

            const ganancia = Math.floor(Math.random() * 15000) + 3000;
            const frase = random(ganoFrases);

            userInChat.coins = coins + ganancia;
            userInChat.lastCrime = now;

            saveDB(chat, realSender);

            return await sock.sendMessage(chat, {
                text: `✿ ${frase} *${coinName}${ganancia.toLocaleString()} Coins*.`
            }, { quoted: m });

        } catch (e) {
            console.error('Error en crime:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al ejecutar el crimen.' }, { quoted: m });
        }
    }
};