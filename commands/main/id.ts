export default {
    command: ['id', 'user', 'me'],
    description: 'Muestra información detallada de tu ID',
    category: 'main',
    run: ({ chat, m, sock, owner, admin }: any) => {
        const pushName = m.pushName || 'Desconocido';
        const sender = m.sender || '';
        const isOwnerStr = owner ? 'Sí' : 'No';
        const isAdminStr = m.isGroup ? (admin ? 'Sí' : 'No') : 'N/A (Chat Privado)';

        const text = `✰ *INFORMACIÓN DE USUARIO*
> 👤 *Nombre:* ${pushName}
> 🆔 *JID:* \`${sender}\`
> 👑 *Owner:* ${isOwnerStr}
> 🛡️ *Admin:* ${isAdminStr}`;

        sock.sendMessage(chat, { text }, { quoted: m }).catch(() => {});
    }
};
