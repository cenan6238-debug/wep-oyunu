import "./style.css";

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const STORAGE_KEYS = {
  bestScore: "wep-best-score",
  leaderboard: "wep-local-leaderboard",
  playerName: "wep-player-name",
  challengeDate: "wep-daily-challenge-date",
};

const canvas = document.querySelector("#scene");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const levelElement = document.querySelector("#level");
const coinsElement = document.querySelector("#coins");
const comboElement = document.querySelector("#combo");
const statusElement = document.querySelector("#status");
const hudBottomElement = document.querySelector("#hud-bottom");
const overlayElement = document.querySelector("#overlay");
const overlayTextElement = document.querySelector("#overlay-text");
const overlayButtonElement = document.querySelector("#overlay-button");
const shareButtonElement = document.querySelector("#share-button");
const pauseButtonElement = document.querySelector("#pause-button");
const dashButtonElement = document.querySelector("#dash-button");
const dashMeterElement = document.querySelector("#dash-meter");
const playerNameElement = document.querySelector("#player-name");
const leaderboardListElement = document.querySelector("#leaderboard-list");
const dailyChallengeElement = document.querySelector("#daily-challenge");
const challengeStatusElement = document.querySelector("#challenge-status");
const sharedChallengeElement = document.querySelector("#shared-challenge");

const lanePositions = [-4.4, 0, 4.4];
const segmentLength = 18;
const rowSpacing = 16;

const sharedChallenge = readSharedChallenge();
const dailyChallenge = createDailyChallenge();

const gameState = {
  running: false,
  started: false,
  paused: false,
  overlayMode: "intro",
  score: 0,
  bestScore: Number(localStorage.getItem(STORAGE_KEYS.bestScore) || 0),
  speed: 16,
  distance: 0,
  targetLane: 1,
  currentLane: 1,
  level: 1,
  coins: 0,
  combo: 1,
  comboTimer: 0,
  nearMisses: 0,
  dashCharge: 1,
  dashActive: false,
  dashTimer: 0,
  invulnerableTimer: 0,
  lastRun: null,
  playerName: sanitizePlayerName(localStorage.getItem(STORAGE_KEYS.playerName) || "Oyuncu"),
  leaderboard: loadLeaderboard(),
  dailyChallenge,
  sharedChallenge,
  dailyChallengeCompleted:
    localStorage.getItem(STORAGE_KEYS.challengeDate) === dailyChallenge.key,
};

playerNameElement.value = gameState.playerName;
scoreElement.textContent = "0";
bestScoreElement.textContent = formatScore(gameState.bestScore);
levelElement.textContent = "1";
coinsElement.textContent = "0";
comboElement.textContent = "x1";

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
renderer.toneMappingExposure = 1.06;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.18,
    0.25,
    0.92,
  ),
);

const ambientLight = new THREE.HemisphereLight("#f4f9ff", "#8ea16d", 1.56);
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

const bounceLight = new THREE.DirectionalLight("#c9ddf2", 0.7);
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

const coinMaterial = new THREE.MeshStandardMaterial({
  color: "#ffca42",
  emissive: "#ffb700",
  emissiveIntensity: 0.65,
  roughness: 0.25,
  metalness: 0.8,
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

const playerBodyMaterial = new THREE.MeshPhysicalMaterial({
  color: "#ef6c32",
  emissive: "#ff9d52",
  emissiveIntensity: 0.15,
  roughness: 0.34,
  metalness: 0.03,
  clearcoat: 0.85,
  clearcoatRoughness: 0.18,
});

const playerBody = new THREE.Mesh(
  new THREE.SphereGeometry(1.08, 40, 40),
  playerBodyMaterial,
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

const playerCore = new THREE.Mesh(
  new THREE.SphereGeometry(0.26, 18, 18),
  new THREE.MeshStandardMaterial({
    color: "#ffe3b2",
    emissive: "#ffc46b",
    emissiveIntensity: 0.8,
    roughness: 0.3,
  }),
);
player.add(playerCore);

player.position.set(lanePositions[1], 1.18, 6.5);

const obstacleRows = [];
for (let index = 0; index < 10; index += 1) {
  const row = new THREE.Group();
  row.position.z = -28 - index * rowSpacing;
  row.userData.blocks = [];
  obstacleRows.push(row);
  scene.add(row);
  refreshRow(row);
}

const coinRows = [];
for (let index = 0; index < 8; index += 1) {
  const row = new THREE.Group();
  row.position.z = -20 - index * 22;
  row.userData.coins = [];
  coinRows.push(row);
  scene.add(row);
  refreshCoinRow(row);
}

const clock = new THREE.Clock();
let audioContext = null;

window.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", onResize);
window.addEventListener("pointerdown", onPointerDown, { passive: true });
overlayButtonElement.addEventListener("click", onOverlayPrimary);
shareButtonElement.addEventListener("click", onShareChallenge);
pauseButtonElement.addEventListener("click", togglePause);
dashButtonElement.addEventListener("click", triggerDash);
playerNameElement.addEventListener("input", onPlayerNameInput);

registerServiceWorker();
renderLeaderboard();
updateChallengeCopy();
setOverlayContent("intro");
updateHudState();
animate();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  if (gameState.running && !gameState.paused) {
    updateGame(delta, elapsed);
  }

  updateIdleAnimations(delta, elapsed);
  composer.render();
}

function updateGame(delta, elapsed) {
  const travelSpeed = gameState.speed + (gameState.dashActive ? 12 : 0);

  gameState.speed = Math.min(34, gameState.speed + delta * 0.22);
  gameState.distance += travelSpeed * delta;
  gameState.level = 1 + Math.floor(gameState.distance / 90);

  if (gameState.comboTimer > 0) {
    gameState.comboTimer -= delta;
    if (gameState.comboTimer <= 0) {
      gameState.combo = 1;
    }
  }

  gameState.dashCharge = Math.min(1, gameState.dashCharge + delta * 0.16);

  if (gameState.dashActive) {
    gameState.dashTimer -= delta;
    gameState.invulnerableTimer = Math.max(0, gameState.invulnerableTimer - delta);
    if (gameState.dashTimer <= 0) {
      gameState.dashActive = false;
      playerBodyMaterial.emissiveIntensity = 0.15;
    }
  } else if (gameState.invulnerableTimer > 0) {
    gameState.invulnerableTimer = Math.max(0, gameState.invulnerableTimer - delta);
  }

  gameState.score = Math.floor(
    gameState.distance * 3.8 +
      gameState.coins * 55 +
      gameState.nearMisses * 35 +
      (gameState.combo - 1) * 22,
  );

  updateRoad(delta, travelSpeed);
  updateDecor(delta, travelSpeed);
  updateObstacleRows(delta, travelSpeed);
  updateCoinRows(delta, travelSpeed, elapsed);
  updateClouds(delta);
  updatePlayerAndCamera(delta, elapsed);
  maybeCompleteDailyChallenge();
  syncHud();
}

function updateIdleAnimations(delta, elapsed) {
  player.position.y = 1.18 + Math.sin(elapsed * 5.1) * 0.1;
  player.rotation.x += delta * (gameState.running && !gameState.paused ? 2.7 : 1.0);

  if (!gameState.running || gameState.paused) {
    updateClouds(delta * 0.35);
  }

  const targetFov = gameState.dashActive ? 67 : 58;
  camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 8, delta);
  camera.updateProjectionMatrix();
}

function updatePlayerAndCamera(delta) {
  gameState.currentLane = THREE.MathUtils.damp(
    gameState.currentLane,
    gameState.targetLane,
    gameState.dashActive ? 18 : 10,
    delta,
  );

  player.position.x = THREE.MathUtils.damp(
    player.position.x,
    interpolateLanePosition(gameState.currentLane),
    gameState.dashActive ? 18 : 10,
    delta,
  );

  player.rotation.z = THREE.MathUtils.damp(
    player.rotation.z,
    (gameState.targetLane - 1) * -0.16,
    6,
    delta,
  );

  camera.position.x = THREE.MathUtils.damp(
    camera.position.x,
    player.position.x * 0.38,
    4,
    delta,
  );
  camera.position.y = THREE.MathUtils.damp(
    camera.position.y,
    8.1 + Math.abs(player.position.x) * 0.05,
    4,
    delta,
  );
  camera.lookAt(player.position.x * 0.16, 1.25, -12);
}

function updateRoad(delta, travelSpeed) {
  const furthestZ = Math.min(...roadSegments.map((segment) => segment.position.z));

  for (const segment of roadSegments) {
    segment.position.z += travelSpeed * delta;

    if (segment.position.z > segmentLength) {
      segment.position.z = furthestZ - segmentLength;
    }
  }
}

function updateDecor(delta, travelSpeed) {
  for (const prop of decorGroup.children) {
    prop.position.z += travelSpeed * delta * 0.82;

    if (prop.position.z > 28) {
      resetRoadsideProp(prop, -190 - Math.random() * 40);
    }
  }
}

function updateObstacleRows(delta, travelSpeed) {
  let furthestZ = Infinity;

  for (const row of obstacleRows) {
    furthestZ = Math.min(furthestZ, row.position.z);
  }

  for (const row of obstacleRows) {
    row.position.z += travelSpeed * delta;

    if (row.position.z > 18) {
      row.position.z = furthestZ - rowSpacing - Math.random() * 3;
      refreshRow(row);
      furthestZ = Math.min(furthestZ, row.position.z);
      continue;
    }

    if (!row.userData.nearMissResolved && row.position.z > player.position.z + 0.8) {
      row.userData.nearMissResolved = true;
      maybeAwardNearMiss(row);
    }

    if (Math.abs(row.position.z - player.position.z) < 1.75) {
      for (const block of row.userData.blocks) {
        if (!block.visible) {
          continue;
        }

        if (Math.abs(block.position.x - player.position.x) < 1.5) {
          if (gameState.invulnerableTimer > 0) {
            block.visible = false;
            playSound("shield");
            pushStatus("Dash ile tehlikeyi delip gectin.");
          } else {
            triggerGameOver();
          }
          break;
        }
      }
    }
  }
}

function updateCoinRows(delta, travelSpeed, elapsed) {
  let furthestZ = Infinity;

  for (const row of coinRows) {
    furthestZ = Math.min(furthestZ, row.position.z);
  }

  for (const row of coinRows) {
    row.position.z += travelSpeed * delta;

    if (row.position.z > 20) {
      row.position.z = furthestZ - 22 - Math.random() * 5;
      refreshCoinRow(row);
      furthestZ = Math.min(furthestZ, row.position.z);
      continue;
    }

    for (const coin of row.userData.coins) {
      if (!coin.visible) {
        continue;
      }

      coin.rotation.y += delta * 2.8;
      coin.position.y = 1.4 + Math.sin(elapsed * 5 + coin.userData.phase) * 0.18;

      if (
        Math.abs(row.position.z - player.position.z) < 1.1 &&
        Math.abs(coin.position.x - player.position.x) < 1.25
      ) {
        coin.visible = false;
        gameState.coins += 1;
        bumpCombo();
        playSound("coin");
        pushStatus(`Coin topladin. Combo ${gameState.combo}x.`);
      }
    }
  }
}

function updateClouds(delta) {
  for (const cloud of cloudGroup.children) {
    cloud.position.z += delta * 1.3;
    cloud.position.x +=
      Math.sin(clock.elapsedTime * 0.12 + cloud.userData.offset) * delta * 0.18;

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
    grassMaterial.clone(),
  );
  leftGrass.position.set(-19, -0.12, 0);
  leftGrass.material.color.set(index % 2 === 0 ? "#65854a" : "#5a7841");
  leftGrass.receiveShadow = true;
  segment.add(leftGrass);

  const rightGrass = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.2, segmentLength),
    grassMaterial.clone(),
  );
  rightGrass.position.set(19, -0.12, 0);
  rightGrass.material.color.set(index % 2 === 0 ? "#65854a" : "#5a7841");
  rightGrass.receiveShadow = true;
  segment.add(rightGrass);

  const leftEdgeLine = buildLineMark();
  leftEdgeLine.position.x = -6.55;
  segment.add(leftEdgeLine);

  const rightEdgeLine = buildLineMark();
  rightEdgeLine.position.x = 6.55;
  segment.add(rightEdgeLine);

  segment.add(buildLaneDashRow(-2.2), buildLaneDashRow(2.2), buildRail(-8.9), buildRail(8.9));
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
    const width = 6 + Math.random() * 6;
    const height = 14 + Math.random() * 18;
    const depth = 6 + Math.random() * 6;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        color: "#c9c0b1",
        map: buildingTexture,
        roughness: 0.94,
      }),
    );
    const side = index % 2 === 0 ? -1 : 1;
    building.position.set(
      side * (30 + Math.random() * 18),
      height * 0.5 - 0.5,
      -110 - Math.random() * 18,
    );
    building.receiveShadow = true;
    horizonGroup.add(building);
  }
}

function createRoadsideProp(seed) {
  const typeRoll = Math.random();

  if (typeRoll < 0.45) {
    return createTree(seed);
  }

  if (typeRoll < 0.72) {
    return createLampPost();
  }

  if (typeRoll < 0.9) {
    return createHouse();
  }

  return createBillboard();
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

  for (const offset of [
    [0, 3.1, 0],
    [0.9, 2.8, 0.2],
    [-0.9, 2.7, -0.1],
  ]) {
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(1.2 + Math.random() * 0.3, 16, 16),
      foliageMaterial,
    );
    foliage.position.set(offset[0], offset[1], offset[2]);
    foliage.castShadow = true;
    group.add(foliage);
  }

  return group;
}

function createLampPost() {
  const group = new THREE.Group();

  const poleMaterial = new THREE.MeshStandardMaterial({
    color: "#909aa2",
    metalness: 0.4,
    roughness: 0.55,
  });

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 4.4, 12),
    poleMaterial,
  );
  pole.position.y = 2.2;
  pole.castShadow = true;
  group.add(pole);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.1, 0.1),
    poleMaterial,
  );
  arm.position.set(0.45, 4.2, 0);
  group.add(arm);

  const lightBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.22, 0.24),
    new THREE.MeshStandardMaterial({
      color: "#d9d9d2",
      emissive: "#fff2c8",
      emissiveIntensity: 0.15,
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

function createBillboard() {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 4.2, 0.22),
    new THREE.MeshStandardMaterial({
      color: "#7d8388",
      metalness: 0.35,
      roughness: 0.6,
    }),
  );
  pole.position.y = 2.1;
  pole.castShadow = true;
  group.add(pole);

  const boardTexture = createBillboardTexture();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 2.2, 0.2),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: boardTexture,
      roughness: 0.8,
    }),
  );
  board.position.y = 4.1;
  board.castShadow = true;
  group.add(board);

  return group;
}

function createCloud() {
  const group = new THREE.Group();
  group.userData.offset = Math.random() * Math.PI * 2;

  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.72,
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
  row.userData.nearMissResolved = false;
  const blockedLaneCount = Math.random() > 0.5 ? 2 : 1;
  const availableLanes = [0, 1, 2];

  for (let index = 0; index < blockedLaneCount; index += 1) {
    const laneIndex = availableLanes.splice(
      Math.floor(Math.random() * availableLanes.length),
      1,
    )[0];
    const obstacle = buildObstacle();
    obstacle.position.x = lanePositions[laneIndex];
    obstacle.userData.laneIndex = laneIndex;
    row.userData.blocks.push(obstacle);
    row.add(obstacle);
  }
}

function buildObstacle() {
  const roll = Math.random();

  if (roll < 0.34) {
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

  if (roll < 0.68) {
    const group = new THREE.Group();

    for (const offset of [-0.52, 0.52]) {
      const cone = createCone();
      cone.position.x = offset;
      group.add(cone);
    }

    return group;
  }

  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.22, 1.5),
    new THREE.MeshStandardMaterial({
      color: "#2f2f2f",
      roughness: 1,
    }),
  );
  base.position.y = 0.11;
  base.receiveShadow = true;
  group.add(base);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.2, 0.16),
    new THREE.MeshStandardMaterial({
      color: "#f7c948",
      roughness: 0.8,
    }),
  );
  sign.position.y = 1.15;
  sign.castShadow = true;
  group.add(sign);

  return group;
}

function createCone() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.16, 0.9),
    new THREE.MeshStandardMaterial({
      color: "#2a2a2a",
      roughness: 1,
    }),
  );
  base.position.y = 0.08;
  base.receiveShadow = true;
  group.add(base);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 1.2, 18),
    new THREE.MeshStandardMaterial({
      color: "#ff7d2c",
      roughness: 0.82,
    }),
  );
  cone.position.y = 0.7;
  cone.castShadow = true;
  cone.receiveShadow = true;
  group.add(cone);

  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.1, 18),
    new THREE.MeshStandardMaterial({
      color: "#f7f1e3",
      roughness: 0.75,
    }),
  );
  stripe.position.y = 0.68;
  group.add(stripe);

  return group;
}

function refreshCoinRow(row) {
  while (row.children.length > 0) {
    row.remove(row.children[0]);
  }

  row.userData.coins = [];
  const coinCount = 1 + Math.floor(Math.random() * 3);
  const lanes = shuffle([0, 1, 2]).slice(0, coinCount);

  for (const laneIndex of lanes) {
    const coin = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.12, 10, 22),
      coinMaterial,
    );
    coin.rotation.x = Math.PI * 0.5;
    coin.position.set(lanePositions[laneIndex], 1.4, 0);
    coin.userData.phase = Math.random() * Math.PI * 2;
    row.userData.coins.push(coin);
    row.add(coin);
  }
}

function maybeAwardNearMiss(row) {
  const playerLane = Math.round(gameState.targetLane);
  const blockedLanes = row.userData.blocks
    .filter((block) => block.visible !== false)
    .map((block) => block.userData.laneIndex);

  if (
    blockedLanes.some(
      (laneIndex) => laneIndex !== playerLane && Math.abs(laneIndex - playerLane) === 1,
    )
  ) {
    gameState.nearMisses += 1;
    bumpCombo();
    playSound("nearMiss");
    pushStatus(`Yakin fark. Bonus yakaladin, combo ${gameState.combo}x.`);
  }
}

function bumpCombo() {
  gameState.combo = Math.min(gameState.combo + 1, 12);
  gameState.comboTimer = 3.2;
}

function triggerDash() {
  ensureAudioContext();

  if (!gameState.running || gameState.paused || gameState.dashCharge < 1) {
    return;
  }

  gameState.dashCharge = 0;
  gameState.dashActive = true;
  gameState.dashTimer = 0.48;
  gameState.invulnerableTimer = 0.45;
  playerBodyMaterial.emissiveIntensity = 0.95;
  playSound("dash");
  pushStatus("Dash acildi. Kisa sureli koruma aktif.");
}

function togglePause() {
  ensureAudioContext();

  if (!gameState.started || !gameState.running) {
    return;
  }

  gameState.paused = !gameState.paused;

  if (gameState.paused) {
    setOverlayContent("paused");
  } else {
    overlayElement.classList.add("is-hidden");
  }

  updateHudState();
}

function onOverlayPrimary() {
  ensureAudioContext();

  if (gameState.overlayMode === "paused") {
    gameState.paused = false;
    overlayElement.classList.add("is-hidden");
    updateHudState();
    playSound("resume");
    return;
  }

  startGame();
}

function startGame() {
  gameState.running = true;
  gameState.started = true;
  gameState.paused = false;
  gameState.overlayMode = "playing";
  gameState.score = 0;
  gameState.speed = 16;
  gameState.distance = 0;
  gameState.targetLane = 1;
  gameState.currentLane = 1;
  gameState.level = 1;
  gameState.coins = 0;
  gameState.combo = 1;
  gameState.comboTimer = 0;
  gameState.nearMisses = 0;
  gameState.dashCharge = 1;
  gameState.dashActive = false;
  gameState.dashTimer = 0;
  gameState.invulnerableTimer = 0;

  player.position.x = lanePositions[1];
  player.rotation.z = 0;
  playerBodyMaterial.color.set("#ef6c32");
  playerBodyMaterial.emissiveIntensity = 0.15;

  obstacleRows.forEach((row, index) => {
    row.position.z = -28 - index * rowSpacing;
    refreshRow(row);
  });

  coinRows.forEach((row, index) => {
    row.position.z = -20 - index * 22;
    refreshCoinRow(row);
  });

  scoreElement.textContent = "0";
  levelElement.textContent = "1";
  coinsElement.textContent = "0";
  comboElement.textContent = "x1";
  pushStatus("Kosu basladi. Bugun challenge'i tamamlama zamani.");
  overlayElement.classList.add("is-hidden");
  updateHudState();
  playSound("start");
}

function triggerGameOver() {
  if (!gameState.running) {
    return;
  }

  gameState.running = false;
  gameState.paused = false;
  gameState.bestScore = Math.max(gameState.bestScore, gameState.score);
  localStorage.setItem(STORAGE_KEYS.bestScore, String(gameState.bestScore));
  bestScoreElement.textContent = formatScore(gameState.bestScore);

  gameState.lastRun = {
    score: gameState.score,
    coins: gameState.coins,
    level: gameState.level,
    nearMisses: gameState.nearMisses,
    combo: gameState.combo,
  };

  playerBodyMaterial.color.set("#c44f29");
  playerBodyMaterial.emissiveIntensity = 0.55;
  saveLeaderboardEntry();
  setOverlayContent("gameover");
  updateHudState();
  playSound("crash");
}

function syncHud() {
  scoreElement.textContent = formatScore(gameState.score);
  bestScoreElement.textContent = formatScore(gameState.bestScore);
  levelElement.textContent = String(gameState.level);
  coinsElement.textContent = formatScore(gameState.coins);
  comboElement.textContent = `x${gameState.combo}`;
  dashMeterElement.textContent = gameState.dashCharge >= 1 ? "Hazir" : `${Math.round(gameState.dashCharge * 100)}%`;
  dashButtonElement.disabled = gameState.dashCharge < 1 || !gameState.running || gameState.paused;
  pauseButtonElement.textContent = gameState.paused ? "Devam" : "Duraklat";
}

function updateHudState() {
  hudBottomElement.classList.toggle("is-hidden", gameState.running && !gameState.paused);
}

function setOverlayContent(mode) {
  gameState.overlayMode = mode;
  overlayElement.classList.remove("is-hidden");

  if (mode === "intro") {
    overlayTextElement.textContent =
      gameState.sharedChallenge
        ? `${gameState.sharedChallenge.from} sana ${formatScore(gameState.sharedChallenge.score)} puan ve ${gameState.sharedChallenge.coins} coinlik bir challenge attı.`
        : "Coin topla, yakin fark bonuslari yakala, dash ile sıkıştığın anı kurtar ve arkadasina challenge linki yolla.";
    overlayButtonElement.textContent = gameState.started ? "Yeni Kosu" : "Oyunu Baslat";
  }

  if (mode === "paused") {
    overlayTextElement.textContent =
      "Oyun duraklatildi. Hazirsan devam et, yoksa challenge linki kopyalayip arkadaslarini oyuna cagir.";
    overlayButtonElement.textContent = "Devam Et";
  }

  if (mode === "gameover" && gameState.lastRun) {
    overlayTextElement.textContent =
      `Skorun ${formatScore(gameState.lastRun.score)}. ${gameState.lastRun.coins} coin, ${gameState.lastRun.nearMisses} yakin fark ve max ${gameState.lastRun.combo}x combo ile kosuyu bitirdin.`;
    overlayButtonElement.textContent = "Tekrar Oyna";
  }

  updateChallengeCopy();
  renderLeaderboard();
}

function updateChallengeCopy() {
  dailyChallengeElement.textContent = `${formatScore(gameState.dailyChallenge.score)} puan ve ${gameState.dailyChallenge.coins} coin`;

  if (gameState.dailyChallengeCompleted) {
    challengeStatusElement.textContent = "Bugunun gorevi tamamlandi. Yarin yeni hedef gelecek.";
  } else {
    challengeStatusElement.textContent = "Bugunun gorevi devam ediyor.";
  }

  if (gameState.sharedChallenge) {
    sharedChallengeElement.textContent =
      `${gameState.sharedChallenge.from} seni ${formatScore(gameState.sharedChallenge.score)} puanlik bir duelloya cagirdi.`;
  } else {
    sharedChallengeElement.textContent =
      "Challenge linki kopyalayip arkadasina gonder. Linkte hedef skor ve coin gorevi yer alir.";
  }
}

function maybeCompleteDailyChallenge() {
  if (gameState.dailyChallengeCompleted) {
    return;
  }

  if (
    gameState.score >= gameState.dailyChallenge.score &&
    gameState.coins >= gameState.dailyChallenge.coins
  ) {
    gameState.dailyChallengeCompleted = true;
    localStorage.setItem(STORAGE_KEYS.challengeDate, gameState.dailyChallenge.key);
    challengeStatusElement.textContent = "Bugunun gorevi tamamlandi. Harika kosu.";
    pushStatus("Gunluk challenge tamamlandi.");
    playSound("challenge");
  }
}

function saveLeaderboardEntry() {
  const entry = {
    name: gameState.playerName,
    score: gameState.score,
    coins: gameState.coins,
    level: gameState.level,
    date: new Date().toISOString(),
  };

  gameState.leaderboard = [...gameState.leaderboard, entry]
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);

  localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(gameState.leaderboard));
  renderLeaderboard();
}

function renderLeaderboard() {
  leaderboardListElement.innerHTML = "";

  if (gameState.leaderboard.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "leaderboard__item";
    emptyItem.textContent = "Ilk skoru sen birak.";
    leaderboardListElement.append(emptyItem);
    return;
  }

  gameState.leaderboard.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard__item";
    item.innerHTML = `
      <span class="leaderboard__rank">${index + 1}</span>
      <span class="leaderboard__meta">
        <strong>${escapeHtml(entry.name)}</strong>
        <span>${entry.coins} coin · Lv ${entry.level}</span>
      </span>
      <span class="leaderboard__score">
        ${formatScore(entry.score)}
        <small>${formatShortDate(entry.date)}</small>
      </span>
    `;
    leaderboardListElement.append(item);
  });
}

function onPlayerNameInput(event) {
  const nextName = sanitizePlayerName(event.target.value || "Oyuncu");
  gameState.playerName = nextName;
  localStorage.setItem(STORAGE_KEYS.playerName, nextName);
}

async function onShareChallenge() {
  ensureAudioContext();

  const targetScore = Math.max(
    gameState.lastRun?.score || 0,
    gameState.sharedChallenge?.score || 0,
    gameState.dailyChallenge.score,
    Math.max(1200, gameState.bestScore),
  );
  const targetCoins = Math.max(
    gameState.lastRun?.coins || 0,
    gameState.sharedChallenge?.coins || 0,
    gameState.dailyChallenge.coins,
  );

  const url = new URL(window.location.href);
  url.searchParams.set("from", gameState.playerName);
  url.searchParams.set("challengeScore", String(targetScore));
  url.searchParams.set("challengeCoins", String(targetCoins));

  const shareText = `${gameState.playerName} sana Wep Oyunu challenge'i atti: ${formatScore(targetScore)} puan ve ${targetCoins} coin.`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Wep Oyunu Challenge",
        text: shareText,
        url: url.toString(),
      });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url.toString());
    }

    pushStatus("Challenge linki hazir. Arkadasina yollayabilirsin.");
    playSound("share");
  } catch (error) {
    pushStatus("Challenge linki paylasilamadi.");
  }
}

function onKeyDown(event) {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    moveLane(-1);
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    moveLane(1);
  }

  if (event.key === "Shift") {
    triggerDash();
  }

  if (event.key.toLowerCase() === "p" || event.key === "Escape") {
    togglePause();
  }

  if (event.code === "Space" && !gameState.running) {
    onOverlayPrimary();
  }
}

function onPointerDown(event) {
  if (
    overlayButtonElement.contains(event.target) ||
    shareButtonElement.contains(event.target) ||
    pauseButtonElement.contains(event.target) ||
    dashButtonElement.contains(event.target) ||
    playerNameElement.contains(event.target)
  ) {
    return;
  }

  ensureAudioContext();

  if (!gameState.running) {
    onOverlayPrimary();
    return;
  }

  if (gameState.paused) {
    return;
  }

  if (event.clientY > window.innerHeight * 0.72 && event.clientX > window.innerWidth * 0.65) {
    triggerDash();
    return;
  }

  if (event.clientX < window.innerWidth / 2) {
    moveLane(-1);
  } else {
    moveLane(1);
  }
}

function moveLane(direction) {
  if (!gameState.running || gameState.paused) {
    return;
  }

  gameState.targetLane = THREE.MathUtils.clamp(gameState.targetLane + direction, 0, 2);
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

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.leaderboard);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitizePlayerName(name) {
  const trimmed = String(name).trim().slice(0, 16);
  return trimmed || "Oyuncu";
}

function createDailyChallenge() {
  const now = new Date();
  const key = now.toISOString().slice(0, 10);
  const seed = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return {
    key,
    score: 1800 + (seed % 6) * 320,
    coins: 12 + (seed % 5) * 3,
  };
}

function readSharedChallenge() {
  const params = new URLSearchParams(window.location.search);
  const score = Number(params.get("challengeScore"));
  const coins = Number(params.get("challengeCoins"));
  const from = sanitizePlayerName(params.get("from") || "Arkadasin");

  if (!Number.isFinite(score) || !Number.isFinite(coins) || score <= 0 || coins <= 0) {
    return null;
  }

  return { score, coins, from };
}

function pushStatus(message) {
  statusElement.textContent = message;
}

function shuffle(items) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    audioContext = new AudioContextCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playSound(type) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const presets = {
    start: [
      { time: 0, frequency: 320, duration: 0.08, gain: 0.06, type: "triangle" },
      { time: 0.08, frequency: 420, duration: 0.1, gain: 0.05, type: "triangle" },
    ],
    coin: [
      { time: 0, frequency: 760, duration: 0.05, gain: 0.04, type: "triangle" },
      { time: 0.05, frequency: 1040, duration: 0.08, gain: 0.03, type: "sine" },
    ],
    nearMiss: [
      { time: 0, frequency: 280, duration: 0.05, gain: 0.03, type: "sawtooth" },
      { time: 0.04, frequency: 520, duration: 0.08, gain: 0.025, type: "triangle" },
    ],
    dash: [
      { time: 0, frequency: 180, duration: 0.08, gain: 0.05, type: "square" },
      { time: 0.03, frequency: 220, duration: 0.12, gain: 0.04, type: "sawtooth" },
    ],
    crash: [
      { time: 0, frequency: 120, duration: 0.16, gain: 0.06, type: "sawtooth" },
      { time: 0.02, frequency: 70, duration: 0.2, gain: 0.05, type: "triangle" },
    ],
    challenge: [
      { time: 0, frequency: 540, duration: 0.08, gain: 0.05, type: "triangle" },
      { time: 0.08, frequency: 740, duration: 0.08, gain: 0.04, type: "triangle" },
      { time: 0.16, frequency: 940, duration: 0.12, gain: 0.035, type: "sine" },
    ],
    share: [
      { time: 0, frequency: 460, duration: 0.08, gain: 0.03, type: "triangle" },
      { time: 0.08, frequency: 640, duration: 0.08, gain: 0.025, type: "triangle" },
    ],
    resume: [
      { time: 0, frequency: 420, duration: 0.06, gain: 0.03, type: "sine" },
    ],
    shield: [
      { time: 0, frequency: 890, duration: 0.06, gain: 0.025, type: "square" },
      { time: 0.06, frequency: 660, duration: 0.06, gain: 0.02, type: "square" },
    ],
  };

  for (const note of presets[type] || []) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = note.type;
    oscillator.frequency.setValueAtTime(note.frequency, context.currentTime + note.time);
    gainNode.gain.setValueAtTime(note.gain, context.currentTime + note.time);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + note.time + note.duration,
    );
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(context.currentTime + note.time);
    oscillator.stop(context.currentTime + note.time + note.duration);
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
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

function createBillboardTexture() {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = 256;
  canvasElement.height = 128;
  const context = canvasElement.getContext("2d");

  const gradient = context.createLinearGradient(0, 0, 256, 128);
  gradient.addColorStop(0, "#2366c5");
  gradient.addColorStop(1, "#ff964f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 128);

  context.fillStyle = "#ffffff";
  context.font = "700 28px Space Grotesk";
  context.fillText("WEP", 22, 48);
  context.font = "500 18px Space Grotesk";
  context.fillText("Dash at, skoru birakma", 22, 82);

  return new THREE.CanvasTexture(canvasElement);
}
