import { handleGroupParticipants } from '#alertas';

export default {
    command: ['testbye'],
    description: 'Prueba la tarjeta de despedida',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: false,
    run: async ({ chat, m, sock }: any) => {
        try {
            await handleGroupParticipants(sock, {
                id: chat,
                participants: [m.sender],
                action: 'remove'
            });
        } catch (e) {
            console.error('Error en testbye:', e);
        }
    }
};
