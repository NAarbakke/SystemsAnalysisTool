import { loadPyodide } from '/vendor/pyodide/pyodide.mjs';
let ready;
async function runtime() {
  const py = await loadPyodide({ indexURL: '/vendor/pyodide/' });
  const response = await fetch('/python/explosion.py');
  if (!response.ok) throw new Error('Could not load the Python planner. Reload and try again.');
  py.runPython(await response.text());
  return py;
}
self.onmessage = async ({data}) => {
  try {
    ready ??= runtime();
    const py = await ready;
    const fn = py.globals.get('plan_json');
    try { self.postMessage({id:data.id,result:JSON.parse(fn(JSON.stringify(data.payload)))}); }
    finally { fn.destroy(); }
  } catch (error) { ready=undefined; self.postMessage({id:data.id,error:error.message}); }
};
