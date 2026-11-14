/* Builds worker/dist/worker.js: the game's rules and price files, then worker/src/index.js, as one module
   for Cloudflare. Run: node tools/build-worker.js */
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
var parts = ['js/dip-data.js', 'js/dip-data-sol.js', 'js/dip-data-link.js', 'js/dip-chains.js', 'js/dip-core.js', 'js/wl-core.js', 'js/dm-core.js'];
// The browser files hang their globals off `window` / `this`; inside the function below both are globalThis,
// and `module` is undefined so they don't take the node path.
var shared = '(function () { var window = globalThis, module;\n' +
  parts.map(function (p) { return '// ---- ' + p + '\n' + fs.readFileSync(path.join(root, p), 'utf8'); }).join('\n') +
  '\n}).call(globalThis);\n';
var out = '// Built by tools/build-worker.js. Do not edit; edit worker/src/index.js and the js/dip-*.js files.\n' + shared +
  fs.readFileSync(path.join(root, 'worker/src/index.js'), 'utf8');
fs.mkdirSync(path.join(root, 'worker/dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'worker/dist/worker.js'), out);
console.log('worker/dist/worker.js', out.length, 'bytes');
