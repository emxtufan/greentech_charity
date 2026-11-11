import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {open, readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.resolve(projectRoot, process.env.DIST_DIR || 'dist');
const modelName = process.env.MODEL_FILE || 'greencube-original-OE4BBULY.glb';
const modelNames = [modelName];
const cloudflareDefaultLimit = 512 * 1024 * 1024;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function relative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll('\\', '/');
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} bytes (${(bytes / 1024 / 1024).toFixed(2)} MiB)`;
}

async function exactPath(root, relativePath) {
  let current = root;
  for (const segment of relativePath.split('/')) {
    let entries;
    try {
      entries = await readdir(current);
    } catch (error) {
      throw new Error(`Nu pot citi ${relative(current)}: ${error.message}`);
    }

    if (!entries.includes(segment)) {
      const caseInsensitiveMatch = entries.find((entry) => entry.toLowerCase() === segment.toLowerCase());
      const hint = caseInsensitiveMatch
        ? ` Exista \`${caseInsensitiveMatch}\`, dar Linux diferentiaza literele mari de cele mici.`
        : '';
      throw new Error(`Lipseste calea exacta ${relativePath}.${hint}`);
    }
    current = path.join(current, segment);
  }
  return current;
}

async function requiredFile(relativePath, minimumBytes = 1) {
  const filePath = await exactPath(distRoot, relativePath);
  const fileStat = await stat(filePath);
  assert(fileStat.isFile(), `${relativePath} nu este fisier.`);
  assert(fileStat.size >= minimumBytes, `${relativePath} este prea mic: ${fileStat.size} bytes.`);
  return {filePath, fileStat};
}

async function firstBytes(filePath, length) {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const {bytesRead} = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function sha256(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

async function javascriptFiles(root) {
  const files = [];
  for (const entry of await readdir(root, {withFileTypes: true})) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await javascriptFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(entryPath);
  }
  return files;
}

async function validateModel(modelName, resolved, stageWorker) {
  const {filePath: modelPath, fileStat: modelStat} = resolved.get(modelName);
  const modelHeader = await firstBytes(modelPath, 256);
  const headerText = modelHeader.toString('utf8');

  assert(
    !headerText.startsWith('version https://git-lfs.github.com/spec/v1'),
    `${modelName} este un pointer Git LFS, nu modelul binar.`,
  );
  assert(modelHeader.length >= 12, `${modelName} nu are un header GLB complet.`);
  assert(modelHeader.toString('ascii', 0, 4) === 'glTF', `${modelName} nu are semnatura GLB \`glTF\`.`);
  assert(modelHeader.readUInt32LE(4) === 2, `${modelName} nu este GLB versiunea 2.`);
  assert(
    modelHeader.readUInt32LE(8) === modelStat.size,
    `Lungimea declarata de ${modelName} nu corespunde: header=${modelHeader.readUInt32LE(8)}, fisier=${modelStat.size}.`,
  );

  const sourceModel = path.join(projectRoot, 'public', modelName);
  try {
    const sourceStat = await stat(sourceModel);
    assert(sourceStat.size === modelStat.size, `Modelul din dist difera ca dimensiune de public/${modelName}.`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    console.log(`[verify:dist] INFO public/${modelName} nu este inclus in release; modelul din dist este validat independent.`);
  }

  const modelHash = await sha256(modelPath);
  const modelVersion = modelHash.slice(0, 16);
  const versionedModelUrl = stageWorker.match(
    new RegExp(`(?:https:\\/\\/[^"'\\s]+|\\/[^"'\\s]+)[?&]v=${modelVersion}`, 'i'),
  )?.[0];
  assert(
    versionedModelUrl,
    `stage-worker.js nu contine un URL pentru ${modelName} cu versiunea ${modelVersion}.`,
  );

  return {modelName, modelPath, modelStat, modelHash, modelVersion, versionedModelUrl};
}

async function main() {
  const required = [
    ['index.html', 100],
    ['index.js', 1000],
    ['index.css', 100],
    ['stage-worker.js', 1000],
    ['404/index.html', 100],
    ['brandbook-section/content.json', 2],
    ['decoder/draco_decoder.js', 1000],
    ['decoder/draco_wasm_wrapper.js', 1000],
    ['decoder/draco_decoder.wasm', 8],
    ...modelNames.map((modelName) => [modelName, 12]),
  ];

  const resolved = new Map();
  for (const [file, minimumBytes] of required) {
    resolved.set(file, await requiredFile(file, minimumBytes));
  }

  const indexHtml = await readFile(resolved.get('index.html').filePath, 'utf8');
  assert(!indexHtml.includes('/@vite/client'), 'index.html contine /@vite/client; acesta este un build de dezvoltare.');
  assert(!indexHtml.includes('/src/main.tsx'), 'index.html contine /src/main.tsx; acesta este un build de dezvoltare.');
  assert(/(?:src|href)=["']\/index\.js["']/.test(indexHtml), 'index.html nu refera /index.js.');

  const wasmHeader = await firstBytes(resolved.get('decoder/draco_decoder.wasm').filePath, 4);
  assert(
    wasmHeader.equals(Buffer.from([0x00, 0x61, 0x73, 0x6d])),
    'decoder/draco_decoder.wasm nu are semnatura WebAssembly valida.',
  );

  const stageWorker = await readFile(resolved.get('stage-worker.js').filePath, 'utf8');
  const modelResults = [];
  for (const modelName of modelNames) {
    modelResults.push(await validateModel(modelName, resolved, stageWorker));
  }

  const assetScripts = (await javascriptFiles(path.join(distRoot, 'assets')))
    .filter((filePath) => path.basename(filePath).startsWith('greencube-runtime-'));
  assert(assetScripts.length > 0, 'Lipseste chunk-ul assets/greencube-runtime-*.js.');
  const runtimeSources = await Promise.all(assetScripts.map((filePath) => readFile(filePath, 'utf8')));
  const combinedRuntime = runtimeSources.join('\n');
  const compactRuntime = combinedRuntime.replace(/\s+/g, '');
  const compactWorker = stageWorker.replace(/\s+/g, '');

  for (const {versionedModelUrl} of modelResults) {
    const runtimeHasVersion = runtimeSources.some((source) => source.includes(versionedModelUrl));
    assert(runtimeHasVersion, `Chunk-ul greencube-runtime nu contine URL-ul versionat ${versionedModelUrl}.`);
  }

  assert(
    /powerPreference:["']high-performance["'],antialias:(?:true|!0)/.test(compactRuntime),
    'Chunk-ul greencube-runtime nu pastreaza antialiasingul original.',
  );
  assert(
    /powerPreference:["']high-performance["'],antialias:(?:true|!0)/.test(compactWorker),
    'stage-worker.js nu pastreaza antialiasingul original.',
  );
  assert(
    compactRuntime.includes('Math.min(window.devicePixelRatio,2)'),
    'Chunk-ul greencube-runtime nu foloseste DPR-ul original, limitat la 2.',
  );
  assert(
    /this\.hasOffscreen=[A-Za-z_$][\w$]*\(\)/.test(compactRuntime),
    'Chunk-ul greencube-runtime nu mai detecteaza automat OffscreenCanvas.',
  );
  assert(
    /\.to\(\{scroll:(?:0?\.5)\},4e3\)/.test(compactRuntime) &&
      /this\.autoScroll&&\(this\.scrollTarget\+=[A-Za-z_$][\w$]*\*(?:0?\.2)\)/.test(compactRuntime) &&
      !/\.to\(\{scroll:(?:0?\.5)\},2e3\)/.test(compactRuntime),
    'Chunk-ul greencube-runtime nu separa norii originali de zoomul final 2x.',
  );
  assert(
    !combinedRuntime.includes('__GREENTECH_LOW_MEMORY__') &&
      !stageWorker.includes('__GREENTECH_LOW_MEMORY__'),
    'Buildul contine inca profilul low-memory care reduce claritatea pe mobil.',
  );
  assert(
    !combinedRuntime.includes('transitionRing') &&
      !stageWorker.includes('transitionRing') &&
      !combinedRuntime.includes('/brandbook-section/assets/image/stage0/s0_o.webp'),
    'Buildul contine inca rendererul portalului WebGL.',
  );

  console.log('[verify:dist] Build production valid.');
  for (const result of modelResults) {
    console.log(`[verify:dist] Model ${result.modelName}: ${relative(result.modelPath)} - ${formatBytes(result.modelStat.size)}`);
    console.log(`[verify:dist] SHA-256: ${result.modelHash}`);
    console.log(`[verify:dist] Versiune cache: ${result.modelVersion}`);
    console.log(`[verify:dist] URL model: ${result.versionedModelUrl}`);
    if (result.modelStat.size > cloudflareDefaultLimit) {
      console.warn(`[verify:dist] Atentie: ${result.modelName} depaseste limita CDN implicita de ${formatBytes(cloudflareDefaultLimit)}.`);
    }
  }
}

main().catch((error) => {
  console.error(`[verify:dist] ESEC: ${error.message}`);
  process.exitCode = 1;
});
