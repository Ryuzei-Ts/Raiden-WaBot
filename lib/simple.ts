import fs from 'fs';
import path from 'path';

export const lidCache = new Map<string, string>();

export const UserJid = (sock: any, chat?: string, jid?: string): string => {
    const targetJid = jid || chat;
    if (!targetJid) return '';

    if (targetJid.endsWith('@s.whatsapp.net') || targetJid.endsWith('@g.us')) {
        return targetJid;
    }

    const lidMatch = targetJid.match(/^([^@]+)@lid$/);
    if (!lidMatch) return targetJid;

    const lidNumber = lidMatch[1];

    if (lidCache.has(lidNumber)) {
        return lidCache.get(lidNumber)!;
    }

    if (sock && sock.signalRepository && sock.signalRepository.lidMapping) {
        try {
            const cachedPn = sock.signalRepository.lidMapping.mappingCache.get(`lid:${lidNumber}`);
            if (cachedPn) {
                const resolvedJid = `${cachedPn}@s.whatsapp.net`;
                lidCache.set(lidNumber, resolvedJid);
                return resolvedJid;
            }
        } catch (err) {}
    }

    const sessionDir = path.join(process.cwd(), 'Session');
    const mappingFile = path.join(sessionDir, `lid-mapping-${lidNumber}_reverse.json`);

    try {
        if (fs.existsSync(mappingFile)) {
            const phoneStr = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
            if (phoneStr) {
                const resolvedJid = `${phoneStr}@s.whatsapp.net`;
                lidCache.set(lidNumber, resolvedJid);
                return resolvedJid;
            }
        }
    } catch (err) {}

    return targetJid;
};
      
