// Live coordinate relay for Sphere.
// The page sends JSON on ws://127.0.0.1:9741/sphere.
// Any other socket on that path receives the same messages.
// GET /coords returns the last fix for a device that only polls.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const PORT = 9741;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function pageFile(url) {
  let rel = decodeURIComponent((url || '/').split('?')[0]);
  if (rel === '/' || rel === '') rel = 'index.html';
  else rel = rel.replace(/^\/+/, '');
  if (!rel || rel.includes('..') || rel.includes('\\') || rel.includes('\0')) return null;
  if (rel !== 'index.html' && !rel.startsWith('js/') && !rel.startsWith('data/')) return null;
  const abs = path.resolve(ROOT, rel);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null;
  return abs;
}
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
let last = null;
const clients = new Set();

function encode(text, opcode) {
  const data = Buffer.from(text);
  const op = opcode == null ? 0x81 : opcode;
  let header;
  if (data.length < 126) header = Buffer.from([op, data.length]);
  else header = Buffer.from([op, 126, (data.length >> 8) & 255, data.length & 255]);
  return Buffer.concat([header, data]);
}

function attach(socket) {
  let buf = Buffer.alloc(0);
  clients.add(socket);
  if (last) socket.write(encode(JSON.stringify(last)));
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const opcode = buf[0] & 0x0f;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        socket.end();
        return;
      }
      const masked = (buf[1] & 0x80) !== 0;
      if (buf.length < off + (masked ? 4 : 0) + len) return;
      let payload = buf.subarray(off + (masked ? 4 : 0), off + (masked ? 4 : 0) + len);
      if (masked) {
        const mask = buf.subarray(off, off + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      }
      buf = buf.subarray(off + (masked ? 4 : 0) + len);
      if (opcode === 8) { socket.end(); return; }
      if (opcode === 9) { socket.write(encode(payload, 0x8a)); continue; }
      if (opcode !== 1) continue;
      const text = payload.toString('utf8');
      try { last = JSON.parse(text); } catch (e) { continue; }
      const frame = encode(text);
      for (const peer of clients) if (peer !== socket) peer.write(frame);
    }
  });
  const drop = () => clients.delete(socket);
  socket.on('close', drop);
  socket.on('error', drop);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.end(); return; }
  if (req.url && req.url.startsWith('/coords')) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(last || { type: 'sphere-coords', v: 1, t: null }));
    return;
  }
  const file = pageFile(req.url);
  if (file && TYPES[path.extname(file)]) {
    fs.readFile(file, (err, buf) => {
      if (err) { res.statusCode = 404; res.end(); return; }
      res.setHeader('Content-Type', TYPES[path.extname(file)]);
      res.end(buf);
    });
    return;
  }
  res.setHeader('Content-Type', 'text/plain');
  res.end('sphere tether\nhttp://127.0.0.1:' + PORT + '/\nws /sphere\nGET /coords\n');
});

server.on('upgrade', (req, socket) => {
  if (!req.url || !req.url.startsWith('/sphere')) { socket.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
  attach(socket);
});

server.listen(PORT, '0.0.0.0', () => {
  const addrs = new Set(['127.0.0.1']);
  const nets = networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) addrs.add(net.address);
    });
  });
  for (const host of addrs) {
    process.stdout.write('sphere page http://' + host + ':' + PORT + '/\n');
    process.stdout.write('sphere tether ws://' + host + ':' + PORT + '/sphere\n');
  }
});
