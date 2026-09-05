import {mkdir,copyFile} from 'node:fs/promises';
for(const [source,target,files] of [
 ['node_modules/occt-import-js/dist','public/vendor/occt',['occt-import-js.js','occt-import-js.wasm']],
 ['node_modules/pyodide','public/vendor/pyodide',['pyodide.mjs','pyodide.asm.mjs','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json']],
]){await mkdir(target,{recursive:true});for(const file of files)await copyFile(`${source}/${file}`,`${target}/${file}`);}
console.log('CAD and Python runtimes copied to public/vendor.');
