import "./style.css";

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const canvas = document.querySelector("#scene");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const levelElement = document.querySelector("#level");
const statusElement = document.querySelector("#status");
const overlayElement = document.querySelector("#overlay");
const overlayTextElement = document.querySelector("#overlay-text");
const overlayButtonElement = document.querySelector("#overlay-button");

const lanePositions = [-4.4, 0, 4.4];
const gameState = {
  running: false,
  started: false,
  score: 0,
  bestScore: Number(localStorage.getItem("wep-best-score") || 0),
  speed: 16,
  distance: 0,
  targetLane: 1,
  currentLane: 1,
  level: 1,
};

bestScoreElement.textContent = formatScore(gameState.bestScore);
levelElement.textContent = String(gameState.level);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#090c14");
scene.fog = new THREE.Fog("#090c14", 26, 82);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);
camera.position.set(0, 7.2, 14);
camera.lookAt(0, 1.5, -10);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.75,
    0.7,
    0.25,
  ),
);

const ambientLight = new THREE.HemisphereLight("#9fb8ff", "#0c1019", 1.8);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight("#fff2cc", 2.5);
sunLight.position.set(9, 16, 8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -22;
sunLight.shadow.camera.right = 22;
sunLight.shadow.camera.top = 22;
sunLight.shadow.camera.bottom = -22;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 50;
scene.add(sunLight);

const fillLight = new THREE.PointLight("#37c6ff", 38, 80, 2.1);
fillLight.position.set(0, 5, -12);
scene.add(fillLight);

const roadGroup = new THREE.Group();
scene.add(roadGroup);

const segmentLength = 16;
const roadSegments = [];

const roadMaterial = new THREE.MeshStandardMaterial({
  color: "#111723",
  metalness: 0.15,
  roughness: 0.65,
});

const stripeMaterial = new THREE.MeshStandardMaterial({
  color: "#8df2ff",
  emissive: "#55c9da",
  emissiveIntensity: 0.8,
  metalness: 0.2,
  roughness: 0.35,
});

for (let index = 0; index < 10; index += 1) {
  const segment = new THREE.Group();

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.8, segmentLength),
    roadMaterial,
  );
  road.receiveShadow = true;
  road.position.y = -0.45;
  segment.add(road);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.05, segmentLength * 0.6),
    stripeMaterial,
  );
  stripe.position.set(0, 0, 0);
  segment.add(stripe);

  const leftRail = buildRail(-7.8);
  const rightRail = buildRail(7.8);
  segment.add(leftRail, rightRail);

  segment.position.z = -index * segmentLength;
  roadSegments.push(segment);
  roadGroup.add(segment);
}

const decorGroup = new THREE.Group();
scene.add(decorGroup);

for (let index = 0; index < 24; index += 1) {
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.4, 3 + Math.random() * 5, 10),
    new THREE.MeshStandardMaterial({
      color: "#263249",
      emissive: "#0d1826",
      roughness: 0.8,
      metalness: 0.2,
    }),
  );
  const side = index % 2 === 0 ? 1 : -1;
  tower.position.set(side * (11 + Math.random() * 8), 1.5, -index * 6);
  tower.castShadow = true;
  decorGroup.add(tower);

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 16),
    new THREE.MeshStandardMaterial({
      color: side > 0 ? "#67f7ff" : "#ff8f52",
      emissive: side > 0 ? "#3bd7ff" : "#ff7138",
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.15,
    }),
  );
  orb.position.copy(tower.position);
  orb.position.y += tower.geometry.parameters.height * 0.5;
  decorGroup.add(orb);
}

const player = new THREE.Group();
scene.add(player);

const playerBody = new THREE.Mesh(
  new THREE.SphereGeometry(1.15, 48, 48),
  new THREE.MeshPhysicalMaterial({
    color: "#f4f7ff",
    emissive: "#5ec8ff",
    emissiveIntensity: 1,
    metalness: 0.05,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  }),
);
playerBody.castShadow = true;
playerBody.receiveShadow = true;
player.add(playerBody);

const core = new THREE.Mesh(
  new THREE.SphereGeometry(0.45, 24, 24),
  new THREE.MeshStandardMaterial({
    color: "#8ffcff",
    emissive: "#5affef",
    emissiveIntensity: 2.4,
    roughness: 0.2,
    metalness: 0.1,
  }),
);
player.add(core);

player.position.set(lanePositions[1], 1.2, 6);

const obstacleRows = [];
const rowSpacing = 13;

for (let index = 0; index < 9; index += 1) {
  const row = new THREE.Group();
  row.position.z = -26 - index * rowSpacing;
  row.userData.blocks = [];
  obstacleRows.push(row);
  scene.add(row);
  refreshRow(row);
}

const sparkGroup = new THREE.Group();
scene.add(sparkGroup);

const sparkMaterial = new THREE.MeshBasicMaterial({ color: "#78e9ff" });

for (let index = 0; index < 80; index += 1) {
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.03 + Math.random() * 0.06, 8, 8),
    sparkMaterial,
  );
  spark.position.set(
    (Math.random() - 0.5) * 40,
    1 + Math.random() * 14,
    -Math.random() * 140,
  );
  spark.userData.speed = 4 + Math.random() * 8;
  sparkGroup.add(spark);
}

const clock = new THREE.Clock();

window.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", onResize);
window.addEventListener("pointerdown", onPointerDown, { passive: true });
overlayButtonElement.addEventListener("click", startOrRestartGame);

animate();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  if (gameState.running) {
    gameState.speed = Math.min(34, gameState.speed + delta * 0.22);
    gameState.distance += gameState.speed * delta;
    gameState.score = Math.floor(gameState.distance * 4.3);
    gameState.level = 1 + Math.floor(gameState.score / 180);
    scoreElement.textContent = formatScore(gameState.score);
    levelElement.textContent = String(gameState.level);
  }

  gameState.currentLane = THREE.MathUtils.damp(
    gameState.currentLane,
    gameState.targetLane,
    10,
    delta,
  );

  player.position.x = THREE.MathUtils.damp(
    player.position.x,
    interpolateLanePosition(gameState.currentLane),
    10,
    delta,
  );
  player.position.y = 1.15 + Math.sin(elapsed * 4.2) * 0.16;
  player.rotation.z = Math.sin(elapsed * 7.5) * 0.05;
  player.rotation.x += delta * 1.4;

  camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x * 0.42, 4, delta);
  camera.lookAt(player.position.x * 0.18, 1.8, -12);

  updateRoad(delta);
  updateDecor(delta);
  updateObstacleRows(delta);
  updateSparks(delta);

  composer.render();
}

function updateRoad(delta) {
  const furthestZ = Math.min(...roadSegments.map((segment) => segment.position.z));

  for (const segment of roadSegments) {
    if (gameState.running) {
      segment.position.z += gameState.speed * delta;
    }

    if (segment.position.z > 14) {
      segment.position.z = furthestZ - segmentLength;
    }
  }
}

function updateDecor(delta) {
  const speed = gameState.running ? gameState.speed : 10;

  for (const child of decorGroup.children) {
    child.position.z += speed * delta * 0.82;
    if (child.position.z > 18) {
      child.position.z = -132 - Math.random() * 40;
    }
  }
}

function updateObstacleRows(delta) {
  let furthestZ = Infinity;

  for (const row of obstacleRows) {
    furthestZ = Math.min(furthestZ, row.position.z);
  }

  for (const row of obstacleRows) {
    if (gameState.running) {
      row.position.z += gameState.speed * delta;
    }

    if (row.position.z > 14) {
      row.position.z = furthestZ - rowSpacing - Math.random() * 3;
      refreshRow(row);
      furthestZ = Math.min(furthestZ, row.position.z);
      continue;
    }

    if (!gameState.running) {
      continue;
    }

    if (Math.abs(row.position.z - player.position.z) < 1.8) {
      for (const block of row.userData.blocks) {
        const blockX = block.position.x;
        if (Math.abs(blockX - player.position.x) < 1.6) {
          triggerGameOver();
          break;
        }
      }
    }
  }
}

function updateSparks(delta) {
  const travel = gameState.running ? gameState.speed * 0.9 : 6;

  for (const spark of sparkGroup.children) {
    spark.position.z += (travel + spark.userData.speed) * delta;

    if (spark.position.z > 8) {
      spark.position.z = -140;
      spark.position.x = (Math.random() - 0.5) * 40;
      spark.position.y = 1 + Math.random() * 14;
    }
  }
}

function buildRail(x) {
  const rail = new THREE.Group();

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.55, segmentLength),
    new THREE.MeshStandardMaterial({
      color: "#1b2637",
      emissive: "#0e151f",
      roughness: 0.58,
      metalness: 0.2,
    }),
  );
  mesh.position.set(x, 0.25, 0);
  mesh.receiveShadow = true;
  rail.add(mesh);

  const lightStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, segmentLength * 0.82),
    new THREE.MeshStandardMaterial({
      color: "#abf7ff",
      emissive: "#5ce5ff",
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.15,
    }),
  );
  lightStrip.position.set(x + (x < 0 ? 0.14 : -0.14), 0.65, 0);
  rail.add(lightStrip);

  return rail;
}

function refreshRow(row) {
  while (row.children.length > 0) {
    row.remove(row.children[0]);
  }

  row.userData.blocks = [];
  const blockedLaneCount = Math.random() > 0.55 ? 2 : 1;
  const availableLanes = [0, 1, 2];

  for (let index = 0; index < blockedLaneCount; index += 1) {
    const laneIndex = availableLanes.splice(
      Math.floor(Math.random() * availableLanes.length),
      1,
    )[0];

    const obstacle = buildObstacle(index);
    obstacle.position.x = lanePositions[laneIndex];
    row.userData.blocks.push(obstacle);
    row.add(obstacle);
  }
}

function buildObstacle(seed) {
  const variant = Math.random() > 0.5 ? "box" : "crystal";
  let mesh;

  if (variant === "box") {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.25, 2.6 + Math.random() * 0.9, 2.25),
      new THREE.MeshStandardMaterial({
        color: seed % 2 === 0 ? "#ff5f6d" : "#ff9f43",
        emissive: seed % 2 === 0 ? "#ff3047" : "#ff7a00",
        emissiveIntensity: 0.95,
        roughness: 0.28,
        metalness: 0.36,
      }),
    );
    mesh.position.y = 1.1;
  } else {
    mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({
        color: "#9a7dff",
        emissive: "#4f44ff",
        emissiveIntensity: 1.25,
        roughness: 0.18,
        metalness: 0.42,
      }),
    );
    mesh.position.y = 1.65;
    mesh.rotation.y = Math.PI * 0.25;
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function onKeyDown(event) {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    moveLane(-1);
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    moveLane(1);
  }

  if (event.code === "Space" && !gameState.running) {
    startOrRestartGame();
  }
}

function onPointerDown(event) {
  if (overlayButtonElement.contains(event.target)) {
    return;
  }

  if (!gameState.running) {
    startOrRestartGame();
    return;
  }

  if (event.clientX < window.innerWidth / 2) {
    moveLane(-1);
  } else {
    moveLane(1);
  }
}

function moveLane(direction) {
  gameState.targetLane = THREE.MathUtils.clamp(gameState.targetLane + direction, 0, 2);
}

function triggerGameOver() {
  gameState.running = false;
  gameState.bestScore = Math.max(gameState.bestScore, gameState.score);
  localStorage.setItem("wep-best-score", String(gameState.bestScore));
  bestScoreElement.textContent = formatScore(gameState.bestScore);
  statusElement.textContent = "Carptin. Yeniden baslamak icin bosluk tusuna bas veya ekrana dokun.";
  overlayTextElement.textContent =
    `Skorun ${formatScore(gameState.score)} oldu. Trafik hizlandi, simdi daha iyi bir akis yakalama zamani.`;
  overlayButtonElement.textContent = "Tekrar Oyna";
  overlayElement.classList.remove("is-hidden");

  playerBody.material.emissive.set("#ff4f75");
  playerBody.material.emissiveIntensity = 1.6;
  fillLight.color.set("#ff5f8f");
}

function resetGame() {
  gameState.running = true;
  gameState.started = true;
  gameState.score = 0;
  gameState.speed = 16;
  gameState.distance = 0;
  gameState.targetLane = 1;
  gameState.currentLane = 1;
  gameState.level = 1;
  player.position.x = lanePositions[1];
  scoreElement.textContent = "0";
  levelElement.textContent = "1";
  statusElement.textContent = "Engellerden kac, ritmi yakala, skoru buyut.";
  overlayElement.classList.add("is-hidden");

  playerBody.material.emissive.set("#5ec8ff");
  playerBody.material.emissiveIntensity = 1;
  fillLight.color.set("#37c6ff");

  obstacleRows.forEach((row, index) => {
    row.position.z = -26 - index * rowSpacing;
    refreshRow(row);
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function formatScore(value) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function interpolateLanePosition(laneValue) {
  const clampedLane = THREE.MathUtils.clamp(laneValue, 0, lanePositions.length - 1);
  const lowerLane = Math.floor(clampedLane);
  const upperLane = Math.ceil(clampedLane);
  const blend = clampedLane - lowerLane;

  return THREE.MathUtils.lerp(
    lanePositions[lowerLane],
    lanePositions[upperLane],
    blend,
  );
}

function startOrRestartGame() {
  overlayTextElement.textContent =
    "Küreyi şeritler arasında kaydır, neon engellerden kaç ve hız arttıkça ritmi koru.";
  overlayButtonElement.textContent = gameState.started ? "Devam Et" : "Oyunu Baslat";
  resetGame();
}
