import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const commit = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
writeFileSync('out/deployment.json', JSON.stringify({ application: 'detailer-calculator', delivery: 'cloudflare-static', commit }) + '\n');
