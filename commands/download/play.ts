import axios from 'axios';
import config from '#config';

export default {
    command: ['play', 'playaudio', 'audio'],
    description: 'Descarga y envía audio de YouTube',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || config.prefix;

        try {
            const query = args.join(" ").trim();

            if (!query) {
                return await sock.sendMessage(chat, {
                    text: `ꕤ Ingresa el título o enlace a buscar ✰\n\n> ꕤ *Ejemplo:* ${p}play Kamikaze - Víctor Mendivil`
                }, { quoted: msg });
            }

            let searchQuery = query;
            const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
            if (urlMatch) {
                searchQuery = `https://youtu.be/${urlMatch[1]}`;
            }

            const api = {
                url: 'https://api.stellarwa.xyz',
                key: 'Midnight'
            };

            const searchResult = await axios.get(`${api.url}/api/youtube?query=${encodeURIComponent(searchQuery)}&key=${api.key}`);
            
            if (!searchResult.data?.status || !searchResult.data?.data?.length) {
                return await sock.sendMessage(chat, {
                    text: "《✧》 No se encontró información del video."
                }, { quoted: msg });
            }

            const video = searchResult.data.data[0];
            const videoUrl = video.url;
            const title = (video.title || "").trim();
            const thumb = video.thumbnail || video.image;
            const channel = video.channel || video.author || "Desconocido";
            const views = video.views || 0;
            const duration = video.duration || video.timestamp || "";

            const thumbBuffer = await axios.get(thumb, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data));

            const caption = `﹒𝜗ৎ      ࣪  \`${title}\`

ׅ  ׄ  ✿ *Canal* » ${channel}
ׅ  ׄ  ✿ *Vistas* » ${(views || 0).toLocaleString()}
ׅ  ׄ  ✿ *Tiempo* » ${duration}
ׅ  ׄ  ✿ *Link* » ${videoUrl}

ׅ  ׄ  ✿ *¡Enviando audio, por favor espera!*`.trim();

            await sock.sendMessage(chat, { image: thumbBuffer, caption }, { quoted: msg });

            let audioBuffer: Buffer | null = null;

            try {
                const dlEndpoint = `${api.url}/dl/ytmp3?url=${encodeURIComponent(videoUrl)}&key=${api.key}`;
                const resDl = await axios.get(dlEndpoint);

                if (resDl.data?.status && resDl.data?.data?.dl) {
                    const audioRes = await axios.get(resDl.data.data.dl, { 
                        responseType: 'arraybuffer',
                        timeout: 60000
                    });
                    audioBuffer = Buffer.from(audioRes.data);
                }
            } catch (error) {
                console.error("Error en descarga:", error);
            }

            if (!audioBuffer) {
                return await sock.sendMessage(chat, {
                    text: "《✧》 No se pudo descargar el *audio*, intenta más tarde."
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`,
                ptt: false
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await sock.sendMessage(chat, {
                text: "《✧》 Ocurrió un error inesperado."
            }, { quoted: msg });
        }
    }
};
