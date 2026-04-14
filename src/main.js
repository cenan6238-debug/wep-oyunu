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
const missionElement = document.querySelector("#mission");
const radioTitleElement = document.querySelector("#radio-title");
const radioTextElement = document.querySelector("#radio-text");
const episodeTitleElement = document.querySelector("#episode-title");
const episodeBlurbElement = document.querySelector("#episode-blurb");
const damageFlashElement = document.querySelector("#damage-flash");
const furyOverlayElement = document.querySelector("#fury-overlay");
const hitTextElement = document.querySelector("#hit-text");
const chapterBannerElement = document.querySelector("#chapter-banner");
const chapterEyebrowElement = document.querySelector("#chapter-eyebrow");
const chapterTitleElement = document.querySelector("#chapter-title");
const chapterTextElement = document.querySelector("#chapter-text");
const subtitleStripElement = document.querySelector("#subtitle-strip");

const healthElement = document.querySelector("#health");
const ammoElement = document.querySelector("#ammo");
const scoreElement = document.querySelector("#score");
const killsElement = document.querySelector("#kills");
const waveElement = document.querySelector("#wave");
const furyElement = document.querySelector("#fury");
const episodeElement = document.querySelector("#episode");
const cityElement = document.querySelector("#city");

const moveLeftButton = document.querySelector("#move-left");
const moveRightButton = document.querySelector("#move-right");
const fireButton = document.querySelector("#fire-button");
const reloadButton = document.querySelector("#reload-button");

const EPISODES = [
  {
    id: 1,
    code: "01",
    title: "Cokus Gecesi",
    city: "Atlanta",
    blurb:
      "Merkez mahalleler dustu. Polis bandi koptu. Simdi tek hedef, apartman aralarindan gecip gecici guvenli bolgeye ulasmak.",
    mission: "3 dalga boyunca mahalleyi savun ve ilk alfa zombiyi indir.",
    radioTitle: "Kanal 6 Acik",
    radioText:
      "Merkez istasyon cevap vermiyor. Guney caddesindeki tahliye koridoru daraldi. Hayatta kalanlar sokak lambalarina gore yoneliyor.",
    environment: {
      background: "#060a11",
      fog: "#060a11",
      bloom: 0.32,
      road: "#222830",
      sidewalk: "#43474f",
      buildingPalette: ["#10161d", "#161d28", "#1a2230", "#131923"],
      red: "#ff5035",
      blue: "#4aa8ff",
    },
  },
  {
    id: 2,
    code: "02",
    title: "Sessiz Merkez",
    city: "Chicago",
    blurb:
      "Sehir cekirdegi tamamen karardi. Cam cepheli binalar bos, sokaklar yankili. Tahliye konvoyu kuzey koprusunde son kez beklenecek.",
    mission: "Downtown caddesinde 25 zombi temizle ve kopru cikisini tut.",
    radioTitle: "Saha Telsizi",
    radioText:
      "Yuksek bloklar arasinda yankı yapan sirenler suruyu cekiyor. Kopru acik ama uzun degil. Hareket eden her sey hedef olabilir.",
    environment: {
      background: "#050810",
      fog: "#050810",
      bloom: 0.38,
      road: "#1f232b",
      sidewalk: "#3d424b",
      buildingPalette: ["#0d1219", "#151b23", "#1b212b", "#111720"],
      red: "#f04a33",
      blue: "#58b8ff",
    },
  },
  {
    id: 3,
    code: "03",
    title: "Karanlik Liman",
    city: "Istanbul",
    blurb:
      "Liman sis altinda. Konteyner hatlari kopmus, kacis tekneleri dagildi. Son durak deniz kiyisi ama suru artik seni taniyor.",
    mission: "Liman yolunda hayatta kal, boss dalgasini gec ve tahliye isigina ulas.",
    radioTitle: "Acil Yayin",
    radioText:
      "Sahil bolgesinde goz temasi kurmayan yok. Sis yogunlasiyor. Son ekip, fener iskelesinde toplaniyor. Oraya kadar yasarsan sansin var.",
    environment: {
      background: "#04070d",
      fog: "#04070d",
      bloom: 0.44,
      road: "#1b2028",
      sidewalk: "#353b44",
      buildingPalette: ["#0b1016", "#121821", "#18202a", "#0f141c"],
      red: "#ff6248",
      blue: "#68c8ff",
    },
  },
];

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
  episodeIndex: 0,
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
  bossSpawnedThisWave: false,
  damageFlashTimer: 0,
  hitTextTimer: 0,
  muzzleFlashTimer: 0,
  shakeTimer: 0,
  shakeStrength: 0,
  chapterTimer: 0,
  subtitleTimer: 0,
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
const searchlights = [];
const fireLights = [];
const cityRoot = new THREE.Group();
const weatherGroup = new THREE.Group();
scene.add(cityRoot);
scene.add(weatherGroup);
buildCity();

const player = buildPlayer();
scene.add(player.group);

const zombies = [];
const effects = [];
const pickups = [];
const enemyProjectiles = [];

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
updateEpisodeUi();
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
  updateEnemyProjectiles(delta, elapsed);
  updatePickups(delta, elapsed);
  updateEffects(delta);
  updateWeather(delta);
  updateTimers(delta);
  updateAtmosphere(delta, elapsed);
  syncHud();
}

function updateIdle(delta, elapsed) {
  updatePlayer(delta, elapsed);
  updateEnemyProjectiles(delta * 0.3, elapsed);
  updatePickups(delta * 0.35, elapsed);
  updateEffects(delta);
  updateWeather(delta * 0.35);
  updateTimers(delta * 0.45);
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
  player.gun.rotation.x = THREE.MathUtils.damp(player.gun.rotation.x, 0, 12, delta);

  const shakeFalloff = gameState.shakeTimer > 0 ? gameState.shakeTimer / 0.24 : 0;
  const shakeOffsetX = (Math.random() - 0.5) * gameState.shakeStrength * shakeFalloff;
  const shakeOffsetY = (Math.random() - 0.5) * gameState.shakeStrength * 0.45 * shakeFalloff;

  camera.position.x = THREE.MathUtils.damp(camera.position.x, player.group.position.x * 0.28, 5, delta) + shakeOffsetX;
  camera.position.y = THREE.MathUtils.damp(
    camera.position.y,
    6.8 + (gameState.health < 35 ? Math.sin(elapsed * 10) * 0.08 : 0),
    4,
    delta,
  ) + shakeOffsetY;
  camera.position.z = THREE.MathUtils.damp(camera.position.z, 15.5 + (gameState.reloading ? 0.35 : 0), 4, delta);
  camera.lookAt(player.group.position.x * 0.1, 2.4 + shakeOffsetY * 0.6, -18);

  player.flashlightTarget.position.set(player.group.position.x * 0.12, 1.8, -32);
  player.flashlightTarget.updateMatrixWorld();
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
    if (gameState.wave >= 3) {
      advanceEpisode();
    } else {
      advanceWave();
    }
  }
}

function updateZombies(delta, elapsed) {
  for (let index = zombies.length - 1; index >= 0; index -= 1) {
    const zombie = zombies[index];
    const distanceToPlayer = player.group.position.z - zombie.group.position.z;

    if (zombie.userData.type === "spitter" && distanceToPlayer > 10) {
      zombie.group.position.z += zombie.userData.speed * 0.62 * delta;
      zombie.userData.attackCooldown = Math.max(0, zombie.userData.attackCooldown - delta);
      if (distanceToPlayer > 12 && distanceToPlayer < 34 && zombie.userData.attackCooldown === 0) {
        spawnEnemyProjectile(zombie);
        zombie.userData.attackCooldown = 1.8 + Math.random() * 0.5;
      }
    } else {
      zombie.group.position.z += zombie.userData.speed * delta;
    }

    zombie.group.position.x =
      zombie.userData.baseX +
      Math.sin(elapsed * zombie.userData.swaySpeed + zombie.userData.phase) * zombie.userData.swayAmplitude;
    zombie.group.rotation.y = Math.sin(elapsed * 6 + zombie.userData.phase) * 0.12;
    zombie.arms.rotation.x = Math.sin(elapsed * 10 + zombie.userData.phase) * 0.6;
    zombie.head.rotation.z = Math.sin(elapsed * 5 + zombie.userData.phase) * 0.08;

    if (zombie.userData.type === "crawler") {
      zombie.group.position.y = 0.02 + Math.sin(elapsed * 14 + zombie.userData.phase) * 0.03;
      zombie.group.rotation.x = -0.28 + Math.sin(elapsed * 8 + zombie.userData.phase) * 0.04;
    }

    if (
      Math.abs(zombie.group.position.z - player.group.position.z) < 1.9 &&
      Math.abs(zombie.group.position.x - player.group.position.x) <
        (zombie.userData.type === "crawler" ? 1.1 : 1.55)
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

function updateEnemyProjectiles(delta, elapsed) {
  for (let index = enemyProjectiles.length - 1; index >= 0; index -= 1) {
    const projectile = enemyProjectiles[index];
    projectile.position.addScaledVector(projectile.userData.velocity, delta);
    projectile.rotation.x += delta * 4;
    projectile.rotation.y += delta * 6;
    projectile.material.opacity = 0.48 + Math.sin(elapsed * 14 + projectile.userData.phase) * 0.1;

    if (
      Math.abs(projectile.position.z - player.group.position.z) < 1.4 &&
      Math.abs(projectile.position.x - player.group.position.x) < 1.1
    ) {
      damagePlayer(projectile.userData.damage);
      spawnImpact(projectile.position, "#98ff8a", 8);
      enemyProjectiles.splice(index, 1);
      scene.remove(projectile);
      continue;
    }

    if (projectile.position.z > 18 || projectile.position.y < -0.5) {
      enemyProjectiles.splice(index, 1);
      scene.remove(projectile);
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

function updatePickups(delta, elapsed) {
  for (let index = pickups.length - 1; index >= 0; index -= 1) {
    const pickup = pickups[index];
    pickup.group.position.z += 6.6 * delta;
    pickup.group.rotation.y += delta * 2.2;
    pickup.group.position.y = 0.6 + Math.sin(elapsed * 4 + pickup.userData.phase) * 0.16;

    if (
      Math.abs(pickup.group.position.z - player.group.position.z) < 1.4 &&
      Math.abs(pickup.group.position.x - player.group.position.x) < 1.2
    ) {
      collectPickup(pickup);
      continue;
    }

    if (pickup.group.position.z > 18) {
      scene.remove(pickup.group);
      pickups.splice(index, 1);
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

  if (gameState.damageFlashTimer > 0) {
    gameState.damageFlashTimer = Math.max(0, gameState.damageFlashTimer - delta);
    damageFlashElement.classList.toggle("is-active", gameState.damageFlashTimer > 0);
  } else {
    damageFlashElement.classList.remove("is-active");
  }

  if (gameState.hitTextTimer > 0) {
    gameState.hitTextTimer = Math.max(0, gameState.hitTextTimer - delta);
    hitTextElement.classList.toggle("is-active", gameState.hitTextTimer > 0);
  } else {
    hitTextElement.classList.remove("is-active");
  }

  if (gameState.muzzleFlashTimer > 0) {
    gameState.muzzleFlashTimer = Math.max(0, gameState.muzzleFlashTimer - delta);
    player.muzzleLight.visible = true;
    player.muzzleLight.intensity = THREE.MathUtils.lerp(
      0,
      gameState.furyActive ? 18 : 12,
      gameState.muzzleFlashTimer / 0.08,
    );
  } else {
    player.muzzleLight.visible = false;
    player.muzzleLight.intensity = 0;
  }

  if (gameState.shakeTimer > 0) {
    gameState.shakeTimer = Math.max(0, gameState.shakeTimer - delta);
  }

  if (gameState.chapterTimer > 0) {
    gameState.chapterTimer = Math.max(0, gameState.chapterTimer - delta);
    chapterBannerElement.classList.toggle("is-active", gameState.chapterTimer > 0);
  } else {
    chapterBannerElement.classList.remove("is-active");
  }

  if (gameState.subtitleTimer > 0) {
    gameState.subtitleTimer = Math.max(0, gameState.subtitleTimer - delta);
    subtitleStripElement.classList.toggle("is-active", gameState.subtitleTimer > 0);
  } else {
    subtitleStripElement.classList.remove("is-active");
  }
}

function updateAtmosphere(delta, elapsed) {
  const episode = getCurrentEpisode();
  redAlarmLight.color.set(episode.environment.red);
  blueAlarmLight.color.set(episode.environment.blue);
  redAlarmLight.intensity = 14 + Math.sin(elapsed * 5.5) * 4 + (gameState.furyActive ? 5 : 0);
  blueAlarmLight.intensity = 8 + Math.sin(elapsed * 4.5 + 1.7) * 3;
  bloomPass.strength = THREE.MathUtils.damp(
    bloomPass.strength,
    gameState.furyActive ? episode.environment.bloom + 0.24 : episode.environment.bloom,
    4,
    delta,
  );

  streetLightTargets.forEach((light, index) => {
    light.intensity = 7 + Math.sin(elapsed * 2 + index) * 0.8;
  });

  searchlights.forEach((entry, index) => {
    entry.pivot.rotation.y = Math.sin(elapsed * 0.42 + index * 1.7) * 0.85;
    entry.pivot.rotation.x = -0.38 + Math.sin(elapsed * 0.33 + index) * 0.06;
    entry.beam.material.opacity = 0.07 + Math.sin(elapsed * 1.6 + index) * 0.015;
  });

  fireLights.forEach((light, index) => {
    light.intensity = 10 + Math.sin(elapsed * 7 + index * 1.8) * 2.8;
  });

  player.flashlight.intensity = THREE.MathUtils.damp(
    player.flashlight.intensity,
    gameState.running ? (gameState.furyActive ? 10 : 8.5) : 6,
    4,
    delta,
  );
  renderer.toneMappingExposure = THREE.MathUtils.damp(
    renderer.toneMappingExposure,
    gameState.furyActive ? 1.08 : gameState.health < 35 ? 0.94 : 1.02,
    2.5,
    delta,
  );

  furyOverlayElement.classList.toggle("is-active", gameState.furyActive);
}

function buildCity() {
  cityRoot.clear();
  weatherGroup.clear();
  streetLightTargets.length = 0;
  searchlights.length = 0;
  fireLights.length = 0;

  const episode = getCurrentEpisode();
  scene.background = new THREE.Color(episode.environment.background);
  scene.fog = new THREE.Fog(episode.environment.fog, 24, 120);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.3, 180),
    new THREE.MeshStandardMaterial({
      color: episode.environment.road,
      roughness: 0.96,
    }),
  );
  road.position.set(0, -0.2, -40);
  road.receiveShadow = true;
  cityRoot.add(road);

  const wetRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(13.2, 180),
    new THREE.MeshPhysicalMaterial({
      color: episode.environment.road,
      roughness: 0.14,
      metalness: 0.26,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.3,
    }),
  );
  wetRoad.rotation.x = -Math.PI * 0.5;
  wetRoad.position.set(0, -0.035, -40);
  cityRoot.add(wetRoad);

  const sidewalkMaterial = new THREE.MeshStandardMaterial({
    color: episode.environment.sidewalk,
    roughness: 0.95,
  });

  const leftSidewalk = new THREE.Mesh(new THREE.BoxGeometry(6, 0.35, 180), sidewalkMaterial);
  leftSidewalk.position.set(-13.5, -0.05, -40);
  leftSidewalk.receiveShadow = true;
  cityRoot.add(leftSidewalk);

  const rightSidewalk = leftSidewalk.clone();
  rightSidewalk.position.x = 13.5;
  cityRoot.add(rightSidewalk);

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
    cityRoot.add(line);
  }

  for (let i = 0; i < 9; i += 1) {
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(1 + Math.random() * 1.3, 18),
      new THREE.MeshPhysicalMaterial({
        color: "#111923",
        roughness: 0.08,
        metalness: 0.35,
        clearcoat: 1,
        transparent: true,
        opacity: 0.24,
      }),
    );
    puddle.rotation.x = -Math.PI * 0.5;
    puddle.scale.set(1.5 + Math.random() * 1.6, 0.45 + Math.random() * 0.3, 1);
    puddle.position.set((Math.random() - 0.5) * 8, -0.03, 14 - i * 18);
    cityRoot.add(puddle);
  }

  const buildingPalette = episode.environment.buildingPalette;
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
      cityRoot.add(building);

      addWindowLights(building);
      if (i % 4 === 0) {
        const sign = buildRooftopSign(i % 8 === 0 ? episode.environment.red : episode.environment.blue);
        sign.position.set(0, height * 0.52, 0);
        building.add(sign);
      }
    }
  }

  for (let i = 0; i < 8; i += 1) {
    const lamp = buildStreetLamp();
    lamp.group.position.set(-8.8, 0, 18 - i * 20);
    cityRoot.add(lamp.group);
    streetLightTargets.push(lamp.light);

    const lamp2 = buildStreetLamp();
    lamp2.group.position.set(8.8, 0, 8 - i * 20);
    cityRoot.add(lamp2.group);
    streetLightTargets.push(lamp2.light);
  }

  for (let i = 0; i < 6; i += 1) {
    const car = buildWreckedCar(i % 2 === 0 ? "#5e1616" : "#2d3c51");
    car.position.set(i % 2 === 0 ? -6.2 : 6.2, 0.15, -8 - i * 20);
    car.rotation.y = i % 2 === 0 ? 0.18 : -0.22;
    cityRoot.add(car);
  }

  for (let i = 0; i < 5; i += 1) {
    const barricade = buildBarricadeCluster(episode);
    barricade.position.set(i % 2 === 0 ? -10.2 : 10.2, 0, 6 - i * 26);
    barricade.rotation.y = i % 2 === 0 ? Math.PI * 0.18 : -Math.PI * 0.12;
    cityRoot.add(barricade);
  }

  for (let i = 0; i < 6; i += 1) {
    const debris = buildDebrisPile();
    debris.position.set((i % 2 === 0 ? -1 : 1) * (6 + Math.random() * 4), 0, 8 - i * 24);
    debris.rotation.y = Math.random() * Math.PI;
    cityRoot.add(debris);
  }

  for (let i = 0; i < 4; i += 1) {
    const barrel = buildFireBarrel();
    barrel.group.position.set(i % 2 === 0 ? -9.6 : 9.8, 0, -4 - i * 28);
    cityRoot.add(barrel.group);
    fireLights.push(barrel.light);
  }

  for (let i = 0; i < 2; i += 1) {
    const searchlight = buildSearchlight(i === 0 ? episode.environment.blue : episode.environment.red);
    searchlight.group.position.set(i === 0 ? -16 : 16, 0, -42 - i * 18);
    cityRoot.add(searchlight.group);
    searchlights.push(searchlight);
  }

  addEpisodeSetDressing(episode.id);
  cityRoot.add(buildMoon(episode));
  cityRoot.add(buildSkyline(episode));

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
  cityRoot.add(fogPlane);

  buildWeather(episode.id);
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

function buildRooftopSign(color) {
  const sign = new THREE.Group();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.9, 0.18),
    new THREE.MeshStandardMaterial({
      color: "#141b24",
      roughness: 0.7,
      metalness: 0.25,
    }),
  );
  sign.add(frame);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.45, 0.62, 0.08),
    new THREE.MeshStandardMaterial({
      color: "#f4f6f8",
      emissive: color,
      emissiveIntensity: 1.1,
      roughness: 0.24,
    }),
  );
  panel.position.z = 0.12;
  sign.add(panel);

  return sign;
}

function buildBarricadeCluster(episode) {
  const group = new THREE.Group();
  const palette = [episode.environment.red, episode.environment.blue, "#6f7881"];

  for (let index = 0; index < 3; index += 1) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1 + Math.random() * 0.6, 1.2),
      new THREE.MeshStandardMaterial({
        color: palette[index % palette.length],
        roughness: 0.88,
      }),
    );
    block.position.set((index - 1) * 1.4, 0.55, Math.random() * 0.4 - 0.2);
    block.rotation.y = (Math.random() - 0.5) * 0.4;
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);
  }

  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.08, 0.08),
    new THREE.MeshStandardMaterial({
      color: "#f7c948",
      emissive: "#c89418",
      emissiveIntensity: 0.3,
      roughness: 0.5,
    }),
  );
  tape.position.set(0, 1.4, 0);
  group.add(tape);

  return group;
}

function buildDebrisPile() {
  const group = new THREE.Group();

  for (let index = 0; index < 5; index += 1) {
    const chunk = new THREE.Mesh(
      new THREE.BoxGeometry(0.3 + Math.random() * 0.9, 0.16 + Math.random() * 0.4, 0.3 + Math.random() * 0.9),
      new THREE.MeshStandardMaterial({
        color: ["#2b3037", "#4d3527", "#3e4349"][index % 3],
        roughness: 0.94,
      }),
    );
    chunk.position.set((Math.random() - 0.5) * 1.8, chunk.geometry.parameters.height * 0.5, (Math.random() - 0.5) * 1.8);
    chunk.rotation.set(Math.random(), Math.random() * Math.PI, Math.random() * 0.4);
    chunk.castShadow = true;
    chunk.receiveShadow = true;
    group.add(chunk);
  }

  return group;
}

function buildFireBarrel() {
  const group = new THREE.Group();

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.5, 1.1, 14),
    new THREE.MeshStandardMaterial({
      color: "#3b424c",
      roughness: 0.82,
      metalness: 0.24,
    }),
  );
  barrel.position.y = 0.55;
  barrel.castShadow = true;
  barrel.receiveShadow = true;
  group.add(barrel);

  const ember = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 12),
    new THREE.MeshBasicMaterial({
      color: "#ffb15c",
      transparent: true,
      opacity: 0.9,
    }),
  );
  ember.position.y = 1.08;
  ember.scale.y = 0.7;
  group.add(ember);

  const light = new THREE.PointLight("#ff8f4a", 10, 14, 2);
  light.position.set(0, 1.1, 0);
  group.add(light);

  return { group, light };
}

function buildSearchlight(color) {
  const group = new THREE.Group();
  const pivot = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.85, 0.5, 16),
    new THREE.MeshStandardMaterial({
      color: "#2f3741",
      roughness: 0.76,
      metalness: 0.18,
    }),
  );
  base.position.y = 0.25;
  group.add(base);

  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.44, 1.2, 16),
    new THREE.MeshStandardMaterial({
      color: "#74818f",
      roughness: 0.52,
      metalness: 0.35,
    }),
  );
  head.rotation.z = Math.PI * 0.5;
  head.position.set(0, 2.2, 0);
  pivot.add(head);

  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 20, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  beam.position.set(0, 1.8, -9.4);
  beam.rotation.x = Math.PI;
  beam.scale.x = 0.5;
  pivot.add(beam);

  const light = new THREE.SpotLight(color, 8, 90, Math.PI / 7, 0.38, 1);
  light.position.set(0, 2.2, 0);
  const target = new THREE.Object3D();
  target.position.set(0, 1.4, -26);
  pivot.add(target);
  light.target = target;
  pivot.add(light);
  group.add(pivot);

  return { group, pivot, beam, light };
}

function addEpisodeSetDressing(episodeId) {
  if (episodeId === 1) {
    for (let index = 0; index < 3; index += 1) {
      const ambulance = buildWreckedCar(index === 1 ? "#c3d8eb" : "#8c2528");
      ambulance.position.set(index % 2 === 0 ? -11.8 : 11.6, 0.15, -18 - index * 26);
      ambulance.rotation.y = index % 2 === 0 ? 0.28 : -0.34;
      cityRoot.add(ambulance);
    }
    return;
  }

  if (episodeId === 2) {
    for (let index = 0; index < 4; index += 1) {
      const overhang = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 0.22, 1.8),
        new THREE.MeshStandardMaterial({
          color: "#1e242e",
          roughness: 0.8,
        }),
      );
      overhang.position.set(index % 2 === 0 ? -14.6 : 14.6, 4.4 + index * 0.15, 4 - index * 20);
      overhang.rotation.y = index % 2 === 0 ? 0.1 : -0.1;
      cityRoot.add(overhang);
    }
    return;
  }

  for (let index = 0; index < 5; index += 1) {
    const container = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.5, 7.4),
      new THREE.MeshStandardMaterial({
        color: ["#33566e", "#7a3b2f", "#465d63"][index % 3],
        roughness: 0.92,
        metalness: 0.12,
      }),
    );
    container.position.set(index % 2 === 0 ? -14.8 : 14.8, 1.25, -8 - index * 18);
    container.rotation.y = index % 2 === 0 ? 0.04 : -0.05;
    container.castShadow = true;
    container.receiveShadow = true;
    cityRoot.add(container);
  }
}

function buildMoon(episode) {
  const moon = new THREE.Group();

  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 24, 24),
    new THREE.MeshBasicMaterial({
      color: episode.id === 3 ? "#f4efe6" : "#d7e8ff",
    }),
  );
  disc.position.set(24, 28, -82);
  moon.add(disc);

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({
      color: episode.id === 3 ? "#e8f0f6" : "#c7dcff",
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  halo.position.copy(disc.position);
  moon.add(halo);

  return moon;
}

function buildSkyline(episode) {
  const skyline = new THREE.Group();
  const colors = episode.environment.buildingPalette;

  for (let index = 0; index < 14; index += 1) {
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(4 + Math.random() * 7, 12 + Math.random() * 26, 3 + Math.random() * 4),
      new THREE.MeshStandardMaterial({
        color: colors[index % colors.length],
        roughness: 0.92,
      }),
    );
    tower.position.set(-34 + index * 5.4, tower.geometry.parameters.height * 0.5 + 4, -102 - Math.random() * 12);
    skyline.add(tower);
  }

  return skyline;
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

  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 1.05, 0.72),
    new THREE.MeshStandardMaterial({
      color: "#1f262f",
      roughness: 0.82,
    }),
  );
  vest.position.set(0, 1.88, 0.12);
  vest.castShadow = true;
  group.add(vest);

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

  const flashlightCasing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.42, 10),
    new THREE.MeshStandardMaterial({
      color: "#aab5c1",
      metalness: 0.55,
      roughness: 0.35,
    }),
  );
  flashlightCasing.rotation.x = Math.PI * 0.5;
  flashlightCasing.position.set(0.02, -0.22, 0.76);
  gun.add(flashlightCasing);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.2, -0.1, 1.5);
  arms.add(muzzle);

  const muzzleLight = new THREE.PointLight("#ffd089", 0, 10, 2);
  muzzleLight.position.set(0.2, -0.1, 1.5);
  muzzleLight.visible = false;
  arms.add(muzzleLight);

  const flashlight = new THREE.SpotLight("#d7ecff", 8, 58, Math.PI / 8, 0.45, 1);
  flashlight.position.set(0.12, -0.06, 1.18);
  flashlight.castShadow = false;
  gun.add(flashlight);

  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 1.8, -32);
  scene.add(flashlightTarget);
  flashlight.target = flashlightTarget;

  return { group, arms, gun, muzzle, muzzleLight, flashlight, flashlightTarget };
}

function spawnZombie() {
  const laneIndex = Math.floor(Math.random() * laneCount);
  const type =
    gameState.wave === 3 && !gameState.bossSpawnedThisWave && gameState.waveSpawned >= gameState.waveSpawnTotal - 1
      ? "alpha"
      : pickZombieType();
  const zombie = buildZombie(type);

  zombie.group.position.set(lanePositions[laneIndex], 0, -58 - Math.random() * 28);
  zombie.userData.baseX = lanePositions[laneIndex];
  zombie.userData.phase = Math.random() * Math.PI * 2;
  zombie.userData.swaySpeed = 1.8 + Math.random() * 1.4;
  zombie.userData.swayAmplitude = type === "runner" ? 0.18 : type === "alpha" ? 0.04 : 0.08;
  zombie.userData.laneIndex = laneIndex;
  scene.add(zombie.group);
  zombies.push(zombie);

  if (type === "alpha") {
    gameState.bossSpawnedThisWave = true;
    radioTitleElement.textContent = "Acil Yayin";
    radioTextElement.textContent = "Buyuk hedef goruldu. Hattı bozma, mermiyi sakla.";
    pushStatus("Alfa zombi hatta girdi.");
  }
}

function pickZombieType() {
  const roll = Math.random();
  if (gameState.wave >= 3 && roll > 0.9) {
    return "spitter";
  }
  if (gameState.wave >= 4 && roll > 0.82) {
    return "brute";
  }
  if (gameState.wave >= 2 && roll > 0.66) {
    return "crawler";
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
    crawler: { skin: "#86a57f", shirt: "#4f5946", pants: "#2e2a2c", speed: 5.8, damage: 14, health: 1, score: 150 },
    spitter: { skin: "#7ca46a", shirt: "#3a4e3d", pants: "#262b2f", speed: 4.3, damage: 18, health: 2, score: 220 },
    brute: { skin: "#89a078", shirt: "#4d4d59", pants: "#2a2327", speed: 4.1, damage: 24, health: 3, score: 260 },
    alpha: { skin: "#9cb17d", shirt: "#2f2a31", pants: "#201c20", speed: 3.8, damage: 34, health: 8, score: 640 },
  }[type];

  const bodyScale =
    type === "alpha" ? 1.65 : type === "brute" ? 1.25 : type === "runner" ? 0.92 : type === "crawler" ? 0.78 : 1;
  const isCrawler = type === "crawler";
  const torsoHeight = isCrawler ? 0.9 : 1.5 * bodyScale;
  const torsoY = isCrawler ? 1.12 : 1.85 * bodyScale;
  const headY = isCrawler ? 1.58 : 2.95 * bodyScale;
  const armsY = isCrawler ? 1.28 : 2.1 * bodyScale;

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(1 * bodyScale, isCrawler ? 0.6 : 1.2 * bodyScale, 0.7 * bodyScale),
    new THREE.MeshStandardMaterial({ color: palette.pants, roughness: 0.88 }),
  );
  legs.position.y = isCrawler ? 0.32 : 0.6 * bodyScale;
  legs.castShadow = true;
  group.add(legs);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(1.2 * bodyScale, torsoHeight, 0.8 * bodyScale),
    new THREE.MeshStandardMaterial({ color: palette.shirt, roughness: 0.82 }),
  );
  torso.position.y = torsoY;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38 * bodyScale, 14, 14),
    new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.7 }),
  );
  head.position.y = headY;
  head.castShadow = true;
  group.add(head);

  if (type === "spitter" || type === "alpha") {
    for (const x of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 * bodyScale, 10, 10),
        new THREE.MeshStandardMaterial({
          color: type === "alpha" ? "#ff6f61" : "#9dff7a",
          emissive: type === "alpha" ? "#ff3b2f" : "#7ff54c",
          emissiveIntensity: 1.4,
        }),
      );
      eye.position.set(x, headY + 0.02, 0.3 * bodyScale);
      group.add(eye);
    }
  }

  const arms = new THREE.Group();
  arms.position.set(0, armsY, isCrawler ? 0.65 : 0.3);
  group.add(arms);

  for (const x of [-0.75, 0.75]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.28 * bodyScale, (isCrawler ? 1.1 : 1.25) * bodyScale, 0.28 * bodyScale),
      new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.74 }),
    );
    arm.position.set(x * bodyScale, 0, 0);
    arm.rotation.z = x < 0 ? 0.45 : -0.45;
    arm.rotation.x = isCrawler ? 1.18 : 0.5;
    arms.add(arm);
  }

  group.position.y = isCrawler ? 0.02 : 0.04;
  group.rotation.x = isCrawler ? -0.26 : 0;

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
      attackCooldown: type === "spitter" ? 0.9 + Math.random() * 0.8 : 0,
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
  gameState.shakeTimer = 0.12;
  gameState.shakeStrength = gameState.furyActive ? 0.28 : 0.18;

  const origin = new THREE.Vector3();
  player.muzzle.getWorldPosition(origin);

  const laneX = player.group.position.x;
  const targets = zombies
    .filter((zombie) => Math.abs(zombie.group.position.x - laneX) < 1.3 && zombie.group.position.z < player.group.position.z)
    .sort((left, right) => right.group.position.z - left.group.position.z);

  const hitCount = gameState.furyActive ? Math.min(2, targets.length) : Math.min(1, targets.length);
  const endZ = targets[0] ? targets[0].group.position.z : -64;
  spawnTracer(origin, endZ);
  flashMuzzle();

  for (let i = 0; i < hitCount; i += 1) {
    const isHeadshot = targets[i] && targets[i].group.position.z > -24;
    hitZombie(targets[i], gameState.furyActive ? 2 : 1, isHeadshot);
  }

  playSound("shoot");
  if (gameState.ammo === 0 && gameState.reserveAmmo > 0) {
    pushStatus("Sarjor bitti. Reload zamani.");
  }
}

function spawnEnemyProjectile(zombie) {
  const projectile = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 14, 14),
    new THREE.MeshBasicMaterial({
      color: "#9dff7a",
      transparent: true,
      opacity: 0.52,
    }),
  );
  projectile.position.copy(zombie.group.position);
  projectile.position.y += zombie.userData.type === "crawler" ? 1 : 1.9;

  const target = new THREE.Vector3(player.group.position.x, 1.4, player.group.position.z);
  const velocity = target.sub(projectile.position).normalize().multiplyScalar(12);
  projectile.userData = {
    velocity,
    damage: zombie.userData.damage,
    phase: Math.random() * Math.PI * 2,
  };
  enemyProjectiles.push(projectile);
  scene.add(projectile);
  playSound("acid");
}

function hitZombie(zombie, damage, headshot = false) {
  zombie.userData.health -= damage;
  spawnImpact(zombie.group.position, "#9dff7a", 7);
  playSound("hit");

  if (headshot) {
    zombie.userData.health -= 1;
    gameState.score += 45;
    showHitText("HEADSHOT");
  }

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
  gameState.furyCharge = Math.min(
    1,
    gameState.furyCharge +
      (zombie.userData.type === "alpha" ? 0.45 : zombie.userData.type === "brute" ? 0.28 : 0.14),
  );
  gameState.score += Math.round(zombie.userData.score * (gameState.furyActive ? 1.5 : 1));

  if (!gameState.missionComplete && gameState.kills >= 20 && gameState.wave >= 3) {
    gameState.missionComplete = true;
    missionStatusElement.textContent = "Bolum gorevi tamamlandi.";
    playSound("mission");
  }

  maybeSpawnPickup(zombie.group.position);
  showHitText(zombie.userData.type === "alpha" ? "BOSS DOWN" : zombie.userData.type === "spitter" ? "PURGE" : "KILL");
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
  gameState.damageFlashTimer = 0.18;
  gameState.shakeTimer = 0.2;
  gameState.shakeStrength = 0.36;
  damageFlashElement.classList.add("is-active");

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
  gameState.bossSpawnedThisWave = false;
  pushStatus(`Dalga ${gameState.wave}. ${getCurrentEpisode().city} daha da karardi.`);
  showChapterBanner(
    `Wave ${String(gameState.wave).padStart(2, "0")}`,
    getCurrentEpisode().city,
    getWaveRadioLine(),
    2.6,
  );
  radioTitleElement.textContent = "Saha Telsizi";
  radioTextElement.textContent = getWaveRadioLine();
  playSound("wave");
}

function advanceEpisode() {
  if (gameState.episodeIndex >= EPISODES.length - 1) {
    pushStatus("Son tahliye hattini da gectin. Sezon finali.");
    gameState.score += 1200;
    endGame();
    return;
  }

  gameState.episodeIndex += 1;
  gameState.wave = 1;
  gameState.waveSpawnTotal = 9 + gameState.episodeIndex * 2;
  gameState.waveSpawned = 0;
  gameState.waveKills = 0;
  gameState.spawnTimer = 1.6;
  gameState.spawnInterval = Math.max(0.52, 1.18 - gameState.episodeIndex * 0.08);
  gameState.reserveAmmo += 18;
  gameState.health = Math.min(100, gameState.health + 16);
  gameState.missionComplete = false;
  gameState.bossSpawnedThisWave = false;
  clearEntities();
  buildCity();
  updateEpisodeUi();
  pushStatus(`${getCurrentEpisode().city} bolumune gecildi.`);
  showChapterBanner(
    `Episode ${getCurrentEpisode().code}`,
    getCurrentEpisode().city,
    getCurrentEpisode().blurb,
    3.2,
  );
  radioTitleElement.textContent = getCurrentEpisode().radioTitle;
  radioTextElement.textContent = getCurrentEpisode().radioText;
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
  gameState.episodeIndex = 0;
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
  gameState.bossSpawnedThisWave = false;
  gameState.damageFlashTimer = 0;
  gameState.hitTextTimer = 0;
  gameState.muzzleFlashTimer = 0;
  gameState.chapterTimer = 0;
  gameState.subtitleTimer = 0;

  player.group.position.x = 0;
  player.group.rotation.z = 0;

  buildCity();
  updateEpisodeUi();
  missionStatusElement.textContent = "Gorev aktif.";
  overlayElement.classList.add("is-hidden");
  hudBottomElement.classList.add("is-hidden");
  radioTitleElement.textContent = getCurrentEpisode().radioTitle;
  radioTextElement.textContent = getCurrentEpisode().radioText;
  pushStatus(`${getCurrentEpisode().city} karanligina girdin. Ilk dalga geliyor.`);
  showChapterBanner(
    `Episode ${getCurrentEpisode().code}`,
    getCurrentEpisode().city,
    getCurrentEpisode().blurb,
    3.2,
  );
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

  while (pickups.length > 0) {
    const pickup = pickups.pop();
    scene.remove(pickup.group);
  }

  while (enemyProjectiles.length > 0) {
    scene.remove(enemyProjectiles.pop());
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
      `${getCurrentEpisode().city} seferi basliyor. ${getCurrentEpisode().blurb}`;
    overlayButtonElement.textContent = gameState.started ? "Yeni Avi Baslat" : "Avi Baslat";
  }

  if (mode === "gameover") {
    overlayTextElement.textContent =
      `Av bitti. ${gameState.kills} zombi indirdin, ${getCurrentEpisode().city} bolumunde ${gameState.wave}. dalgaya ulastin ve ${formatNumber(gameState.score)} puan topladin.`;
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
  episodeElement.textContent = `${getCurrentEpisode().code}`;
  cityElement.textContent = getCurrentEpisode().city;
}

function flashMuzzle() {
  gameState.muzzleFlashTimer = 0.08;
  player.muzzleLight.visible = true;
  player.muzzleLight.intensity = gameState.furyActive ? 18 : 12;

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 10),
    new THREE.MeshBasicMaterial({
      color: gameState.furyActive ? "#ffb15c" : "#ffd089",
      transparent: true,
      opacity: 0.9,
    }),
  );
  const worldPosition = new THREE.Vector3();
  player.muzzle.getWorldPosition(worldPosition);
  flash.position.copy(worldPosition);
  flash.userData = { type: "particle", life: 0.08, velocity: new THREE.Vector3(0, 0, 0) };
  effects.push(flash);
  scene.add(flash);
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

function maybeSpawnPickup(position) {
  const roll = Math.random();
  if (roll > 0.34) {
    return;
  }

  const type = roll < 0.12 ? "ammo" : roll < 0.24 ? "medkit" : "adrenaline";
  const group = buildPickup(type);
  group.position.set(position.x, 0.6, position.z);
  scene.add(group);
  pickups.push({
    group,
    userData: {
      type,
      phase: Math.random() * Math.PI * 2,
    },
  });
}

function buildPickup(type) {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.32, 0.9),
    new THREE.MeshStandardMaterial({
      color: type === "ammo" ? "#38495b" : type === "medkit" ? "#4b2d2d" : "#43324d",
      roughness: 0.84,
    }),
  );
  group.add(base);

  const icon = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.18, 0.18),
    new THREE.MeshStandardMaterial({
      color: type === "ammo" ? "#52d2ff" : type === "medkit" ? "#ff6f61" : "#bb7cff",
      emissive: type === "ammo" ? "#2da9d8" : type === "medkit" ? "#d63d36" : "#8f47ff",
      emissiveIntensity: 1,
      roughness: 0.4,
    }),
  );
  icon.position.y = 0.28;
  group.add(icon);

  if (type === "medkit") {
    const crossBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.46, 0.18),
      icon.material.clone(),
    );
    crossBar.position.y = 0.28;
    group.add(crossBar);
  }

  if (type === "adrenaline") {
    const vial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.42, 10),
      new THREE.MeshStandardMaterial({
        color: "#efe6ff",
        emissive: "#c38eff",
        emissiveIntensity: 0.8,
        roughness: 0.18,
      }),
    );
    vial.position.set(0, 0.28, 0);
    group.add(vial);
  }

  return group;
}

function collectPickup(pickup) {
  if (pickup.userData.type === "ammo") {
    gameState.reserveAmmo += 10;
    pushStatus("Mermi kutusu toplandi.");
    showHitText("AMMO");
  } else if (pickup.userData.type === "medkit") {
    gameState.health = Math.min(100, gameState.health + 22);
    pushStatus("Saglik kiti bulundu.");
    showHitText("HEAL");
  } else {
    gameState.furyCharge = Math.min(1, gameState.furyCharge + 0.42);
    pushStatus("Adrenalin enjekte edildi.");
    showHitText("FURY");
  }

  playSound("pickup");
  spawnImpact(
    pickup.group.position,
    pickup.userData.type === "ammo" ? "#52d2ff" : pickup.userData.type === "medkit" ? "#ff6f61" : "#bb7cff",
    8,
  );
  scene.remove(pickup.group);
  pickups.splice(pickups.indexOf(pickup), 1);
}

function showHitText(text) {
  hitTextElement.textContent = text;
  gameState.hitTextTimer = 0.32;
  hitTextElement.classList.add("is-active");
}

function showChapterBanner(eyebrow, title, text, duration = 2.8) {
  chapterEyebrowElement.textContent = eyebrow;
  chapterTitleElement.textContent = title;
  chapterTextElement.textContent = text;
  gameState.chapterTimer = duration;
  chapterBannerElement.classList.add("is-active");
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
  subtitleStripElement.textContent = message;
  gameState.subtitleTimer = 2.4;
  subtitleStripElement.classList.add("is-active");
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
    pickup: [
      { time: 0, frequency: 540, duration: 0.05, gain: 0.03, type: "triangle" },
      { time: 0.05, frequency: 720, duration: 0.08, gain: 0.025, type: "triangle" },
    ],
    acid: [
      { time: 0, frequency: 260, duration: 0.08, gain: 0.03, type: "sawtooth" },
      { time: 0.04, frequency: 180, duration: 0.1, gain: 0.025, type: "triangle" },
    ],
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

function updateEpisodeUi() {
  const episode = getCurrentEpisode();
  missionElement.textContent = episode.mission;
  missionStatusElement.textContent = gameState.missionComplete ? "Bolum gorevi tamamlandi." : "Gorev aktif.";
  radioTitleElement.textContent = episode.radioTitle;
  radioTextElement.textContent = episode.radioText;
  episodeTitleElement.textContent = `${episode.code}. ${episode.title}`;
  episodeBlurbElement.textContent = episode.blurb;
}

function getCurrentEpisode() {
  return EPISODES[gameState.episodeIndex];
}

function getWaveRadioLine() {
  const episode = getCurrentEpisode();
  const lines = [
    `${episode.city} kuzey aksinda hareket var. Daha hizli geliyorlar.`,
    `Telsiz kirik ama sesler net: sokak baskisi artiyor.`,
    `Suru dagilmiyor. Her yeni dalga daha da koordineli.`,
  ];
  return lines[(gameState.wave - 1) % lines.length];
}

function buildWeather(episodeId) {
  weatherGroup.clear();
  const color = episodeId === 1 ? "#6c7a8a" : episodeId === 2 ? "#8ca1b6" : "#d8e0ea";
  const speed = episodeId === 1 ? 9 : episodeId === 2 ? 12 : 6;
  const count = episodeId === 3 ? 70 : 52;

  for (let i = 0; i < count; i += 1) {
    const particle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, episodeId === 3 ? 0.04 : 0.3, 0.04),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: episodeId === 3 ? 0.28 : 0.22,
      }),
    );
    particle.position.set(
      (Math.random() - 0.5) * 40,
      4 + Math.random() * 14,
      -80 + Math.random() * 120,
    );
    particle.userData.speed = speed + Math.random() * 4;
    particle.userData.drift = (Math.random() - 0.5) * 0.6;
    weatherGroup.add(particle);
  }
}

function updateWeather(delta) {
  for (const particle of weatherGroup.children) {
    particle.position.z += particle.userData.speed * delta;
    particle.position.x += particle.userData.drift * delta;
    particle.position.y -= delta * 0.2;

    if (particle.position.z > 28 || particle.position.y < -1) {
      particle.position.z = -96 - Math.random() * 24;
      particle.position.x = (Math.random() - 0.5) * 40;
      particle.position.y = 6 + Math.random() * 14;
    }
  }
}
