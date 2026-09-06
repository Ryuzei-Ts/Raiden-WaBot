import { prepareWAMessageMedia } from '@whiskeysockets/baileys';
import config from '#config';

export default {
    command: ['menu', 'help', 'comandos'],
    description: 'Muestra el menú completo del bot',
    category: 'main',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || config.prefix || '.';

        try {
            const bannerUrl = config.banner;
            const userName = msg.pushName || 'Usuario';
            const link = 'https://ryuzei.xyz';

            let menu = `︶⊹︶︶୨୧︶︶⊹︶︶⊹︶︶୨୧︶︶⊹\n「 ꕤ 」 ¡Hola! *${userName}*, Soy *${config.botName}*, Aquí tienes la lista de comandos.\n> Para Ver Tu Perfil Usa *${p}perfil* 𝜗ৎ\n\n‿    ׅ   𝆬     ε❤︎︭з   𝆬     ׅ      ‿\n\nׅ  ׄ  ✿ *Modo* » Raiden-Vip\nׅ  ׄ  ✿ *Desarrollador* » ${config.devName}\nׅ  ׄ  ✿ *Moneda* » ${config.coin || '¥enes'}\nׅ  ׄ  ✿ *Prefijo* » ${p}\nׅ  ׄ  ✿ *Link* » ${link}\n\n‿    ׅ   𝆬     ε❤︎︭з   𝆬     ׅ      ‿\n${String.fromCharCode(8206).repeat(4000)}\n\n⋆｡ﾟ☁︎ ｡° *ᴄᴏᴍ꯭ᴀ꯭ɴᴅᴏs* ﾟ｡˚₊ 𓂃\n`;

            const categoryArg = args[0]?.toLowerCase();

            const categories: { [key: string]: any[] } = {};
            const plugins = global.plugins || {};

            for (const name in plugins) {
                const plugin = plugins[name];
                if (!plugin?.command) continue;
                const cat = (plugin.category || 'otros').toLowerCase();
                if (cat === 'owner') continue;
                if (!categories[cat]) categories[cat] = [];
                const aliases = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
                const uniqueAliases = [...new Set(aliases)];
                const limitedAliases = uniqueAliases.slice(0, 2);
                categories[cat].push({
                    command: limitedAliases,
                    description: plugin.description || 'Sin descripción',
                    category: plugin.category || 'otros',
                    usage: plugin.usage || '',
                    allAliases: uniqueAliases
                });
            }

            for (const cat in categories) {
                const uniqueCommands: any[] = [];
                const seen = new Set();
                for (const cmd of categories[cat]) {
                    const key = cmd.allAliases.join('|');
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueCommands.push(cmd);
                    }
                }
                categories[cat] = uniqueCommands;
            }

            if (categoryArg && !categories[categoryArg]) {
                return msg.reply(`《✤》 La categoría *${categoryArg}* no fue encontrada.`);
            }

            const categoryOrder = ['main', 'info', 'download', 'sticker', 'group', 'fun', 'game', 'economy', 'admin', 'nsfw', 'anime', 'tools', 'utils', 'otros'];
            const sortedCategories = Object.keys(categories).sort((a, b) => {
                const indexA = categoryOrder.indexOf(a);
                const indexB = categoryOrder.indexOf(b);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.localeCompare(b);
            });

            const categoryEmojis: { [key: string]: string } = {
                'main': '☁️', 'info': '🌷', 'download': '🛍️', 'sticker': '⭐',
                'group': '☕', 'fun': '🪼', 'game': '🌸', 'economy': '🪷',
                'admin': '🦋', 'nsfw': '🍓', 'anime': '🧈', 'tools': '💐',
                'utils': '🍚', 'otros': '❀'
            };

            for (const category of sortedCategories) {
                if (categoryArg && category !== categoryArg) continue;
                const cmds = categories[category];
                const catName = category.toUpperCase();
                const catEmoji = categoryEmojis[category] || '✦';
                menu += `\n☕︎  𝀢  塞缪尔ᅟ֪   ﹙ *\`${catName}\`* ﹚ᅟ ㅤ✿\n\n`;
                cmds.forEach((cmd) => {
                    const aliases = cmd.command;
                    const aliasesStr = aliases.map(a => `*${p}${a}*`).join(' › ');
                    const usoText = cmd.usage ? ` + _${cmd.usage}_` : '';
                    menu += `❀   ᠀᠀ㅤ۟ ${catEmoji}  ${aliasesStr}${usoText}\n`;
                    menu += `> ── 𑁪ㅤׅㅤ۫  ${cmd.description}\n`;
                });
                menu += `\n ㅤׅㅤ۫ㅤㅤ      ﹙❀﹚ㅤׅㅤㅤ˚ㅤ\n`;
            }

            menu += `\n> ׅ  ׄ  ✿  Made with love by ${config.devName}`;

            const textMessage = menu;

            await sock.sendMessage(chat, {
                text: textMessage,
                linkPreview: bannerUrl ? (await prepareWAMessageMedia({ image: { url: bannerUrl } }, { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }).then(({ imageMessage }) => ({
                    'canonical-url': link,
                    'matched-text': link,
                    title: config.botName,
                    description: `Made with love by ${config.devName}`,
                    jpegThumbnail: imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : undefined,
                    highQualityThumbnail: imageMessage || undefined
                })).catch(() => undefined)) : undefined,
                contextInfo: {
                    isForwarded: false
                }
            }, { quoted: msg });

        } catch (e: any) {
            console.error(e);
            await msg.reply('《✤》 Ocurrió un error al generar el menú.');
        }
    }
};
