import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const cache = new Map();
const resolvedCache = new Map();

export const MODEL_URLS = {
  playerClassic: "/models/player-classic.gltf",
  playerStreet: "/models/player-street.gltf",
  playerStealth: "/models/player-stealth.gltf",
  obstacleCar: "/models/obstacle-car.gltf",
  obstacleTruck: "/models/obstacle-truck.gltf",
  obstacleRoadblock: "/models/obstacle-roadblock.gltf",
  propTree: "/models/prop-tree.gltf",
  propBillboard: "/models/prop-billboard.gltf",
};

export const SKINS = [
  {
    id: "classic",
    name: "Classic",
    description: "Turuncu dengeli skin",
    accent: "#ef6c32",
    glow: "#ff9d52",
    modelUrl: MODEL_URLS.playerClassic,
  },
  {
    id: "street",
    name: "Street",
    description: "Mavi hiz odakli skin",
    accent: "#2575d8",
    glow: "#6bd8ff",
    modelUrl: MODEL_URLS.playerStreet,
  },
  {
    id: "stealth",
    name: "Stealth",
    description: "Koyu premium skin",
    accent: "#2b3039",
    glow: "#4ad6ff",
    modelUrl: MODEL_URLS.playerStealth,
  },
];

export async function preloadModels(urls) {
  await Promise.all(urls.map((url) => loadModel(url)));
}

export async function loadModel(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const promise = loader.loadAsync(url).then((gltf) => {
    const model = gltf.scene || gltf.scenes?.[0];
    prepareObject(model);
    resolvedCache.set(url, model);
    return model;
  });

  cache.set(url, promise);
  return promise;
}

export async function cloneModel(url) {
  const original = await loadModel(url);
  const clone = original.clone(true);
  prepareObject(clone);
  return clone;
}

export function cloneModelSync(url) {
  const original = resolvedCache.get(url);
  if (!original) {
    return null;
  }

  const clone = original.clone(true);
  prepareObject(clone);
  return clone;
}

export function tintModel(root, color, emissive, emissiveIntensity = 0.18) {
  root.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    if (child.material.color) {
      child.material = child.material.clone();
      child.material.color.set(color);
    }

    if (child.material.emissive) {
      child.material.emissive.set(emissive);
      child.material.emissiveIntensity = emissiveIntensity;
    }
  });
}

function prepareObject(root) {
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone());
    } else if (child.material) {
      child.material = child.material.clone();
    }
  });
}
