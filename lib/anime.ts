import axios from 'axios';
import { UserJid } from '#simple';
import { saveDB } from '#db';

const getBuffer = async (url: string, timeoutMs = 20000): Promise<Buffer> => {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: timeoutMs,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        return Buffer.from(res.data);
    } catch {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    }
};

function getRandomEmoji() {
    const emojis = ['(◕‿◕)', '(｡◕‿◕｡)', '♡', '✿', '❀', '(◠‿◠)', '(◡‿◡)', '(◕‿◕)♡', '☆', '✦', '✧', '(｡･ω･｡)', '(◠‿◠✿)'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

function getPhrases(phrases: any, gender: string, type: 'solo' | 'together') {
    let genderKey = 'indefinido';
    
    if (gender === 'Hombre' || gender === 'Masculino' || gender === 'masculino' || gender === 'hombre') {
        genderKey = 'hombre';
    } else if (gender === 'Mujer' || gender === 'Femenino' || gender === 'femenino' || gender === 'mujer') {
        genderKey = 'mujer';
    } else if (gender === 'Otro' || gender === 'otro') {
        genderKey = 'otro';
    } else {
        genderKey = 'indefinido';
    }
    
    const target = type === 'solo' ? phrases.soloPhrases : phrases.togetherPhrases;
    
    if (target?.global) {
        return target.global;
    }
    
    if (target?.[genderKey]) {
        return target[genderKey];
    }
    
    if (target?.indefinido) {
        return target.indefinido;
    }
    
    if (target?.hombre) {
        return target.hombre;
    }
    
    return [];
}

interface AnimeOptions {
    command: string | string[];
    description: string;
    soloPhrases: {
        global?: string[];
        hombre?: string[];
        mujer?: string[];
        otro?: string[];
        indefinido?: string[];
    };
    togetherPhrases?: {
        global?: string[];
        hombre?: string[];
        mujer?: string[];
        otro?: string[];
        indefinido?: string[];
    };
}

export function animeMaker(options: AnimeOptions) {
    const cmdList = Array.isArray(options.command) ? options.command : [options.command];

    return {
        command: cmdList,
        description: options.description,
        category: 'anime',
        group: true,
        run: async ({ chat, m, sock, args, sender }: any) => {
            const msgId = m?.id || m?.key?.id;

            try {
                const q = args[0];
                const quotedMsg = m.message?.extendedTextMessage?.contextInfo;
                const rawMention = quotedMsg?.mentionedJid?.[0] || quotedMsg?.participant;
                
                let rawUser: string | null = null;
                if (rawMention && (rawMention.endsWith('@s.whatsapp.net') || rawMention.endsWith('@lid'))) {
                    rawUser = rawMention;
                } else if (q) {
                    const cleanNumber = q.replace(/[^0-9]/g, '');
                    if (cleanNumber.length >= 7) {
                        rawUser = cleanNumber + '@s.whatsapp.net';
                    }
                }

                const senderJid = await UserJid(sock, chat, sender);

                let targetJid: string | null = null;
                if (rawUser) {
                    const resolvedTarget = await UserJid(sock, chat, rawUser);
                    if (resolvedTarget && /^\d+@s\.whatsapp\.net$/.test(resolvedTarget)) {
                        targetJid = resolvedTarget;
                    }
                }

                const usersDB = global.db?.data?.users || {};
                const senderUser = usersDB[senderJid] || {};
                const senderName = m.pushName || senderUser.name || senderJid.split('@')[0];
                const senderGenre = senderUser.genre || 'Indefinido';

                let targetName = 'Usuario';
                if (targetJid) {
                    const targetUser = usersDB[targetJid] || {};
                    targetName = targetUser.name || targetJid.split('@')[0];
                }

                let phrase: string;
                let mentions: string[] = [senderJid];

                if (targetJid && targetJid !== senderJid) {
                    mentions.push(targetJid);
                    const phrases = getPhrases(options, senderGenre, 'together');
                    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
                    phrase = `\`${senderName}\` ${randomPhrase} \`${targetName}\` ${getRandomEmoji()}`;
                } else {
                    const phrases = getPhrases(options, senderGenre, 'solo');
                    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
                    phrase = `\`${senderName}\` ${randomPhrase} ${getRandomEmoji()}`;
                }

                global.broadcast?.('cmd_progress', { id: msgId, step: 'fetching_anime' });

                const response = await axios.get(`https://api.stellarwa.xyz/sfw/interaction?inter=${cmdList[0]}&key=Midnight`, {
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36',
                        'Accept': 'application/json, */*'
                    },
                    responseType: 'arraybuffer'
                });

                const mediaBuffer = Buffer.from(response.data);

                if (!mediaBuffer || mediaBuffer.length < 1000) {
                    throw new Error('No se pudo obtener el GIF de interacción');
                }

                const result = await sock.sendMessage(chat, {
                    video: mediaBuffer,
                    gifPlayback: true,
                    caption: phrase,
                    mentions: mentions
                }, { quoted: m });

                return result;

            } catch (error: any) {
                return sock.sendMessage(chat, {
                    text: `❌ Error: ${error.message || 'Error desconocido'}`
                }, { quoted: m });
            }
        }
    };
}
