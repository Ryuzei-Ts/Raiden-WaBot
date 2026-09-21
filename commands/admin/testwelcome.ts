import { handleGroupParticipants } from '#alertas';

export default {
    command: ['testwelcome'],
    description: 'Prueba la tarjeta de bienvenida',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: false,
    run: async ({ chat, m, sock }: any) => {
        try {
            await handleGroupParticipants(sock, {
                id: chat,
                participants: [m.sender],
                action: 'add'
            });
        } catch (e) {
            console.error('Error en testwelcome:', e);
        }
    }
};
