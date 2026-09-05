export default {
    command: ['id', 'jid'],
    description: 'Muestra el JID del chat o usuario actual con sus permisos',
    category: 'main',
    group: false,
    run: async (ctx: any) => {
        const jid = ctx.chat || ctx.m?.chat;
        if (!jid) return;

        const text = 
`ꕤ *Identificador*

ꕤ Chat: \`${jid}\`
ꕤ Usuario: \`${ctx.sender}\`
ꕤ Admin: \`${ctx.admin ? 'Sí' : 'No'}\`
ꕤ Owner: \`${ctx.owner ? 'Sí' : 'No'}\``;

        await ctx.sock.sendMessage(jid, { text }, { quoted: ctx.m });
    }
};
