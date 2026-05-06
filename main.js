import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

let scene=new THREE.Scene();
let camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
let renderer=new THREE.WebGLRenderer();
renderer.setSize(innerWidth,innerHeight);
document.body.appendChild(renderer.domElement);

let player=new THREE.Object3D();
scene.add(player);
scene.add(camera);

let bullets=[];
let bots=[];
let keys={};

let hp=100;
let kills=0;
let yaw=0,pitch=0;
let shooting=false;
let recoil=0;
let cameraShake=0;
let streak=0;

const hitmarker=document.getElementById("hitmarker");
const killFeed=document.getElementById("killFeed");

document.getElementById("playBtn").onclick=()=>{
 document.getElementById("menu").style.display="none";
 document.body.requestPointerLock();
 spawnBots();
}

document.addEventListener("mousemove",e=>{
 yaw-=e.movementX*0.002;
 pitch-=e.movementY*0.002;
});

document.addEventListener("mousedown",()=>shooting=true);
document.addEventListener("mouseup",()=>shooting=false);

function shoot(){
 recoil+=0.05;
 cameraShake+=0.05;

 let dir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation);

 let bullet=new THREE.Mesh(
  new THREE.SphereGeometry(0.05),
  new THREE.MeshBasicMaterial({color:0xffff00})
 );

 bullet.position.copy(camera.position);
 bullet.dir=dir;
 bullet.life=100;

 scene.add(bullet);
 bullets.push(bullet);
}

function updateBullets(){
 bullets.forEach((b,i)=>{
  b.position.add(b.dir.clone().multiplyScalar(1.5));
  b.life--;

  bots.forEach((bot,j)=>{
   if(b.position.distanceTo(bot.position)<1){
    bot.hp-=20;

    showHitmarker();
    createBlood(bot.position);

    if(bot.hp<=0){
     scene.remove(bot);
     bots.splice(j,1);
     kills++;
     streak++;
     addFeed("ELIMINADO x"+streak);
    }

    scene.remove(b);
    bullets.splice(i,1);
   }
  });

  if(b.life<=0){
   scene.remove(b);
   bullets.splice(i,1);
  }
 });
}

function showHitmarker(){
 hitmarker.style.opacity=1;
 hitmarker.style.transform="translate(-50%,-50%) scale(1.3)";
 setTimeout(()=>{
  hitmarker.style.opacity=0;
  hitmarker.style.transform="translate(-50%,-50%) scale(.5)";
 },100);
}

function addFeed(text){
 let d=document.createElement("div");
 d.className="feedItem";
 d.textContent=text;
 killFeed.prepend(d);
 setTimeout(()=>d.remove(),2000);
}

function createBlood(pos){
 for(let i=0;i<5;i++){
  let p=new THREE.Mesh(
   new THREE.SphereGeometry(0.05),
   new THREE.MeshBasicMaterial({color:"red"})
  );
  p.position.copy(pos);
  scene.add(p);
 }
}

function spawnBots(){
 for(let i=0;i<6;i++){
  let bot=new THREE.Mesh(
   new THREE.BoxGeometry(1,2,1),
   new THREE.MeshBasicMaterial({color:"white"})
  );
  bot.position.set(Math.random()*20-10,1,-20);
  bot.hp=100;
  scene.add(bot);
  bots.push(bot);
 }
}

function animate(){
 requestAnimationFrame(animate);

 if(shooting) shoot();
 updateBullets();

 camera.position.set(player.position.x,2,player.position.z);
 camera.rotation.y=yaw;
 camera.rotation.x=pitch+recoil;

 if(cameraShake>0){
  camera.position.x+=(Math.random()-0.5)*cameraShake;
  cameraShake*=0.9;
 }

 recoil*=0.9;

 renderer.render(scene,camera);
}

animate();