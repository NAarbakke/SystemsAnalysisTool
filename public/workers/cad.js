importScripts('/vendor/occt/occt-import-js.js');
let ready;
self.onmessage = async ({data}) => {
  try {
    ready ??= occtimportjs({locateFile:file=>'/vendor/occt/'+file});
    const occt = await ready;
    const method = data.payload.ext==='brep'?'ReadBrepFile':['igs','iges'].includes(data.payload.ext)?'ReadIgesFile':'ReadStepFile';
    const result = occt[method](new Uint8Array(data.payload.buffer), {linearUnit:'millimeter',linearDeflectionType:'bounding_box_ratio',linearDeflection:0.002,angularDeflection:0.5});
    self.postMessage({id:data.id,result});
  } catch(error) { ready=undefined;self.postMessage({id:data.id,error:'CAD import failed. Check the file or export a smaller STEP assembly. '+error.message}); }
};
