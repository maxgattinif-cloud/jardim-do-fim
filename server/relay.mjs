// Servidor relay do Jardim do Fim — encaminha mensagens entre o anfitrião e os convidados de uma sala.
// Não contém lógica de jogo (o anfitrião é a autoridade) e NÃO guarda nenhum dado.
// Sem dependências: só módulos nativos do Node (>= 18).
//
//   node server/relay.mjs                (porta 8787)
//   PORT=9000 ALLOWED_ORIGINS=https://meujogo.com node server/relay.mjs
//
// Em produção coloque atrás de HTTPS/WSS (nginx, Caddy, Cloudflare...). O jogo usa o endereço
// que o jogador digita em Configurações → "Servidor relay" (ex.: wss://relay.meujogo.com).
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 8787);
const ALLOWED = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_ROOMS = 300;
const MAX_GUESTS = 5;
const MAX_MSG = 256 * 1024;
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/** @type {Map<string,{host:any|null,guests:Map<string,any>}>} */
const rooms = new Map();

function frame(op, payload) {
  const len = payload.length;
  let head;
  if (len < 126) head = Buffer.from([0x80 | op, len]);
  else if (len < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x80 | op;
    head[1] = 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | op;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([head, payload]);
}
const sendText = (peer, obj) => {
  if (peer && !peer.socket.destroyed) peer.socket.write(frame(0x1, Buffer.from(JSON.stringify(obj))));
};
const closePeer = (peer, code = 1000) => {
  if (peer.socket.destroyed) return;
  const b = Buffer.alloc(2);
  b.writeUInt16BE(code);
  peer.socket.write(frame(0x8, b));
  peer.socket.end();
};

function onMessage(peer, text) {
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    return;
  }
  if (!d || typeof d.to !== "string") return;
  const room = rooms.get(peer.room);
  if (!room) return;
  const env = { f: peer.id, m: d.m };
  if (peer.role === "guest") sendText(room.host, d.to === "host" ? env : null);
  else if (d.to === "*") for (const g of room.guests.values()) sendText(g, env);
  else sendText(room.guests.get(d.to), env);
}

function parse(peer, chunk) {
  peer.buf = Buffer.concat([peer.buf, chunk]);
  for (;;) {
    const b = peer.buf;
    if (b.length < 2) return;
    const fin = (b[0] & 0x80) !== 0;
    const op = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let off = 2;
    if (len === 126) {
      if (b.length < 4) return;
      len = b.readUInt16BE(2);
      off = 4;
    } else if (len === 127) {
      if (b.length < 10) return;
      len = Number(b.readBigUInt64BE(2));
      off = 10;
    }
    if (len > MAX_MSG) return peer.socket.destroy();
    const need = off + (masked ? 4 : 0) + len;
    if (b.length < need) return;
    let payload = b.subarray(off + (masked ? 4 : 0), need);
    if (masked) {
      const mask = b.subarray(off, off + 4);
      payload = Buffer.from(payload.map((v, i) => v ^ mask[i % 4]));
    }
    peer.buf = b.subarray(need);
    if (op === 0x8) return closePeer(peer);
    if (op === 0x9) peer.socket.write(frame(0xa, payload));
    else if (op === 0x1 || op === 0x0) {
      peer.frag = op === 0x1 ? [payload] : [...(peer.frag || []), payload];
      if (fin) {
        const text = Buffer.concat(peer.frag).toString("utf8");
        peer.frag = null;
        if (Date.now() - peer.winStart > 1000) {
          peer.winStart = Date.now();
          peer.count = 0;
        }
        if (++peer.count <= 200) onMessage(peer, text); // limite de 200 msg/s por conexão
      }
    }
  }
}

function leave(peer) {
  const room = rooms.get(peer.room);
  if (!room) return;
  if (peer.role === "host") {
    for (const g of room.guests.values()) closePeer(g, 1001);
    rooms.delete(peer.room);
  } else if (room.guests.get(peer.id) === peer) {
    room.guests.delete(peer.id);
    sendText(room.host, { f: "relay", m: { t: "peer-left", id: peer.id } });
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
  } else {
    res.writeHead(426);
    res.end("Jardim do Fim relay: use WebSocket.");
  }
});

server.on("upgrade", (req, socket) => {
  const url = new URL(req.url || "/", "http://x");
  const room = (url.searchParams.get("room") || "").toUpperCase();
  const id = url.searchParams.get("id") || "";
  const role = url.searchParams.get("role");
  const key = req.headers["sec-websocket-key"];
  const origin = req.headers.origin;
  const bad = () => socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  if (!key || !/^[A-Z0-9]{3,8}$/.test(room) || !/^[\w-]{3,40}$/.test(id) || (role !== "host" && role !== "guest")) return bad();
  if (ALLOWED.length && !(origin && ALLOWED.includes(origin))) return socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
  const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const peer = { id, role, room, socket, buf: Buffer.alloc(0), frag: null, winStart: Date.now(), count: 0 };

  let r = rooms.get(room);
  if (role === "host") {
    if (r && r.host) {
      sendText(peer, { f: "relay", m: { t: "error", reason: "room-taken" } });
      return closePeer(peer, 1008);
    }
    if (!r && rooms.size >= MAX_ROOMS) {
      sendText(peer, { f: "relay", m: { t: "error", reason: "server-full" } });
      return closePeer(peer, 1013);
    }
    r = r || { host: null, guests: new Map() };
    r.host = peer;
    rooms.set(room, r);
  } else {
    if (!r || !r.host) {
      sendText(peer, { f: "relay", m: { t: "error", reason: "no-host" } });
      return closePeer(peer, 1008);
    }
    if (r.guests.size >= MAX_GUESTS && !r.guests.has(id)) {
      sendText(peer, { f: "relay", m: { t: "error", reason: "full" } });
      return closePeer(peer, 1008);
    }
    const old = r.guests.get(id);
    if (old) old.socket.destroy();
    r.guests.set(id, peer);
    sendText(r.host, { f: "relay", m: { t: "peer-joined", id } });
  }
  socket.on("data", (c) => parse(peer, c));
  socket.on("close", () => leave(peer));
  socket.on("error", () => socket.destroy());
});

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  server.listen(PORT, () => console.log(`Relay do Jardim do Fim ouvindo na porta ${PORT}`));
}
export { server, rooms };
