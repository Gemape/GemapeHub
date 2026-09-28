import { isIP } from 'node:net';
import { networkInterfaces } from 'node:os';

export function validateHost(host, addresses) {
  if (!isIP(host) || ['0.0.0.0', '::'].includes(host)) throw new Error('VPN_HOST deve ser um IP específico de uma interface local.');
  const privateAddress = host === '::1' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^f[cd]/i.test(host);
  if (!privateAddress || !addresses.includes(host)) throw new Error('VPN_HOST deve pertencer a uma interface privada presente nesta máquina.');
  return host;
}
export async function start() {
  const host = validateHost(process.env.VPN_HOST || '127.0.0.1', Object.values(networkInterfaces()).flat().filter(Boolean).map(n => n.address));
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida');
  process.env.HOST = host; process.env.NITRO_HOST = host;
  process.env.PORT = String(port); process.env.NITRO_PORT = String(port);
  await import('../.output/server/index.mjs');
}
if (process.argv[1]?.endsWith('start-private.mjs')) await start();
