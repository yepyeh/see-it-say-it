import { promises as fs } from 'node:fs';
import path from 'node:path';

const serverDir = path.resolve('dist/server');
const entryPath = path.join(serverDir, 'entry.mjs');
const astroEntryPath = path.join(serverDir, 'entry.astro.mjs');
const chunksDir = path.join(serverDir, 'chunks');

async function findCommunicationsChunk() {
	const entries = await fs.readdir(chunksDir);
	const match = entries.find((name) => /^communications_.*\.mjs$/.test(name));
	if (!match) {
		throw new Error('Could not find the built communications chunk.');
	}
	return match;
}

async function findDigestExportAlias(chunkPath) {
	const source = await fs.readFile(chunkPath, 'utf8');
	const match = source.match(/sendDailyDigestsBatch as (\w+)/);
	if (!match) {
		throw new Error('Could not find the sendDailyDigestsBatch export alias.');
	}
	return match[1];
}

async function ensureAstroEntry() {
	const astroEntryExists = await fs
		.access(astroEntryPath)
		.then(() => true)
		.catch(() => false);

	if (astroEntryExists) return;
	await fs.rename(entryPath, astroEntryPath);
}

async function main() {
	const entryExists = await fs
		.access(entryPath)
		.then(() => true)
		.catch(() => false);
	if (!entryExists) return;

	await ensureAstroEntry();

	const communicationsChunk = await findCommunicationsChunk();
	const digestAlias = await findDigestExportAlias(path.join(chunksDir, communicationsChunk));

	const wrapper = `globalThis.process ??= {};
globalThis.process.env ??= {};
import "cloudflare:workers";
import astroWorker from "./entry.astro.mjs";
import { ${digestAlias} as sendDailyDigestsBatch } from "./chunks/${communicationsChunk}";

function createScheduledLocals(env) {
\treturn {
\t\tcfContext: { env },
\t};
}

async function runDailyDigestBatch(env) {
\ttry {
\t\tconst result = await sendDailyDigestsBatch(createScheduledLocals(env), { limit: 100 });
\t\tconsole.log("daily_digest_batch", JSON.stringify(result));
\t} catch (error) {
\t\tconsole.error("daily_digest_batch_failed", error);
\t\tthrow error;
\t}
}

export default {
\tasync fetch(request, env, ctx) {
\t\treturn astroWorker.fetch(request, env, ctx);
\t},
\tasync scheduled(controller, env, ctx) {
\t\tif (controller.cron !== "0 8 * * *") return;
\t\tctx.waitUntil(runDailyDigestBatch(env));
\t},
};
`;

	await fs.writeFile(entryPath, wrapper, 'utf8');
}

await main();
