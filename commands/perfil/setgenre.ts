import { UserJid } from '#simple';
import { saveDB } from '#db';

export default {
    command: ['setgenre', 'setgenero'],
    description: 'Establece tu género (hombre, mujer, otro)',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const user = (global as any).db.data.users[realSender] || {};

            const q = args.join(' ').trim().toLowerCase();

            if (!q) {
                return reply(`「 ꕤ 」Debes ingresar un género válido: *hombre*, *mujer* u *otro*.\n> Ejemplo » *${usedPrefix}setgenre hombre*`);
            }

            const generos = ['hombre', 'mujer', 'otro'];
            if (!generos.includes(q)) {
                return reply(`「 ꕤ 」Género no válido. Usa: *hombre*, *mujer* u *otro*.\n> Ejemplo » *${usedPrefix}setgenre mujer*`);
            }

            user.genre = q;
            saveDB(chat, realSender);

            const generoFormateado = q.charAt(0).toUpperCase() + q.slice(1);
            return reply(`✐ Género actualizado a: *${generoFormateado}*`);

        } catch (e) {
            console.error('Error en setgenre:', e);
            return reply(`✿ Ocurrió un error al actualizar el género.`);
        }
    }
};
