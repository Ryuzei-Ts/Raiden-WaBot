import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const execPromise = promisify(exec);

export default {
    command: ['fix', 'pull', 'update'],
    category: 'owner',
    owner: true,
    run: async (ctx: any) => {
        const { reply, sock, chat, msg } = ctx;

        try {
            const { stdout } = await execPromise('git pull');
            const rootDir = path.join(process.cwd(), 'commands');

            if (!(global as any).plugins) {
                (global as any).plugins = {};
            }

            const reload = async (dir: string) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        await reload(fullPath);
                    } else if (file.endsWith('.ts') && !file.startsWith('_')) {
                        try {
                            const fileUrl = pathToFileURL(fullPath).href + `?update=${Date.now()}`;
                            const module = await import(fileUrl);
                            const cmd = module.default || module;

                            if (cmd) {
                                const pluginKey = path.relative(rootDir, fullPath).replace(/\\/g, '/');
                                (global as any).plugins[pluginKey] = cmd;
                            }
                        } catch (e) {}
                    }
                }
            };

            (global as any).plugins = {};
            await reload(rootDir);

            let status = stdout.includes('Already up to date') 
                ? '✰ *Estado:* Sistema ya actualizado.' 
                : `✰ *Actualización completada:*\n\n\`\`\`${stdout}\`\`\``;

            await reply(status);

        } catch (err: any) {
            await reply(`✿ Error real detectado: fix > ${err.message || err.toString()}`);
        }
    }
};
