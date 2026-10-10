import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Mesh, Vector3 } from 'three';
import { inferFinish, finishes } from '../src/finishes.ts';
import { detailMesh, heatTint, revolve, sectionCaps } from '../models/display-details.ts';

test('imported parts take a finish from their name, and from their colour when the name says nothing', () => {
  assert.equal(inferFinish('M8_bolt_12').name, 'Zinc plated');
  assert.equal(inferFinish('Ox turbopump housing').name, 'Cast aluminium');
  assert.equal(inferFinish('Spindle').name, 'Ground steel');
  assert.equal(inferFinish('Solid 4').name, 'Machined aluminium');
  assert.equal(inferFinish('Solid 4', [.7, .7, .7]).name, 'Machined aluminium');
  assert.equal(inferFinish('Solid 4', [.05, .05, .06]).name, 'Black oxide');
  const painted = inferFinish('Solid 4', [.8, .1, .1]);
  assert.equal(painted.name, 'Paint');
  assert.ok(painted.color.r > painted.color.g * 5);
  // A name still wins over the colour, which is kept.
  const seal = inferFinish('O-ring', [.8, .1, .1]);
  assert.equal(seal.name, 'Rubber'); assert.ok(seal.color.r > seal.color.g * 5);
});

test('section caps close both cut planes of a cutaway and face outward from the remaining material', () => {
  const profile = [[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]], arc = Math.PI * 1.5;
  const { geometry } = sectionCaps(profile, arc, 0);
  const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
  assert.equal(p.count, 8); assert.equal(geometry.index.count, 12);
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  for (let t = 0; t < 12; t += 3) {
    const [i, j, k] = [0, 1, 2].map(o => geometry.index.getX(t + o));
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, j).sub(a); c.fromBufferAttribute(p, k).sub(a);
    assert.ok(b.cross(c).dot(new Vector3().fromBufferAttribute(n, i)) > 0, 'winding agrees with the normal');
  }
  // The sweep starts at +z heading toward +x and ends at -x heading toward +z.
  assert.ok(Math.abs(n.getX(0) + 1) < 1e-9, 'start cap faces back along the sweep');
  assert.ok(Math.abs(n.getZ(4) - 1) < 1e-9, 'end cap faces on along the sweep');
  geometry.dispose();
});

test('tinted and untinted pieces merge into one mesh, with vertex colours only on the tinted finish', () => {
  const profile = [[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]];
  const mesh = new Mesh(revolve(profile, 16), finishes.steel());
  detailMesh(mesh, [
    { geometry: heatTint(revolve(profile, 16), 0, 1), color: '#888888' },
    { geometry: new BoxGeometry(), color: '#222222', finish: finishes.zinc },
  ]);
  const color = mesh.geometry.getAttribute('color');
  assert.equal(color.count, mesh.geometry.getAttribute('position').count);
  assert.deepEqual([color.getX(0), color.getY(0), color.getZ(0)], [1, 1, 1]);
  assert.deepEqual(mesh.material.map(m => m.vertexColors), [false, true, false]);
  assert.equal(mesh.material[2].name, 'Zinc plated');
  mesh.geometry.dispose(); mesh.material.forEach(m => m.dispose());
});
