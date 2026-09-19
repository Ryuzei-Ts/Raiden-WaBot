import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const ownerNumbers = new Set([
    '5214436165999',
    '905364919591'
]);

export const config = {
    botName: 'Raiden-WaBot',
    devName: 'Ryuzei-Ts',
    prefix: '.',
    owner: ownerNumbers,
    banner: 'https://cdn.ryuzei.xyz/files/mz6r0pg6.jpeg',
    icon: 'https://cdn.ryuzei.xyz/files/ddj5167z.jpeg',
    coin: '¥enes'
};

const __filename = fileURLToPath(import.meta.url);

fs.watchFile(__filename, () => {
    fs.unwatchFile(__filename);
    console.log(chalk.gray(`Updated ${path.basename(__filename)}`));
    import(`${import.meta.url}?update=${Date.now()}`);
});

export default config;
