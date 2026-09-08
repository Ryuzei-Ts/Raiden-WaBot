import { broadcast } from '#index';

export default {
    command: ['topcmd', 'topcommand', 'totalcmd'],
    description: 'Muestra los comandos más usados del bot',
    category: 'main',
    group: true,
    admin: true,
    run: async ({ chat, m, sock, db, getAverageTime, getExecutionStats }: any) => {
        const start = performance.now();

        const avgTime = getAverageTime?.() || 0;
        const stats = getExecutionStats?.() || {};

        if (!db?.data?.users) {
            return sock.sendMessage(chat, { 
                text: '✰ No hay datos de comandos aún.',
                quoted: m 
            }).catch(() => {});
        }

        const commandCount: Record<string, number> = {};
        const users = db.data.users;

        for (const user in users) {
            const userData = users[user];
            if (userData.commands) {
                for (const cmd in userData.commands) {
                    commandCount[cmd] = (commandCount[cmd] || 0) + userData.commands[cmd];
                }
            }
        }

        const sortedCommands = Object.entries(commandCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (!sortedCommands.length) {
            return sock.sendMessage(chat, { 
                text: '✰ No hay comandos registrados aún.',
                quoted: m 
            }).catch(() => {});
        }

        const totalCommands = sortedCommands.reduce((acc, [, count]) => acc + count, 0);
        const totalUsers = Object.keys(users).length;

        let text = '「✦」Estado de *Comandos* ^●ω●^\n\n';
        text += `❒ Comandos Totales » *${totalCommands}*\n`;
        text += `❒ Usuarios Activos » *${totalUsers}*\n`;
        text += `❒ Promedio Respuesta » *${avgTime.toFixed(2)}ms*\n`;
        text += `❒ Ejecuciones Registradas » *${stats.totalExecutions || 0}*\n\n`;
        text += '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n';

        sortedCommands.forEach(([cmd, count], index) => {
            const percentage = ((count / totalCommands) * 100).toFixed(1);
            const bar = '⬡'.repeat(Math.min(Math.floor(count / 5), 15));
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            text += `${medal} *${cmd}* ⴵ ${count} usos (${percentage}%)\n`;
            text += `   ${bar}\n\n`;
        });

        text += '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n';
        text += `\n> *Raiden-WaBot funcionando correctamente*`;

        const latency = (performance.now() - start).toFixed(2);
        text += `\n⏱ ${latency}ms`;

        sock.sendMessage(chat, { 
            text,
            quoted: m 
        }).catch(() => {});

        queueMicrotask(() => {
            broadcast('topcmd_executed', {
                chat,
                totalCommands,
                totalUsers,
                avgTime,
                totalExecutions: stats.totalExecutions || 0,
                topCommands: sortedCommands,
                latency: Number(latency),
                timestamp: Date.now()
            });
        });
    }
};
