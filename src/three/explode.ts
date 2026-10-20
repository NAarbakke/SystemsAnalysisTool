import { Box3, BufferAttribute, BufferGeometry, LineDashedMaterial, LineSegments, Matrix3, Matrix4, Mesh, Raycaster, Vector3, type Object3D } from 'three';

/** A rigid body of an exploded view (a part, or a whole sub-assembly) moved in its parent's frame. */
export interface Mover {
  object: Object3D;
  home: Vector3;
  offset: Vector3;
  /** Where the body's trail line starts, in its parent's frame. */
  pivot?: Vector3;
}

/** Clearance between exploded neighbours, as a share of the enclosing assembly's size. */
const GAP = .12;
/** Sideways moves within 15° of a principal axis are snapped onto it. */
const SNAP = Math.cos(15 * Math.PI / 180);

/**
 * Plans an engineering exploded view from the assembly tree, the way a drafter lays one out.
 * Each assembly keeps its largest central body (its base) in place. Sub-assemblies slide straight
 * out sideways from it, clear of the base. Parts lift off along one stacking axis in build order:
 * each part clears every exploded part beneath it that it would otherwise pass through, so stacks
 * fan out into evenly spaced layers, and parts side by side share a layer. A part enclosed within
 * the base's height leaves through whichever side of the base is open, found by casting rays. The same rule applies
 * inside every sub-assembly, in its own frame, so separation compounds down the tree.
 *
 * The stacking axis is the assembly's thinnest one, or its longest when it is slender (a shaft
 * or a rocket). Groups whose meshes all share the group's frame are treated as one component:
 * that is how glTF splits a multi-material part. Mark a group with `userData.assembly` to explode it anyway.
 */
export function planExplosion(content: Object3D): Mover[] {
  content.updateMatrixWorld(true);
  const ownBoxes = new Map<Mesh, Box3>(), boxes = new Map<Object3D, Box3>();
  const point = new Vector3();
  function boxOf(object: Object3D): Box3 {
    let box = boxes.get(object);
    if (box) return box;
    box = new Box3();
    if (object instanceof Mesh) {
      const own = new Box3(), positions = object.geometry.getAttribute('position');
      for (let i = 0; i < (positions?.count ?? 0); i++) own.expandByPoint(point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld));
      ownBoxes.set(object, own); box.union(own);
    }
    for (const child of object.children) box.union(boxOf(child));
    boxes.set(object, box);
    return box;
  }
  boxOf(content);
  const units = (object: Object3D) => object.children.filter(child => !boxOf(child).isEmpty());
  const atOrigin = (object: Object3D) => object.position.lengthSq() < 1e-18 && Math.abs(object.quaternion.w) > 1 - 1e-9 && object.scale.distanceToSquared(new Vector3(1, 1, 1)) < 1e-12;
  const rigid = (object: Object3D) => !object.userData.assembly && !(object instanceof Mesh)
    && units(object).every(child => child instanceof Mesh && !units(child).length && atOrigin(child));
  /** True when the body would explode inside, so it moves out as a sub-assembly. */
  function isAssembly(object: Object3D): boolean {
    const inner = units(object);
    if (object instanceof Mesh) return inner.length > 0;
    if (inner.length === 1) return isAssembly(inner[0]);
    return inner.length > 1 && !rigid(object);
  }

  const size = boxOf(content).getSize(new Vector3()).toArray();
  const [thin, middle, long] = [0, 1, 2].sort((a, b) => size[a] - size[b]);
  const k = size[long] > 2 * size[middle] ? long : thin;
  const lateral = [0, 1, 2].filter(axis => axis !== k);
  const up = new Vector3().setComponent(k, 1);

  const movers: Mover[] = [];
  function move(object: Object3D, world: Vector3) {
    const basis = new Matrix3().setFromMatrix4(object.parent!.matrixWorld);
    if (Math.abs(basis.determinant()) < 1e-15) throw new Error('A component has a zero-scale transform. Repair the export first.');
    const pivot = object.parent!.worldToLocal(boxOf(object).getCenter(new Vector3()));
    movers.push({ object, home: object.position.clone(), offset: world.applyMatrix3(basis.invert()), pivot });
  }

  function explode(node: Object3D) {
    const inner = units(node), own = node instanceof Mesh;
    if (!inner.length || rigid(node)) return;
    if (inner.length === 1 && !own) { explode(inner[0]); return; }
    const box = boxOf(node), centre = box.getCenter(new Vector3());
    const span = Math.max(...box.getSize(new Vector3()).toArray()), gap = GAP * span;
    const overlaps = (a: Box3, b: Box3) => lateral.every(axis => Math.min(a.max.getComponent(axis), b.max.getComponent(axis)) - Math.max(a.min.getComponent(axis), b.min.getComponent(axis)) > span * 5e-3);
    const volume = (b: Box3) => b.getSize(new Vector3()).addScalar(span * 1e-3).toArray().reduce((p, s) => p * s, 1);

    // The base: the node's own mesh, else the largest body that sits over the node's centre.
    let anchor: Object3D | undefined, base: Box3;
    if (own) base = ownBoxes.get(node as Mesh)!;
    else {
      const central = inner.filter(u => lateral.every(axis => boxOf(u).min.getComponent(axis) <= centre.getComponent(axis) && centre.getComponent(axis) <= boxOf(u).max.getComponent(axis)));
      anchor = (central.length ? central : inner).reduce((a, b) => volume(boxOf(b)) > volume(boxOf(a)) ? b : a);
      base = boxOf(anchor);
    }
    const baseCentre = base.getCenter(new Vector3());
    const sideways = (u: Object3D) => { const v = boxOf(u).getCenter(new Vector3()).sub(baseCentre); v.setComponent(k, 0); return v; };
    const rest = inner.filter(u => u !== anchor);
    const radial = rest.filter(u => isAssembly(u) && sideways(u).length() > .15 * span);
    const stacked = rest.filter(u => !radial.includes(u));

    // Rays from points across a part, counting how often the base stands in its way up and down.
    const raycaster = new Raycaster();
    const blocked = (u: Object3D, sign: number) => {
      const b = boxOf(u), c = b.getCenter(new Vector3()), s = b.getSize(new Vector3()).multiplyScalar(.35);
      return [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].filter(([i, j]) => {
        const origin = c.clone();
        origin.setComponent(lateral[0], c.getComponent(lateral[0]) + i * s.getComponent(lateral[0]));
        origin.setComponent(lateral[1], c.getComponent(lateral[1]) + j * s.getComponent(lateral[1]));
        raycaster.set(origin, up.clone().multiplyScalar(sign));
        return raycaster.intersectObject(anchor ?? node, !!anchor).length > 0;
      }).length;
    };
    const exit = (u: Object3D) => {
      const c = boxOf(u).getCenter(new Vector3()).getComponent(k);
      if (c < base.min.getComponent(k) || c > base.max.getComponent(k)) return Math.sign(c - baseCentre.getComponent(k)) || 1;
      return blocked(u, -1) < blocked(u, 1) ? -1 : 1;
    };
    const exits = new Map(stacked.map(u => [u, exit(u)]));

    // Stacks: above the base in order of their undersides, below it in order of their tops.
    for (const sign of [1, -1]) {
      const side = stacked.filter(u => exits.get(u) === sign).sort((a, b) =>
        (sign > 0 ? boxOf(a).min.getComponent(k) - boxOf(b).min.getComponent(k) : boxOf(b).max.getComponent(k) - boxOf(a).max.getComponent(k))
        || sideways(a).length() - sideways(b).length());
      const layers = [{ box: base, lift: 0 }];
      for (const u of side) {
        const b = boxOf(u);
        let lift = gap;
        for (const q of layers) if (overlaps(q.box, b)) lift = Math.max(lift, sign > 0
          ? q.box.max.getComponent(k) + q.lift + gap - b.min.getComponent(k)
          : b.max.getComponent(k) - q.box.min.getComponent(k) + q.lift + gap);
        layers.push({ box: b, lift });
        move(u, up.clone().multiplyScalar(sign * lift));
      }
    }

    // Sub-assemblies: straight out from the base, past everything that stays near the centre.
    const core = stacked.reduce((b, u) => b.union(boxOf(u)), base.clone());
    const corners = (b: Box3) => [0, 1, 2, 3, 4, 5, 6, 7].map(i => new Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
    for (const u of radial) {
      const direction = sideways(u).normalize();
      const axis = lateral.reduce((a, b) => Math.abs(direction.getComponent(b)) > Math.abs(direction.getComponent(a)) ? b : a);
      if (Math.abs(direction.getComponent(axis)) > SNAP) direction.set(0, 0, 0).setComponent(axis, Math.sign(direction.getComponent(axis) || 1));
      const reach = Math.max(...corners(core).map(c => c.dot(direction))), start = Math.min(...corners(boxOf(u)).map(c => c.dot(direction)));
      move(u, direction.multiplyScalar(Math.max(gap, reach + gap - start)));
    }
    for (const u of inner) explode(u);
  }
  explode(content);
  return movers;
}

/**
 * Dashed trail lines from each moved body's place in its (possibly moved) parent to where it is
 * now, as on an exploded drawing. One line object in `root`'s frame, redrawn on every change.
 */
export function createTrails(root: Object3D, movers: Mover[], dash: number) {
  const traced = movers.filter(m => m.pivot && m.offset.lengthSq() > 0);
  const geometry = new BufferGeometry();
  const positions = new BufferAttribute(new Float32Array(traced.length * 6), 3);
  geometry.setAttribute('position', positions);
  const material = new LineDashedMaterial({ name: 'Explosion trail', color: '#d0485a', dashSize: dash, gapSize: dash * .6, transparent: true, opacity: .8 });
  const line = new LineSegments(geometry, material);
  line.name = 'Explosion trails'; line.raycast = () => {}; line.visible = false; line.frustumCulled = false;
  root.add(line);
  const toRoot = new Matrix4(), from = new Vector3(), to = new Vector3();
  return {
    update(t: number) {
      line.visible = t > 0 && traced.length > 0;
      root.updateMatrixWorld(true);
      toRoot.copy(root.matrixWorld).invert();
      traced.forEach((m, i) => {
        const parent = m.object.parent!.matrixWorld;
        from.copy(m.pivot!).applyMatrix4(parent).applyMatrix4(toRoot);
        to.copy(m.pivot!).addScaledVector(m.offset, t).applyMatrix4(parent).applyMatrix4(toRoot);
        positions.setXYZ(2 * i, from.x, from.y, from.z); positions.setXYZ(2 * i + 1, to.x, to.y, to.z);
      });
      positions.needsUpdate = true;
      line.computeLineDistances();
      geometry.computeBoundingSphere();
    },
    dispose() { line.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
