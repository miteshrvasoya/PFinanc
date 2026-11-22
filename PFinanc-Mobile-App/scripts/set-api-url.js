#!/usr/bin/env node
/**
 * Detects this PC's Wi-Fi/LAN IPv4 address and writes EXPO_PUBLIC_API_URL into .env.
 * Runs automatically before `npm start`, so a changed IP never leaves the phone pointing at a stale address.
 *
 *   npm run set-ip            -> detect and update .env
 *   node scripts/set-api-url.js --print   -> only show the detected addresses
 *
 * A non-local URL already in .env (e.g. https://api.example.com) is never overwritten.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.API_PORT || '5000';
const envPath = path.join(__dirname, '..', '.env');
const printOnly = process.argv.includes('--print');

// Adapters that are virtual (WSL, Docker, VMs, VPNs): the phone cannot reach these.
const VIRTUAL = /vethernet|wsl|docker|virtual|vmware|vbox|hyper-v|loopback|bluetooth|tailscale|zerotier|vpn|tun|tap|utun|bridge|br-|veth/i;
const PREFERRED = /wi-?fi|wlan|wireless|^en0$|^wlp|^eth0$|ethernet/i;

function candidates() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (/^169\.254\./.test(a.address)) continue; // link-local: no real network
      const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address);
      if (!isPrivate) continue;
      let score = 0;
      if (VIRTUAL.test(name)) score -= 100;
      if (PREFERRED.test(name)) score += 20;
      if (a.address.startsWith('192.168.')) score += 10;
      else if (a.address.startsWith('10.')) score += 5;
      out.push({ name, address: a.address, score });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

const list = candidates();
if (list.length === 0) {
  console.warn('[set-ip] No Wi-Fi/LAN address found. Connect to Wi-Fi, or set EXPO_PUBLIC_API_URL manually in .env.');
  process.exit(0);
}

console.log('[set-ip] Network addresses found:');
list.forEach((c, i) => console.log(`  ${i === 0 ? '→' : ' '} ${c.address}  (${c.name})${c.score < 0 ? '  [virtual - ignored]' : ''}`));
if (printOnly) process.exit(0);

const best = list[0];
if (best.score < 0) {
  console.warn('[set-ip] Only virtual adapters found; not changing .env. Set EXPO_PUBLIC_API_URL manually.');
  process.exit(0);
}

const url = `http://${best.address}:${PORT}`;
let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const match = content.match(/^EXPO_PUBLIC_API_URL=(.*)$/m);
const current = match ? match[1].trim() : '';

if (current && !/^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(current)) {
  console.log(`[set-ip] .env points at a remote server (${current}); leaving it alone.`);
  process.exit(0);
}
if (current === url) {
  console.log(`[set-ip] .env already uses ${url}`);
  process.exit(0);
}

content = match
  ? content.replace(/^EXPO_PUBLIC_API_URL=.*$/m, `EXPO_PUBLIC_API_URL=${url}`)
  : `${content}${content && !content.endsWith('\n') ? '\n' : ''}EXPO_PUBLIC_API_URL=${url}\n`;
fs.writeFileSync(envPath, content);
console.log(`[set-ip] Updated .env: EXPO_PUBLIC_API_URL=${url}  (was ${current || 'unset'})`);
console.log(`[set-ip] Backend must be running on this PC at port ${PORT} and your phone on the same Wi-Fi.`);
