/**
 * Fails the build if the service worker was not generated.
 *
 * Why this exists: `@ducanh2912/next-pwa` is a webpack plugin — it works by
 * hooking `config.webpack`. Next 16 builds with Turbopack by default, which
 * never calls that hook, so `withPWA` wrapped the config, did nothing, and the
 * build printed success. Both apps shipped for months with no service worker
 * and no signal, which meant installed PWAs had no update path at all: the old
 * worker polled /sw.js, got a 404, and kept serving its cached bundle forever.
 * (Task 042.)
 *
 * `next build --webpack` is the current fix, but it is a compatibility flag
 * with a shelf life. This guard is the part that outlives it — whatever bundler
 * or plugin comes next, a build that silently produces no worker fails here
 * rather than reaching a device.
 *
 * Checks existence, non-trivial size, and that it actually looks like a
 * generated worker. An empty or placeholder file would otherwise pass.
 */
import { readFileSync, statSync } from "node:fs";

const SW_PATH = "public/sw.js";

// A real generated worker is ~18KB. Anything under this is a stub or a stray.
const MIN_BYTES = 1000;

// Emitted by workbox's generateSW; their absence means the file is not a
// generated worker, whatever else it might be.
const REQUIRED_TOKENS = ["skipWaiting", "clientsClaim"];

function fail(reason) {
    console.error(`\n✖ Service worker check failed: ${reason}`);
    console.error(`  Expected a generated worker at ${SW_PATH}.`);
    console.error(`  next-pwa only runs under webpack — check that the build`);
    console.error(`  script still passes --webpack, and that withPWA still`);
    console.error(`  wraps the config in next.config.ts.\n`);
    process.exit(1);
}

let stats;
try {
    stats = statSync(SW_PATH);
} catch {
    fail(`${SW_PATH} does not exist`);
}

if (stats.size < MIN_BYTES) {
    fail(`${SW_PATH} is only ${stats.size} bytes`);
}

const source = readFileSync(SW_PATH, "utf8");
const missing = REQUIRED_TOKENS.filter((token) => !source.includes(token));
if (missing.length > 0) {
    fail(`${SW_PATH} is missing ${missing.join(", ")}`);
}

console.log(`✓ Service worker emitted (${SW_PATH}, ${(stats.size / 1024).toFixed(1)}KB)`);
