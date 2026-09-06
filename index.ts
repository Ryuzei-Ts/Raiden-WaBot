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
import qrcode from 'qrcode';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import { serialize } from '#simple';
import { loadDB } from '#db';
import config from '#config';
import { handler } from '#handler';
import printMessageLog from './lib/printlog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(global as any).botName = config?.botName || 'Raiden-WaBot';
(global as any).plugins = (global as any).plugins || {};

const httpServer = (global as any).server || (global as any).expressServer || createServer();
if (!httpServer.listening) {
    const PORT = process.env.PORT || process.env.WS_PORT || 8080;
    httpServer.listen(PORT);
}
(global as any).server = httpServer;

const wss = new WebSocketServer({ server: httpServer });
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'status', data: 'Connected to Raiden-WaBot Realtime Stream' }));

    ws.on('close', () => {
        clients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error(chalk.red('WebSocket Client Error:'), err);
    });
});

export function broadcast(event: string, payload: any) {
    if (clients.size === 0) return;
    const message = JSON.stringify({ event, payload, timestamp: Date.now() });
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

(global as any).broadcast = broadcast;

const sDir = path.join(__dirname, 'Session');

const pCache = new Set<string>();
const mStore = new Map<string, any>();

const methodCodeQR = process.argv.includes("--qr");
const methodCode = process.argv.includes("code");

function normalizePhone(input: any) {
    let s = String(input).replace(/\D/g, '');
    if (!s) return '';
    if (s.startsWith('0')) s = s.replace(/^0+/, '');
    if (s.length === 10 && s.startsWith('3')) s = '57' + s;
    if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
    if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
    return s;
}

const limpiarSesion = () => {
    if (fs.existsSync(sDir)) {
        try {
            fs.rmSync(sDir, { recursive: true, force: true });
        } catch {}
    }
};

async function cargarPlugins(dir = './commands') {
    const cmdDir = path.resolve(__dirname, dir);
    if (!fs.existsSync(cmdDir)) return;

    const newPlugins: Record<string, any> = {};

    async function getAllFiles(directory: string): Promise<string[]> {
        const entries = await fsPromises.readdir(directory, { withFileTypes: true });
        const files = await Promise.all(entries.map(e => {
            const res = join(directory, e.name);
            return e.isDirectory() ? getAllFiles(res) : Promise.resolve([res]);
        }));
        return files.flat();
    }

    try {
        const allFiles = await getAllFiles(cmdDir);
        const files = allFiles.filter(f => 
            (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts')
        );

        const ts = Date.now();

        await Promise.all(
            files.map(async (fullPath) => {
                try {
                    const fileUrl = pathToFileURL(fullPath).href;
                    const cmdModule = await import(`${fileUrl}?update=${ts}`);
                    const plugin = cmdModule.default?.default || cmdModule.default || cmdModule;
                    const pluginName = path.basename(fullPath);
                    newPlugins[pluginName] = plugin;
                } catch {}
            })
        );

        (global as any).plugins = newPlugins;
        console.log(chalk.bold.cyan(`[ SYSTEM ] ${Object.keys(newPlugins).length} plugins cargados en memoria.`));
        broadcast('plugins_loaded', { count: Object.keys(newPlugins).length });
    } catch (e) {
        console.error(chalk.red('[ ERROR ] Error al cargar plugins:'), e);
        broadcast('plugins_error', { error: String(e) });
    }
}

const askQuestion = async (query: string): Promise<string> => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(query, (ans) => {
            rl.close();
            resolve(ans.trim());
        });
    });
};

const displayLoadingMessage = () => {
    console.log(chalk.bold.white(`\n\nPor favor, Ingrese el número de WhatsApp.\n` +
        `${chalk.bold.cyan("Ejemplo: +521XXXXXXXXXX")}\n` +
        `${chalk.bold.white('---> ')} `));
};

async function startBot() {
    await loadDB();
    await cargarPlugins('./commands');

    if (!fs.existsSync(sDir)) {
        fs.mkdirSync(sDir, { recursive: true });
    }

    let { state, saveCreds } = await useMultiFileAuthState(sDir);
    const { version } = await fetchLatestBaileysVersion();

    let opcion: string = '';
    let usarCodigo: boolean = false;

    if (!state.creds.registered) {
        console.log(chalk.cyan(`
      Raiden | Wa Bot
     Powered by Ryuzei-Ts 
`));

        if (methodCodeQR) {
            opcion = '1';
        } else if (methodCode) {
            opcion = '2';
            usarCodigo = true;
        } else {
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

        limpiarSesion();
        fs.mkdirSync(sDir, { recursive: true });

        const reloadedAuth = await useMultiFileAuthState(sDir);
        state = reloadedAuth.state;
        saveCreds = reloadedAuth.saveCreds;
    }

    const esQR = opcion === '1' || methodCodeQR;

    const sock = makeWASocket({
        logger: P({ level: 'silent' }) as any,
        printQRInTerminal: false,
        version,
        browser: Browsers.macOS('Safari'),
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
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: undefined,
        retryRequestDelayMs: 250,
        getMessage: async () => undefined
    });

    if (usarCodigo && !state.creds.registered) {
        displayLoadingMessage();
        let num = await askQuestion('');
        num = normalizePhone(num);

        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(num);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.white.bgBlue(` CODIGO DE VINCULACION `), chalk.white(`: ${code}`));
                broadcast('pairing_code', { code });
            } catch (err) {
                console.log(chalk.red('[ ERROR ] Falla al generar código de vinculación:'), err);
                limpiarSesion();
                setTimeout(() => startBot(), 2000);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', async () => {
        await saveCreds();
    });

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u;

        if (qr && esQR) {
            try {
                const qrTerminal = await qrcode.toString(qr, { type: 'terminal', small: true });
                console.log(chalk.bold.cyan('\n[ QR ] ESCANEA EL SIGUIENTE CÓDIGO QR:\n'));
                console.log(qrTerminal);
                broadcast('qr_generated', { qr });
            } catch (err) {
                console.log(chalk.red('[ ERROR ] Error al renderizar el código QR:'), err);
            }
        }

        if (connection === 'open') {
            (global as any).mainConn = sock;
            console.log(chalk.bold.cyan(`\n✿ ${(global as any).botName} conectado y listo ✰\n`));
            broadcast('bot_status', { status: 'connected', botName: (global as any).botName });
        }

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const isStreamError = lastDisconnect?.error?.message?.includes('Stream Errored');
            broadcast('bot_status', { status: 'disconnected', statusCode });

            if (statusCode === 515 || isStreamError) {
                console.log(chalk.yellow('[ RECONNECT ] Reiniciando socket por actualización de sesión...'));
                setTimeout(() => startBot(), 2000);
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red('[ SESSION ] Sesión cerrada desde el teléfono. Limpiando...'));
                limpiarSesion();
                setTimeout(() => startBot(), 2000);
            } else {
                console.log(chalk.yellow(`[ CONEXION ] Desconectado (Status ${statusCode}). Reintentando...`));
                setTimeout(() => startBot(), 3000);
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
                if (first) {
                    pCache.delete(first);
                    mStore.delete(first);
                }
            }

            queueMicrotask(() => {
                handler(sock, rawMsg).catch(() => {});
                printMessageLog(serialize(sock, rawMsg), sock).catch(() => {});
                broadcast('message_received', { id: mId, jid, pushName: rawMsg.pushName });
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
