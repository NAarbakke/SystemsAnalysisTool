import { cp, mkdir, mkdtemp, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
await stat(path.join(root, 'dist/index.html'));
await mkdir(path.join(root, 'outputs'), { recursive: true });
const destination = await mkdtemp(path.join(root, 'outputs/intranet-viewer-'));
await cp(path.join(root, 'dist'), path.join(destination, 'dist'), { recursive: true });
await mkdir(path.join(destination, 'scripts'));
await cp(path.join(root, 'node_modules/three/LICENSE'), path.join(destination, 'THIRD-PARTY-LICENSES.txt'));
for (const file of ['scripts/serve.mjs', 'scripts/serve.py', 'run-local.cmd', 'run-intranet.cmd']) {
  await cp(path.join(root, file), path.join(destination, file));
}
await writeFile(path.join(destination, 'README.txt'), `EXPLODED VIEW — LOCAL / INTRANET\n\nThis folder is ready to run. No npm install, cloud account, or internet connection is needed.\nThe host machine needs Node.js 22.13+ OR Python 3.9+. Viewer computers only need a modern browser with WebGL.\n\nWINDOWS\n1. Unzip/copy this entire folder onto the host machine.\n2. Double-click run-local.cmd for this computer only.\n3. Open http://localhost:3000 in Edge or Chrome. Keep the server window open.\n\nFor access from other intranet computers, double-click run-intranet.cmd instead.\nOn the other computers open http://HOST-MACHINE-NAME:3000 (or its intranet IP address).\nThe network must allow inbound TCP port 3000 on the host. Do not add internet port forwarding.\nStop the server with Ctrl+C.\n\nCOMMAND LINE (WINDOWS / MAC / LINUX)\nNode:   node scripts/serve.mjs\nPython: python scripts/serve.py\nAdd --host 0.0.0.0 to either command for intranet access.\nAdd --port 8080 to use a different port.\n\nEXISTING INTRANET WEB SERVER\nYou can also serve the contents of dist/ using IIS, nginx, or another static HTTP server.\nNo backend, database, CAD converter, CDN, or cloud service is required.\nOpening index.html directly with file:// is not supported; use the local HTTP server.\n\nUSE\nChoose a model. Use the Separation slider (0-100%) or Explode assembly / Assemble.\nChoose Euler degrees (intrinsic XYZ) or quaternion (x,y,z,w), then Apply orientation.\nQuaternions are normalized. Reset restores the original orientation.\nDrag to orbit the camera; scroll or pinch to zoom. WebGL 2 is required; WebGPU is not.\nOpen Orientation replay to paste/import CSV (time,x,y,z), select degrees/radians and Euler order, then Load series and Play.\nUse example loads a demo; Replay time scrubs the series. Files stay local.\nAn example is included as orientation-example.csv. Convert simulator coordinate frames to model axes before import.\nUse the Assembly / Flyover menu to open the offline Earth globe.\nFlyover has a sample route, play/pause, seeking, whole-route and follow-camera views.\nImport flight CSV as time,latitude,longitude,altitude (seconds,degrees,degrees,metres above WGS84 ellipsoid).\nOptional roll,pitch,yaw columns are intrinsic ZYX degrees in local East/North/Up coordinates.\nNASA Blue Marble 16K imagery and Cesium assets are all bundled. No cloud account is needed.\nThe sample flight is illustrative and the vehicle is enlarged. Detailed terrain is not included.\nSee flight-example.csv and PROJECT-README.md for format and coordinate conventions.\nFlyover > Load a flight also supports full 3DOF and 6DOF state CSV. Select Input type and coordinate conventions, then use the displayed header.\n3DOF includes position and velocity; 6DOF also includes Euler/quaternion attitude and body angular rates.\nSee examples/README.md and PROJECT-README.md for units, frames, and templates.\nShow NOTAM areas toggles two synthetic ground footprints near the example route.\nReplace dist/data/notams.geojson with your local data; see dist/data/README.md for the schema.\nThe examples are not real NOTAMs. No stream is configured.\nThe example geometry is generated in Three.js with denser curved surfaces.\n`);
await cp(path.join(root, 'models/examples/orientation.csv'), path.join(destination, 'orientation-example.csv'));
await cp(path.join(root, 'models/examples/flight.csv'), path.join(destination, 'flight-example.csv'));
await cp(path.join(root, 'README.md'), path.join(destination, 'PROJECT-README.md'));
await cp(path.join(root, 'models/examples'), path.join(destination, 'examples'), { recursive: true });
await mkdir(path.join(destination, 'licenses'));
for (const font of ['dm-sans', 'newsreader']) {
  await cp(path.join(root, `node_modules/@fontsource-variable/${font}/LICENSE`), path.join(destination, 'licenses', `${font}.txt`));
}
console.log(destination);
