import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['slut'],
    description: 'Trabaja como escort para ganar o perder monedas',
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
                chatUsers[realSender] = { coins: 0, bank: 0, lastSlut: 0 };
            }
            const userInChat = chatUsers[realSender];

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;

            const now = Date.now();
            const cooldown = 4 * 60 * 1000;
            const last = userInChat.lastSlut || 0;
            const diff = now - last;

            if (last && diff < cooldown) {
                const remaining = cooldown - diff;
                const minutos = Math.floor(remaining / (1000 * 60));
                const segundos = Math.floor((remaining % (1000 * 60)) / 1000);
                const tiempo = minutos > 0
                    ? `${minutos} minutos ${segundos} segundos`
                    : `${segundos} segundos`;
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 Debes esperar *${tiempo}* para usar *${p}slut* de nuevo.`
                }, { quoted: m });
            }

            const ganoFrases = [
                'Atendiste a un cliente vistiendo su cosplay favorito y te dieron',
                'Un cliente generoso te pagó una noche completa y recibiste',
                'Grabaste contenido exclusivo y lo vendiste por',
                'Un extranjero te pagó por una noche en su hotel y ganaste',
                'Atendiste a un político famoso y te dejó',
                'Hiciste un show privado por webcam y juntaste',
                'Un cliente te pagó por acompañarlo a una cena y ganaste',
                'Te contrataron para una despedida de soltero y conseguiste',
                'Un cliente rico te dio propina generosa:',
                'Triunfaste con tu último cliente y ganaste'
            ];

            const perdioFrases = [
                'Un cliente se escapó sin pagarte y perdiste',
                'Te cayó la policía en plena noche y tuviste que sobornar con',
                'Un cliente abusivo te estafó y perdiste',
                'La cuenta se te bloqueó y perdiste',
                'Un cliente te grabó sin permiso y pagaste para que borrara',
                'Te robaron en la habitación del hotel y perdiste',
                'Un cliente violento te obligó a pagarle',
                'Te cancelaron el show y perdiste',
                'La plataforma te cobró comisiones y perdiste',
                'Un cliente insistente te hizo gastar'
            ];

            const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

            const perder = Math.random() < 0.30;

            if (perder) {
                const rango = Math.floor(Math.random() * 8000) + 2000;
                const perdida = Math.min(coins, rango);
                const frase = random(perdioFrases);

                userInChat.coins = coins - perdida;
                userInChat.lastSlut = now;

                saveDB(chat, realSender);

                return await sock.sendMessage(chat, {
                    text: `✿ ${frase} *-${perdida.toLocaleString()} ${coinName}*.`
                }, { quoted: m });
            }

            const ganancia = Math.floor(Math.random() * 10000) + 1000;
            const frase = random(ganoFrases);

            userInChat.coins = coins + ganancia;
            userInChat.lastSlut = now;

            saveDB(chat, realSender);

            return await sock.sendMessage(chat, {
                text: `✿ ${frase} *${ganancia.toLocaleString()} ${coinName}*.`
            }, { quoted: m });

        } catch (e) {
            console.error('Error en slut:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al ejecutar el comando.' }, { quoted: m });
        }
    }
};