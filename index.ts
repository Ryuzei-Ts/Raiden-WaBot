import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } from '@whiskeysockets/baileys';
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
import { handler } from '#handler';
import printMessageLog from './lib/printlog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
(global as any).botName = config?.botName || 'Raiden-WaBot';
(global as any).plugins = (global as any).plugins || {};

const sDir = path.join(__dirname, 'Session');
const pCache = new Set<string>();
const mStore = new Map<string, any>();

async function cargarPlugins(dir = './commands') {
    const cmdDir = path.resolve(__dirname, dir);
    if (!fs.existsSync(cmdDir)) return;
    const newPlugins: Record<string, any> = {};
    const getAllFiles = async (directory: string): Promise<string[]> => {
        const entries = await fsPromises.readdir(directory, { withFileTypes: true });
        const files = await Promise.all(entries.map(e => {
            const res = join(directory, e.name);
            return e.isDirectory() ? getAllFiles(res) : Promise.resolve([res]);
        }));
        return files.flat();
    };
    try {
        const allFiles = await getAllFiles(cmdDir);
        const files = allFiles.filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'));
        const ts = Date.now();
        await Promise.all(files.map(async (fullPath) => {
            try {
                const fileUrl = pathToFileURL(fullPath).href;
                const cmdModule = await import(`${fileUrl}?update=${ts}`);
                const plugin = cmdModule.default?.default || cmdModule.default || cmdModule;
                const pluginName = path.basename(fullPath);
                newPlugins[pluginName] = plugin;
            } catch {}
        }));
        (global as any).plugins = newPlugins;
        console.log(chalk.white(`[ ${chalk.cyan('SYSTEM')} ] ${Object.keys(newPlugins).length} plugins cargados en memoria.`));
    } catch (e) {
        console.error(chalk.red('[ ERROR ] Error al cargar plugins:'), e);
    }
}

const askQuestion = (query: string): Promise<string> => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(query, (ans) => { rl.close(); resolve(ans.trim()); }));
};

const displayLoadingMessage = () => {
    console.log(chalk.bold.white(`\n\nPor favor, Ingrese el número de WhatsApp.\n${chalk.bold.cyan("Ejemplo: +521XXXXXXXXXX")}\n${chalk.bold.white('---> ')} `));
};

const limpiarSesion = () => {
    if (fs.existsSync(sDir)) {
        try {
            fs.rmSync(sDir, { recursive: true, force: true });
            console.log(chalk.white(`[ ${chalk.cyan('SYSTEM')} ] Sesión eliminada por error crítico.`));
        } catch (err) {
            console.log(chalk.white('[ ERROR ] No se pudo limpiar la sesión:'), err);
        }
    }
};

async function startBot() {
    loadDB();
    await cargarPlugins('./commands');

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
        markOnlineOnConnect: false,
        emitOwnEvents: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        downloadHistory: false,
        fireInitQueries: false,
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 30000,
        defaultQueryTimeoutMs: undefined,
        retryRequestDelayMs: 100,
        getMessage: async () => undefined,
        options: {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--fast-start',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        }
    });

    if (usarCodigo && !state.creds.registered) {
        displayLoadingMessage();
        let num = await askQuestion('');
        num = num.replace(/[^0-9]/g, '');
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(num);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.white.bgCyan(` CODIGO DE VINCULACION `), chalk.white(`: ${code}`));
            } catch (err) {
                console.log(chalk.white('[ ERROR ] solicitud de codigo:'), err);
            }
        }, 1500);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
        if (u.connection === 'open') {
            (global as any).mainConn = sock;
            console.log(chalk.bold.cyan(`\n✿ ${(global as any).botName} conectado y listo ✰\n`));
        }
        if (u.connection === 'close') {
            const boom = new Boom(u.lastDisconnect?.error);
            const statusCode = boom?.output?.statusCode;
            const errorMessage = boom?.message || '';
            
            if (statusCode === 403 || statusCode === 401 || statusCode === 400 || 
                errorMessage.includes('logged out') || errorMessage.includes('unauthorized') ||
                errorMessage.includes('invalid') || statusCode === 429 || statusCode >= 500) {
                console.log(chalk.white(`[ ${chalk.cyan('SYSTEM')} ] Error crítico detectado (${statusCode}). Limpiando sesión...`));
                limpiarSesion();
                setTimeout(() => {
                    console.log(chalk.white(`[ ${chalk.cyan('SYSTEM')} ] Reiniciando bot con sesión limpia...`));
                    startBot();
                }, 2000);
            } else if (statusCode !== DisconnectReason.loggedOut) {
                setTimeout(() => startBot(), 1500);
            } else {
                limpiarSesion();
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
            if (pCache.size > 1000) {
                const first = pCache.values().next().value;
                if (first) { pCache.delete(first); mStore.delete(first); }
            }
            queueMicrotask(() => {
                handler(sock, rawMsg).catch(() => {});
                printMessageLog(serialize(sock, rawMsg), sock).catch(() => {});
            });
        }
    });

    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        fs.watch(commandsPath, { recursive: true }, (_, filename) => {
            if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
                cargarPlugins('./commands').catch(() => {});
            }
        });
    }
}

startBot().catch(() => {});

const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

const filterNoise = (chunk: any, encoding?: any, callback?: any) => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    
    if (
        str.includes('Closing open session') ||
        str.includes('Closing session') ||
        str.includes('SessionEntry') ||
        str.includes('ephemeralKeyPair') ||
        str.includes('currentRatchet') ||
        str.includes('prekey bundle') ||
        str.includes('chainKey') ||
        str.includes('registrationId') ||
        str.includes('bad-mac') ||
        str.includes('Bad MAC') ||
        str.includes('Failed to decrypt') ||
        str.includes('Session error') ||
        str.includes('Session error:') ||
        str.includes('Error: bad-mac')
    ) {
        if (typeof callback === 'function') callback();
        return true;
    }
    
    return originalStdoutWrite(chunk, encoding, callback);
};

process.stdout.write = filterNoise as any;
process.stderr.write = filterNoise as any;

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
process.on('uncaughtExceptionMonitor', () => {});
