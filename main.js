import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/* =========================================================
   CÓDIGO ROJO: BARRIO TOMADO — MAIN.JS FINAL LIMPIO
   Sin duplicados de renderer/scene/camera.
   Compatible con tu index.html v1.5.
========================================================= */

/* =========================
   VARIABLES GLOBALES
========================= */
let scene, camera, renderer, player, gun;
let keys = {};

let bots = [];
let bullets = [];
let grenadesLive = [];
let particles = [];
let colliders = [];
let mapObjects = [];
let objectives = [];

let yaw = 0;
let pitch = 0;
let velocityY = 0;
let canJump = true;

let hp = 100;
let shield = 50;
let kills = 0;
let streak = 0;
let maxStreak = 0;
let mission = 1;
let missionKills = 0;
let missionTimer = 0;
let grenades = 2;

let started = false;
let paused = false;
let playerDead = false;
let reloading = false;
let shooting = false;

let abilityReady = true;
let abilityActive = false;
let abilityCooldown = 0;
let abilityTimer = 0;

let currentWeapon = "rifle";
let lastShot = 0;
let recoil = 0;
let cameraShake = 0;
let bossRef = null;

let stamina = 100;
let sliding = false;
let slideTimer = 0;
let slideDir = new THREE.Vector3();
let cameraTilt = 0;
let headBob = 0;

let audioCtx = null;
let masterVolume = 0.6;
let sensitivity = 1;
let quality = "high";
let stepTimer = 0;

let mobileLook = false;
let lastTouchX = 0;
let lastTouchY = 0;
let joystickActive = false;
let joystickX = 0;
let joystickY = 0;

const MAP_SIZE = 280;
const MAP_HALF = MAP_SIZE / 2;

/* =========================
   ARMAS
========================= */
const weapons = {
  pistol: {
    name: "P9 Compact",
    damage: 34,
    mag: 12,
    ammo: 12,
    reserve: 48,
    rate: 330,
    spread: 0.022,
    reload: 850,
    auto: false,
    recoil: 0.04,
    pellets: 1
  },
  rifle: {
    name: "Rifle R-21",
    damage: 29,
    mag: 30,
    ammo: 30,
    reserve: 90,
    rate: 115,
    spread: 0.018,
    reload: 1300,
    auto: true,
    recoil: 0.035,
    pellets: 1
  },
  shotgun: {
    name: "Trueno 12",
    damage: 18,
    mag: 6,
    ammo: 6,
    reserve: 24,
    rate: 650,
    spread: 0.115,
    reload: 1500,
    auto: false,
    recoil: 0.09,
    pellets: 8
  },
  sniper: {
    name: "Halcón M1",
    damage: 100,
    mag: 5,
    ammo: 5,
    reserve: 20,
    rate: 900,
    spread: 0.004,
    reload: 1900,
    auto: false,
    recoil: 0.12,
    pellets: 1
  }
};

/* =========================
   DOM SEGURO
========================= */
const $ = (id) => document.getElementById(id);

const menu = $("menu");
const playBtn = $("playBtn");
const settingsBtn = $("settingsBtn");
const settingsPanel = $("settingsPanel");
const closeSettings = $("closeSettings");
const sensInput = $("sensInput");
const volumeInput = $("volumeInput");
const qualityInput = $("qualityInput");

const hpText = $("hp");
const shieldText = $("shield");
const weaponText = $("weapon");
const ammoText = $("ammo");
const reserveText = $("reserve");
const killsText = $("kills");
const streakText = $("streak");
const missionNumberText = $("missionNumber");
const grenadesText = $("grenades");
const abilityText = $("ability");
const staminaText = $("stamina");

const message = $("message");
const damageScreen = $("damage");
const hitmarker = $("hitmarker");
const killFeed = $("killFeed");

const bossBar = $("bossBar");
const bossHpFill = $("bossHpFill");
const bossState = $("bossState");

const minimap = $("minimap");
const miniCtx = minimap ? minimap.getContext("2d") : null;

const scoreboard = $("scoreboard");
const finalKills = $("finalKills");
const finalRank = $("finalRank");
const finalAccuracy = $("finalAccuracy");
const finalStreak = $("finalStreak");
const scoreRestart = $("scoreRestart");

const joystick = $("joystick");
const stick = $("stick");
const shootBtn = $("shootBtn");
const jumpBtn = $("jumpBtn");
const reloadBtn = $("reloadBtn");

/* =========================
   EVENTOS UI
========================= */
if (playBtn) {
  playBtn.onclick = () => {
    initAudio();

    if (menu) menu.style.display = "none";

    started = true;
    paused = false;

    resetStory();

    if (document.body.requestPointerLock) {
      document.body.requestPointerLock();
    }
  };
}

if (settingsBtn && settingsPanel) {
  settingsBtn.onclick = () => {
    settingsPanel.style.display = "flex";
  };
}

if (closeSettings && settingsPanel) {
  closeSettings.onclick = () => {
    settingsPanel.style.display = "none";
  };
}

if (scoreRestart && scoreboard) {
  scoreRestart.onclick = () => {
    scoreboard.style.display = "none";
    started = true;
    paused = false;
    resetStory();

    if (document.body.requestPointerLock) {
      document.body.requestPointerLock();
    }
  };
}

if (sensInput) {
  sensInput.oninput = () => {
    sensitivity = Number(sensInput.value);
    localStorage.setItem("cr_sensitivity", String(sensitivity));
  };
}

if (volumeInput) {
  volumeInput.oninput = () => {
    masterVolume = Number(volumeInput.value);
    localStorage.setItem("cr_volume", String(masterVolume));
  };
}

if (qualityInput) {
  qualityInput.onchange = () => {
    quality = qualityInput.value;
    localStorage.setItem("cr_quality", quality);
    applyQuality();
  };
}

/* =========================
   INICIALIZACIÓN
========================= */
init();
setupMobile();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8aa0ad);
  scene.fog = new THREE.Fog(0x8aa0ad, 120, 330);

  camera = new THREE.PerspectiveCamera(
    75,
    innerWidth / innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = false;

  document.body.appendChild(renderer.domElement);

  player = new THREE.Object3D();
  scene.add(player);
  scene.add(camera);

  loadSettings();
  buildMap();
  createGun();
  bindGameEvents();
  animate();
}

function bindGameEvents() {
  document.addEventListener("keydown", (e) => {
    keys[e.code] = true;

    if (e.code === "Escape" && started) togglePause();

    if (!started || paused) return;

    if (e.code === "KeyR") reload();
    if (e.code === "KeyQ") useAbility();
    if (e.code === "KeyG") throwGrenade();

    if (e.code === "Digit1") switchWeapon("pistol");
    if (e.code === "Digit2") switchWeapon("rifle");
    if (e.code === "Digit3") switchWeapon("shotgun");
    if (e.code === "Digit4") switchWeapon("sniper");

    if (e.code === "Space" && canJump && !playerDead) {
      velocityY = 0.39;
      cameraShake += 0.025;
      canJump = false;
    }

    if (
      e.code === "KeyC" &&
      !playerDead &&
      !sliding &&
      keys.ShiftLeft &&
      stamina > 20
    ) {
      startSlide();
    }
  });

  document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  document.addEventListener("mousemove", (e) => {
    if (!started || paused || playerDead) return;

    yaw -= e.movementX * 0.002 * sensitivity;
    pitch -= e.movementY * 0.002 * sensitivity;
    pitch = Math.max(-1.15, Math.min(0.85, pitch));
  });

  document.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      shooting = true;
      shoot();
    }
  });

  document.addEventListener("mouseup", () => {
    shooting = false;
  });

  document.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("resize", resize);
}

/* =========================
   SETTINGS
========================= */
function loadSettings() {
  sensitivity = Number(localStorage.getItem("cr_sensitivity")) || 1;
  masterVolume = Number(localStorage.getItem("cr_volume")) || 0.6;
  quality = localStorage.getItem("cr_quality") || "high";

  if (sensInput) sensInput.value = String(sensitivity);
  if (volumeInput) volumeInput.value = String(masterVolume);
  if (qualityInput) qualityInput.value = quality;

  applyQuality();
}

function applyQuality() {
  if (!renderer || !scene) return;

  if (quality === "low") {
    renderer.setPixelRatio(1);
    scene.fog = new THREE.Fog(0x8aa0ad, 80, 230);
  } else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    scene.fog = new THREE.Fog(0x8aa0ad, 120, 330);
  }
}

/* =========================
   AUDIO
========================= */
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!audioCtx || masterVolume <= 0) return;

  const now = audioCtx.currentTime;

  function tone(freq, endFreq, duration, gainValue, wave = "square") {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, gainValue * masterVolume),
      now + 0.01
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  if (type === "shot") {
    tone(220, 45, 0.09, 0.11, "square");
    tone(90, 35, 0.14, 0.06, "sawtooth");
  }

  if (type === "hit") tone(620, 410, 0.08, 0.07, "triangle");

  if (type === "headshot") {
    tone(980, 380, 0.14, 0.1, "sine");
    tone(520, 260, 0.16, 0.06, "triangle");
  }

  if (type === "explosion") {
    tone(95, 22, 0.32, 0.16, "sawtooth");
    tone(55, 18, 0.42, 0.12, "square");
  }

  if (type === "ability") tone(380, 820, 0.18, 0.08, "sine");

  if (type === "reload") {
    tone(180, 260, 0.08, 0.05, "triangle");
    setTimeout(() => tone(260, 180, 0.08, 0.04, "triangle"), 90);
  }

  if (type === "step") tone(80, 55, 0.045, 0.025, "sine");
  if (type === "slide") tone(130, 45, 0.18, 0.07, "sawtooth");
}

/* =========================
   RESET / PAUSA
========================= */
function togglePause() {
  paused = !paused;

  if (paused) {
    if (document.exitPointerLock) document.exitPointerLock();
    showMessage("PAUSA");
  } else {
    if (document.body.requestPointerLock) document.body.requestPointerLock();
  }
}

function resetStory() {
  hp = 100;
  shield = 50;
  kills = 0;
  streak = 0;
  maxStreak = 0;
  mission = 1;
  missionKills = 0;
  grenades = 2;
  currentWeapon = "rifle";
  playerDead = false;
  paused = false;
  stamina = 100;
  sliding = false;
  bossRef = null;

  if (scoreboard) scoreboard.style.display = "none";
  if (bossBar) bossBar.style.display = "none";

  resetWeapons();
  buildMap();
  startMission(1);
}

function resetWeapons() {
  weapons.pistol.ammo = 12;
  weapons.pistol.reserve = 48;
  weapons.rifle.ammo = 30;
  weapons.rifle.reserve = 90;
  weapons.shotgun.ammo = 6;
  weapons.shotgun.reserve = 24;
  weapons.sniper.ammo = 5;
  weapons.sniper.reserve = 20;
}

/* =========================
   MAPA
========================= */
function clearWorld() {
  mapObjects.forEach((o) => scene.remove(o));
  bots.forEach((b) => scene.remove(b));
  bullets.forEach((b) => scene.remove(b));
  grenadesLive.forEach((g) => scene.remove(g));
  particles.forEach((p) => scene.remove(p));
  objectives.forEach((o) => scene.remove(o));

  mapObjects = [];
  bots = [];
  bullets = [];
  grenadesLive = [];
  particles = [];
  objectives = [];
  colliders = [];
  bossRef = null;

  if (bossBar) bossBar.style.display = "none";
}

function addMapObj(obj) {
  scene.add(obj);
  mapObjects.push(obj);
  return obj;
}

function buildMap() {
  clearWorld();

  scene.background = new THREE.Color(0x8aa0ad);
  scene.fog = new THREE.Fog(0x8aa0ad, 120, 330);

  addMapObj(new THREE.AmbientLight(0xffffff, 0.78));

  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(70, 120, 50);
  addMapObj(sun);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.95
  });
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x252525,
    roughness: 0.9
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x202020,
    roughness: 0.8
  });
  const houseMat1 = new THREE.MeshStandardMaterial({
    color: 0x8c6f5a,
    roughness: 0.85
  });
  const houseMat2 = new THREE.MeshStandardMaterial({
    color: 0x7a3f3f,
    roughness: 0.85
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x3b1118,
    roughness: 0.8
  });
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x6b4526,
    roughness: 0.85
  });
  const redMat = new THREE.MeshStandardMaterial({
    color: 0x9b1025,
    roughness: 0.75
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE), floorMat);
  floor.rotation.x = -Math.PI / 2;
  addMapObj(floor);

  box(0, 4, -MAP_HALF, MAP_SIZE, 8, 2, wallMat);
  box(0, 4, MAP_HALF, MAP_SIZE, 8, 2, wallMat);
  box(-MAP_HALF, 4, 0, 2, 8, MAP_SIZE, wallMat);
  box(MAP_HALF, 4, 0, 2, 8, MAP_SIZE, wallMat);

  box(0, 0.05, 0, 28, 0.1, MAP_SIZE - 10, roadMat, false);
  box(0, 0.06, 0, MAP_SIZE - 10, 0.1, 26, roadMat, false);
  box(-72, 0.07, 0, 18, 0.1, MAP_SIZE - 45, roadMat, false);
  box(72, 0.07, 0, 18, 0.1, MAP_SIZE - 45, roadMat, false);

  const houses = [
    [-110, -100], [-80, -105], [-42, -108], [42, -108], [82, -104], [112, -95],
    [-112, -42], [-86, -18], [-45, -45], [45, -42], [86, -18], [112, -42],
    [-112, 42], [-82, 18], [-45, 45], [45, 42], [82, 18], [112, 42],
    [-110, 100], [-78, 105], [-42, 108], [42, 108], [82, 104], [112, 95]
  ];

  houses.forEach((h, i) => {
    createHouse(
      h[0],
      h[1],
      20 + Math.random() * 6,
      18 + Math.random() * 5,
      12 + Math.random() * 4,
      i % 2 ? houseMat1 : houseMat2,
      roofMat
    );
  });

  box(0, 1.3, -36, 52, 2.6, 2, redMat);
  box(0, 1.3, 36, 52, 2.6, 2, redMat);
  box(-36, 1.3, 0, 2, 2.6, 52, redMat);
  box(36, 1.3, 0, 2, 2.6, 52, redMat);

  for (let i = 0; i < 46; i++) {
    box(
      Math.random() * 235 - 117,
      1,
      Math.random() * 235 - 117,
      2.5 + Math.random() * 2.5,
      2,
      2.5 + Math.random() * 2.5,
      crateMat
    );
  }

  const carPlaces = [
    [-10, -90], [12, -72], [-7, -52], [9, -20],
    [-12, 20], [12, 48], [-8, 85], [-90, -8],
    [-65, 10], [-75, 58], [-85, -55], [90, 8],
    [65, -12], [75, -58], [85, 55], [-25, 5],
    [28, -7], [5, 72], [-5, -72]
  ];

  carPlaces.forEach((c, i) => createAbandonedCar(c[0], c[1], i));
}

function box(x, y, z, w, h, d, mat, solid = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  addMapObj(mesh);

  if (solid) {
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2
    });
  }

  return mesh;
}

function createHouse(x, z, w, d, h, wallMat, roofMat) {
  box(x, h / 2, z, w, h, d, wallMat);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(w, d) * 0.72, 5, 4),
    roofMat
  );
  roof.position.set(x, h + 2.5, z);
  roof.rotation.y = Math.PI / 4;
  addMapObj(roof);

  const doorMat = new THREE.MeshStandardMaterial({ color: 0x1b0d08 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x22384a });

  box(x, 2.1, z + d / 2 + 0.06, 3, 4.2, 0.12, doorMat, false);
  box(x - w * 0.25, 4.8, z + d / 2 + 0.08, 3.3, 2, 0.12, windowMat, false);
  box(x + w * 0.25, 4.8, z + d / 2 + 0.08, 3.3, 2, 0.12, windowMat, false);
}

function createAbandonedCar(x, z, i) {
  const carMat = new THREE.MeshStandardMaterial({
    color: i % 3 === 0 ? 0x2a3245 : i % 3 === 1 ? 0x6b1824 : 0x4a4a3a,
    roughness: 0.75,
    metalness: 0.15
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111820,
    roughness: 0.35
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x050505 });

  const car = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.05, 2.6), carMat);
  base.position.y = 0.75;

  const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.95, 2), glassMat);
  top.position.y = 1.55;

  car.add(base, top);

  for (const sx of [-2.1, 2.1]) {
    for (const sz of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12),
        dark
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx, 0.35, sz);
      car.add(wheel);
    }
  }

  car.position.set(x, 0, z);
  car.rotation.y = Math.random() * Math.PI;
  addMapObj(car);

  colliders.push({
    minX: x - 3.5,
    maxX: x + 3.5,
    minZ: z - 2.2,
    maxZ: z + 2.2
  });
}

/* =========================
   MISIONES
========================= */
function startMission(n) {
  mission = n;
  missionKills = 0;
  missionTimer = 0;
  playerDead = false;
  bossRef = null;

  if (bossBar) bossBar.style.display = "none";

  bots.forEach((b) => scene.remove(b));
  bullets.forEach((b) => scene.remove(b));
  grenadesLive.forEach((g) => scene.remove(g));
  objectives.forEach((o) => scene.remove(o));

  bots = [];
  bullets = [];
  grenadesLive = [];
  objectives = [];

  hp = Math.min(100, hp + 35);
  shield = Math.min(50, shield + 25);
  grenades = Math.min(4, grenades + 1);

  player.position.set(0, 2, 118);
  yaw = 0;
  pitch = 0;
  velocityY = 0;
  canJump = true;
  sliding = false;
  stamina = 100;

  if (mission === 1) {
    spawnEnemies(5, -70);
    createObjectiveZone(0, -95, "ENTRADA");
    setMissionUI("Misión 1", "Entrá al barrio y eliminá a los primeros enemigos.", "Eliminá 5 enemigos");
  }

  if (mission === 2) {
    spawnEnemies(9, -30);
    setMissionUI("Misión 2", "Limpiá la zona central.", "Eliminá 9 enemigos");
  }

  if (mission === 3) {
    spawnEnemies(8, -40);
    createRescueNPC(-85, 38);
    setMissionUI("Misión 3", "Rescatá al aliado atrapado.", "Llegá hasta el aliado");
  }

  if (mission === 4) {
    missionTimer = 60 * 60;
    spawnEnemies(6, -20);
    setMissionUI("Misión 4", "Sobreviví mientras llegan refuerzos.", "Sobreviví 60 segundos");
  }

  if (mission === 5) {
    spawnEnemies(10, -10);
    createObjectiveZone(0, 125, "ESCAPE");
    setMissionUI("Misión 5", "Cruzá el barrio hasta el escape.", "Llegá al punto de escape");
  }

  if (mission === 6) {
    spawnEnemies(8, -40);
    spawnBoss();
    setMissionUI("Misión 6", "Derrotá al jefe del barrio.", "Derrotá al jefe");
  }

  showMessage(`MISIÓN ${mission}`);
  createGun();
  updateHud();
}

function setMissionUI(title, text, progress) {
  const missionTitle = $("missionTitle");
  const missionText = $("missionText");
  const missionProgress = $("missionProgress");

  if (missionTitle) missionTitle.textContent = title;
  if (missionText) missionText.textContent = text;
  if (missionProgress) missionProgress.textContent = progress;
  if (missionNumberText) missionNumberText.textContent = String(mission);
}

function createObjectiveZone(x, z, label) {
  const zone = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 0.25, 24),
    new THREE.MeshBasicMaterial({
      color: 0xff1744,
      transparent: true,
      opacity: 0.35
    })
  );

  zone.position.set(x, 0.15, z);
  zone.kind = label;
  scene.add(zone);
  objectives.push(zone);
}

function createRescueNPC(x, z) {
  const npc = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({ color: 0x00aaff });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.45), mat);
  body.position.y = 1.1;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), mat);
  head.position.y = 1.95;

  npc.add(body, head);
  npc.position.set(x, 0, z);
  npc.kind = "rescue";

  scene.add(npc);
  objectives.push(npc);
}

function updateMissionLogic() {
  if (!started || paused || playerDead) return;

  const missionProgress = $("missionProgress");

  if (mission === 3) {
    const npc = objectives.find((o) => o.kind === "rescue");

    if (npc && player.position.distanceTo(npc.position) < 5) {
      if (missionProgress) missionProgress.textContent = "Aliado rescatado";
      completeMission();
    }
  }

  if (mission === 4) {
    missionTimer--;

    const seconds = Math.ceil(missionTimer / 60);
    if (missionProgress) missionProgress.textContent = `Sobreviví: ${seconds}s`;

    if (missionTimer % 240 === 0) {
      spawnEnemies(2, Math.random() > 0.5 ? -80 : 40);
    }

    if (missionTimer <= 0) completeMission();
  }

  if (mission === 5) {
    const zone = objectives.find((o) => o.kind === "ESCAPE");

    if (zone && player.position.distanceTo(zone.position) < 8) {
      if (missionProgress) missionProgress.textContent = "Escape logrado";
      completeMission();
    }
  }
}

function completeMission() {
  started = false;
  showMessage("MISIÓN COMPLETADA");

  setTimeout(() => {
    started = true;
    startMission(mission + 1);
  }, 1700);
}

function completeStory() {
  started = false;

  if (document.exitPointerLock) document.exitPointerLock();

  if (scoreboard) {
    scoreboard.style.display = "flex";

    if (finalKills) finalKills.textContent = String(kills);
    if (finalStreak) finalStreak.textContent = String(maxStreak);
    if (finalAccuracy) finalAccuracy.textContent = "—";

    let rank = "C";
    if (kills > 20) rank = "B";
    if (kills > 35) rank = "A";
    if (kills > 50) rank = "S";

    if (finalRank) finalRank.textContent = rank;
  } else {
    showMessage("CÓDIGO ROJO COMPLETADO");
  }
}

/* =========================
   BOTS / BOSS
========================= */
function spawnEnemies(amount, centerZ) {
  for (let i = 0; i < amount; i++) {
    const bot = createBot("enemy");
    bot.position.set(
      Math.random() * 150 - 75,
      0,
      centerZ + Math.random() * 75 - 37
    );
    scene.add(bot);
    bots.push(bot);
  }
}

function spawnBoss() {
  const boss = createBot("boss");

  boss.position.set(0, 0, -95);
  boss.hp = 1000;
  boss.maxHp = 1000;
  boss.role = "boss";
  boss.phase = 1;
  boss.specialCooldown = 260;
  boss.scale.set(1.7, 1.7, 1.7);

  bossRef = boss;

  scene.add(boss);
  bots.push(boss);

  if (bossBar) bossBar.style.display = "block";
  if (bossState) bossState.textContent = "VIVO";
  updateBossBar();
}

function createBot(type) {
  const bot = new THREE.Group();

  const roles = ["rush", "rifle", "sniper", "support"];
  bot.role = type === "boss" ? "boss" : roles[Math.floor(Math.random() * roles.length)];

  const uniformColor = type === "boss" ? 0x550000 : 0xe8e8e8;
  const vestColor = 0x151515;

  const uniform = new THREE.MeshStandardMaterial({
    color: uniformColor,
    roughness: 0.6
  });
  const vest = new THREE.MeshStandardMaterial({
    color: vestColor,
    roughness: 0.75
  });
  const skin = new THREE.MeshStandardMaterial({
    color: 0xc98b61,
    roughness: 0.65
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x050505 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.42), uniform);
  body.position.y = 1.1;

  const armor = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.48), vest);
  armor.position.y = 1.2;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.44), skin);
  head.position.y = 1.95;

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.24), uniform);
  legL.position.set(-0.22, 0.38, 0);

  const legR = legL.clone();
  legR.position.x = 0.22;

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), uniform);
  armL.position.set(-0.55, 1.15, 0);

  const armR = armL.clone();
  armR.position.x = 0.55;

  const botGun = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.14, bot.role === "sniper" ? 1.1 : 0.8),
    dark
  );
  botGun.position.set(0.45, 1.25, -0.45);

  bot.add(body, armor, head, legL, legR, armL, armR, botGun);

  bot.legL = legL;
  bot.legR = legR;
  bot.armL = armL;
  bot.armR = armR;

  bot.hp = bot.role === "rush" ? 105 : bot.role === "sniper" ? 80 : 100;
  bot.hp += mission * 12;
  bot.maxHp = bot.hp;
  bot.cooldown = Math.random() * 45;
  bot.grenadeCooldown = 300 + Math.random() * 420;
  bot.walk = Math.random() * 10;
  bot.strafe = Math.random() > 0.5 ? 1 : -1;
  bot.reaction = 12 + Math.random() * 18;
  bot.aiTick = Math.random() * 20;
  bot.coverTarget = null;

  return bot;
}

function updateBots() {
  if (!started || paused) return;

  for (const bot of bots) {
    const targetPos = player.position;
    const dist = bot.position.distanceTo(targetPos);

    const dir = new THREE.Vector3().subVectors(targetPos, bot.position);
    dir.y = 0;
    dir.normalize();

    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(bot.strafe);
    const old = bot.position.clone();

    bot.aiTick--;

    if (bot.aiTick <= 0) {
      bot.aiTick = 18 + Math.random() * 18;
      bot.coverTarget = findNearestCover(bot.position);

      if (Math.random() < 0.35) bot.strafe *= -1;
    }

    let moveSpeed = 0.048;

    if (bot.role === "rush") moveSpeed = 0.088;
    if (bot.role === "rifle") moveSpeed = 0.064;
    if (bot.role === "sniper") moveSpeed = 0.041;
    if (bot.role === "support") moveSpeed = 0.055;

    if (bot.role === "boss") {
      moveSpeed = bot.phase === 2 ? 0.102 : 0.074;

      if (Math.random() < (bot.phase === 2 ? 0.052 : 0.028)) {
        botThrowGrenade(bot, player.position);
      }
    }

    const lowHp = bot.hp < bot.maxHp * 0.35;
    const nearCover = bot.coverTarget;

    if (lowHp && nearCover && bot.role !== "boss") {
      const coverDir = new THREE.Vector3().subVectors(nearCover, bot.position);
      coverDir.y = 0;
      coverDir.normalize();
      bot.position.add(coverDir.multiplyScalar(moveSpeed * 1.18));
    } else if (lowHp && bot.role !== "boss") {
      bot.position.add(dir.clone().multiplyScalar(-moveSpeed));
      bot.position.add(side.clone().multiplyScalar(moveSpeed));
    } else if (bot.role === "rush" || bot.role === "boss") {
      if (dist > 7) bot.position.add(dir.clone().multiplyScalar(moveSpeed));
      else bot.position.add(side.clone().multiplyScalar(moveSpeed));
    } else if (bot.role === "sniper") {
      if (dist < 48) bot.position.add(dir.clone().multiplyScalar(-moveSpeed));
      else if (dist > 100) bot.position.add(dir.clone().multiplyScalar(moveSpeed * 0.72));
      else bot.position.add(side.clone().multiplyScalar(moveSpeed * 0.58));
    } else {
      if (dist > 24) bot.position.add(dir.clone().multiplyScalar(moveSpeed));
      else bot.position.add(side.clone().multiplyScalar(moveSpeed));
    }

    if (Math.random() < 0.024) bot.strafe *= -1;

    if (isColliding(bot.position.x, bot.position.z, 0.55)) {
      bot.position.copy(old);
      bot.strafe *= -1;
    }

    bot.lookAt(targetPos.x, bot.position.y, targetPos.z);

    bot.walk += 0.25;
    bot.legL.rotation.x = Math.sin(bot.walk) * 0.6;
    bot.legR.rotation.x = -Math.sin(bot.walk) * 0.6;
    bot.armL.rotation.x = -Math.sin(bot.walk) * 0.32;
    bot.armR.rotation.x = Math.sin(bot.walk) * 0.32;

    bot.cooldown--;
    bot.grenadeCooldown--;

    let range = 62;
    if (bot.role === "rush") range = 40;
    if (bot.role === "rifle") range = 76;
    if (bot.role === "sniper") range = 125;
    if (bot.role === "support") range = 68;
    if (bot.role === "boss") range = 100;

    if (bot.cooldown <= 0 && dist < range && !playerDead) {
      botShoot(bot, targetPos);

      let cd = 70;
      if (bot.role === "rush") cd = 34;
      if (bot.role === "rifle") cd = 48;
      if (bot.role === "sniper") cd = 98;
      if (bot.role === "support") cd = 60;
      if (bot.role === "boss") cd = bot.phase === 2 ? 21 : 34;

      bot.cooldown = Math.max(16, cd) + Math.random() * bot.reaction;
    }

    if (
      bot.grenadeCooldown <= 0 &&
      dist > 16 &&
      dist < 60 &&
      Math.random() < 0.025 &&
      !playerDead
    ) {
      botThrowGrenade(bot, targetPos);
      bot.grenadeCooldown = 520 + Math.random() * 380;
    }
  }
}

function updateBossMode() {
  if (!bossRef || bossRef.hp <= 0 || playerDead || paused) return;

  const hpPercent = bossRef.hp / bossRef.maxHp;

  if (hpPercent <= 0.5 && bossRef.phase === 1) {
    bossRef.phase = 2;
    bossRef.scale.set(1.95, 1.95, 1.95);
    bossRef.cooldown = 20;
    bossRef.grenadeCooldown = 80;
    cameraShake += 0.28;
    showMessage("EL JEFE ENTRÓ EN FURIA");
  }

  bossRef.specialCooldown--;

  if (bossRef.specialCooldown <= 0) {
    bossSpecialAttack();
    bossRef.specialCooldown = bossRef.phase === 2 ? 145 : 240;
  }
}

function bossSpecialAttack() {
  if (!bossRef) return;

  showMessage("ATAQUE ESPECIAL DEL JEFE");
  cameraShake += 0.2;

  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;

    const target = new THREE.Vector3(
      bossRef.position.x + Math.sin(angle) * 18,
      0,
      bossRef.position.z + Math.cos(angle) * 18
    );

    botThrowGrenade(bossRef, target);
  }
}

function updateBossBar() {
  if (!bossRef || bossRef.hp <= 0) {
    if (bossBar) bossBar.style.display = "none";
    return;
  }

  if (bossBar) bossBar.style.display = "block";

  if (bossHpFill) {
    const percent = Math.max(0, (bossRef.hp / bossRef.maxHp) * 100);
    bossHpFill.style.width = `${percent}%`;
  }
}

/* =========================
   PLAYER / MOVIMIENTO
========================= */
function movePlayer() {
  if (!started || paused || hp <= 0 || playerDead) return;

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const dir = new THREE.Vector3();

  if (keys.KeyW) dir.add(forward);
  if (keys.KeyS) dir.sub(forward);
  if (keys.KeyD) dir.add(right);
  if (keys.KeyA) dir.sub(right);

  if (joystickActive) {
    dir.add(forward.clone().multiplyScalar(-joystickY / 45));
    dir.add(right.clone().multiplyScalar(joystickX / 45));
  }

  dir.normalize();

  const old = player.position.clone();
  const moving = dir.length() > 0;
  const wantsSprint = keys.ShiftLeft && moving && stamina > 5 && !sliding;

  let speed = 0.18;

  if (wantsSprint) {
    speed = 0.36;
    stamina = Math.max(0, stamina - 0.45);
  } else {
    stamina = Math.min(100, stamina + 0.28);
  }

  if (abilityActive) speed *= 1.35;

  if (sliding) {
    player.position.x += slideDir.x * 0.58;
    player.position.z += slideDir.z * 0.58;
    slideTimer--;

    if (slideTimer <= 0) sliding = false;
  } else {
    player.position.x += dir.x * speed;
    player.position.z += dir.z * speed;
  }

  player.position.x = Math.max(-MAP_HALF + 3, Math.min(MAP_HALF - 3, player.position.x));
  player.position.z = Math.max(-MAP_HALF + 3, Math.min(MAP_HALF - 3, player.position.z));

  if (isColliding(player.position.x, player.position.z, 0.55)) {
    player.position.copy(old);
    sliding = false;
  }

  velocityY -= 0.016;
  player.position.y += velocityY;

  if (player.position.y <= 2) {
    player.position.y = 2;
    velocityY = 0;
    canJump = true;
  }

  if (moving && !sliding) headBob += wantsSprint ? 0.18 : 0.1;

  const targetTilt = keys.KeyA ? 0.045 : keys.KeyD ? -0.045 : 0;
  cameraTilt += (targetTilt - cameraTilt) * 0.08;

  if (moving && canJump && !sliding) {
    stepTimer--;

    if (stepTimer <= 0) {
      playSound("step");
      stepTimer = wantsSprint ? 18 : 28;
    }
  }
}

function startSlide() {
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));

  slideDir.copy(forward);
  sliding = true;
  slideTimer = 28;
  stamina = Math.max(0, stamina - 18);
  cameraShake += 0.04;

  playSound("slide");
  showMessage("SLIDE");
}

function isColliding(x, z, r) {
  return colliders.some(
    (c) =>
      x + r > c.minX &&
      x - r < c.maxX &&
      z + r > c.minZ &&
      z - r < c.maxZ
  );
}

/* =========================
   ARMAS / DISPARO
========================= */
function createGun() {
  if (gun) camera.remove(gun);

  gun = new THREE.Group();

  const metal = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8f1021 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x050505 });

  let bodyLen = 1.0;
  let barrelLen = 0.85;
  let magH = 0.58;
  let scope = false;
  let scale = 1;

  if (currentWeapon === "pistol") {
    bodyLen = 0.7;
    barrelLen = 0.4;
    magH = 0.35;
  }

  if (currentWeapon === "shotgun") {
    bodyLen = 1.1;
    barrelLen = 0.95;
    magH = 0.25;
    scale = 1.08;
  }

  if (currentWeapon === "sniper") {
    bodyLen = 1.15;
    barrelLen = 1.35;
    magH = 0.42;
    scope = true;
    scale = 1.13;
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, bodyLen), metal);
  body.position.set(0.45, -0.32, -0.75);

  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, barrelLen), metal);
  barrel.position.set(0.45, -0.32, -1.1 - barrelLen / 2);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.18, magH, 0.22), dark);
  mag.position.set(0.45, -0.6, -0.82);

  const detail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, bodyLen * 0.75), red);
  detail.position.set(0.45, -0.18, -0.76);

  gun.add(body, barrel, mag, detail);

  if (scope) {
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.45, 14), dark);
    sc.rotation.z = Math.PI / 2;
    sc.position.set(0.45, -0.08, -0.95);
    gun.add(sc);
  }

  gun.scale.set(scale, scale, scale);
  camera.add(gun);
}

function switchWeapon(w) {
  if (!weapons[w] || reloading || playerDead) return;

  currentWeapon = w;
  createGun();
  updateHud();
}

function shoot() {
  initAudio();

  if (!started || paused || hp <= 0 || playerDead || reloading) return;

  const w = weapons[currentWeapon];
  const now = performance.now();

  if (now - lastShot < w.rate) return;

  if (w.ammo <= 0) {
    reload();
    return;
  }

  if (bullets.length > 120) {
    scene.remove(bullets[0]);
    bullets.shift();
  }

  lastShot = now;
  w.ammo--;

  recoil += w.recoil * 1.65;
  cameraShake += currentWeapon === "sniper" ? 0.08 : 0.042;

  playSound("shot");
  createMuzzleFlash();
  createMuzzleSmoke();

  const shots = w.pellets || 1;

  for (let i = 0; i < shots; i++) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);

    const movingPenalty = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD ? 1.35 : 1;
    const slidePenalty = sliding ? 1.8 : 1;

    dir.x += (Math.random() - 0.5) * w.spread * movingPenalty * slidePenalty;
    dir.y += (Math.random() - 0.5) * w.spread * movingPenalty * slidePenalty;
    dir.z += (Math.random() - 0.5) * w.spread * movingPenalty * slidePenalty;
    dir.normalize();

    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(currentWeapon === "sniper" ? 0.075 : 0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffdd44 })
    );

    bullet.position.copy(camera.position).add(dir.clone().multiplyScalar(1.2));
    bullet.dir = dir;
    bullet.life = currentWeapon === "sniper" ? 155 : 120;
    bullet.damage = abilityActive ? w.damage * 1.35 : w.damage;
    bullet.team = "player";

    scene.add(bullet);
    bullets.push(bullet);
  }

  updateHud();
}

function reload() {
  const w = weapons[currentWeapon];

  if (reloading || w.ammo === w.mag || w.reserve <= 0 || playerDead) return;

  reloading = true;
  playSound("reload");

  if (ammoText) ammoText.textContent = "...";

  setTimeout(() => {
    const need = w.mag - w.ammo;
    const take = Math.min(need, w.reserve);

    w.ammo += take;
    w.reserve -= take;

    reloading = false;
    updateHud();
  }, w.reload);
}

function updateBullets() {
  if (bullets.length > 120) {
    scene.remove(bullets[0]);
    bullets.shift();
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    b.position.add(b.dir.clone().multiplyScalar(1.7));
    b.life--;

    if (b.team === "enemy" && !playerDead && b.position.distanceTo(player.position) < 0.85) {
      takeDamage(b.damage);
      scene.remove(b);
      bullets.splice(i, 1);
      continue;
    }

    for (const c of colliders) {
      if (
        b.position.x > c.minX &&
        b.position.x < c.maxX &&
        b.position.z > c.minZ &&
        b.position.z < c.maxZ
      ) {
        createSpark(b.position);
        scene.remove(b);
        bullets.splice(i, 1);
        break;
      }
    }

    if (!bullets[i]) continue;

    if (b.team === "player") {
      for (let j = bots.length - 1; j >= 0; j--) {
        const bot = bots[j];

        const body = bot.position.clone().add(new THREE.Vector3(0, 1.1, 0));
        const head = bot.position.clone().add(new THREE.Vector3(0, 1.95, 0));

        let damage = 0;
        let headshot = false;

        if (b.position.distanceTo(head) < 0.45) {
          damage = b.damage * 2.45;
          headshot = true;
        } else if (b.position.distanceTo(body) < 0.85) {
          damage = b.damage;
        }

        if (damage > 0) {
          bot.hp -= damage;

          showHitmarker(headshot);
          createBlood(bot.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
          playSound(headshot ? "headshot" : "hit");

          scene.remove(b);
          bullets.splice(i, 1);

          if (bot.hp <= 0) killBot(bot, j, headshot);

          break;
        }
      }
    }

    if (bullets[i] && b.life <= 0) {
      scene.remove(b);
      bullets.splice(i, 1);
    }
  }
}

function botShoot(bot, targetPos) {
  const dir = new THREE.Vector3().subVectors(targetPos, bot.position);
  dir.y = 1.2;
  dir.normalize();

  let accuracy = 0.08;
  let damage = 8 + mission;

  if (bot.role === "rush") {
    accuracy = 0.125;
    damage = 7 + mission;
  }

  if (bot.role === "rifle") {
    accuracy = 0.058;
    damage = 10 + mission;
  }

  if (bot.role === "sniper") {
    accuracy = 0.028;
    damage = 19 + mission * 1.6;
  }

  if (bot.role === "support") {
    accuracy = 0.07;
    damage = 8 + mission;
  }

  if (bot.role === "boss") {
    accuracy = bot.phase === 2 ? 0.03 : 0.044;
    damage = bot.phase === 2 ? 25 + mission * 2.7 : 17 + mission * 2;
  }

  dir.x += (Math.random() - 0.5) * accuracy;
  dir.z += (Math.random() - 0.5) * accuracy;
  dir.normalize();

  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(bot.role === "sniper" ? 0.07 : 0.052, 6, 6),
    new THREE.MeshBasicMaterial({ color: bot.role === "boss" ? 0xff3344 : 0xffffff })
  );

  bullet.position.copy(bot.position);
  bullet.position.y += 1.4;
  bullet.dir = dir;
  bullet.life = bot.role === "sniper" ? 145 : 110;
  bullet.damage = damage;
  bullet.team = "enemy";

  scene.add(bullet);
  bullets.push(bullet);
}

/* =========================
   GRANADAS / DAÑO
========================= */
function throwGrenade() {
  if (!started || paused || playerDead || grenades <= 0) return;

  grenades--;

  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);

  const grenade = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x202020 })
  );

  grenade.position.copy(camera.position).add(dir.clone().multiplyScalar(1.5));
  grenade.vel = dir.clone().multiplyScalar(1.2);
  grenade.vel.y += 0.45;
  grenade.timer = 95;
  grenade.team = "player";

  scene.add(grenade);
  grenadesLive.push(grenade);
  updateHud();
}

function botThrowGrenade(bot, targetPos) {
  const dir = new THREE.Vector3().subVectors(targetPos, bot.position);
  dir.y = 0.25;
  dir.normalize();

  const grenade = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 10),
    new THREE.MeshBasicMaterial({ color: bot.role === "boss" ? 0xff2233 : 0xffffff })
  );

  grenade.position.copy(bot.position);
  grenade.position.y += 1.4;
  grenade.vel = dir.clone().multiplyScalar(0.95);
  grenade.vel.y += 0.35;
  grenade.timer = bot.role === "boss" ? 78 : 100;
  grenade.team = "enemy";

  scene.add(grenade);
  grenadesLive.push(grenade);
}

function updateGrenades() {
  for (let i = grenadesLive.length - 1; i >= 0; i--) {
    const g = grenadesLive[i];

    g.position.add(g.vel);
    g.vel.y -= 0.018;
    g.timer--;
    g.rotation.x += 0.2;
    g.rotation.z += 0.15;

    if (g.position.y < 0.25) {
      g.position.y = 0.25;
      g.vel.y *= -0.35;
      g.vel.x *= 0.88;
      g.vel.z *= 0.88;
    }

    if (g.timer <= 0) {
      explode(g.position, g.team);
      scene.remove(g);
      grenadesLive.splice(i, 1);
    }
  }
}

function explode(pos, team) {
  playSound("explosion");
  cameraShake += 0.16;

  const boom = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0xff3344,
      transparent: true,
      opacity: 0.65
    })
  );

  boom.position.copy(pos);
  boom.life = 18;
  boom.vel = new THREE.Vector3();
  boom.grow = true;

  scene.add(boom);
  particles.push(boom);

  for (let i = bots.length - 1; i >= 0; i--) {
    const b = bots[i];
    const d = b.position.distanceTo(pos);

    if (d < 11) {
      b.hp -= Math.max(20, 115 - d * 9);

      if (b.hp <= 0) killBot(b, i, false);
    }
  }

  if (team === "enemy" && !playerDead) {
    const d = player.position.distanceTo(pos);

    if (d < 11) takeDamage(Math.max(15, 105 - d * 8));
  }
}

function takeDamage(amount) {
  if (playerDead) return;

  streak = 0;

  let dmg = amount;

  if (shield > 0) {
    const s = Math.min(shield, dmg);
    shield -= s;
    dmg -= s;
  }

  hp -= dmg;
  cameraShake += 0.09;

  if (damageScreen) {
    damageScreen.style.opacity = "1";
    setTimeout(() => {
      damageScreen.style.opacity = "0";
    }, 120);
  }

  if (hp <= 0) {
    hp = 0;
    playerDead = true;
    shooting = false;

    showMessage("TE BAJARON · REINICIANDO MISIÓN");

    setTimeout(() => {
      hp = 100;
      shield = 50;
      streak = 0;
      startMission(mission);
    }, 1800);
  }

  updateHud();
}

function killBot(bot, index, headshot = false) {
  const pos = bot.position.clone();

  scene.remove(bot);
  bots.splice(index, 1);

  if (bot === bossRef) {
    bossRef = null;

    if (bossBar) bossBar.style.display = "none";
    if (bossState) bossState.textContent = "DERROTADO";

    bossDeathCinematic(pos);
  }

  createDeathParticles(pos);

  kills++;
  missionKills++;
  streak++;
  maxStreak = Math.max(maxStreak, streak);

  cameraShake += headshot ? 0.1 : 0.06;

  const text = headshot ? `HEADSHOT · RACHA x${streak}` : `ELIMINADO · RACHA x${streak}`;

  showMessage(text);
  addKillFeed(text);

  checkMission();
  updateHud();
}

function bossDeathCinematic(pos) {
  cameraShake += 0.35;
  showMessage("JEFE ELIMINADO · BARRIO RECUPERADO");

  for (let i = 0; i < 18; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3344 })
    );

    p.position.copy(pos);
    p.position.y += 2;
    p.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.28,
      Math.random() * 0.22,
      (Math.random() - 0.5) * 0.28
    );
    p.life = 45;

    scene.add(p);
    particles.push(p);
  }
}

/* =========================
   PARTÍCULAS / EFECTOS
========================= */
function createDeathParticles(pos) {
  if (particles.length > 120) return;

  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    p.position.copy(pos);
    p.position.y += 1.2;
    p.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.12,
      Math.random() * 0.12,
      (Math.random() - 0.5) * 0.12
    );
    p.life = 24 + Math.random() * 14;

    scene.add(p);
    particles.push(p);
  }
}

function createBlood(pos) {
  if (particles.length > 120) return;

  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xaa001f })
    );

    p.position.copy(pos);
    p.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      Math.random() * 0.08,
      (Math.random() - 0.5) * 0.1
    );
    p.life = 20;

    scene.add(p);
    particles.push(p);
  }
}

function createSpark(pos) {
  if (particles.length > 120) return;

  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffcc66 })
    );

    p.position.copy(pos);
    p.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      Math.random() * 0.08,
      (Math.random() - 0.5) * 0.1
    );
    p.life = 12 + Math.random() * 6;

    scene.add(p);
    particles.push(p);
  }
}

function createMuzzleSmoke() {
  if (particles.length > 120) return;

  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);

  const smoke = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0x777777,
      transparent: true,
      opacity: 0.35
    })
  );

  smoke.position.copy(camera.position).add(dir.multiplyScalar(1.1));
  smoke.vel = new THREE.Vector3(0, 0.015, 0);
  smoke.life = 18;
  smoke.grow = true;

  scene.add(smoke);
  particles.push(smoke);
}

function createMuzzleFlash() {
  if (particles.length > 120) return;

  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(currentWeapon === "sniper" ? 0.18 : 0.12, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xfff1a1,
      transparent: true,
      opacity: 0.9
    })
  );

  flash.position.copy(camera.position).add(dir.multiplyScalar(1.15));
  flash.vel = new THREE.Vector3();
  flash.life = 4;
  flash.grow = true;

  scene.add(flash);
  particles.push(flash);
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    if (p.grow) {
      p.scale.multiplyScalar(1.12);

      if (p.material.opacity !== undefined) {
        p.material.opacity *= 0.88;
      }
    } else {
      p.position.add(p.vel);
      p.vel.y -= 0.006;
      p.scale.multiplyScalar(0.96);
    }

    p.life--;

    if (p.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }
}

/* =========================
   UI / HUD
========================= */
function updateHud() {
  const w = weapons[currentWeapon];

  if (hpText) hpText.textContent = String(Math.floor(hp));
  if (shieldText) shieldText.textContent = String(Math.floor(shield));
  if (weaponText) weaponText.textContent = w.name;
  if (ammoText) ammoText.textContent = String(w.ammo);
  if (reserveText) reserveText.textContent = String(w.reserve);
  if (killsText) killsText.textContent = String(kills);
  if (streakText) streakText.textContent = String(streak);
  if (missionNumberText) missionNumberText.textContent = String(mission);
  if (grenadesText) grenadesText.textContent = String(grenades);
  if (staminaText) staminaText.textContent = String(Math.floor(stamina));

  if (abilityText) {
    if (abilityActive) abilityText.textContent = "Activa";
    else if (abilityReady) abilityText.textContent = "Lista";
    else abilityText.textContent = "Cargando";
  }
}

function showMessage(text) {
  if (!message) return;

  message.textContent = text;
  message.style.opacity = "1";

  setTimeout(() => {
    message.style.opacity = "0";
  }, 1300);
}

function showHitmarker(headshot) {
  if (!hitmarker) return;

  hitmarker.textContent = headshot ? "✦" : "✕";
  hitmarker.style.color = headshot ? "#ffffff" : "#ff3558";
  hitmarker.style.opacity = "1";
  hitmarker.style.transform = "translate(-50%, -50%) scale(1.55)";

  setTimeout(() => {
    hitmarker.style.opacity = "0";
    hitmarker.style.transform = "translate(-50%, -50%) scale(.5)";
  }, 90);
}

function addKillFeed(text) {
  if (!killFeed) return;

  const item = document.createElement("div");
  item.className = "feedItem";
  item.textContent = text;

  killFeed.prepend(item);

  setTimeout(() => item.remove(), 2600);
}

function drawMinimap() {
  if (!miniCtx || !minimap || !player) return;

  const size = minimap.width || 180;

  miniCtx.clearRect(0, 0, size, size);
  miniCtx.fillStyle = "rgba(0,0,0,.85)";
  miniCtx.fillRect(0, 0, size, size);

  miniCtx.strokeStyle = "rgba(255,80,100,.5)";
  miniCtx.lineWidth = 2;
  miniCtx.strokeRect(2, 2, size - 4, size - 4);

  const scale = size / MAP_SIZE;
  const half = size / 2;

  miniCtx.fillStyle = "#00ff88";
  miniCtx.beginPath();
  miniCtx.arc(
    player.position.x * scale + half,
    player.position.z * scale + half,
    5,
    0,
    Math.PI * 2
  );
  miniCtx.fill();

  bots.forEach((bot) => {
    miniCtx.fillStyle = bot.role === "boss" ? "#ff0033" : "#ffffff";
    miniCtx.beginPath();
    miniCtx.arc(
      bot.position.x * scale + half,
      bot.position.z * scale + half,
      bot.role === "boss" ? 6 : 3,
      0,
      Math.PI * 2
    );
    miniCtx.fill();
  });

  objectives.forEach((obj) => {
    miniCtx.fillStyle = "#ffaa00";
    miniCtx.beginPath();
    miniCtx.arc(
      obj.position.x * scale + half,
      obj.position.z * scale + half,
      4,
      0,
      Math.PI * 2
    );
    miniCtx.fill();
  });
}

/* =========================
   HABILIDAD
========================= */
function useAbility() {
  if (!started || paused || playerDead || !abilityReady) return;

  abilityReady = false;
  abilityActive = true;
  abilityTimer = 360;
  abilityCooldown = 900;

  playSound("ability");
  showMessage("FURIA ROJA ACTIVADA");
  updateHud();
}

function updateAbility() {
  if (abilityActive) {
    abilityTimer--;

    if (abilityTimer <= 0) {
      abilityActive = false;
      showMessage("HABILIDAD TERMINADA");
    }
  }

  if (!abilityReady) {
    abilityCooldown--;

    if (abilityCooldown <= 0) {
      abilityReady = true;
      showMessage("HABILIDAD LISTA");
    }
  }
}

/* =========================
   MOBILE
========================= */
function setupMobile() {
  if (!joystick || !stick) return;

  window.addEventListener(
    "touchstart",
    (e) => {
      const target = e.target;

      if (
        target === joystick ||
        joystick.contains(target) ||
        target === shootBtn ||
        target === jumpBtn ||
        target === reloadBtn
      ) {
        return;
      }

      mobileLook = true;

      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    },
    { passive: false }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (mobileLook && e.touches.length > 0) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;

        yaw -= dx * 0.003 * sensitivity;
        pitch -= dy * 0.003 * sensitivity;
        pitch = Math.max(-1.15, Math.min(0.85, pitch));

        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    },
    { passive: false }
  );

  window.addEventListener("touchend", () => {
    mobileLook = false;
  });

  joystick.addEventListener(
    "touchstart",
    () => {
      joystickActive = true;
    },
    { passive: false }
  );

  joystick.addEventListener(
    "touchmove",
    (e) => {
      const rect = joystick.getBoundingClientRect();

      const x = e.touches[0].clientX - rect.left - 70;
      const y = e.touches[0].clientY - rect.top - 70;

      joystickX = Math.max(-45, Math.min(45, x));
      joystickY = Math.max(-45, Math.min(45, y));

      stick.style.left = joystickX + 40 + "px";
      stick.style.top = joystickY + 40 + "px";

      e.preventDefault();
    },
    { passive: false }
  );

  joystick.addEventListener("touchend", () => {
    joystickActive = false;
    joystickX = 0;
    joystickY = 0;

    stick.style.left = "40px";
    stick.style.top = "40px";
  });

  if (shootBtn) {
    shootBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      shooting = true;
      shoot();
    });

    shootBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      shooting = false;
    });
  }

  if (jumpBtn) {
    jumpBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();

      if (canJump && started && !paused && !playerDead) {
        velocityY = 0.39;
        cameraShake += 0.025;
        canJump = false;
      }
    });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      reload();
    });
  }
}

/* =========================
   HELPERS
========================= */
function findNearestCover(pos) {
  let best = null;
  let bestDist = Infinity;

  for (const c of colliders) {
    const cx = (c.minX + c.maxX) / 2;
    const cz = (c.minZ + c.maxZ) / 2;
    const d = Math.hypot(pos.x - cx, pos.z - cz);

    if (d < bestDist && d < 24) {
      bestDist = d;
      best = new THREE.Vector3(cx, 0, cz);
    }
  }

  return best;
}

function checkMission() {
  const missionProgress = $("missionProgress");

  if (mission === 1 && missionProgress) {
    missionProgress.textContent = `Enemigos eliminados: ${missionKills}/5`;
  }

  if (mission === 2 && missionProgress) {
    missionProgress.textContent = `Zona limpiada: ${missionKills}/9`;
  }

  if (mission === 6 && missionProgress) {
    missionProgress.textContent = `Enemigos restantes: ${bots.length}`;
  }

  if (mission === 1 && missionKills >= 5) completeMission();
  if (mission === 2 && missionKills >= 9) completeMission();
  if (mission === 6 && bots.length <= 0) completeStory();
}

function updateCamera() {
  const bobAmount = sliding ? -0.32 : Math.sin(headBob) * 0.045;

  camera.position.set(
    player.position.x,
    player.position.y + 1.45 + bobAmount,
    player.position.z
  );

  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch + recoil;
  camera.rotation.z = cameraTilt;

  if (sliding) camera.rotation.z += 0.055;

  if (cameraShake > 0) {
    camera.position.x += (Math.random() - 0.5) * cameraShake;
    camera.position.y += (Math.random() - 0.5) * cameraShake;
    cameraShake *= 0.86;
  }

  if (gun) {
    gun.position.z = -recoil * 8;
    gun.position.y = Math.sin(performance.now() * 0.006) * 0.012;

    if (sliding) {
      gun.position.y -= 0.09;
      gun.rotation.z = 0.08;
    } else {
      gun.rotation.z *= 0.9;
    }

    gun.rotation.x = -recoil * 0.9;
  }

  recoil *= 0.82;
}

/* =========================
   LOOP
========================= */
function animate() {
  requestAnimationFrame(animate);

  if (started && !paused) {
    const w = weapons[currentWeapon];

    if (shooting && w.auto && !playerDead) shoot();

    movePlayer();
    updateCamera();
    updateBots();
    updateBullets();
    updateGrenades();
    updateParticles();
    updateAbility();
    updateMissionLogic();
    updateBossMode();
    updateBossBar();
    updateHud();
    drawMinimap();
  } else {
    updateCamera();
    updateParticles();
    drawMinimap();
  }

  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
