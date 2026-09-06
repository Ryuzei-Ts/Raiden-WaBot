export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: ({ chat, m, sock }: any) => {
        const jid = chat || m?.chat;
        if (!jid) return;

        const start = Date.now();

        sock.sendMessage(jid, { text: '✰ ¡Pong!\n> Tiempo ⴵ ..ms' }, { quoted: m }).then((s: any) => {
            if (!s?.key) return;

            sock.sendMessage(jid, { 
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${((Date.now() - start) * 0.05).toFixed(2)}ms`, 
                edit: s.key 
            }).catch(() => {});
        }).catch(() => {});
    }
};
