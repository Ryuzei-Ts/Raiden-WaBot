import config from '#config';

export default {
    command: ['baltop', 'eboard', 'economytop'],
    description: 'Muestra el ranking de usuarios con más monedas',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';

        try {
            const dbData = (global as any).db?.data;
            if (!dbData) {
                return await sock.sendMessage(chat, { text: '「 ꕤ 」 Error: La base de datos no está inicializada.' }, { quoted: m });
            }

            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};
            if (!dbData.users) dbData.users = {};

            const chatDb = dbData.chats[chat];
            const chatUsers = chatDb.users || {};

            if (chatDb.adminonly) {
                return await sock.sendMessage(chat, {
                    text:
`「 ꕤ 」 Para utilizar comandos de *Economía* en este grupo, se requiere desactivar el modo *solo administradores*.

> Un *administrador* puede desactivarlo con el comando » *${p}onlyadmin off*`
                }, { quoted: m });
            }

            const coinName = (config as any)?.coin || '¥enes';

            const entries = Object.entries(chatUsers)
                .map(([jid, data]: any) => ({
                    jid,
                    total: (data.coins || 0) + (data.bank || 0)
                }))
                .filter(e => e.total > 0)
                .sort((a, b) => b.total - a.total);

            if (entries.length === 0) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 No hay usuarios con *${coinName}* registrados en este grupo.`
                }, { quoted: m });
            }

            const perPage = 10;
            const totalPages = Math.ceil(entries.length / perPage);

            const input = (args[0] || '').trim();
            const page = input ? parseInt(input.replace(/[^0-9]/g, '')) : 1;

            if (!page || page < 1 || page > totalPages) {
                return await sock.sendMessage(chat, {
                    text: `「 ꕤ 」 Debes especificar una página válida entre *1* y *${totalPages}*.`
                }, { quoted: m });
            }

            const start = (page - 1) * perPage;
            const slice = entries.slice(start, start + perPage);

            let text = `「✿」Los usuarios con más *${coinName}* son:\n\n`;

            slice.forEach((entry, index) => {
                const pos = start + index + 1;
                const name = dbData.users?.[entry.jid]?.name || entry.jid.split('@')[0];
                text += `✰ ${pos} » *${name}*\n\t\t Total→ *${entry.total.toLocaleString()} ${coinName}*\n`;
            });

            text += `\n> • Página *${page}* de *${totalPages}*`;

            await sock.sendMessage(chat, { text }, { quoted: m });

        } catch (e) {
            console.error('Error en baltop:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error al obtener el ranking.' }, { quoted: m });
        }
    }
};