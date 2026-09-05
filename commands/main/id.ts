export default {
    command: ['id', 'jid'],
    description: 'Muestra el JID y datos del usuario actual con sus permisos',
    category: 'main',
    group: false,
    run: async (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;

        const name = ctx.m?.pushName || ctx.pushName || 'Usuario';
        const sender = ctx.m?.sender || ctx.sender;

        const text = 
`ꕤ *Identificador*

ꕤ Nombre: \`${name}\`
ꕤ Chat: \`${jid}\`
ꕤ Usuario: \`${sender}\`
ꕤ Admin: \`${ctx.admin ? 'Sí' : 'No'}\`
ꕤ Owner: \`${ctx.owner ? 'Sí' : 'No'}\``;

        await ctx.sock.sendMessage(jid, { text }, { quoted: ctx.m });
    }
};
