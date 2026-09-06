import config from '#config';

export default {
    command: ['owner', 'creador', 'dev'],
    description: 'Muestra el contacto del creador del bot',
    category: 'main',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat } = ctx;

        const ownerNumber = config.owner[0];
        const ownerName = config.devName;

        const vcard = 
            `BEGIN:VCARD\n` +
            `VERSION:3.0\n` +
            `FN:${ownerName}\n` +
            `ORG:Raiden-WaBot\n` +
            `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\n` +
            `URL:https://github.com/Ryuzei-Ts/Raiden-WaBot\n` +
            `ADR;type=HOME:;;México;;;\n` +
            `END:VCARD`;

        await sock.sendMessage(chat, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: msg });
    }
};
