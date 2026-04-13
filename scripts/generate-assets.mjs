import fs from "node:fs/promises";
import path from "node:path";

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    constructor() {
      this.result = null;
      this.onloadend = null;
    }

    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer();
      if (typeof this.onloadend === "function") {
        this.onloadend();
      }
    }

    async readAsDataURL(blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      this.result = `data:${blob.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
      if (typeof this.onloadend === "function") {
        this.onloadend();
      }
    }
  };
}

const outputDir = path.resolve("public/models");

await fs.mkdir(outputDir, { recursive: true });

const assets = [
  ["player-classic.gltf", buildPlayerClassic()],
  ["player-street.gltf", buildPlayerStreet()],
  ["player-stealth.gltf", buildPlayerStealth()],
  ["obstacle-car.gltf", buildObstacleCar()],
  ["obstacle-truck.gltf", buildObstacleTruck()],
  ["obstacle-roadblock.gltf", buildRoadblock()],
  ["prop-tree.gltf", buildTree()],
  ["prop-billboard.gltf", buildBillboard()],
];

for (const [filename, scene] of assets) {
  const gltf = await exportScene(scene);
  await fs.writeFile(
    path.join(outputDir, filename),
    JSON.stringify(gltf, null, 2),
    "utf8",
  );
}

console.log(`Generated ${assets.length} asset files in ${outputDir}`);

function exportScene(scene) {
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => resolve(result),
      (error) => reject(error),
      { binary: false, onlyVisible: true, trs: false },
    );
  });
}

function buildPlayerClassic() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 36, 36),
    new THREE.MeshPhysicalMaterial({
      color: "#ef6c32",
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
    }),
  );
  group.add(body);

  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(0.74, 0.08, 16, 48),
    new THREE.MeshStandardMaterial({ color: "#fff6e8", roughness: 0.5 }),
  );
  stripe.rotation.x = Math.PI * 0.5;
  group.add(stripe);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 18, 18),
    new THREE.MeshStandardMaterial({
      color: "#ffe3b2",
      emissive: "#ffc46b",
      emissiveIntensity: 0.8,
    }),
  );
  group.add(core);

  return wrapScene(group);
}

function buildPlayerStreet() {
  const group = new THREE.Group();

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1.02, 32, 32),
    new THREE.MeshPhysicalMaterial({
      color: "#2080d8",
      roughness: 0.24,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
    }),
  );
  shell.scale.set(1, 0.92, 1.05);
  group.add(shell);

  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.12, 0.26),
    new THREE.MeshStandardMaterial({ color: "#122033", roughness: 0.6 }),
  );
  spoiler.position.set(0, 0.88, -0.32);
  group.add(spoiler);

  const sideBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.06, 14, 48),
    new THREE.MeshStandardMaterial({ color: "#d6f4ff", roughness: 0.4 }),
  );
  sideBand.rotation.z = Math.PI * 0.5;
  group.add(sideBand);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 18, 18),
    new THREE.MeshPhysicalMaterial({
      color: "#b7f1ff",
      transparent: true,
      opacity: 0.8,
      transmission: 0.3,
      roughness: 0.08,
    }),
  );
  visor.position.set(0, 0.1, 0.78);
  visor.scale.set(1, 0.6, 0.5);
  group.add(visor);

  return wrapScene(group);
}

function buildPlayerStealth() {
  const group = new THREE.Group();

  const shell = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.08, 1),
    new THREE.MeshPhysicalMaterial({
      color: "#2b3039",
      roughness: 0.2,
      metalness: 0.55,
      clearcoat: 0.75,
    }),
  );
  shell.scale.set(1, 0.86, 1.08);
  group.add(shell);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.05, 12, 48),
    new THREE.MeshStandardMaterial({
      color: "#7bf1ff",
      emissive: "#4ad6ff",
      emissiveIntensity: 1.4,
      roughness: 0.2,
    }),
  );
  ring.rotation.x = Math.PI * 0.5;
  group.add(ring);

  const fin = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.7, 4),
    new THREE.MeshStandardMaterial({ color: "#7bf1ff", roughness: 0.22 }),
  );
  fin.position.set(0, 0.88, 0);
  fin.rotation.z = Math.PI;
  group.add(fin);

  return wrapScene(group);
}

function buildObstacleCar() {
  const group = new THREE.Group();

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.8, 4.3),
    new THREE.MeshStandardMaterial({ color: "#d53b3b", roughness: 0.42 }),
  );
  chassis.position.y = 0.65;
  group.add(chassis);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.85, 2.1),
    new THREE.MeshPhysicalMaterial({
      color: "#d9ebf7",
      transparent: true,
      opacity: 0.84,
      roughness: 0.18,
    }),
  );
  cabin.position.set(0, 1.18, -0.2);
  group.add(cabin);

  addWheels(group, 1.05, 0.34, 1.45);
  return wrapScene(group);
}

function buildObstacleTruck() {
  const group = new THREE.Group();

  const trailer = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 1.9, 5.2),
    new THREE.MeshStandardMaterial({ color: "#d6d6d2", roughness: 0.72 }),
  );
  trailer.position.y = 1.2;
  group.add(trailer);

  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.6, 1.8),
    new THREE.MeshStandardMaterial({ color: "#2c7cd8", roughness: 0.45 }),
  );
  cab.position.set(0, 1.05, 2.1);
  group.add(cab);

  addWheels(group, 1.12, 0.36, 2.1);
  addWheels(group, 1.12, 0.36, -1.7);
  return wrapScene(group);
}

function buildRoadblock() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.26, 1.2),
    new THREE.MeshStandardMaterial({ color: "#303030", roughness: 1 }),
  );
  base.position.y = 0.14;
  group.add(base);

  const plank = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.1, 0.18),
    new THREE.MeshStandardMaterial({ color: "#f7c948", roughness: 0.7 }),
  );
  plank.position.y = 1;
  group.add(plank);

  const stripeLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.12, 0.2),
    new THREE.MeshStandardMaterial({ color: "#f0652f", roughness: 0.7 }),
  );
  stripeLeft.position.set(-0.62, 1, 0);
  stripeLeft.rotation.z = Math.PI * 0.18;
  group.add(stripeLeft);

  const stripeRight = stripeLeft.clone();
  stripeRight.position.x = 0.62;
  stripeRight.rotation.z = -Math.PI * 0.18;
  group.add(stripeRight);

  return wrapScene(group);
}

function buildTree() {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.34, 2.2, 10),
    new THREE.MeshStandardMaterial({ color: "#7b5d3f", roughness: 1 }),
  );
  trunk.position.y = 1.1;
  group.add(trunk);

  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: "#5f8642",
    roughness: 1,
  });

  for (const [x, y, z, s] of [
    [0, 3.2, 0, 1.35],
    [0.92, 2.92, 0.18, 1.05],
    [-0.88, 2.84, -0.12, 1],
  ]) {
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(s, 16, 16),
      foliageMaterial,
    );
    foliage.position.set(x, y, z);
    group.add(foliage);
  }

  return wrapScene(group);
}

function buildBillboard() {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 4.4, 0.24),
    new THREE.MeshStandardMaterial({ color: "#7d8388", roughness: 0.6 }),
  );
  pole.position.y = 2.2;
  group.add(pole);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(4.1, 2.4, 0.22),
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.82 }),
  );
  board.position.y = 4.25;
  group.add(board);

  return wrapScene(group);
}

function addWheels(group, x, radius, zOffset) {
  for (const z of [zOffset, -zOffset]) {
    const left = createWheel(radius);
    left.position.set(-x, 0.34, z);
    left.rotation.z = Math.PI * 0.5;
    group.add(left);

    const right = createWheel(radius);
    right.position.set(x, 0.34, z);
    right.rotation.z = Math.PI * 0.5;
    group.add(right);
  }
}

function createWheel(radius) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.28, 20),
    new THREE.MeshStandardMaterial({ color: "#1f2328", roughness: 0.95 }),
  );
}

function wrapScene(root) {
  const scene = new THREE.Scene();
  scene.add(root);
  return scene;
}
