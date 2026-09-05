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
import path, { join } from 'path';
import { pathToFileURL } from 'url';
import readline from 'readline';

import { serialize, commands, Command } from '#simple';
import { loadDB } from '#db';
import config from '#config';

(global as any).botName = config?.botName || 'Raiden-WaBot';

const sDir = './Session';

// ==========================================
// CARGA DIRECTA Y RECURSIVA DE COMANDOS
// ==========================================
async function cargarComandosDirecto(dir = './commands') {
    const cmdDir = path.resolve(dir);
    if (!fs.existsSync(cmdDir)) {
        console.log(chalk.yellow(`[ ADVERTENCIA ] La carpeta "${dir}" no existe.`));
        return;
    }

    commands.clear(); // Limpiamos la memoria para recargar

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
                    console.log(chalk.green(`  ✔ Cargado:`), chalk.gray(path.relative(process.cwd(), fullPath)));
                } else {
                    console.log(chalk.yellow(`  ⚠ Omitido (no exporta 'command' o 'run'):`), chalk.gray(path.relative(process.cwd(), fullPath)));
                }
            } catch (e) {
                console.error(chalk.red(`  ✖ Error en file ${fullPath}:`), e);
            }
        })
    );

    console.log(chalk.bold.cyan(`\n[ SYSTEM ] Total de comandos listos en Map: ${commands.size} (Archivos válidos: ${cargados})\n`));
}

// ==========================================
// FUNCIONES AUXILIARES DE VINCULACIÓN
// ==========================================
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

// ==========================================
// ARRANQUE DEL BOT
// ==========================================
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
                console.log(chalk.red('Sesión cerrada (loggedOut). Borrando carpeta Session...'));

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

    // ==========================================
    // ESCUCHADOR Y LOGS EN TIEMPO REAL
    // ==========================================
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        if (chatUpdate.type !== 'notify') return;

        for (const rawMsg of chatUpdate.messages) {
            // LOG DE RED: ¿Llega el mensaje desde la API de Baileys?
            console.log(chalk.bgMagenta.black(' [RED-EVENT] '), chalk.magenta('Mensaje entrante detectado en el Socket.'));

            const m = serialize(sock, rawMsg);
            if (!m) {
                console.log(chalk.yellow('  └─ [OMITIDO] El mensaje no se pudo serializar o es de sistema.'));
                continue;
            }

            const texto = m.body?.trim();
            console.log(chalk.cyan(`  ├─ Emisor: ${m.sender}`));
            console.log(chalk.cyan(`  ├─ Chat: ${m.chat}`));
            console.log(chalk.cyan(`  └─ Texto recibido: "${texto}"`));

            if (!texto) continue;

            // Extraemos prefijo y nombre de comando
            const prefixes = ['.', '#', '/', '!'];
            const prefix = prefixes.find(p => texto.startsWith(p)) || '';
            const usedPrefix = prefix;
            
            const args = texto.slice(usedPrefix.length).trim().split(/ +/);
            const commandName = args.shift()?.toLowerCase() || '';

            if (usedPrefix) {
                console.log(chalk.blue(`  ├─ Buscando comando: "${commandName}" (Prefijo: "${usedPrefix}")`));
                const cmd = commands.get(commandName);

                if (cmd) {
                    console.log(chalk.bold.green(`  └─ ¡COMANDO ENCONTRADO! Ejecutando handler...`));
                    try {
                        await cmd.run({ sock, m, text: args.join(' '), args, command: commandName, usedPrefix });
                        console.log(chalk.bold.green(`  ✔ Ejecutado con éxito`));
                    } catch (err) {
                        console.error(chalk.bold.red(`  ✖ Error ejecutando el comando "${commandName}":`), err);
                    }
                } else {
                    console.log(chalk.bold.red(`  └─ ✖ El comando "${commandName}" NO existe en la lista de comandos cargados.`));
                }
            } else {
                console.log(chalk.gray(`  └─ Ignorado (No inicia con prefijo válido: ${prefixes.join(', ')})`));
            }
        }
    });

    // Auto-Reload al guardar archivos en /commands
    if (fs.existsSync('./commands')) {
        fs.watch('./commands', { recursive: true }, (_, filename) => {
            if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
                console.log(chalk.yellow(`\n[ AUTO-RELOAD ] Cambio detectado en ${filename}. Recargando comandos...`));
                cargarComandosDirecto('./commands').catch(() => {});
            }
        });
    }
}

startBot().catch(err => console.error('Error fatal al iniciar:', err));
