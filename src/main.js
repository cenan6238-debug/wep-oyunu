import "./style.css";

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const STORAGE_KEYS = {
  bestScore: "zch-best-score",
  leaderboard: "zch-local-leaderboard",
  playerName: "zch-player-name",
};

const lanePositions = [-4.4, 0, 4.4];
const laneCount = lanePositions.length;

const canvas = document.querySelector("#scene");
const overlayElement = document.querySelector("#overlay");
const overlayTextElement = document.querySelector("#overlay-text");
const overlayButtonElement = document.querySelector("#overlay-button");
const playerNameElement = document.querySelector("#player-name");
const leaderboardListElement = document.querySelector("#leaderboard-list");
const hudBottomElement = document.querySelector("#hud-bottom");
const statusElement = document.querySelector("#status");
const missionStatusElement = document.querySelector("#mission-status");

const healthElement = document.querySelector("#health");
const ammoElement = document.querySelector("#ammo");
const scoreElement = document.querySelector("#score");
const killsElement = document.querySelector("#kills");
const waveElement = document.querySelector("#wave");
const furyElement = document.querySelector("#fury");

const moveLeftButton = document.querySelector("#move-left");
const moveRightButton = document.querySelector("#move-right");
const fireButton = document.querySelector("#fire-button");
const reloadButton = document.querySelector("#reload-button");

const gameState = {
  running: false,
  started: false,
  overlayMode: "intro",
  playerName: sanitizePlayerName(localStorage.getItem(STORAGE_KEYS.playerName) || "Avci"),
  health: 100,
  ammo: 12,
  reserveAmmo: 48,
  score: 0,
  kills: 0,
  wave: 1,
  bestScore: Number(localStorage.getItem(STORAGE_KEYS.bestScore) || 0),
  furyCharge: 0,
  furyActive: false,
  furyTimer: 0,
  shootCooldown: 0,
  reloadTimer: 0,
  reloading: false,
  dodgeTimer: 0,
  dodgeCooldown: 0,
  targetLane: 1,
  currentLane: 1,
  waveSpawnTotal: 0,
  waveSpawned: 0,
  waveKills: 0,
  spawnTimer: 0,
  spawnInterval: 1.4,
  missionComplete: false,
  leaderboard: loadLeaderboard(),
};

playerNameElement.value = gameState.playerName;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#060a11");
scene.fog = new THREE.Fog("#060a11", 24, 120);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  240,
);
camera.position.set(0, 6.8, 15.5);
camera.lookAt(0, 2.5, -18);

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
renderer.toneMappingExposure = 1.02;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.32,
  0.35,
  0.8,
);
composer.addPass(bloomPass);

const hemiLight = new THREE.HemisphereLight("#6787a6", "#111111", 0.8);
scene.add(hemiLight);

const moonLight = new THREE.DirectionalLight("#a7c9ff", 1.6);
moonLight.position.set(18, 26, 8);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.left = -40;
moonLight.shadow.camera.right = 40;
moonLight.shadow.camera.top = 40;
moonLight.shadow.camera.bottom = -40;
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far = 120;
scene.add(moonLight);

const redAlarmLight = new THREE.PointLight("#ff5035", 18, 60, 2.2);
redAlarmLight.position.set(0, 8, -22);
scene.add(redAlarmLight);

const blueAlarmLight = new THREE.PointLight("#4aa8ff", 12, 48, 2);
blueAlarmLight.position.set(-10, 7, -12);
scene.add(blueAlarmLight);

const streetLightTargets = [];
buildCity();

const player = buildPlayer();
scene.add(player.group);

const zombies = [];
const effects = [];

const clock = new THREE.Clock();
let audioContext = null;

window.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", onResize);
window.addEventListener("pointerdown", onPointerDown, { passive: true });
overlayButtonElement.addEventListener("click", startOrRestartGame);
playerNameElement.addEventListener("input", onPlayerNameInput);
moveLeftButton.addEventListener("click", () => moveLane(-1));
moveRightButton.addEventListener("click", () => moveLane(1));
fireButton.addEventListener("click", fireShot);
reloadButton.addEventListener("click", reloadWeapon);

registerServiceWorker();
renderLeaderboard();
setOverlay("intro");
syncHud();
animate();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  if (gameState.running) {
    updateGame(delta, elapsed);
  } else {
    updateIdle(delta, elapsed);
  }

  composer.render();
}

function updateGame(delta, elapsed) {
  updatePlayer(delta, elapsed);
  updateWave(delta);
  updateZombies(delta, elapsed);
  updateEffects(delta);
  updateTimers(delta);
  updateAtmosphere(delta, elapsed);
  syncHud();
}

function updateIdle(delta, elapsed) {
  updatePlayer(delta, elapsed);
  updateEffects(delta);
  updateAtmosphere(delta, elapsed);
}

function updatePlayer(delta, elapsed) {
  gameState.currentLane = THREE.MathUtils.damp(
    gameState.currentLane,
    gameState.targetLane,
    gameState.dodgeTimer > 0 ? 18 : 10,
    delta,
  );

  player.group.position.x = THREE.MathUtils.damp(
    player.group.position.x,
    interpolateLanePosition(gameState.currentLane),
    gameState.dodgeTimer > 0 ? 18 : 10,
    delta,
  );
  player.group.position.y = 0.1 + Math.sin(elapsed * 7.5) * 0.05;
  player.group.rotation.z = THREE.MathUtils.damp(
    player.group.rotation.z,
    (gameState.targetLane - 1) * -0.12,
    8,
    delta,
  );
  player.arms.rotation.x = -0.2 + Math.sin(elapsed * 13) * 0.02;

  camera.position.x = THREE.MathUtils.damp(camera.position.x, player.group.position.x * 0.28, 5, delta);
  camera.lookAt(player.group.position.x * 0.1, 2.4, -18);
}

function updateWave(delta) {
  if (gameState.waveSpawned < gameState.waveSpawnTotal) {
    gameState.spawnTimer -= delta;
    if (gameState.spawnTimer <= 0) {
      spawnZombie();
      gameState.waveSpawned += 1;
      gameState.spawnTimer = gameState.spawnInterval;
    }
  }

  if (gameState.waveKills >= gameState.waveSpawnTotal && zombies.length === 0) {
    advanceWave();
  }
}

function updateZombies(delta, elapsed) {
  for (let index = zombies.length - 1; index >= 0; index -= 1) {
    const zombie = zombies[index];

    zombie.group.position.z += zombie.userData.speed * delta;
    zombie.group.position.x =
      zombie.userData.baseX +
      Math.sin(elapsed * zombie.userData.swaySpeed + zombie.userData.phase) * zombie.userData.swayAmplitude;
    zombie.group.rotation.y = Math.sin(elapsed * 6 + zombie.userData.phase) * 0.12;
    zombie.arms.rotation.x = Math.sin(elapsed * 10 + zombie.userData.phase) * 0.6;
    zombie.head.rotation.z = Math.sin(elapsed * 5 + zombie.userData.phase) * 0.08;

    if (
      Math.abs(zombie.group.position.z - player.group.position.z) < 1.9 &&
      Math.abs(zombie.group.position.x - player.group.position.x) < 1.55
    ) {
      damagePlayer(zombie.userData.damage);
      spawnImpact(zombie.group.position, "#ff6f61", 10);
      zombies.splice(index, 1);
      scene.remove(zombie.group);
      continue;
    }

    if (zombie.group.position.z > 18) {
      zombies.splice(index, 1);
      scene.remove(zombie.group);
      continue;
    }
  }
}

function updateEffects(delta) {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    effect.userData.life -= delta;

    if (effect.userData.type === "tracer") {
      effect.scale.z += delta * 20;
      effect.material.opacity = Math.max(0, effect.userData.life * 4);
    }

    if (effect.userData.type === "particle") {
      effect.position.addScaledVector(effect.userData.velocity, delta);
      effect.userData.velocity.y -= delta * 2.8;
      effect.material.opacity = Math.max(0, effect.userData.life * 2.5);
    }

    if (effect.userData.life <= 0) {
      effects.splice(index, 1);
      scene.remove(effect);
    }
  }
}

function updateTimers(delta) {
  if (gameState.shootCooldown > 0) {
    gameState.shootCooldown = Math.max(0, gameState.shootCooldown - delta);
  }

  if (gameState.reloadTimer > 0) {
    gameState.reloadTimer = Math.max(0, gameState.reloadTimer - delta);
    if (gameState.reloadTimer === 0 && gameState.reloading) {
      completeReload();
    }
  }

  if (gameState.dodgeCooldown > 0) {
    gameState.dodgeCooldown = Math.max(0, gameState.dodgeCooldown - delta);
  }

  if (gameState.dodgeTimer > 0) {
    gameState.dodgeTimer = Math.max(0, gameState.dodgeTimer - delta);
  }

  if (gameState.furyActive) {
    gameState.furyTimer = Math.max(0, gameState.furyTimer - delta);
    if (gameState.furyTimer === 0) {
      gameState.furyActive = false;
      gameState.furyCharge = 0;
      pushStatus("Ofke modu sona erdi. Mermiyi dikkatli kullan.");
    }
  } else if (gameState.furyCharge >= 1) {
    activateFury();
  }
}

function updateAtmosphere(delta, elapsed) {
  redAlarmLight.intensity = 14 + Math.sin(elapsed * 5.5) * 4 + (gameState.furyActive ? 5 : 0);
  blueAlarmLight.intensity = 8 + Math.sin(elapsed * 4.5 + 1.7) * 3;
  bloomPass.strength = THREE.MathUtils.damp(
    bloomPass.strength,
    gameState.furyActive ? 0.62 : 0.32,
    4,
    delta,
  );

  streetLightTargets.forEach((light, index) => {
    light.intensity = 7 + Math.sin(elapsed * 2 + index) * 0.8;
  });
}

function buildCity() {
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.3, 180),
    new THREE.MeshStandardMaterial({
      color: "#222830",
      roughness: 0.96,
    }),
  );
  road.position.set(0, -0.2, -40);
  road.receiveShadow = true;
  scene.add(road);

  const sidewalkMaterial = new THREE.MeshStandardMaterial({
    color: "#43474f",
    roughness: 0.95,
  });

  const leftSidewalk = new THREE.Mesh(new THREE.BoxGeometry(6, 0.35, 180), sidewalkMaterial);
  leftSidewalk.position.set(-13.5, -0.05, -40);
  leftSidewalk.receiveShadow = true;
  scene.add(leftSidewalk);

  const rightSidewalk = leftSidewalk.clone();
  rightSidewalk.position.x = 13.5;
  scene.add(rightSidewalk);

  for (let i = 0; i < 16; i += 1) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.04, 4),
      new THREE.MeshStandardMaterial({
        color: "#efe3a4",
        emissive: "#5c4a14",
        emissiveIntensity: 0.25,
        roughness: 0.6,
      }),
    );
    line.position.set(0, 0.03, 20 - i * 10);
    scene.add(line);
  }

  const buildingPalette = ["#10161d", "#161d28", "#1a2230", "#131923"];
  for (let side of [-1, 1]) {
    for (let i = 0; i < 18; i += 1) {
      const width = 6 + Math.random() * 5;
      const height = 10 + Math.random() * 24;
      const depth = 7 + Math.random() * 7;
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({
          color: buildingPalette[Math.floor(Math.random() * buildingPalette.length)],
          roughness: 0.9,
          metalness: 0.05,
        }),
      );
      building.position.set(side * (18 + Math.random() * 8), height * 0.5 - 0.2, 18 - i * 10);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);

      addWindowLights(building);
    }
  }

  for (let i = 0; i < 8; i += 1) {
    const lamp = buildStreetLamp();
    lamp.group.position.set(-8.8, 0, 18 - i * 20);
    scene.add(lamp.group);
    streetLightTargets.push(lamp.light);

    const lamp2 = buildStreetLamp();
    lamp2.group.position.set(8.8, 0, 8 - i * 20);
    scene.add(lamp2.group);
    streetLightTargets.push(lamp2.light);
  }

  for (let i = 0; i < 6; i += 1) {
    const car = buildWreckedCar(i % 2 === 0 ? "#5e1616" : "#2d3c51");
    car.position.set(i % 2 === 0 ? -6.2 : 6.2, 0.15, -8 - i * 20);
    car.rotation.y = i % 2 === 0 ? 0.18 : -0.22;
    scene.add(car);
  }

  const fogPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 80),
    new THREE.MeshBasicMaterial({
      color: "#0a1018",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  );
  fogPlane.position.set(0, 8, -48);
  scene.add(fogPlane);
}

function addWindowLights(building) {
  const size = building.geometry.parameters;
  for (let x = -1; x <= 1; x += 1) {
    for (let y = 0; y < Math.max(2, Math.floor(size.height / 8)); y += 1) {
      if (Math.random() < 0.55) {
        continue;
      }

      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.1, 0.1),
        new THREE.MeshStandardMaterial({
          color: "#f6e1a2",
          emissive: "#ffcc6a",
          emissiveIntensity: 0.75,
          roughness: 0.4,
        }),
      );
      light.position.set(
        x * (size.width * 0.2),
        1.8 + y * 2.6,
        size.depth * 0.5 + 0.06,
      );
      building.add(light);
    }
  }
}

function buildStreetLamp() {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 6, 10),
    new THREE.MeshStandardMaterial({
      color: "#5f6c7b",
      roughness: 0.7,
      metalness: 0.22,
    }),
  );
  pole.position.y = 3;
  pole.castShadow = true;
  group.add(pole);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.1, 0.1),
    pole.material,
  );
  arm.position.set(0.68, 5.8, 0);
  group.add(arm);

  const lampHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.2, 0.22),
    new THREE.MeshStandardMaterial({
      color: "#d0cbbf",
      emissive: "#f7c66a",
      emissiveIntensity: 0.8,
      roughness: 0.4,
    }),
  );
  lampHead.position.set(1.38, 5.7, 0);
  group.add(lampHead);

  const light = new THREE.PointLight("#f6bf69", 7, 18, 2.2);
  light.position.set(1.3, 5.5, 0);
  group.add(light);

  return { group, light };
}

function buildWreckedCar(color) {
  const group = new THREE.Group();

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.9, 5),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.18,
    }),
  );
  chassis.position.y = 0.65;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.9, 2.4),
    new THREE.MeshPhysicalMaterial({
      color: "#bfd3e6",
      roughness: 0.1,
      transmission: 0.12,
      transparent: true,
      opacity: 0.72,
    }),
  );
  cabin.position.set(0, 1.22, -0.4);
  group.add(cabin);

  for (const x of [-1.1, 1.1]) {
    for (const z of [-1.5, 1.5]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.28, 16),
        new THREE.MeshStandardMaterial({
          color: "#111",
          roughness: 0.95,
        }),
      );
      wheel.rotation.z = Math.PI * 0.5;
      wheel.position.set(x, 0.32, z);
      group.add(wheel);
    }
  }

  return group;
}

function buildPlayer() {
  const group = new THREE.Group();
  group.position.set(0, 0, 8);

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.2, 0.7),
    new THREE.MeshStandardMaterial({
      color: "#202934",
      roughness: 0.85,
    }),
  );
  legs.position.y = 0.6;
  legs.castShadow = true;
  group.add(legs);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.4, 0.8),
    new THREE.MeshStandardMaterial({
      color: "#394652",
      roughness: 0.72,
    }),
  );
  torso.position.y = 1.8;
  torso.castShadow = true;
  group.add(torso);

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.92, 0.36),
    new THREE.MeshStandardMaterial({
      color: "#574a3f",
      roughness: 0.88,
    }),
  );
  backpack.position.set(0, 1.9, -0.58);
  group.add(backpack);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 18, 18),
    new THREE.MeshStandardMaterial({
      color: "#cfa489",
      roughness: 0.62,
    }),
  );
  head.position.y = 2.9;
  head.castShadow = true;
  group.add(head);

  const arms = new THREE.Group();
  arms.position.set(0, 2.05, 0.15);
  group.add(arms);

  for (const x of [-0.75, 0.75]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 1.1, 0.28),
      new THREE.MeshStandardMaterial({
        color: "#cfa489",
        roughness: 0.68,
      }),
    );
    arm.position.set(x, 0, 0);
    arm.rotation.z = x < 0 ? 0.2 : -0.2;
    arms.add(arm);
  }

  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.18, 1.2),
    new THREE.MeshStandardMaterial({
      color: "#1b2128",
      metalness: 0.4,
      roughness: 0.55,
    }),
  );
  gun.position.set(0.2, -0.14, 0.86);
  arms.add(gun);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.2, -0.1, 1.5);
  arms.add(muzzle);

  return { group, arms, gun, muzzle };
}

function spawnZombie() {
  const laneIndex = Math.floor(Math.random() * laneCount);
  const type = pickZombieType();
  const zombie = buildZombie(type);

  zombie.group.position.set(lanePositions[laneIndex], 0, -58 - Math.random() * 28);
  zombie.userData.baseX = lanePositions[laneIndex];
  zombie.userData.phase = Math.random() * Math.PI * 2;
  zombie.userData.swaySpeed = 1.8 + Math.random() * 1.4;
  zombie.userData.swayAmplitude = type === "runner" ? 0.18 : 0.08;
  zombie.userData.laneIndex = laneIndex;
  scene.add(zombie.group);
  zombies.push(zombie);
}

function pickZombieType() {
  const roll = Math.random();
  if (gameState.wave >= 4 && roll > 0.82) {
    return "brute";
  }
  if (gameState.wave >= 2 && roll > 0.56) {
    return "runner";
  }
  return "walker";
}

function buildZombie(type) {
  const group = new THREE.Group();

  const palette = {
    walker: { skin: "#7ea17d", shirt: "#58614a", pants: "#332f32", speed: 5.2, damage: 12, health: 1, score: 110 },
    runner: { skin: "#98b18d", shirt: "#5e3636", pants: "#262a2f", speed: 7.3, damage: 16, health: 1, score: 160 },
    brute: { skin: "#89a078", shirt: "#4d4d59", pants: "#2a2327", speed: 4.1, damage: 24, health: 3, score: 260 },
  }[type];

  const bodyScale = type === "brute" ? 1.25 : type === "runner" ? 0.92 : 1;

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(1 * bodyScale, 1.2 * bodyScale, 0.7 * bodyScale),
    new THREE.MeshStandardMaterial({ color: palette.pants, roughness: 0.88 }),
  );
  legs.position.y = 0.6 * bodyScale;
  legs.castShadow = true;
  group.add(legs);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(1.2 * bodyScale, 1.5 * bodyScale, 0.8 * bodyScale),
    new THREE.MeshStandardMaterial({ color: palette.shirt, roughness: 0.82 }),
  );
  torso.position.y = 1.85 * bodyScale;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38 * bodyScale, 14, 14),
    new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.7 }),
  );
  head.position.y = 2.95 * bodyScale;
  head.castShadow = true;
  group.add(head);

  const arms = new THREE.Group();
  arms.position.set(0, 2.1 * bodyScale, 0.3);
  group.add(arms);

  for (const x of [-0.75, 0.75]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.28 * bodyScale, 1.25 * bodyScale, 0.28 * bodyScale),
      new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.74 }),
    );
    arm.position.set(x * bodyScale, 0, 0);
    arm.rotation.z = x < 0 ? 0.45 : -0.45;
    arm.rotation.x = 0.5;
    arms.add(arm);
  }

  group.position.y = 0.04;

  return {
    group,
    arms,
    head,
    userData: {
      type,
      speed: palette.speed + Math.random() * 0.5 + gameState.wave * 0.08,
      damage: palette.damage,
      health: palette.health,
      score: palette.score,
      hitFlash: 0,
    },
  };
}

function fireShot() {
  ensureAudioContext();

  if (!gameState.running || gameState.reloading || gameState.shootCooldown > 0) {
    return;
  }

  if (gameState.ammo <= 0) {
    pushStatus("Sarjor bos. Reload yap.");
    playSound("empty");
    reloadWeapon();
    return;
  }

  gameState.ammo -= 1;
  gameState.shootCooldown = gameState.furyActive ? 0.11 : 0.2;
  player.gun.rotation.x = -0.2;

  const origin = new THREE.Vector3();
  player.muzzle.getWorldPosition(origin);

  const laneX = player.group.position.x;
  const targets = zombies
    .filter((zombie) => Math.abs(zombie.group.position.x - laneX) < 1.3 && zombie.group.position.z < player.group.position.z)
    .sort((left, right) => right.group.position.z - left.group.position.z);

  const hitCount = gameState.furyActive ? Math.min(2, targets.length) : Math.min(1, targets.length);
  const endZ = targets[0] ? targets[0].group.position.z : -64;
  spawnTracer(origin, endZ);

  for (let i = 0; i < hitCount; i += 1) {
    hitZombie(targets[i], gameState.furyActive ? 2 : 1);
  }

  playSound("shoot");
  if (gameState.ammo === 0 && gameState.reserveAmmo > 0) {
    pushStatus("Sarjor bitti. Reload zamani.");
  }
}

function hitZombie(zombie, damage) {
  zombie.userData.health -= damage;
  spawnImpact(zombie.group.position, "#9dff7a", 7);
  playSound("hit");

  if (zombie.userData.health <= 0) {
    killZombie(zombie);
  }
}

function killZombie(zombie) {
  const index = zombies.indexOf(zombie);
  if (index >= 0) {
    zombies.splice(index, 1);
  }

  scene.remove(zombie.group);
  spawnImpact(zombie.group.position, "#ff3f3f", 12);

  gameState.kills += 1;
  gameState.waveKills += 1;
  gameState.furyCharge = Math.min(1, gameState.furyCharge + (zombie.userData.type === "brute" ? 0.28 : 0.14));
  gameState.score += Math.round(zombie.userData.score * (gameState.furyActive ? 1.5 : 1));

  if (!gameState.missionComplete && gameState.kills >= 20 && gameState.wave >= 3) {
    gameState.missionComplete = true;
    missionStatusElement.textContent = "Gorev tamamlandi. Sokak sende.";
    playSound("mission");
  }
}

function reloadWeapon() {
  if (!gameState.running || gameState.reloading || gameState.ammo === 12 || gameState.reserveAmmo <= 0) {
    return;
  }

  gameState.reloading = true;
  gameState.reloadTimer = gameState.furyActive ? 0.9 : 1.35;
  pushStatus("Sarjor degisiyor...");
  playSound("reload");
}

function completeReload() {
  const needed = 12 - gameState.ammo;
  const taken = Math.min(needed, gameState.reserveAmmo);
  gameState.ammo += taken;
  gameState.reserveAmmo -= taken;
  gameState.reloading = false;
  pushStatus("Hazirsin. Atese devam.");
}

function damagePlayer(amount) {
  gameState.health = Math.max(0, gameState.health - amount);
  playSound("hurt");

  if (gameState.health <= 0) {
    endGame();
  } else {
    pushStatus("Temas aldın. Hattı tut.");
  }
}

function dodge() {
  if (!gameState.running || gameState.dodgeCooldown > 0) {
    return;
  }

  let bestLane = gameState.targetLane;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
    const danger = zombies.reduce((total, zombie) => {
      if (zombie.userData.laneIndex !== laneIndex) {
        return total;
      }
      return total + Math.max(0, 30 - Math.abs(zombie.group.position.z - player.group.position.z));
    }, 0);

    if (danger < bestScore) {
      bestScore = danger;
      bestLane = laneIndex;
    }
  }

  gameState.targetLane = bestLane;
  gameState.dodgeTimer = 0.22;
  gameState.dodgeCooldown = 1.4;
  playSound("dodge");
  pushStatus("Ani kacis yapildi.");
}

function activateFury() {
  gameState.furyActive = true;
  gameState.furyTimer = 6;
  playSound("fury");
  pushStatus("Ofke modu aktif. Hizli ates ve ekstra skor.");
}

function advanceWave() {
  gameState.wave += 1;
  gameState.waveSpawnTotal = 6 + gameState.wave * 3;
  gameState.waveSpawned = 0;
  gameState.waveKills = 0;
  gameState.spawnInterval = Math.max(0.48, 1.32 - gameState.wave * 0.08);
  gameState.spawnTimer = 1.2;
  gameState.reserveAmmo += 10 + gameState.wave * 2;
  gameState.health = Math.min(100, gameState.health + 10);
  gameState.score += 300 + gameState.wave * 80;
  pushStatus(`Dalga ${gameState.wave}. Sokak daha da kizisiyor.`);
  playSound("wave");
}

function startOrRestartGame() {
  ensureAudioContext();
  clearEntities();

  gameState.running = true;
  gameState.started = true;
  gameState.overlayMode = "playing";
  gameState.health = 100;
  gameState.ammo = 12;
  gameState.reserveAmmo = 48;
  gameState.score = 0;
  gameState.kills = 0;
  gameState.wave = 1;
  gameState.furyCharge = 0;
  gameState.furyActive = false;
  gameState.furyTimer = 0;
  gameState.shootCooldown = 0;
  gameState.reloadTimer = 0;
  gameState.reloading = false;
  gameState.dodgeTimer = 0;
  gameState.dodgeCooldown = 0;
  gameState.targetLane = 1;
  gameState.currentLane = 1;
  gameState.waveSpawnTotal = 9;
  gameState.waveSpawned = 0;
  gameState.waveKills = 0;
  gameState.spawnTimer = 1;
  gameState.spawnInterval = 1.2;
  gameState.missionComplete = false;

  player.group.position.x = 0;
  player.group.rotation.z = 0;

  missionStatusElement.textContent = "Gorev aktif.";
  overlayElement.classList.add("is-hidden");
  hudBottomElement.classList.add("is-hidden");
  pushStatus("Gece başladı. İlk dalga geliyor.");
  syncHud();
  playSound("start");
}

function endGame() {
  gameState.running = false;
  gameState.bestScore = Math.max(gameState.bestScore, gameState.score);
  localStorage.setItem(STORAGE_KEYS.bestScore, String(gameState.bestScore));
  saveLeaderboardEntry();
  setOverlay("gameover");
  hudBottomElement.classList.remove("is-hidden");
  syncHud();
  playSound("gameover");
}

function clearEntities() {
  while (zombies.length > 0) {
    const zombie = zombies.pop();
    scene.remove(zombie.group);
  }

  while (effects.length > 0) {
    scene.remove(effects.pop());
  }
}

function saveLeaderboardEntry() {
  const entry = {
    name: gameState.playerName,
    score: gameState.score,
    kills: gameState.kills,
    wave: gameState.wave,
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
    const empty = document.createElement("li");
    empty.className = "leaderboard__item";
    empty.textContent = "Ilk kaydi sen birak.";
    leaderboardListElement.append(empty);
    return;
  }

  gameState.leaderboard.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard__item";
    item.innerHTML = `
      <span class="leaderboard__rank">${index + 1}</span>
      <span class="leaderboard__meta">
        <strong>${escapeHtml(entry.name)}</strong>
        <span>${entry.kills} kill · Dalga ${entry.wave}</span>
      </span>
      <span class="leaderboard__score">
        ${formatNumber(entry.score)}
        <small>${formatDate(entry.date)}</small>
      </span>
    `;
    leaderboardListElement.append(item);
  });
}

function setOverlay(mode) {
  gameState.overlayMode = mode;
  overlayElement.classList.remove("is-hidden");

  if (mode === "intro") {
    overlayTextElement.textContent =
      "Hayatta kalan son avcilardan birisin. Sokagi temizle, dalgalari as ve kayit tablosuna adini yaz.";
    overlayButtonElement.textContent = gameState.started ? "Yeni Avi Baslat" : "Avi Baslat";
  }

  if (mode === "gameover") {
    overlayTextElement.textContent =
      `Av bitti. ${gameState.kills} zombi indirdin, ${gameState.wave}. dalgaya ulastin ve ${formatNumber(gameState.score)} puan topladin.`;
    overlayButtonElement.textContent = "Tekrar Dene";
  }
}

function syncHud() {
  healthElement.textContent = String(gameState.health);
  ammoElement.textContent = `${gameState.ammo} / ${gameState.reserveAmmo}`;
  scoreElement.textContent = formatNumber(gameState.score);
  killsElement.textContent = formatNumber(gameState.kills);
  waveElement.textContent = String(gameState.wave);
  furyElement.textContent = gameState.furyActive ? "AKTIF" : `${Math.round(gameState.furyCharge * 100)}%`;
}

function spawnTracer(origin, hitZ) {
  const tracer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, Math.abs(hitZ - origin.z), 8),
    new THREE.MeshBasicMaterial({
      color: gameState.furyActive ? "#ffb85c" : "#fff0bb",
      transparent: true,
      opacity: 0.95,
    }),
  );
  tracer.rotation.x = Math.PI * 0.5;
  tracer.position.set(origin.x, origin.y, (origin.z + hitZ) * 0.5);
  tracer.userData = { type: "tracer", life: 0.12 };
  effects.push(tracer);
  scene.add(tracer);
}

function spawnImpact(position, color, count) {
  for (let i = 0; i < count; i += 1) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 6, 6),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      }),
    );
    particle.position.copy(position);
    particle.position.y += 1.2 + Math.random() * 1.2;
    particle.userData = {
      type: "particle",
      life: 0.35 + Math.random() * 0.2,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        1.6 + Math.random() * 2.4,
        (Math.random() - 0.5) * 4,
      ),
    };
    effects.push(particle);
    scene.add(particle);
  }
}

function onKeyDown(event) {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    moveLane(-1);
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    moveLane(1);
  }
  if (event.code === "Space") {
    if (gameState.running) {
      fireShot();
    } else {
      startOrRestartGame();
    }
  }
  if (event.key.toLowerCase() === "r") {
    reloadWeapon();
  }
  if (event.key === "Shift") {
    dodge();
  }
}

function onPointerDown(event) {
  if (
    overlayButtonElement.contains(event.target) ||
    moveLeftButton.contains(event.target) ||
    moveRightButton.contains(event.target) ||
    fireButton.contains(event.target) ||
    reloadButton.contains(event.target) ||
    playerNameElement.contains(event.target)
  ) {
    return;
  }

  if (!gameState.running) {
    startOrRestartGame();
    return;
  }

  fireShot();
}

function onPlayerNameInput(event) {
  const nextName = sanitizePlayerName(event.target.value || "Avci");
  gameState.playerName = nextName;
  localStorage.setItem(STORAGE_KEYS.playerName, nextName);
}

function moveLane(direction) {
  if (!gameState.running) {
    return;
  }
  gameState.targetLane = THREE.MathUtils.clamp(gameState.targetLane + direction, 0, laneCount - 1);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function interpolateLanePosition(laneValue) {
  const clampedLane = THREE.MathUtils.clamp(laneValue, 0, lanePositions.length - 1);
  const lowerLane = Math.floor(clampedLane);
  const upperLane = Math.ceil(clampedLane);
  const blend = clampedLane - lowerLane;
  return THREE.MathUtils.lerp(lanePositions[lowerLane], lanePositions[upperLane], blend);
}

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.leaderboard);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function sanitizePlayerName(name) {
  const trimmed = String(name).trim().slice(0, 16);
  return trimmed || "Avci";
}

function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDate(value) {
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

function pushStatus(message) {
  statusElement.textContent = message;
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
      { time: 0, frequency: 220, duration: 0.08, gain: 0.05, type: "triangle" },
      { time: 0.08, frequency: 320, duration: 0.1, gain: 0.05, type: "triangle" },
    ],
    shoot: [
      { time: 0, frequency: 170, duration: 0.05, gain: 0.07, type: "square" },
      { time: 0.03, frequency: 90, duration: 0.08, gain: 0.05, type: "sawtooth" },
    ],
    empty: [{ time: 0, frequency: 480, duration: 0.04, gain: 0.02, type: "sine" }],
    hit: [{ time: 0, frequency: 620, duration: 0.04, gain: 0.02, type: "triangle" }],
    hurt: [
      { time: 0, frequency: 150, duration: 0.08, gain: 0.06, type: "sawtooth" },
      { time: 0.03, frequency: 95, duration: 0.1, gain: 0.05, type: "triangle" },
    ],
    reload: [
      { time: 0, frequency: 380, duration: 0.04, gain: 0.025, type: "triangle" },
      { time: 0.08, frequency: 310, duration: 0.05, gain: 0.02, type: "triangle" },
    ],
    dodge: [{ time: 0, frequency: 520, duration: 0.06, gain: 0.03, type: "sine" }],
    fury: [
      { time: 0, frequency: 180, duration: 0.08, gain: 0.06, type: "sawtooth" },
      { time: 0.06, frequency: 360, duration: 0.08, gain: 0.04, type: "triangle" },
      { time: 0.13, frequency: 700, duration: 0.12, gain: 0.03, type: "triangle" },
    ],
    mission: [
      { time: 0, frequency: 440, duration: 0.08, gain: 0.04, type: "triangle" },
      { time: 0.08, frequency: 660, duration: 0.08, gain: 0.04, type: "triangle" },
      { time: 0.16, frequency: 880, duration: 0.1, gain: 0.03, type: "triangle" },
    ],
    wave: [
      { time: 0, frequency: 210, duration: 0.1, gain: 0.05, type: "triangle" },
      { time: 0.1, frequency: 280, duration: 0.1, gain: 0.04, type: "triangle" },
    ],
    gameover: [
      { time: 0, frequency: 120, duration: 0.18, gain: 0.06, type: "sawtooth" },
      { time: 0.08, frequency: 72, duration: 0.22, gain: 0.05, type: "triangle" },
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
