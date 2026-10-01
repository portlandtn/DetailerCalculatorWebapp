const [baseUrl, expectedCommit] = process.argv.slice(2);
if (!baseUrl || !expectedCommit) throw new Error('Usage: node scripts/check-deployment.mjs URL COMMIT');
const base = new URL(baseUrl);
if (base.protocol !== 'https:') throw new Error('Deployment verification requires HTTPS');
for (const path of ['/', '/manifest.webmanifest', '/favicon.svg', '/og.png', '/deployment.json']) {
  const url = new URL(path, base);
  url.searchParams.set('verify', expectedCommit);
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  if (path === '/deployment.json') {
    const metadata = await response.json();
    if (metadata.commit !== expectedCommit || metadata.delivery !== 'cloudflare-static') {
      throw new Error('Production does not serve the expected static release');
    }
  }
}
console.log(`Verified static release ${expectedCommit} at ${base.origin}`);
