export interface Config {
    botName: string;
    devName: string;
    prefix: string;
    owner: string[];
    banner: string;
    icon: string;
}

const config: Config = {
    botName: 'Raiden-WaBot',
    devName: 'Ryuzei-Ts',
    prefix: '.',
    owner: [
        '5214436165999',
        '905363893523',
        '905364919591'
    ],
    banner: 'https://cdn.ryuzei.xyz/files/mz6r0pg6.jpeg',
    icon: 'https://cdn.ryuzei.xyz/files/x21npy.jpeg'
};

export default config;
