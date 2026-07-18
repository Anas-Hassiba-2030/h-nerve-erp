// Post-build patch: make webpack-bundled WASM work on Cloudflare Workers.
//
// WHY: webpack's asyncWebAssembly runtime loads wasm by reading the emitted
// asset file (`static/wasm/<hash>.wasm`) and calling
// `WebAssembly.instantiate(arrayBuffer)`. On workerd this is doubly broken:
//   1. OpenNext never embeds the emitted asset, so the readFile fails
//      (ENOENT readAll '/bundle/static/wasm/<hash>.wasm'); and
//   2. even with the bytes present, instantiating from an ArrayBuffer is
//      runtime wasm COMPILATION, which Workers forbid (the same class of
//      restriction as eval). Wasm must arrive as a deploy-time-compiled
//      WebAssembly.Module.
//
// FIX: rewrite the webpack wasm runtime inside the OpenNext server handler to
// instantiate from imported modules instead. Wrangler's default module rules
// compile any `import ... from "./x.wasm"` to a CompiledWasm module at deploy
// time, which workerd accepts.
//
// Steps:
//   1. find every .wasm file under the server function directory;
//   2. find every webpack wasm hash referenced by `.v(<mod>,<id>,"<hash>",…)`;
//   3. prepend one wasm-module import per file + a hash→module map;
//   4. replace the `k.v = (…) => new Promise(readFile…)` loader with
//      `WebAssembly.instantiate(map[hash], imports)`.
//
// The script FAILS LOUDLY on any ambiguity (no handler, no loader match,
// hash/file count mismatch) — a silent skip here ships a Worker whose every
// DB query throws.
//
// Runs as the last step of cf:build (see package.json). Idempotent: a
// re-run on an already-patched handler is a no-op.

import fs from "node:fs";
import path from "node:path";

const serverDir = path.join(process.cwd(), ".open-next", "server-functions", "default");
const handlerPath = path.join(serverDir, "handler.mjs");

if (!fs.existsSync(handlerPath)) {
  console.error(`[patch-wasm] handler not found: ${handlerPath} — run opennextjs-cloudflare build first`);
  process.exit(1);
}

let handler = fs.readFileSync(handlerPath, "utf8");

if (handler.includes("__cfWasmModules")) {
  console.log("[patch-wasm] handler already patched — nothing to do");
  process.exit(0);
}

// 1. All wasm files shipped inside the server function (relative paths).
const wasmFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith(".wasm")) wasmFiles.push(path.relative(serverDir, p).split(path.sep).join("/"));
  }
})(serverDir);

// 2. Webpack wasm hashes: call sites look like `c.v(b,a.id,"<16-hex>",{…})`.
const hashes = [...new Set([...handler.matchAll(/\.v\(\w+,\w+\.id,"([0-9a-f]{16,20})"/g)].map((m) => m[1]))];

console.log(`[patch-wasm] wasm files: ${JSON.stringify(wasmFiles)}`);
console.log(`[patch-wasm] webpack wasm hashes: ${JSON.stringify(hashes)}`);

if (wasmFiles.length === 0 && hashes.length === 0) {
  console.log("[patch-wasm] no wasm in this build — nothing to do");
  process.exit(0);
}
// Next runs several webpack compilations (server, edge) that emit the same
// wasm under different content hashes — with a single wasm file every hash
// necessarily refers to it. Ambiguity only exists with 2+ files.
if (wasmFiles.length > 1 && wasmFiles.length !== hashes.length) {
  console.error(
    `[patch-wasm] cannot map ${hashes.length} webpack wasm hash(es) to ${wasmFiles.length} wasm file(s). ` +
      "Extend this script with an explicit mapping before shipping.",
  );
  process.exit(1);
}

// 3. Loader rewrite. The minified runtime is:
//    k.v=(a,b,c,d)=>new Promise(function(…){…readFile…"static/wasm/"+c+".wasm"…})
//        .then(x=>x.arrayBuffer()).then(x=>WebAssembly.instantiate(x,d))
//        .then(r=>Object.assign(a,r.instance.exports))
// Identifier names vary per build, so match structurally around the unique
// "static/wasm/" anchor.
const loaderRe =
  /\.v=\((\w+),(\w+),(\w+),(\w+)\)=>new Promise\(function\([^)]*\)\{.*?"static\/wasm\/"\+\w+\+"\.wasm".*?\}\)\.then\(\w+=>\w+\.arrayBuffer\(\)\)\.then\(\w+=>WebAssembly\.instantiate\(\w+,\w+\)\)\.then\((\w+)=>Object\.assign\(\w+,\5\.instance\.exports\)\)/;

const m = handler.match(loaderRe);
if (!m) {
  console.error("[patch-wasm] webpack wasm loader not found in handler.mjs — webpack runtime shape changed, update loaderRe");
  process.exit(1);
}
const [, pExports, , pHash, pImports, pResult] = m;
// Besides the instance exports (what plain `import x from "./y.wasm"` users
// consume), also expose the compiled module as `default`: Prisma's
// wasm-compiler-edge runtime imports `./query_compiler_bg.wasm?module` and
// expects `default` to BE a WebAssembly.Module it instantiates itself —
// without this it throws "loaded wasm module was unexpectedly undefined".
const replacement =
  `.v=(${pExports},${m[2]},${pHash},${pImports})=>` +
  `WebAssembly.instantiate(__cfWasmModules[${pHash}],${pImports})` +
  `.then((${pResult})=>Object.assign(${pExports},${pResult}.exports,{default:__cfWasmModules[${pHash}]}))`;
handler = handler.replace(loaderRe, replacement);

// 4. Prepend imports + hash→module map. With exactly one file per hash the
//    order pairing is unambiguous (enforced above); today there is exactly
//    one wasm: Prisma's query compiler.
const importLines = wasmFiles
  .map((f, i) => `import __cfWasm${i} from ${JSON.stringify("./" + f)};`)
  .join("\n");
const moduleForHash = (i) => (wasmFiles.length === 1 ? "__cfWasm0" : `__cfWasm${i}`);
const mapLine = `const __cfWasmModules={${hashes.map((h, i) => `${JSON.stringify(h)}:${moduleForHash(i)}`).join(",")}};`;
handler = `${importLines}\n${mapLine}\n${handler}`;

fs.writeFileSync(handlerPath, handler);
console.log(`[patch-wasm] patched ${path.relative(process.cwd(), handlerPath)}: ${wasmFiles.length} wasm module(s) wired as CompiledWasm imports`);
