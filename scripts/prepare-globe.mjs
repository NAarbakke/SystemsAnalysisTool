import { cp, mkdir } from 'node:fs/promises';
const target = new URL('../static/cesium/', import.meta.url);
await mkdir(target, { recursive: true });
for (const directory of ['Assets', 'Workers', 'ThirdParty', 'Widgets']) {
  await cp(new URL(`../node_modules/cesium/Build/Cesium/${directory}/`, import.meta.url), new URL(`${directory}/`, target), { recursive: true });
}
await cp(new URL('../node_modules/cesium/LICENSE.md', import.meta.url), new URL('LICENSE.md', target));
await cp(new URL('../node_modules/cesium/ThirdParty.extra.json', import.meta.url), new URL('ThirdParty.extra.json', target));
await cp(new URL('../node_modules/cesium/ThirdParty.json', import.meta.url), new URL('ThirdParty.json', target));
console.log('Offline globe assets prepared.');
