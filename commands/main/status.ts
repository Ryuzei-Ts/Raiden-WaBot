import os from 'os';
import config from '#config';

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    command: ['status', 'botstatus'],
    description: 'Muestra el estado actual del bot y del servidor',
    category: 'main',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat } = ctx;

        const uptime = process.uptime();
        const botUptime = formatUptime(uptime);
        
        const memUsage = process.memoryUsage();
        const heapUsed = formatBytes(memUsage.heapUsed);
        const heapTotal = formatBytes(memUsage.heapTotal);
        const rss = formatBytes(memUsage.rss);
        
        const totalMem = formatBytes(os.totalmem());
        const usedMem = formatBytes(os.totalmem() - os.freemem());
        const memPercent = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1);
        
        const cpus = os.cpus();
        const cpuCores = cpus.length;
        
        const loadAvg = os.loadavg();
        const load1 = loadAvg[0].toFixed(2);
        const load5 = loadAvg[1].toFixed(2);
        const load15 = loadAvg[2].toFixed(2);
        
        const platform = os.platform();
        const release = os.release();
        const arch = os.arch();
        let hostname = os.hostname();
        
        const nodeVersion = process.version;
        const pid = process.pid;

        if (hostname.length > 10 || hostname.includes('-')) {
            hostname = 'Local';
        }

        const textMessage = 
            `「✦」Estado de *${config.botName}* ^●ω●^\n\n` +
            `❒ RAM [${hostname}] » *${usedMem}* / ${totalMem} (${memPercent}%)\n` +
            `❒ CPU (x${cpuCores}) » *${load1} ${load5} ${load15}*\n` +
            `❒ Heap Node » *${heapUsed}* / ${heapTotal}\n` +
            `❒ RSS » *${rss}*\n` +
            `❒ SO » ${platform} ${release} (${arch})\n` +
            `❒ Node.js » ${nodeVersion}\n` +
            `❒ Uptime » ${botUptime}\n` +
            `❒ PID » ${pid}\n\n` +
            `> *${config.botName} está funcionando correctamente*`;

        await sock.sendMessage(chat, {
            text: textMessage,
            contextInfo: {
                isForwarded: false
            }
        }, { quoted: msg });
    }
};
