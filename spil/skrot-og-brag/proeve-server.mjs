// Lokal browserprøve. Serveren indgår ikke i spillet eller offline-cachen.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const rod = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const typer = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.json': 'application/json', '.glb': 'model/gltf-binary' };
createServer(async (req, res) => {
  try {
    let sti = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (sti.endsWith('/')) sti += 'index.html';
    const fil = resolve(rod, `.${sti}`);
    if (!fil.startsWith(rod + sep)) throw new Error('Uden for projektet');
    const indhold = await readFile(fil);
    res.writeHead(200, { 'Content-Type': typer[extname(fil)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(indhold);
  } catch { res.writeHead(404); res.end('Ikke fundet'); }
}).listen(18124, '127.0.0.1', () => console.log('Skrot & Brag: http://127.0.0.1:18124/spil/skrot-og-brag/'));
