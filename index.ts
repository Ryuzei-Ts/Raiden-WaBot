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
import fs, { promises as fsPromises } from 'fs';
import path, { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import readline from 'readline';

import { serialize } from '#simple';
import { loadDB } from '#db';
import config from '#config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(global as any).botName = config?.botName || 'Raiden-WaBot';

const sDir = path.join(__dirname, 'Session');

export interface Command {
    command: string | string[];
    description?: string;
    category?: string;
    group?: boolean;
    owner?: boolean;
    admin?: boolean;
    botAdmin?: boolean;
    run: (ctx: any) => Promise<any> | any;
}

export const commands = new Map<string, Command>();

const pCache = new Set<string>();
const mStore = new Map<string, any>();

async function cargarComandosDirecto(dir = './commands') {
    const cmdDir = path.resolve(__dirname, dir);
    if (!fs.existsSync(cmdDir)) {
        console.log(chalk.yellow(`[ ADVERTENCIA ] La carpeta "${dir}" no existe.`));
        return;
    }

    commands.clear();

    async function getAllFiles(directory: string): Promise<string[]> {
        const entries = await fsPromises.readdir(directory, { withFileTypes: true });
        const files = await Promise.all(entries.map(e => {
            const res = join(directory, e.name);
            return e.isDirectory() ? getAllFiles(res) : Promise.resolve([res]);
        }));
        return files.flat();
    }

    const allFiles = await getAllFiles(cmdDir);
    const files = allFiles.filter(f => 
        (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts')
    );

    const ts = Date.now();
    let cargados = 0;

    await Promise.all(
        files.map(async (fullPath) => {
            try {
                const fileUrl = pathToFileURL(fullPath).href;
                const cmdModule = await import(`${fileUrl}?update=${ts}`);
                const cFile = cmdModule.default?.default || cmdModule.default || cmdModule;

                if (cFile?.command && cFile?.run) {
                    const aliases = Array.isArray(cFile.command) ? cFile.command : [cFile.command];
                    aliases.forEach((alias: string) => {
                        commands.set(alias.toLowerCase(), cFile);
                    });
                    cargados++;
                    console.log(chalk.green(`  ✔ Cargado:`), chalk.gray(path.relative(__dirname, fullPath)));
                } else {
                    console.log(chalk.yellow(`  ⚠ Omitido (sin 'command' o 'run'):`), chalk.gray(path.relative(__dirname, fullPath)));
                }
            } catch (e) {
                console.error(chalk.red(`  ✖ Error en ${fullPath}:`), e);
            }
        })
    );

    console.log(chalk.bold.cyan(`\n[ SYSTEM ] Total de comandos listos: ${commands.size} (Archivos válidos: ${cargados})\n`));
}

const askQuestion = (query: string): Promise<string> => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
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
    
    console.log(chalk.bold.blue('\n--- CARGANDO ARCHIVOS DE COMANDOS ---'));
    await cargarComandosDirecto('./commands');

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
            console.log(chalk.bold.green(`\n✿ ${(global as any).botName} conectado y listo para recibir mensajes ✰\n`));
        }

        if (u.connection === 'close') {
            const sc = new Boom(u.lastDisconnect?.error)?.output?.statusCode;
            console.log(chalk.yellow('Conexión cerrada - StatusCode:', sc));

            if (sc !== DisconnectReason.loggedOut) {
                console.log(chalk.cyan('Reconectando en 3 segundos...'));
                setTimeout(() => startBot(), 3000);
            } else {
                console.log(chalk.red('Sesión cerrada. Borrando carpeta Session...'));

                if (fs.existsSync(sDir)) {
                    try {
                        fs.rmSync(sDir, { recursive: true, force: true });
                        console.log(chalk.gray('Carpeta Session eliminada'));
                    } catch (e: any) {
                        console.log(chalk.red('Error borrando Session:', e.message));
                    }
                }
                process.exit(0);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const rawMsg of messages) {
            if (!rawMsg?.message || !rawMsg?.key?.id) continue;
            
            const jid = rawMsg.key.remoteJid || '';
            if (jid === 'status@broadcast' || jid.endsWith('@broadcast')) continue;

            const mId = rawMsg.key.id;
            if (pCache.has(mId)) continue;

            pCache.add(mId);
            mStore.set(mId, rawMsg);

            if (pCache.size > 2000) {
                const first = pCache.values().next().value;
                if (first) {
                    pCache.delete(first);
                    mStore.delete(first);
                }
            }

            queueMicrotask(async () => {
                try {
                    console.log(chalk.bgMagenta.black(' [RED-EVENT] '), chalk.magenta('Mensaje procesado en microtask.'));

                    const m = serialize(sock, rawMsg);
                    if (!m) return;

                    const texto = m.body?.trim();
                    console.log(chalk.cyan(`  ├─ Emisor: ${m.sender}`));
                    console.log(chalk.cyan(`  ├─ Chat: ${m.chat}`));
                    console.log(chalk.cyan(`  └─ Texto recibido: "${texto}"`));

                    if (!texto) return;

                    const prefixes = ['.', '#', '/', '!'];
                    const prefix = prefixes.find(p => texto.startsWith(p)) || '';
                    const usedPrefix = prefix;

                    const args = texto.slice(usedPrefix.length).trim().split(/ +/);
                    const commandName = args.shift()?.toLowerCase() || '';

                    if (usedPrefix) {
                        console.log(chalk.blue(`  ├─ Buscando comando: "${commandName}"`));
                        const cmd = commands.get(commandName);

                        if (cmd) {
                            console.log(chalk.bold.green(`  └─ ¡COMANDO ENCONTRADO! Ejecutando...`));
                            await cmd.run({ sock, m, text: args.join(' '), args, command: commandName, usedPrefix });
                            console.log(chalk.bold.green(`  ✔ Ejecutado con éxito`));
                        } else {
                            console.log(chalk.bold.red(`  └─ ✖ El comando "${commandName}" NO existe.`));
                        }
                    } else {
                        console.log(chalk.gray(`  └─ Ignorado (sin prefijo válido)`));
                    }
                } catch (err) {
                    console.error(chalk.red('[ ERROR UPSERT ] Error en procesamiento de mensaje:'), err);
                }
            });
        }
    });

    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        fs.watch(commandsPath, { recursive: true }, (_, filename) => {
            if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
                console.log(chalk.yellow(`\n[ AUTO-RELOAD ] Cambio detectado en ${filename}. Recargando...`));
                cargarComandosDirecto('./commands').catch(() => {});
            }
        });
    }
}

startBot().catch(err => console.error('Error fatal al iniciar:', err));
