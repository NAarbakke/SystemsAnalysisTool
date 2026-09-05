// These tests verify failure recovery, not actual browser encoding or pixels.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import ts from 'typescript';
const source=(await readFile('lib/studio.ts','utf8')).replace("from './models'", "from '../lib/models.ts'").replace("from './worker-client'", "from './worker-client-test.mjs'");
await mkdir('outputs',{recursive:true});
await writeFile('outputs/studio-export-test.mjs',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
await writeFile('outputs/worker-client-test.mjs',ts.transpileModule(await readFile('lib/worker-client.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
const {Studio}=await import('../outputs/studio-export-test.mjs');
globalThis.cancelAnimationFrame=()=>{};
const events=new EventTarget();
globalThis.document={hidden:false,addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)};
function fixture(){
 const studio=Object.create(Studio.prototype),original={background:true};let stopped=0;
 Object.assign(studio, {
  amount:65, playing:true, recording:false, recorder:null, duration:6,
  scene:{background:original}, camera:{}, controls:{enabled:true},
  cb:{onPlay(){},onProgress(){}}, apply(){}, resize(){}, download(){},
  renderer:{
   render(){},
   domElement:{captureStream(){return {getTracks(){return [{stop(){stopped++;}}];}};}}
  }
 });
 return {studio,restored(){assert.equal(studio.controls.enabled,true);assert.equal(studio.recording,false);assert.equal(studio.playing,true);assert.equal(studio.amount,65);assert.equal(studio.scene.background,original);assert.equal(studio.recorder,null);},stopped:()=>stopped};
}
globalThis.MediaRecorder=class{static isTypeSupported(){return true;}constructor(){throw new Error('Encoder allocation failed');}};
let f=fixture();await assert.rejects(f.studio.saveVideo('test'),/Encoder allocation failed/);f.restored();assert.equal(f.stopped(),1);
f=fixture();f.studio.renderer.domElement.captureStream=()=>{throw new Error('Capture denied');};await assert.rejects(f.studio.saveVideo('test'),/Capture denied/);f.restored();assert.equal(f.stopped(),0);
globalThis.MediaRecorder=class{static isTypeSupported(){return true;}state='inactive';start(){throw new Error('Codec start failed');}};
f=fixture();await assert.rejects(f.studio.saveVideo('test'),/Codec start failed/);f.restored();assert.equal(f.stopped(),1);
globalThis.MediaRecorder=class{static isTypeSupported(){return true;}state='inactive';start(){this.state='recording';queueMicrotask(()=>{document.hidden=true;events.dispatchEvent(new Event('visibilitychange'));});}stop(){this.state='inactive';this.onstop?.();}};
globalThis.requestAnimationFrame=()=>1;
f=fixture();await assert.rejects(f.studio.saveVideo('test'),/Keep this tab visible/);f.restored();assert.equal(f.stopped(),1);document.hidden=false;
f=fixture();f.studio.renderer.domElement.toBlob=callback=>callback(null);await assert.rejects(f.studio.saveImage('test'),/could not create a PNG/);f.restored();
f=fixture();f.studio.renderer.render=()=>{throw new Error('Context lost');};await assert.rejects(f.studio.saveImage('test'),/Context lost/);f.restored();
console.log('PASS export recovery: capture failure, encoder constructor/start failure, hidden tab, null PNG, lost context. Controls, playback, background and streams restored.');
