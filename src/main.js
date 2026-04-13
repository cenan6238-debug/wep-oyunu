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
const hudBottomElement = document.querySelector("#hud-bottom");
const overlayElement = document.querySelector("#overlay");
const overlayTextElement = document.querySelector("#overlay-text");
const overlayButtonElement = document.querySelector("#overlay-button");

const lanePositions = [-4.4, 0, 4.4];
const segmentLength = 18;
const rowSpacing = 16;

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

scoreElement.textContent = "0";
bestScoreElement.textContent = formatScore(gameState.bestScore);
levelElement.textContent = "1";

const scene = new THREE.Scene();
scene.background = new THREE.Color("#d7e7f4");
scene.fog = new THREE.Fog("#d7e7f4", 42, 150);

const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  0.1,
  260,
);
camera.position.set(0, 8.5, 16);
camera.lookAt(0, 1.2, -12);

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
renderer.toneMappingExposure = 1.05;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.14,
    0.25,
    0.92,
  ),
);

const ambientLight = new THREE.HemisphereLight("#f4f9ff", "#8ea16d", 1.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight("#fff8e1", 2.2);
sunLight.position.set(18, 26, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -40;
sunLight.shadow.camera.right = 40;
sunLight.shadow.camera.top = 40;
sunLight.shadow.camera.bottom = -40;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 120;
scene.add(sunLight);

const bounceLight = new THREE.DirectionalLight("#c9ddf2", 0.65);
bounceLight.position.set(-12, 10, -18);
scene.add(bounceLight);

const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(180, 32, 32),
  new THREE.MeshBasicMaterial({
    map: createSkyTexture(),
    side: THREE.BackSide,
  }),
);
scene.add(skyDome);

const sunDisc = new THREE.Mesh(
  new THREE.CircleGeometry(7, 32),
  new THREE.MeshBasicMaterial({
    color: "#fff2c5",
    transparent: true,
    opacity: 0.75,
  }),
);
sunDisc.position.set(0, 42, -120);
scene.add(sunDisc);

const asphaltTexture = createAsphaltTexture();
const grassTexture = createGrassTexture();
const buildingTexture = createBuildingTexture();
const barrierTexture = createBarrierTexture();

const roadMaterial = new THREE.MeshStandardMaterial({
  color: "#6f747a",
  map: asphaltTexture,
  roughness: 0.95,
  metalness: 0.02,
});

const grassMaterial = new THREE.MeshStandardMaterial({
  color: "#71914f",
  map: grassTexture,
  roughness: 1,
  metalness: 0,
});

const shoulderMaterial = new THREE.MeshStandardMaterial({
  color: "#9f8f73",
  roughness: 1,
});

const paintMaterial = new THREE.MeshStandardMaterial({
  color: "#f5f0d6",
  roughness: 0.55,
  metalness: 0,
});

const railMaterial = new THREE.MeshStandardMaterial({
  color: "#c8d0d6",
  roughness: 0.55,
  metalness: 0.45,
});

const roadGroup = new THREE.Group();
scene.add(roadGroup);

const roadSegments = [];

for (let index = 0; index < 11; index += 1) {
  const segment = buildRoadSegment(index);
  segment.position.z = -index * segmentLength;
  roadSegments.push(segment);
  roadGroup.add(segment);
}

const horizonGroup = new THREE.Group();
scene.add(horizonGroup);
buildHorizon();

const decorGroup = new THREE.Group();
scene.add(decorGroup);

for (let index = 0; index < 38; index += 1) {
  const prop = createRoadsideProp(index);
  resetRoadsideProp(prop, index * -12 - 18);
  decorGroup.add(prop);
}

const cloudGroup = new THREE.Group();
scene.add(cloudGroup);

for (let index = 0; index < 8; index += 1) {
  const cloud = createCloud();
  cloud.position.set(
    (Math.random() - 0.5) * 95,
    20 + Math.random() * 12,
    -40 - index * 25,
  );
  cloudGroup.add(cloud);
}

const player = new THREE.Group();
scene.add(player);

const playerBody = new THREE.Mesh(
  new THREE.SphereGeometry(1.08, 40, 40),
  new THREE.MeshPhysicalMaterial({
    color: "#ef6c32",
    roughness: 0.34,
    metalness: 0.03,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
  }),
);
playerBody.castShadow = true;
playerBody.receiveShadow = true;
player.add(playerBody);

const playerStripe = new THREE.Mesh(
  new THREE.TorusGeometry(0.74, 0.08, 16, 48),
  new THREE.MeshStandardMaterial({
    color: "#fff6e8",
    roughness: 0.6,
  }),
);
playerStripe.rotation.x = Math.PI * 0.5;
player.add(playerStripe);

player.position.set(lanePositions[1], 1.18, 6.5);

const obstacleRows = [];

for (let index = 0; index < 9; index += 1) {
  const row = new THREE.Group();
  row.position.z = -28 - index * rowSpacing;
  row.userData.blocks = [];
  obstacleRows.push(row);
  scene.add(row);
  refreshRow(row);
}

const clock = new THREE.Clock();

window.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", onResize);
window.addEventListener("pointerdown", onPointerDown, { passive: true });
overlayButtonElement.addEventListener("click", startOrRestartGame);

updateHudState();
animate();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  if (gameState.running) {
    gameState.speed = Math.min(33, gameState.speed + delta * 0.2);
    gameState.distance += gameState.speed * delta;
    gameState.score = Math.floor(gameState.distance * 4);
    gameState.level = 1 + Math.floor(gameState.score / 200);
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
  player.position.y = 1.18 + Math.sin(elapsed * 5.1) * 0.1;
  player.rotation.x += delta * (gameState.running ? 2.6 : 1.1);
  player.rotation.z = THREE.MathUtils.damp(player.rotation.z, (gameState.targetLane - 1) * -0.14, 6, delta);

  camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x * 0.36, 4, delta);
  camera.position.y = THREE.MathUtils.damp(camera.position.y, 8.1 + Math.abs(player.position.x) * 0.05, 4, delta);
  camera.lookAt(player.position.x * 0.16, 1.25, -12);

  updateRoad(delta);
  updateDecor(delta);
  updateObstacleRows(delta);
  updateClouds(delta);

  composer.render();
}

function updateRoad(delta) {
  const furthestZ = Math.min(...roadSegments.map((segment) => segment.position.z));

  for (const segment of roadSegments) {
    if (gameState.running) {
      segment.position.z += gameState.speed * delta;
    }

    if (segment.position.z > segmentLength) {
      segment.position.z = furthestZ - segmentLength;
    }
  }
}

function updateDecor(delta) {
  const speed = gameState.running ? gameState.speed : 7;

  for (const prop of decorGroup.children) {
    prop.position.z += speed * delta * 0.82;

    if (prop.position.z > 28) {
      resetRoadsideProp(prop, -190 - Math.random() * 40);
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

    if (row.position.z > 16) {
      row.position.z = furthestZ - rowSpacing - Math.random() * 3;
      refreshRow(row);
      furthestZ = Math.min(furthestZ, row.position.z);
      continue;
    }

    if (!gameState.running) {
      continue;
    }

    if (Math.abs(row.position.z - player.position.z) < 1.85) {
      for (const block of row.userData.blocks) {
        if (Math.abs(block.position.x - player.position.x) < 1.55) {
          triggerGameOver();
          break;
        }
      }
    }
  }
}

function updateClouds(delta) {
  for (const cloud of cloudGroup.children) {
    cloud.position.z += delta * 1.3;
    cloud.position.x += Math.sin(clock.elapsedTime * 0.12 + cloud.userData.offset) * delta * 0.18;

    if (cloud.position.z > 24) {
      cloud.position.z = -220 - Math.random() * 30;
      cloud.position.x = (Math.random() - 0.5) * 100;
      cloud.position.y = 18 + Math.random() * 14;
    }
  }
}

function buildRoadSegment(index) {
  const segment = new THREE.Group();

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(14.4, 0.55, segmentLength),
    roadMaterial,
  );
  road.position.y = -0.28;
  road.receiveShadow = true;
  segment.add(road);

  const leftShoulder = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.12, segmentLength),
    shoulderMaterial,
  );
  leftShoulder.position.set(-8.1, -0.05, 0);
  leftShoulder.receiveShadow = true;
  segment.add(leftShoulder);

  const rightShoulder = leftShoulder.clone();
  rightShoulder.position.x = 8.1;
  segment.add(rightShoulder);

  const leftGrass = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.2, segmentLength),
    grassMaterial,
  );
  leftGrass.position.set(-19, -0.12, 0);
  leftGrass.receiveShadow = true;
  segment.add(leftGrass);

  const rightGrass = leftGrass.clone();
  rightGrass.position.x = 19;
  segment.add(rightGrass);

  const leftEdgeLine = buildLineMark();
  leftEdgeLine.position.x = -6.55;
  segment.add(leftEdgeLine);

  const rightEdgeLine = buildLineMark();
  rightEdgeLine.position.x = 6.55;
  segment.add(rightEdgeLine);

  const laneLineLeft = buildLaneDashRow(-2.2);
  const laneLineRight = buildLaneDashRow(2.2);
  segment.add(laneLineLeft, laneLineRight);

  const leftRail = buildRail(-8.9);
  const rightRail = buildRail(8.9);
  segment.add(leftRail, rightRail);

  const roadsideBandColor = index % 2 === 0 ? "#65854a" : "#5a7841";
  leftGrass.material = grassMaterial.clone();
  leftGrass.material.color.set(roadsideBandColor);
  rightGrass.material = grassMaterial.clone();
  rightGrass.material.color.set(roadsideBandColor);

  return segment;
}

function buildLineMark() {
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.03, segmentLength),
    paintMaterial,
  );
  line.position.y = 0.02;
  return line;
}

function buildLaneDashRow(x) {
  const group = new THREE.Group();

  for (let index = 0; index < 4; index += 1) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.03, 2.4),
      paintMaterial,
    );
    dash.position.set(x, 0.03, -6.8 + index * 4.6);
    group.add(dash);
  }

  return group;
}

function buildRail(x) {
  const group = new THREE.Group();

  const postPositions = [-7, -2.5, 2, 6.5];
  for (const z of postPositions) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.7, 0.16),
      railMaterial,
    );
    post.position.set(x, 0.35, z);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);
  }

  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.14, segmentLength - 1.2),
    railMaterial,
  );
  beam.position.set(x, 0.65, 0);
  beam.castShadow = true;
  beam.receiveShadow = true;
  group.add(beam);

  return group;
}

function buildHorizon() {
  const hillMaterial = new THREE.MeshStandardMaterial({
    color: "#879b74",
    roughness: 1,
  });

  for (let index = 0; index < 7; index += 1) {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(14 + Math.random() * 8, 24, 16),
      hillMaterial,
    );
    hill.scale.y = 0.38;
    hill.position.set(-48 + index * 16, -3.6, -120 - Math.random() * 18);
    hill.receiveShadow = true;
    horizonGroup.add(hill);
  }

  for (let index = 0; index < 12; index += 1) {
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(6 + Math.random() * 6, 14 + Math.random() * 18, 6 + Math.random() * 6),
      new THREE.MeshStandardMaterial({
        color: "#c9c0b1",
        map: buildingTexture,
        roughness: 0.94,
      }),
    );
    const side = index % 2 === 0 ? -1 : 1;
    building.position.set(side * (30 + Math.random() * 18), building.geometry.parameters.height * 0.5 - 0.5, -110 - Math.random() * 18);
    building.receiveShadow = true;
    horizonGroup.add(building);
  }
}

function createRoadsideProp(index) {
  const typeRoll = Math.random();

  if (typeRoll < 0.5) {
    return createTree(index);
  }

  if (typeRoll < 0.78) {
    return createLampPost();
  }

  return createHouse();
}

function createTree(seed) {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.34, 2.2, 10),
    new THREE.MeshStandardMaterial({
      color: "#7b5d3f",
      roughness: 1,
    }),
  );
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  group.add(trunk);

  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: seed % 2 === 0 ? "#547a38" : "#5f8642",
    roughness: 1,
  });

  const foliageMain = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 16, 16),
    foliageMaterial,
  );
  foliageMain.position.y = 3.1;
  foliageMain.castShadow = true;
  group.add(foliageMain);

  const foliageSide = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 16, 16),
    foliageMaterial,
  );
  foliageSide.position.set(0.95, 2.9, 0.2);
  foliageSide.castShadow = true;
  group.add(foliageSide);

  return group;
}

function createLampPost() {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 4.4, 12),
    new THREE.MeshStandardMaterial({
      color: "#909aa2",
      metalness: 0.4,
      roughness: 0.55,
    }),
  );
  pole.position.y = 2.2;
  pole.castShadow = true;
  group.add(pole);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.1, 0.1),
    pole.material,
  );
  arm.position.set(0.45, 4.2, 0);
  group.add(arm);

  const lightBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.22, 0.24),
    new THREE.MeshStandardMaterial({
      color: "#d9d9d2",
      roughness: 0.55,
    }),
  );
  lightBox.position.set(0.95, 4.03, 0);
  group.add(lightBox);

  return group;
}

function createHouse() {
  const group = new THREE.Group();
  const width = 3 + Math.random() * 2.5;
  const height = 2.6 + Math.random() * 2;
  const depth = 3.6 + Math.random() * 2.4;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: "#d6ccb8",
      map: buildingTexture,
      roughness: 0.96,
    }),
  );
  base.position.y = height * 0.5;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(width * 0.86, 1.8, 4),
    new THREE.MeshStandardMaterial({
      color: "#915b42",
      roughness: 1,
    }),
  );
  roof.rotation.y = Math.PI * 0.25;
  roof.position.y = height + 0.9;
  roof.castShadow = true;
  group.add(roof);

  return group;
}

function resetRoadsideProp(prop, z) {
  const side = Math.random() > 0.5 ? 1 : -1;
  prop.position.z = z;
  prop.position.x = side * (13 + Math.random() * 11);
  prop.position.y = 0;
  prop.rotation.y = side > 0 ? Math.PI * 1.2 : Math.PI * 0.2;
}

function refreshRow(row) {
  while (row.children.length > 0) {
    row.remove(row.children[0]);
  }

  row.userData.blocks = [];
  const blockedLaneCount = Math.random() > 0.5 ? 2 : 1;
  const availableLanes = [0, 1, 2];

  for (let index = 0; index < blockedLaneCount; index += 1) {
    const laneIndex = availableLanes.splice(
      Math.floor(Math.random() * availableLanes.length),
      1,
    )[0];

    const obstacle = buildObstacle();
    obstacle.position.x = lanePositions[laneIndex];
    row.userData.blocks.push(obstacle);
    row.add(obstacle);
  }
}

function buildObstacle() {
  if (Math.random() > 0.45) {
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.5, 0.9),
      new THREE.MeshStandardMaterial({
        color: "#d8d8d2",
        map: barrierTexture,
        roughness: 0.75,
      }),
    );
    barrier.position.y = 0.82;
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    return barrier;
  }

  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.18, 1.4),
    new THREE.MeshStandardMaterial({
      color: "#272727",
      roughness: 1,
    }),
  );
  base.position.y = 0.09;
  base.receiveShadow = true;
  group.add(base);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 1.5, 18),
    new THREE.MeshStandardMaterial({
      color: "#ff7d2c",
      roughness: 0.82,
    }),
  );
  cone.position.y = 0.9;
  cone.castShadow = true;
  cone.receiveShadow = true;
  group.add(cone);

  const coneStripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.42, 0.12, 18),
    new THREE.MeshStandardMaterial({
      color: "#f7f1e3",
      roughness: 0.75,
    }),
  );
  coneStripe.position.y = 0.8;
  group.add(coneStripe);

  return group;
}

function createCloud() {
  const group = new THREE.Group();
  group.userData.offset = Math.random() * Math.PI * 2;

  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.7,
  });

  for (let index = 0; index < 4; index += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(2 + Math.random() * 1.2, 14, 14),
      material,
    );
    puff.position.set(index * 1.8, Math.random() * 0.6, (Math.random() - 0.5) * 0.6);
    group.add(puff);
  }

  group.scale.setScalar(0.9 + Math.random() * 0.5);
  return group;
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
  statusElement.textContent = "Carptin. Bosluk tusu veya dokunus ile yeniden basla.";
  overlayTextElement.textContent =
    `Skorun ${formatScore(gameState.score)} oldu. Bu kez yolu daha erken okuyup daha temiz bir kacis dene.`;
  overlayButtonElement.textContent = "Tekrar Oyna";
  overlayElement.classList.remove("is-hidden");

  playerBody.material.color.set("#cb4b26");
  updateHudState();
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
  player.rotation.z = 0;
  playerBody.material.color.set("#ef6c32");

  scoreElement.textContent = "0";
  levelElement.textContent = "1";
  statusElement.textContent = "Yol temiz gorunuyor, simdi tempoyu koru.";
  overlayElement.classList.add("is-hidden");

  obstacleRows.forEach((row, index) => {
    row.position.z = -28 - index * rowSpacing;
    refreshRow(row);
  });

  updateHudState();
}

function startOrRestartGame() {
  overlayTextElement.textContent =
    "Küreyi seritler arasinda kaydir, yol calismasi engellerinden kac ve akisi bozmadan ilerle.";
  overlayButtonElement.textContent = "Oyunu Baslat";
  resetGame();
}

function updateHudState() {
  hudBottomElement.classList.toggle("is-hidden", gameState.running);
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

function createSkyTexture() {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = 1024;
  canvasElement.height = 1024;
  const context = canvasElement.getContext("2d");

  const gradient = context.createLinearGradient(0, 0, 0, canvasElement.height);
  gradient.addColorStop(0, "#91bfe8");
  gradient.addColorStop(0.45, "#d8e8f7");
  gradient.addColorStop(1, "#f2ede1");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvasElement.width, canvasElement.height);

  context.fillStyle = "rgba(255, 255, 255, 0.18)";
  for (let index = 0; index < 12; index += 1) {
    context.beginPath();
    context.arc(
      Math.random() * canvasElement.width,
      120 + Math.random() * 220,
      46 + Math.random() * 80,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  return new THREE.CanvasTexture(canvasElement);
}

function createAsphaltTexture() {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = 256;
  canvasElement.height = 256;
  const context = canvasElement.getContext("2d");

  context.fillStyle = "#767b82";
  context.fillRect(0, 0, 256, 256);

  for (let index = 0; index < 900; index += 1) {
    const shade = 92 + Math.floor(Math.random() * 42);
    context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
    const size = 1 + Math.random() * 2.2;
    context.fillRect(Math.random() * 256, Math.random() * 256, size, size);
  }

  const texture = new THREE.CanvasTexture(canvasElement);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  return texture;
}

function createGrassTexture() {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = 256;
  canvasElement.height = 256;
  const context = canvasElement.getContext("2d");

  context.fillStyle = "#6b8748";
  context.fillRect(0, 0, 256, 256);

  for (let index = 0; index < 1000; index += 1) {
    const hue = 88 + Math.floor(Math.random() * 22);
    const lightness = 28 + Math.floor(Math.random() * 18);
    context.fillStyle = `hsl(${hue} 35% ${lightness}%)`;
    context.fillRect(Math.random() * 256, Math.random() * 256, 2, 6 + Math.random() * 8);
  }

  const texture = new THREE.CanvasTexture(canvasElement);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  return texture;
}

function createBuildingTexture() {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = 256;
  canvasElement.height = 256;
  const context = canvasElement.getContext("2d");

  context.fillStyle = "#cdbfa7";
  context.fillRect(0, 0, 256, 256);

  context.strokeStyle = "rgba(109, 91, 69, 0.34)";
  context.lineWidth = 6;
  for (let y = 0; y <= 256; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(256, y);
    context.stroke();
  }

  for (let x = 24; x < 232; x += 42) {
    for (let y = 18; y < 228; y += 52) {
      context.fillStyle = Math.random() > 0.5 ? "#8ca6b8" : "#ece3cf";
      context.fillRect(x, y, 18, 22);
    }
  }

  return new THREE.CanvasTexture(canvasElement);
}

function createBarrierTexture() {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = 256;
  canvasElement.height = 128;
  const context = canvasElement.getContext("2d");

  context.fillStyle = "#d8d8d2";
  context.fillRect(0, 0, 256, 128);

  for (let index = -1; index < 8; index += 1) {
    context.fillStyle = "#d85f29";
    context.beginPath();
    context.moveTo(index * 42, 128);
    context.lineTo(index * 42 + 24, 128);
    context.lineTo(index * 42 + 72, 0);
    context.lineTo(index * 42 + 48, 0);
    context.closePath();
    context.fill();
  }

  return new THREE.CanvasTexture(canvasElement);
}
