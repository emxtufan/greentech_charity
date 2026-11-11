import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = new URL(process.argv[2] || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3002');
const modelName = process.env.MODEL_FILE || 'greencube-original-OE4BBULY.glb';
const modelNames = [modelName];
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || '30000', 10);
const retries = Number.parseInt(process.env.SMOKE_RETRIES || '10', 10);
const retryDelayMs = Number.parseInt(process.env.SMOKE_RETRY_DELAY_MS || '500', 10);
const requireCdn = /^(1|true|yes)$/i.test(process.env.SMOKE_REQUIRE_CDN || '');
const hostHeader = String(process.env.SMOKE_HOST_HEADER || '').trim();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function endpoint(pathname) {
  const url = new URL(baseUrl);
  url.pathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
  url.search = '';
  url.hash = '';
  return url;
}

function commonHeaders(extra = {}) {
  const headers = {
    'accept-encoding': 'identity',
    'user-agent': 'greentech-charity-smoke/1.0',
    ...extra,
  };
  if (hostHeader) headers.host = hostHeader;
  return headers;
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function request(url, options = {}) {
  return fetch(url, {
    redirect: 'follow',
    ...options,
    headers: commonHeaders(options.headers),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function requestUntilReady(url) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await request(url);
      if (response.status === 200) return response;
      await response.body?.cancel();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < retries) await sleep(retryDelayMs);
  }
  throw new Error(`Endpointul ${url} nu este disponibil dupa ${retries} incercari: ${lastError?.message || 'eroare necunoscuta'}`);
}

function assertNoCache(response, label) {
  const value = response.headers.get('cache-control') || '';
  assert(/(?:no-store|no-cache|max-age=0)/i.test(value), `${label} are Cache-Control neasteptat: ${value || '(lipsa)'}.`);
}

function assertContentType(response, expected, label) {
  const value = response.headers.get('content-type') || '';
  assert(expected.test(value), `${label} are Content-Type neasteptat: ${value || '(lipsa)'}.`);
}

async function sha256Prefix(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex').slice(0, 16);
}

async function builtModelUrl(modelName) {
  const forcedVersion = process.env.SMOKE_MODEL_VERSION?.trim();
  try {
    const modelVersion = forcedVersion || await sha256Prefix(path.join(projectRoot, 'dist', modelName));
    const worker = await readFile(path.join(projectRoot, 'dist', 'stage-worker.js'), 'utf8');
    const modelPattern = new RegExp(
      `(?:https:\\/\\/[^"'\\s]+|\\/[^"'\\s]+)[?&]v=${modelVersion}`,
      'i',
    );
    return worker.match(modelPattern)?.[0] || '';
  } catch {
    return '';
  }
}

async function expectedLocalModelSize(modelName) {
  try {
    return (await stat(path.join(projectRoot, 'dist', modelName))).size;
  } catch {
    return 0;
  }
}

async function checkModel(modelName) {
  const modelAssetUrl = await builtModelUrl(modelName);
  const modelUrl = modelAssetUrl
    ? new URL(modelAssetUrl, baseUrl)
    : endpoint(`/${modelName}`);

  const modelHead = await request(modelUrl, {method: 'HEAD'});
  assert(modelHead.status === 200, `${modelUrl.pathname} raspunde cu HTTP ${modelHead.status}.`);
  assertContentType(modelHead, /model\/gltf-binary/i, modelUrl.pathname);
  assert(
    (modelHead.headers.get('accept-ranges') || '').toLowerCase() === 'bytes',
    `${modelUrl.pathname} nu anunta Accept-Ranges: bytes.`,
  );
  const cacheControl = modelHead.headers.get('cache-control') || '';
  assert(
    /public/i.test(cacheControl) && /immutable/i.test(cacheControl),
    `${modelUrl.pathname} are Cache-Control neasteptat: ${cacheControl || '(lipsa)'}.`,
  );

  const contentLength = Number.parseInt(modelHead.headers.get('content-length') || '', 10);
  assert(
    Number.isSafeInteger(contentLength) && contentLength > 1024,
    `${modelUrl.pathname} are Content-Length invalid: ${modelHead.headers.get('content-length') || '(lipsa)'}.`,
  );
  const localSize = await expectedLocalModelSize(modelName);
  if (localSize) {
    assert(
      contentLength === localSize,
      `Content-Length ${modelName} (${contentLength}) difera de buildul local (${localSize}).`,
    );
  }
  console.log(`[smoke:production] OK ${modelUrl.pathname} HEAD (${contentLength} bytes)`);

  const rangeResponse = await request(modelUrl, {headers: {range: 'bytes=0-1023'}});
  assert(rangeResponse.status === 206, `Range ${modelName} raspunde cu HTTP ${rangeResponse.status}, nu 206.`);
  const contentRange = rangeResponse.headers.get('content-range') || '';
  assert(
    contentRange === `bytes 0-1023/${contentLength}`,
    `Content-Range ${modelName} neasteptat: ${contentRange || '(lipsa)'}.`,
  );
  const rangeBody = Buffer.from(await rangeResponse.arrayBuffer());
  assert(rangeBody.length === 1024, `Range ${modelName} are ${rangeBody.length} bytes, nu 1024.`);
  assert(rangeBody.toString('ascii', 0, 4) === 'glTF', `Range-ul initial ${modelName} nu contine semnatura glTF.`);
  console.log(`[smoke:production] OK ${modelUrl.pathname} Range bytes=0-1023`);

  const cfCacheStatus = rangeResponse.headers.get('cf-cache-status') || modelHead.headers.get('cf-cache-status') || '';
  if (cfCacheStatus || requireCdn) {
    assert(cfCacheStatus, `Lipseste CF-Cache-Status pentru ${modelName}, desi SMOKE_REQUIRE_CDN este activ.`);
    assert(
      !/^(?:DYNAMIC|BYPASS)$/i.test(cfCacheStatus),
      `${modelName} nu este eligibil in cache-ul Cloudflare: CF-Cache-Status=${cfCacheStatus}.`,
    );
    console.log(`[smoke:production] OK ${modelName} Cloudflare CF-Cache-Status=${cfCacheStatus}`);
  } else {
    console.log(`[smoke:production] INFO verificarea Cloudflare pentru ${modelName} a fost omisa (origin/local).`);
  }
}

async function main() {
  assert(Number.isFinite(timeoutMs) && timeoutMs > 0, 'SMOKE_TIMEOUT_MS nu este valid.');
  assert(Number.isInteger(retries) && retries > 0, 'SMOKE_RETRIES nu este valid.');

  const healthResponse = await requestUntilReady(endpoint('/healthz'));
  await healthResponse.text();
  assertNoCache(healthResponse, '/healthz');
  console.log('[smoke:production] OK /healthz');

  const homeResponse = await request(endpoint('/'));
  assert(homeResponse.status === 200, `/ raspunde cu HTTP ${homeResponse.status}.`);
  assertContentType(homeResponse, /text\/html/i, '/');
  assertNoCache(homeResponse, '/');
  const homeHtml = await homeResponse.text();
  assert(!homeHtml.includes('/@vite/client'), '/ contine /@vite/client.');
  assert(!homeHtml.includes('/src/main.tsx'), '/ contine /src/main.tsx.');
  assert(homeHtml.includes('/index.js'), '/ nu refera /index.js.');
  console.log('[smoke:production] OK / (build production)');

  for (const asset of ['/index.js', '/index.css', '/stage-worker.js']) {
    const response = await request(endpoint(asset), {method: 'HEAD'});
    assert(response.status === 200, `${asset} raspunde cu HTTP ${response.status}.`);
    assertNoCache(response, asset);
    if (asset.endsWith('.js')) assertContentType(response, /javascript|ecmascript/i, asset);
    if (asset.endsWith('.css')) assertContentType(response, /text\/css/i, asset);
    console.log(`[smoke:production] OK ${asset}`);
  }

  for (const modelName of modelNames) await checkModel(modelName);

  console.log(`[smoke:production] Toate verificarile au trecut pentru ${baseUrl.origin}.`);
}

main().catch((error) => {
  console.error(`[smoke:production] ESEC: ${error.message}`);
  process.exitCode = 1;
});
