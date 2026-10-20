import {
  Box3, DirectionalLight, DoubleSide, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh,
  NeutralToneMapping, PCFShadowMap, PlaneGeometry, PMREMGenerator, ShadowMaterial, Sphere, Vector3,
  type Camera, type Scene, type WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import type { Assembly } from './assembly.ts';

/** Edge lines cost a pass over every triangle, so very dense parts and assemblies go without. */
const EDGE_PART_LIMIT = 120_000, EDGE_TOTAL_LIMIT = 600_000;

/**
 * Staging for the assembly view: studio lighting with cast shadows, a ground that only catches
 * the shadow, ambient occlusion between parts, and ink lines on hard edges. The canvas stays
 * transparent, so the backdrop is the page's own gradient in either colour mode.
 */
export function createStage(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = .9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const room = new RoomEnvironment(), pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .75;
  room.dispose(); pmrem.dispose();

  // The key light casts the shadows; the rim only separates the far side from the backdrop.
  const keyDirection = new Vector3(3, 6, 5).normalize();
  const key = new DirectionalLight(0xffffff, 1.7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -.0004;
  key.shadow.normalBias = .02;
  key.shadow.radius = 5;
  const rim = new DirectionalLight(0xdfe8ff, 1.1);
  rim.position.set(-5, 2, -6);
  const ground = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new ShadowMaterial());
  ground.receiveShadow = true;
  scene.add(key, key.target, rim, ground);

  // The renderer's supersampling is the antialiasing here; the passes draw into plain targets.
  const composer = new EffectComposer(renderer);
  const occlusion = new GTAOPass(scene, camera, 1, 1);
  occlusion.updateGtaoMaterial({ radius: .35, distanceExponent: 1.4, thickness: 1.2, scale: 1.15, samples: 16 });
  occlusion.normalMaterial.side = DoubleSide; // cutaway shells show their inner faces
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(occlusion);
  composer.addPass(new OutputPass());

  const ink = new LineBasicMaterial({ color: 0x05070a, transparent: true, opacity: .4 });
  let edges: LineSegments[] = [];
  let floor = 0;
  const light = () => document.documentElement.dataset.theme === 'light';

  function clearEdges() {
    for (const line of edges) { line.removeFromParent(); line.geometry.dispose(); }
    edges = [];
  }

  return {
    /** Shadows and edge lines for a newly shown model. */
    setModel(model: Assembly) {
      clearEdges();
      const count = (mesh: Mesh) => (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
      const outlined = model.parts.reduce((sum, part) => sum + count(part.mesh), 0) <= EDGE_TOTAL_LIMIT;
      for (const { mesh } of model.parts) {
        mesh.castShadow = mesh.receiveShadow = true;
        // Surfaces sit a hair behind their own edge lines.
        for (const material of [mesh.material].flat()) { material.polygonOffset = true; material.polygonOffsetFactor = material.polygonOffsetUnits = 1; }
        if (!outlined || count(mesh) > EDGE_PART_LIMIT) continue;
        const line = new LineSegments(new EdgesGeometry(mesh.geometry, 32), ink);
        line.raycast = () => {};
        mesh.add(line); edges.push(line);
      }
    },
    /** Fit the shadow and its ground to the model's current pose. */
    fit(model: Assembly) {
      const box = new Box3().setFromObject(model.root), sphere = box.getBoundingSphere(new Sphere()), r = sphere.radius;
      key.target.position.copy(sphere.center);
      key.position.copy(sphere.center).addScaledVector(keyDirection, r * 3);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -r; shadow.right = shadow.top = r; shadow.near = r; shadow.far = r * 6;
      shadow.updateProjectionMatrix();
      floor = box.min.y - r * .04;
      ground.position.set(sphere.center.x, floor, sphere.center.z);
      ground.scale.setScalar(r * 12);
    },
    setSize(width: number, height: number) {
      const ratio = renderer.getPixelRatio();
      composer.setPixelRatio(ratio);
      composer.setSize(width, height);
      // Occlusion is soft by nature: half the supersampled resolution is ample and four times cheaper.
      occlusion.setSize(Math.ceil(width * ratio / 2), Math.ceil(height * ratio / 2));
    },
    render() {
      (ground.material as ShadowMaterial).opacity = light() ? .16 : .34;
      ground.visible = camera.position.y > floor; // a shadow has no underside
      composer.render();
    },
    dispose() {
      clearEdges(); ink.dispose();
      ground.geometry.dispose(); (ground.material as ShadowMaterial).dispose();
      key.dispose(); rim.dispose();
      environment.dispose(); composer.dispose();
    },
  };
}
