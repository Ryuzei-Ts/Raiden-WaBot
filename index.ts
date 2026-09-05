import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} from '@whiskeysockets/baileys';
import P from 'pino';
import { Boom } from '@hapi/boom';
import chalk from 'chalk';
import fs from 'fs';
import readline from 'readline';
import { handler } from '#handler';
import { loadCommands } from '#simple';
import { loadDB } from '#db';
import config from '#config';

(global as any).botName = config?.botName || 'Raiden-WaBot';

const sDir = './Session';

const askQuestion = (query: string): Promise<string> => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
    }));
};

const displayLoadingMessage = () => {
    console.log(chalk.bold.white(`\n\nPor favor, Ingrese el número de WhatsApp.\n` +
        `${chalk.bold.cyan("Ejemplo: +521XXXXXXXXXX")}\n` +
        `${chalk.bold.white('---> ')} `));
};

async function startBot() {
    loadDB();
    await loadCommands();

    const { state, saveCreds } = await useMultiFileAuthState(sDir);
    const { version } = await fetchLatestBaileysVersion();

    let opcion: string = '';
    let usarCodigo: boolean = false;

    if (!state.creds.registered) {
        let lineM = '⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ 》';
        console.log(chalk.white(`╭${lineM}`));
        opcion = await askQuestion(
            `┊ ${chalk.bold.cyan(' METODO DE VINCULACION ')}\n` +
            `┊ ${chalk.bold.white('⇢ Opcion 1:')} ${chalk.cyan('Codigo QR.')}\n` +
            `┊ ${chalk.bold.white('⇢ Opcion 2:')} ${chalk.cyan('Codigo de 8 digitos.')}\n` +
            `╰${lineM}\n${chalk.bold.white('---> ')}`
        );
        usarCodigo = opcion === "2";
    }

    const sock = makeWASocket({
        logger: P({ level: 'silent' }) as any,
        printQRInTerminal: opcion === '1',
        version,
        browser: Browsers.ubuntu('Chrome'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }) as any)
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        downloadHistory: false,
        fireInitQueries: false,
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: undefined,
        retryRequestDelayMs: 250,
        getMessage: async () => undefined
    });

    if (usarCodigo && !state.creds.registered) {
        displayLoadingMessage();
        let num = await askQuestion('');
        num = num.replace(/[^0-9]/g, '');

        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(num);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.white.bgBlue(` CODIGO DE VINCULACION `), chalk.white(`: ${code}`));
            } catch (err) {
                console.log(chalk.white('[ ERROR ] solicitud de codigo:'), err);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
        if (u.connection === 'open') {
            (global as any).mainConn = sock;
            console.log(chalk.cyan(`✿ ${(global as any).botName} conectado correctamente ✰`));
        }

        if (u.connection === 'close') {
            const sc = new Boom(u.lastDisconnect?.error)?.output?.statusCode;
            console.log(chalk.white('Desconectado - Código:', sc));

            if (sc !== DisconnectReason.loggedOut) {
                console.log(chalk.cyan('Reconectando en 3 segundos...'));
                setTimeout(() => startBot(), 3000);
            } else {
                console.log(chalk.white('Sesión cerrada. Borrando carpeta Session...'));

                if (fs.existsSync(sDir)) {
                    try {
                        fs.rmSync(sDir, { recursive: true, force: true });
                        console.log(chalk.white('Carpeta Session eliminada'));
                    } catch (e: any) {
                        console.log(chalk.cyan('Error borrando Session:', e.message));
                    }
                }

                console.log(chalk.white('Reinicia el bot manualmente'));
                process.exit(0);
            }
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        if (chatUpdate.type !== 'notify') return;
        
        const msgs = chatUpdate.messages;
        const len = msgs.length;

        for (let i = 0; i < len; i++) {
            await handler(sock, msgs[i]);
        }
    });

    if (fs.existsSync('./commands')) {
        fs.watch('./commands', { recursive: true }, async (_, filename) => {
            if (filename && filename.endsWith('.ts')) {
                console.log(chalk.yellow(`[HOT-RELOAD] Cambio en commands/${filename}. Recargando...`));
                await loadCommands();
            }
        });
    }
}

startBot().catch(err => console.error('Error al iniciar el bot:', err));
