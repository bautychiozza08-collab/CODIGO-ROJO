import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

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
let mission = 1;
let missionKills = 0;
let missionTimer = 0;
let grenades = 2;

let started = false;
let paused = false;
let reloading = false;
let shooting = false;
let playerDead = false;

let abilityReady = true;
let abilityActive = false;
let abilityCooldown = 0;
let abilityTimer = 0;

let currentWeapon = "rifle";
let lastShot = 0;
let recoil = 0;
let audioCtx;

const MAP_SIZE = 280;
const MAP_HALF = MAP_SIZE / 2;
const TOTAL_MISSIONS = 6;

const weapons = {
  pistol: { name: "P9 Compact", damage: 34, mag: 12, ammo: 12, reserve: 48, rate: 330, spread: 0.02, reload: 850, auto: false, recoil: 0.035, pellets: 1 },
  rifle: { name: "Rifle R-21", damage: 29, mag: 30, ammo: 30, reserve: 90, rate: 120, spread: 0.018, reload: 1300, auto: true, recoil: 0.032, pellets: 1 },
  shotgun: { name: "Trueno 12", damage: 18, mag: 6, ammo: 6, reserve: 24, rate: 650, spread: 0.11, reload: 1500, auto: false, recoil: 0.08, pellets: 8 },
  sniper: { name: "Halcón M1", damage: 95, mag: 5, ammo: 5, reserve: 20, rate: 900, spread: 0.004, reload: 1900, auto: false, recoil: 0.11, pellets: 1 }
};

const menu = document.getElementById("menu");
const loading = document.getElementById("loading");
const pauseScreen = document.getElementById("pause");
const endScreen = document.getElementById("endScreen");

const playBtn = document.getElementById("playBtn");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtn = document.getElementById("restartBtn");
const endRestartBtn = document.getElementById("endRestartBtn");

const hpText = document.getElementById("hp");
const shieldText = document.getElementById("shield");
const weaponText = document.getElementById("weapon");
const ammoText = document.getElementById("ammo");
const reserveText = document.getElementById("reserve");
const killsText = document.getElementById("kills");
const missionNumberText = document.getElementById("missionNumber");
const message = document.getElementById("message");
const damageScreen = document.getElementById("damage");
const grenadesText = document.getElementById("grenades");
const abilityText = document.getElementById("ability");
const missionTitle = document.getElementById("missionTitle");
const missionText = document.getElementById("missionText");
const missionProgress = document.getElementById("missionProgress");
const endTitle = document.getElementById("endTitle");
const endText = document.getElementById("endText");

playBtn.onclick = () => {
  initAudio();
  menu.style.display = "none";
  loading.style.display = "flex";

  setTimeout(() => {
    loading.style.display = "none";
    started = true;
    paused = false;
    resetStory();
    document.body.requestPointerLock();
  }, 1050);
};

resumeBtn.onclick = togglePause;
restartBtn.onclick = () => {
  pauseScreen.style.display = "none";
  started = true;
  paused = false;
  resetStory();
  document.body.requestPointerLock();
};

endRestartBtn.onclick = () => {
  endScreen.style.display = "none";
  started = true;
  paused = false;
  resetStory();
  document.body.requestPointerLock();
};

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8aa0ad);
  scene.fog = new THREE.Fog(0x8aa0ad, 120, 330);

  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  player = new THREE.Object3D();
  scene.add(player);
  scene.add(camera);

  document.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (e.code === "Escape" && started) togglePause();

    if (paused) return;

    if (e.code === "KeyR") reload();
    if (e.code === "KeyQ") useAbility();
    if (e.code === "KeyG") throwGrenade();

    if (e.code === "Digit1") switchWeapon("pistol");
    if (e.code === "Digit2") switchWeapon("rifle");
    if (e.code === "Digit3") switchWeapon("shotgun");
    if (e.code === "Digit4") switchWeapon("sniper");

    if (e.code === "Space" && canJump && started && hp > 0 && !playerDead) {
      velocityY = 0.34;
      canJump = false;
    }
  });

  document.addEventListener("keyup", e => keys[e.code] = false);

  document.addEventListener("mousemove", e => {
    if (!started || paused || hp <= 0 || playerDead) return;

    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-1.15, Math.min(0.85, pitch));
  });

  document.addEventListener("mousedown", e => {
    if (e.button === 0) {
      shooting = true;
      shoot();
    }
  });

  document.addEventListener("mouseup", () => shooting = false);
  document.addEventListener("contextmenu", e => e.preventDefault());
  window.addEventListener("resize", resize);

  createGun();
  animate();
}

function togglePause() {
  if (!started) return;

  paused = !paused;
  pauseScreen.style.display = paused ? "flex" : "none";

  if (paused) document.exitPointerLock();
  else document.body.requestPointerLock();
}

function resetStory() {
  hp = 100;
  shield = 50;
  kills = 0;
  mission = 1;
  missionKills = 0;
  grenades = 2;
  currentWeapon = "rifle";
  playerDead = false;
  paused = false;

  resetWeapons();
  buildMap();
  startMission(1);
}

function resetWeapons() {
  weapons.pistol.ammo = 12; weapons.pistol.reserve = 48;
  weapons.rifle.ammo = 30; weapons.rifle.reserve = 90;
  weapons.shotgun.ammo = 6; weapons.shotgun.reserve = 24;
  weapons.sniper.ammo = 5; weapons.sniper.reserve = 20;
}

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playSound(type) {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.0001, now);

  if (type === "shot") {
    osc.type = "square";
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  if (type === "hit") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  if (type === "explosion") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  if (type === "ability") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(390, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}

function clearWorld() {
  mapObjects.forEach(o => scene.remove(o));
  bots.forEach(b => scene.remove(b));
  bullets.forEach(b => scene.remove(b));
  grenadesLive.forEach(g => scene.remove(g));
  particles.forEach(p => scene.remove(p));
  objectives.forEach(o => scene.remove(o));

  mapObjects = [];
  bots = [];
  bullets = [];
  grenadesLive = [];
  particles = [];
  objectives = [];
  colliders = [];
}

function addMapObj(obj) {
  scene.add(obj);
  mapObjects.push(obj);
  return obj;
}

function buildMap() {
  clearWorld();

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  addMapObj(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.3);
  sun.position.set(70, 120, 50);
  sun.castShadow = true;
  addMapObj(sun);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 });
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x252525, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.8 });
  const houseMat1 = new THREE.MeshStandardMaterial({ color: 0x8c6f5a, roughness: 0.85 });
  const houseMat2 = new THREE.MeshStandardMaterial({ color: 0x7a3f3f, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b1118, roughness: 0.8 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x6b4526, roughness: 0.85 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0x9b1025, roughness: 0.75 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
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
    createHouse(h[0], h[1], 20 + Math.random() * 6, 18 + Math.random() * 5, 12 + Math.random() * 4, i % 2 ? houseMat1 : houseMat2, roofMat);
  });

  box(0, 1.3, -36, 52, 2.6, 2, redMat);
  box(0, 1.3, 36, 52, 2.6, 2, redMat);
  box(-36, 1.3, 0, 2, 2.6, 52, redMat);
  box(36, 1.3, 0, 2, 2.6, 52, redMat);

  for (let i = 0; i < 60; i++) {
    box(Math.random() * 235 - 117, 1, Math.random() * 235 - 117, 2.5 + Math.random() * 2.5, 2, 2.5 + Math.random() * 2.5, crateMat);
  }

  const carPlaces = [
    [-10, -90], [12, -72], [-7, -52], [9, -20], [-12, 20], [12, 48], [-8, 85],
    [-90, -8], [-65, 10], [-75, 58], [-85, -55], [90, 8], [65, -12],
    [75, -58], [85, 55], [-25, 5], [28, -7], [5, 72], [-5, -72]
  ];

  carPlaces.forEach((c, i) => createAbandonedCar(c[0], c[1], i));
}

function box(x, y, z, w, h, d, mat, solid = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addMapObj(mesh);

  if (solid) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  return mesh;
}

function createHouse(x, z, w, d, h, wallMat, roofMat) {
  box(x, h / 2, z, w, h, d, wallMat);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 5, 4), roofMat);
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

  const glassMat = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x050505 });

  const car = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.05, 2.6), carMat);
  base.position.y = 0.75;

  const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.95, 2), glassMat);
  top.position.y = 1.55;

  car.add(base, top);

  for (const sx of [-2.1, 2.1]) {
    for (const sz of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx, 0.35, sz);
      car.add(wheel);
    }
  }

  car.position.set(x, 0, z);
  car.rotation.y = Math.random() * Math.PI;
  addMapObj(car);

  colliders.push({ minX: x - 3.5, maxX: x + 3.5, minZ: z - 2.2, maxZ: z + 2.2 });
}

function startMission(n) {
  mission = n;
  missionKills = 0;
  missionTimer = 0;
  playerDead = false;

  bots.forEach(b => scene.remove(b));
  bullets.forEach(b => scene.remove(b));
  grenadesLive.forEach(g => scene.remove(g));
  objectives.forEach(o => scene.remove(o));

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

  if (mission === 1) {
    spawnEnemies(5, -70);
    createObjectiveZone(0, -95, "ENTRADA");
    setMissionUI("Misión 1: Entrada", "Entrá al barrio y eliminá a los primeros enemigos.", "Eliminá 5 enemigos");
  }

  if (mission === 2) {
    spawnEnemies(9, -30);
    setMissionUI("Misión 2: Limpieza", "Limpiá la zona central del barrio.", "Eliminá 9 enemigos");
  }

  if (mission === 3) {
    spawnEnemies(8, -40);
    createRescueNPC(-85, 38);
    setMissionUI("Misión 3: Rescate", "Llegá hasta el aliado atrapado.", "Encontrá al aliado");
  }

  if (mission === 4) {
    missionTimer = 60 * 60;
    spawnEnemies(6, -20);
    setMissionUI("Misión 4: Zona Caliente", "Sobreviví un minuto mientras llegan refuerzos.", "Sobreviví 60 segundos");
  }

  if (mission === 5) {
    spawnEnemies(10, -10);
    createObjectiveZone(0, 125, "ESCAPE");
    setMissionUI("Misión 5: Escape", "Cruzá el barrio y llegá al punto de escape.", "Llegá al punto de escape");
  }

  if (mission === 6) {
    spawnEnemies(8, -40);
    spawnBoss();
    setMissionUI("Misión 6: Jefe Final", "Derrotá al líder del barrio tomado.", "Derrotá al jefe");
  }

  showMessage(`MISIÓN ${mission}`);
  createGun();
  updateHud();
}

function setMissionUI(title, text, progress) {
  missionTitle.textContent = title;
  missionText.textContent = text;
  missionProgress.textContent = progress;
  missionNumberText.textContent = mission;
}

function createObjectiveZone(x, z, label) {
  const zone = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 0.25, 32),
    new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.35 })
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

function spawnEnemies(amount, centerZ) {
  for (let i = 0; i < amount; i++) {
    const bot = createBot("pirados");
    bot.position.set(Math.random() * 150 - 75, 0, centerZ + Math.random() * 75 - 37);
    scene.add(bot);
    bots.push(bot);
  }
}

function spawnBoss() {
  const boss = createBot("boss");
  boss.position.set(0, 0, -95);
  boss.hp = 650;
  boss.maxHp = 650;
  boss.role = "boss";
  boss.scale.set(1.4, 1.4, 1.4);
  scene.add(boss);
  bots.push(boss);
}

function createBot(team) {
  const bot = new THREE.Group();
  bot.team = team;

  const roles = ["rush", "rifle", "sniper", "support"];
  bot.role = team === "boss" ? "boss" : roles[Math.floor(Math.random() * roles.length)];

  const uniformColor = team === "boss" ? 0x550000 : 0xe8e8e8;
  const vestColor = 0x151515;

  const uniform = new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.6 });
  const vest = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.75 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98b61, roughness: 0.65 });
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

  const botGun = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, bot.role === "sniper" ? 1.1 : 0.8), dark);
  botGun.position.set(0.45, 1.25, -0.45);

  bot.add(body, armor, head, legL, legR, armL, armR, botGun);

  bot.legL = legL;
  bot.legR = legR;
  bot.armL = armL;
  bot.armR = armR;

  bot.hp = bot.role === "rush" ? 105 : bot.role === "sniper" ? 80 : 100;
  bot.hp += mission * 10;
  bot.maxHp = bot.hp;
  bot.cooldown = Math.random() * 70;
  bot.grenadeCooldown = 400 + Math.random() * 500;
  bot.walk = Math.random() * 10;
  bot.strafe = Math.random() > 0.5 ? 1 : -1;
  bot.reaction = 20 + Math.random() * 25;

  return bot;
}

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

  if (currentWeapon === "pistol") { bodyLen = 0.7; barrelLen = 0.4; magH = 0.35; }
  if (currentWeapon === "shotgun") { bodyLen = 1.1; barrelLen = 0.95; magH = 0.25; scale = 1.08; }
  if (currentWeapon === "sniper") { bodyLen = 1.15; barrelLen = 1.35; magH = 0.42; scope = true; scale = 1.13; }

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, bodyLen), metal);
  body.position.set(0.45, -0.32, -0.75);

  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, barrelLen), metal);
  barrel.position.set(0.45, -0.32, -1.1 - barrelLen / 2);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.18, magH, 0.22), dark);
  mag.position.set(0.45, -0.6, -0.82);

  const detail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, bodyLen * .75), red);
  detail.position.set(0.45, -0.18, -0.76);

  gun.add(body, barrel, mag, detail);

  if (scope) {
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.45, 18), dark);
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

function movePlayer() {
  if (!started || paused || hp <= 0 || playerDead) return;

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const dir = new THREE.Vector3();

  if (keys.KeyW) dir.add(forward);
  if (keys.KeyS) dir.sub(forward);
  if (keys.KeyD) dir.add(right);
  if (keys.KeyA) dir.sub(right);

  dir.normalize();

  let speed = keys.ShiftLeft ? 0.32 : 0.22;
  if (abilityActive) speed *= 1.45;

  const old = player.position.clone();

  player.position.x += dir.x * speed;
  player.position.z += dir.z * speed;

  player.position.x = Math.max(-MAP_HALF + 3, Math.min(MAP_HALF - 3, player.position.x));
  player.position.z = Math.max(-MAP_HALF + 3, Math.min(MAP_HALF - 3, player.position.z));

  if (isColliding(player.position.x, player.position.z, 0.55)) {
    player.position.x = old.x;
    player.position.z = old.z;
  }

  velocityY -= 0.018;
  player.position.y += velocityY;

  if (player.position.y <= 2) {
    player.position.y = 2;
    velocityY = 0;
    canJump = true;
  }
}

function isColliding(x, z, r) {
  return colliders.some(c => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ);
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

  lastShot = now;
  w.ammo--;
  recoil += w.recoil;

  playSound("shot");

  const shots = w.pellets || 1;

  for (let i = 0; i < shots; i++) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);

    dir.x += (Math.random() - 0.5) * w.spread;
    dir.y += (Math.random() - 0.5) * w.spread;
    dir.z += (Math.random() - 0.5) * w.spread;
    dir.normalize();

    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffdd44 })
    );

    bullet.position.copy(camera.position).add(dir.clone().multiplyScalar(1.2));
    bullet.dir = dir;
    bullet.life = 120;
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
  ammoText.textContent = "...";

  setTimeout(() => {
    const need = w.mag - w.ammo;
    const take = Math.min(need, w.reserve);
    w.ammo += take;
    w.reserve -= take;
    reloading = false;
    updateHud();
  }, w.reload);
}

function throwGrenade() {
  if (!started || paused || playerDead || grenades <= 0) return;

  grenades--;

  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const grenade = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
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
    new THREE.SphereGeometry(0.22, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );

  grenade.position.copy(bot.position);
  grenade.position.y += 1.4;
  grenade.vel = dir.clone().multiplyScalar(0.95);
  grenade.vel.y += 0.35;
  grenade.timer = 100;
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

  const boom = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.65 })
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
      if (b.hp <= 0) killBot(b, i);
    }
  }

  if (team === "enemy" && !playerDead) {
    const d = player.position.distanceTo(pos);
    if (d < 11) takeDamage(Math.max(15, 105 - d * 8));
  }
}

function updateBullets() {
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
      if (b.position.x > c.minX && b.position.x < c.maxX && b.position.z > c.minZ && b.position.z < c.maxZ) {
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

        if (b.position.distanceTo(head) < 0.45) damage = b.damage * 2.2;
        else if (b.position.distanceTo(body) < 0.85) damage = b.damage;

        if (damage > 0) {
          bot.hp -= damage;
          playSound("hit");
          scene.remove(b);
          bullets.splice(i, 1);

          if (bot.hp <= 0) killBot(bot, j);

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

    let moveSpeed = 0.045;
    if (bot.role === "rush") moveSpeed = 0.075;
    if (bot.role === "rifle") moveSpeed = 0.055;
    if (bot.role === "sniper") moveSpeed = 0.038;
    if (bot.role === "support") moveSpeed = 0.048;
    if (bot.role === "boss") moveSpeed = 0.05;

    const lowHp = bot.hp < bot.maxHp * 0.35;

    if (lowHp) {
      bot.position.add(dir.clone().multiplyScalar(-moveSpeed));
      bot.position.add(side.clone().multiplyScalar(moveSpeed * 0.9));
    } else if (bot.role === "rush") {
      if (dist > 8) bot.position.add(dir.clone().multiplyScalar(moveSpeed));
      else bot.position.add(side.clone().multiplyScalar(moveSpeed));
    } else if (bot.role === "sniper") {
      if (dist < 42) bot.position.add(dir.clone().multiplyScalar(-moveSpeed));
      else if (dist > 85) bot.position.add(dir.clone().multiplyScalar(moveSpeed * 0.7));
      else bot.position.add(side.clone().multiplyScalar(moveSpeed * 0.5));
    } else {
      if (dist > 24) bot.position.add(dir.clone().multiplyScalar(moveSpeed));
      else bot.position.add(side.clone().multiplyScalar(moveSpeed));
    }

    if (Math.random() < 0.018) bot.strafe *= -1;

    if (isColliding(bot.position.x, bot.position.z, 0.55)) {
      bot.position.copy(old);
      bot.strafe *= -1;
    }

    bot.lookAt(targetPos.x, bot.position.y, targetPos.z);

    bot.walk += 0.22;
    bot.legL.rotation.x = Math.sin(bot.walk) * 0.55;
    bot.legR.rotation.x = -Math.sin(bot.walk) * 0.55;
    bot.armL.rotation.x = -Math.sin(bot.walk) * 0.28;
    bot.armR.rotation.x = Math.sin(bot.walk) * 0.28;

    bot.cooldown--;
    bot.grenadeCooldown--;

    let range = 55;
    if (bot.role === "rush") range = 34;
    if (bot.role === "rifle") range = 65;
    if (bot.role === "sniper") range = 110;
    if (bot.role === "support") range = 58;
    if (bot.role === "boss") range = 90;

    if (bot.cooldown <= 0 && dist < range && !playerDead) {
      botShoot(bot, targetPos);

      let cd = 80;
      if (bot.role === "rush") cd = 42;
      if (bot.role === "rifle") cd = 58;
      if (bot.role === "sniper") cd = 115;
      if (bot.role === "support") cd = 72;
      if (bot.role === "boss") cd = 45;

      bot.cooldown = Math.max(22, cd) + Math.random() * bot.reaction;
    }

    if (bot.grenadeCooldown <= 0 && dist > 16 && dist < 55 && Math.random() < 0.018 && !playerDead) {
      botThrowGrenade(bot, targetPos);
      bot.grenadeCooldown = 650 + Math.random() * 500;
    }
  }
}

function botShoot(bot, targetPos) {
  const dir = new THREE.Vector3().subVectors(targetPos, bot.position);
  dir.y = 1.2;
  dir.normalize();

  let accuracy = 0.09;
  let damage = 7 + mission;

  if (bot.role === "rush") { accuracy = 0.13; damage = 6 + mission; }
  if (bot.role === "rifle") { accuracy = 0.07; damage = 8 + mission; }
  if (bot.role === "sniper") { accuracy = 0.035; damage = 16 + mission * 1.4; }
  if (bot.role === "support") { accuracy = 0.08; damage = 7 + mission; }
  if (bot.role === "boss") { accuracy = 0.055; damage = 14 + mission * 2; }

  dir.x += (Math.random() - 0.5) * accuracy;
  dir.z += (Math.random() - 0.5) * accuracy;
  dir.normalize();

  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(bot.role === "sniper" ? 0.065 : 0.05, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );

  bullet.position.copy(bot.position);
  bullet.position.y += 1.4;
  bullet.dir = dir;
  bullet.life = bot.role === "sniper" ? 130 : 100;
  bullet.damage = damage;
  bullet.team = "enemy";

  scene.add(bullet);
  bullets.push(bullet);
}

function takeDamage(amount) {
  if (playerDead) return;

  let dmg = amount;

  if (shield > 0) {
    const s = Math.min(shield, dmg);
    shield -= s;
    dmg -= s;
  }

  hp -= dmg;

  damageScreen.style.opacity = 1;
  setTimeout(() => damageScreen.style.opacity = 0, 120);

  if (hp <= 0) {
    hp = 0;
    playerDead = true;
    shooting = false;
    showMessage("TE BAJARON · REINICIANDO MISIÓN");

    setTimeout(() => {
      hp = 100;
      shield = 50;
      startMission(mission);
    }, 1800);
  }

  updateHud();
}

function killBot(bot, index) {
  scene.remove(bot);
  bots.splice(index, 1);

  createDeathParticles(bot.position);

  kills++;
  missionKills++;

  checkMission();
  updateHud();
}

function createDeathParticles(pos) {
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    p.position.copy(pos);
    p.position.y += 1.2;
    p.vel = new THREE.Vector3((Math.random() - 0.5) * 0.12, Math.random() * 0.12, (Math.random() - 0.5) * 0.12);
    p.life = 30 + Math.random() * 20;
    scene.add(p);
    particles.push(p);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    if (p.grow) {
      p.scale.multiplyScalar(1.22);
      p.material.opacity *= 0.86;
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

function checkMission() {
  if (mission === 1) missionProgress.textContent = `Enemigos eliminados: ${missionKills}/5`;
  if (mission === 2) missionProgress.textContent = `Zona limpiada: ${missionKills}/9`;
  if (mission === 6) missionProgress.textContent = `Enemigos restantes: ${bots.length}`;

  if (mission === 1 && missionKills >= 5) completeMission();
  if (mission === 2 && missionKills >= 9) completeMission();
  if (mission === 6 && bots.length <= 0) completeStory();
}

function updateMissionLogic() {
  if (!started || paused || playerDead) return;

  if (mission === 3) {
    const npc = objectives.find(o => o.kind === "rescue");
    if (npc && player.position.distanceTo(npc.position) < 5) {
      missionProgress.textContent = "Aliado rescatado";
      completeMission();
    } else {
      missionProgress.textContent = "Llegá hasta el aliado";
    }
  }

  if (mission === 4) {
    missionTimer--;
    const seconds = Math.ceil(missionTimer / 60);
    missionProgress.textContent = `Sobreviví: ${seconds}s`;

    if (missionTimer % 240 === 0) spawnEnemies(2, Math.random() > 0.5 ? -80 : 40);

    if (missionTimer <= 0) completeMission();
  }

  if (mission === 5) {
    const zone = objectives.find(o => o.kind === "ESCAPE");
    if (zone && player.position.distanceTo(zone.position) < 8) {
      missionProgress.textContent = "Escape logrado";
      completeMission();
    } else {
      missionProgress.textContent = "Llegá al punto de escape";
    }
  }
}

function completeMission() {
  showMessage("MISIÓN COMPLETADA");
  started = false;

  setTimeout(() => {
    started = true;
    startMission(mission + 1);
  }, 1700);
}

function completeStory() {
  started = false;
  document.exitPointerLock();

  endTitle.textContent = "CÓDIGO ROJO COMPLETADO";
  endText.textContent = `Terminaste la historia con ${kills} bajas. Barrio recuperado.`;
  endScreen.style.display = "flex";
}

function updateCamera() {
  camera.position.set(player.position.x, player.position.y + 1.45, player.position.z);
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch + recoil;

  if (gun) {
    gun.position.z = -recoil * 7;
    gun.position.y = Math.sin(performance.now() * 0.006) * 0.008;
  }

  recoil *= 0.84;
}

function updateHud() {
  const w = weapons[currentWeapon];

  hpText.textContent = Math.floor(hp);
  shieldText.textContent = Math.floor(shield);
  weaponText.textContent = w.name;
  ammoText.textContent = w.ammo;
  reserveText.textContent = w.reserve;
  killsText.textContent = kills;
  missionNumberText.textContent = mission;
  grenadesText.textContent = grenades;

  if (abilityActive) abilityText.textContent = "Activa";
  else if (abilityReady) abilityText.textContent = "Lista";
  else abilityText.textContent = "Cargando";
}

function showMessage(text) {
  message.textContent = text;
  message.style.opacity = 1;

  setTimeout(() => {
    message.style.opacity = 0;
  }, 1300);
}

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
    updateHud();
  } else {
    updateCamera();
    updateParticles();
  }

  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}