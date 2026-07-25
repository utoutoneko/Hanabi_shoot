(function(){
"use strict";

/* ============================================================
   UTIL
============================================================ */
function fmt(n){
  n = Math.floor(n);
  if(!isFinite(n)) return "0";
  if(n < 10000) return n.toLocaleString('ja-JP');
  const units = [{v:1e16,s:'京'},{v:1e12,s:'兆'},{v:1e8,s:'億'},{v:1e4,s:'万'}];
  for(const u of units){
    if(n >= u.v){
      let s = (n/u.v).toFixed(2);
      s = s.replace(/\.?0+$/,'');
      return s + u.s;
    }
  }
  return n.toString();
}
function rand(a,b){ return a + Math.random()*(b-a); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function lerp(a,b,t){ return a+(b-a)*t; }
function hexToRgb(hex){
  hex = hex.replace('#','');
  if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const num = parseInt(hex,16);
  return [(num>>16)&255,(num>>8)&255,num&255];
}
function mixColor(hexA,hexB,t){
  const a=hexToRgb(hexA), b=hexToRgb(hexB);
  const r = a[0]+(b[0]-a[0])*t, g = a[1]+(b[1]-a[1])*t, bl = a[2]+(b[2]-a[2])*t;
  return `rgb(${r|0},${g|0},${bl|0})`;
}

/* ============================================================
   GAME DATA
============================================================ */
const SHELLS = [
  {id:'s0', name:'3号玉',  cost:0,       value:1,   note:'まずはここから。小気味よい一発。'},
  {id:'s1', name:'5号玉',  cost:60,      value:3,   note:'花が少し大きくなる。'},
  {id:'s2', name:'7号玉',  cost:400,     value:9,   note:'夜空に映える尺の入り口。'},
  {id:'s3', name:'尺玉(10号)', cost:2600,   value:24,  note:'直径約320m、日本の定番大玉。'},
  {id:'s4', name:'二尺玉(20号)', cost:18000,  value:70,  note:'轟音と共に開く大輪。'},
  {id:'s5', name:'三尺玉(30号)', cost:120000, value:230, note:'一発で街の話題になる規模。'},
  {id:'s6', name:'四尺玉(40号)', cost:900000, value:800, note:'世界最大級、伝説の一発。'},
];

const GENERATORS = [
  {id:'g0', name:'見習い職人', desc:'まだ手元がおぼつかない新米。それでも毎秒コツコツ打つ。', baseCost:20,    baseCps:0.15, count:0},
  {id:'g1', name:'玉屋',       desc:'江戸の名門、玉屋の流れを汲む工房。', baseCost:150,   baseCps:1,    count:0},
  {id:'g2', name:'鍵屋',       desc:'玉屋と並ぶもう一つの名門。腕は確か。', baseCost:1300,  baseCps:7,    count:0},
  {id:'g3', name:'打上げ筒一式', desc:'筒を並べて連続発射。壮観の一言。', baseCost:13000,  baseCps:45,   count:0},
  {id:'g4', name:'スターマイン装置', desc:'速射連発、まさに星の雨。', baseCost:150000, baseCps:260,  count:0},
  {id:'g5', name:'実行委員会', desc:'町ぐるみで打ち上げを取り仕切る。', baseCost:1600000,baseCps:1500, count:0},
  {id:'g6', name:'伝説の花火師', desc:'名前を出さずとも夜空でわかる、あの人。', baseCost:22000000,baseCps:8200, count:0},
];

const POWDERS = [
  {id:'p0', name:'特製火薬・壱', desc:'全生産 +50%', cost:800,     mult:1.5, kind:'all', bought:false},
  {id:'p1', name:'会心の一発',   desc:'クリックの15%が会心(3倍)になる', cost:6000, mult:1, kind:'crit', bought:false},
  {id:'p2', name:'職人の技術書', desc:'職人の生産 +100%', cost:20000,  mult:2,   kind:'passive', bought:false},
  {id:'p3', name:'特製火薬・弐', desc:'全生産 +75%', cost:60000,   mult:1.75,kind:'all', bought:false},
  {id:'p4', name:'大玉解禁許可証', desc:'全生産 +150%', cost:400000, mult:2.5, kind:'all', bought:false},
  {id:'p5', name:'特製火薬・参', desc:'全生産 +100%', cost:3000000,mult:2,   kind:'all', bought:false},
];

const SHAPES = [
  {id:'kiku',   name:'菊',       req:0,     desc:'王道の大輪。多色に開く。'},
  {id:'botan',  name:'牡丹',     req:100,   desc:'尾を引かない、清らかな一色の花。'},
  {id:'yanagi', name:'柳',       req:500,   desc:'金色の光が滝のように垂れ落ちる。'},
  {id:'senrin', name:'千輪',     req:2000,  desc:'開いた先でさらに小さな花が咲く。'},
  {id:'kamuro', name:'冠(かむろ)', req:8000,  desc:'開花の途中で色が変わる二段咲き。'},
  {id:'heart',  name:'ハート',   req:30000, desc:'夜空に描く、ちょっと照れくさい形。'},
  {id:'legend', name:'八重芯・極', req:150000,desc:'二重の芯を持つ、職人技の到達点。'},
];

const MAPS = {
  river:    {name:'川辺',   clickMult:1.15, passiveMult:1.0,  sky:['#050916','#0c1638','#132247']},
  mountain: {name:'山',     clickMult:1.0,  passiveMult:1.15, sky:['#040611','#0a0e26','#141032']},
  festival: {name:'祭り会場', clickMult:1.07, passiveMult:1.07, sky:['#0a0612','#1c0e1f','#2a1220']},
};

const RANKS = [
  {req:0,name:'見習い'},{req:1000,name:'花火士'},{req:20000,name:'花火師'},
  {req:300000,name:'名工'},{req:3000000,name:'大花火師'},{req:30000000,name:'夜空の主'},
];

/* ============================================================
   STATE
============================================================ */
let state = {
  currency:0,
  lifetimeEarned:0,
  totalLaunches:0,
  shellIdx:0,
  generators: GENERATORS.map(g=>({id:g.id,count:0})),
  powders: POWDERS.map(p=>({id:p.id,bought:false})),
  currentShape:'kiku',
  map:'river',
  prestigePoints:0,
};

let activeTab = 'artisans';
let saveVersion = 'hanabi-clicker-save-v1';

/* ============================================================
   DERIVED GETTERS
============================================================ */
function shellData(){ return SHELLS[state.shellIdx]; }
function nextShell(){ return SHELLS[state.shellIdx+1]; }

function powderMult(kind){
  let m = 1;
  for(const p of state.powders){
    if(!p.bought) continue;
    const def = POWDERS.find(d=>d.id===p.id);
    if(def.kind==='all' || def.kind===kind) m *= def.mult;
  }
  return m;
}
function critInfo(){
  const bought = state.powders.find(p=>p.id==='p1' && p.bought);
  return bought ? {chance:0.15, mult:3} : {chance:0, mult:1};
}
function prestigeMult(){ return 1 + state.prestigePoints*0.02; }
function mapDef(){ return MAPS[state.map]; }

function currentClickValue(){
  return shellData().value * powderMult('click') * prestigeMult() * mapDef().clickMult;
}
function totalCps(){
  let sum = 0;
  for(const g of state.generators){
    const def = GENERATORS.find(d=>d.id===g.id);
    sum += def.baseCps * g.count;
  }
  return sum * powderMult('passive') * prestigeMult() * mapDef().passiveMult;
}
function generatorCost(g){
  const def = GENERATORS.find(d=>d.id===g.id);
  return Math.ceil(def.baseCost * Math.pow(1.15, g.count));
}
function unlockedShapes(){
  return SHAPES.filter(s=>state.totalLaunches>=s.req);
}
function currentRank(){
  let r = RANKS[0];
  for(const x of RANKS){ if(state.lifetimeEarned>=x.req) r = x; }
  return r.name;
}

/* ============================================================
   CANVAS / FIREWORKS ENGINE (realistic depth build)
============================================================ */
const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
let W=0,H=0,DPR=1;
let vignetteGrad=null;
let stars=[];

function resize(){
  DPR = Math.min(window.devicePixelRatio||1, 2);
  const rect = canvas.getBoundingClientRect();
  W = rect.width; H = rect.height;
  canvas.width = W*DPR; canvas.height = H*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  buildVignette();
}
function buildVignette(){
  if(W<=0||H<=0) return;
  vignetteGrad = ctx.createRadialGradient(W/2,H*0.42,H*0.2, W/2,H*0.42,H*0.85);
  vignetteGrad.addColorStop(0,'rgba(0,0,0,0)');
  vignetteGrad.addColorStop(1,'rgba(0,0,0,0.5)');
}
function initStars(){
  stars = [];
  for(let i=0;i<70;i++){
    stars.push({x:Math.random(), y:Math.random()*0.62, size:rand(0.5,1.6), phase:rand(0,Math.PI*2), speed:rand(0.4,1.1)});
  }
}
window.addEventListener('resize', resize);

let rockets = [];
let particles = [];
let texts = [];
let flashes = [];
let smokePuffs = [];
let shakeMag = 0;
function addShake(v){ shakeMag = Math.min(shakeMag+v, 9); }

const SHAPE_PALETTE = {
  kiku:   ['#ff5e5e','#ffd166','#06d6a0','#4cc9f0','#f72585','#ffffff'],
  botan:  ['#ff6b6b','#ffd93d','#6bc6ef','#c77dff','#ff9f6b'],
  yanagi: ['#ffd700','#ffb703','#fb8500'],
  senrin: ['#f72585','#7209b7','#4361ee','#4cc9f0','#80ffdb'],
  kamuro: ['#ffffff','#ff006e','#8338ec','#3a86ff'],
  heart:  ['#ff4d6d','#ff8fa3','#ffccd5','#ffd77a'],
  legend: ['#ffffff','#ffd700','#ff5e5e','#4cc9f0','#c77dff']
};

function makeParticle(x,y,ang,speed,color,opts){
  opts = opts||{};
  return {
    x,y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed,
    life:0, maxLife: opts.maxLife || rand(55,85),
    color, size: opts.size || rand(1.6,2.8),
    gravity: opts.gravity!=null?opts.gravity:0.045,
    drag: opts.drag!=null?opts.drag:0.985,
    trail: [], trailLen: opts.trailLen || 3,
    twinkle: opts.twinkle||false,
    colorShift: opts.colorShift||null,
    secondary: opts.secondary||false, secondaryDone:false,
    crackle: opts.crackle||false, crackleDone:false,
    z: opts.z!=null ? opts.z : 1,
    omega: opts.omega!=null ? opts.omega : rand(-0.022,0.022),
  };
}

function spawnBurst(x,y,shape,tierIdx,isAuto){
  const baseCount = isAuto ? 46 : (44 + tierIdx*22);
  const count = clamp(baseCount, 30, 220);
  const palette = SHAPE_PALETTE[shape] || SHAPE_PALETTE.kiku;
  const speedScale = 1 + tierIdx*0.13;
  const burstZ = rand(0.65,1.5); // depth of this whole shell — gives varied "distance" per firework

  function z(){ return clamp(burstZ + rand(-0.09,0.09), 0.5, 1.65); }
  function maybeCrackle(p){ return Math.random()<0.17 ? Object.assign(p,{}) : p; }

  if(shape==='heart'){
    for(let i=0;i<count;i++){
      const t = (i/count)*Math.PI*2;
      const hx = 16*Math.pow(Math.sin(t),3);
      const hy = -(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t));
      const ang = Math.atan2(hy,hx);
      const dist = Math.hypot(hx,hy);
      const speed = dist*0.22*speedScale;
      const c = Math.random()<0.15 ? '#ffd77a' : pick(palette);
      particles.push(makeParticle(x,y,ang,speed,c,{maxLife:rand(50,72),gravity:0.05,trailLen:3,z:z(),omega:rand(-0.01,0.01)}));
    }
  } else if(shape==='yanagi'){
    for(let i=0;i<count;i++){
      const ang = rand(0,Math.PI*2);
      const speed = rand(1.5,4.2)*speedScale;
      particles.push(makeParticle(x,y,ang,speed,pick(palette),{
        maxLife:rand(85,120), gravity:0.09, drag:0.99, trailLen:6, twinkle:true, z:z(), omega:rand(-0.012,0.012)
      }));
    }
  } else if(shape==='senrin'){
    for(let i=0;i<count;i++){
      const ang = rand(0,Math.PI*2);
      const speed = rand(2.2,4.6)*speedScale;
      particles.push(makeParticle(x,y,ang,speed,pick(palette),{
        maxLife:rand(45,60), gravity:0.04, trailLen:3, secondary:(i%4===0), z:z()
      }));
    }
  } else if(shape==='kamuro'){
    for(let i=0;i<count;i++){
      const ang = (i/count)*Math.PI*2 + rand(-.05,.05);
      const speed = rand(2.6,4.4)*speedScale;
      particles.push(makeParticle(x,y,ang,speed,'#ffffff',{
        maxLife:rand(60,90), gravity:0.05, trailLen:4, twinkle:true,
        colorShift: pick(palette.slice(1)), z:z(), crackle: Math.random()<0.18
      }));
    }
  } else if(shape==='legend'){
    for(let i=0;i<count;i++){
      const ang = (i/count)*Math.PI*2;
      const speed = rand(3.2,5.2)*speedScale;
      particles.push(makeParticle(x,y,ang,speed,pick(palette),{maxLife:rand(55,80),gravity:0.045,trailLen:4,z:z(),crackle:Math.random()<0.2}));
    }
    const innerCount = Math.floor(count*0.4);
    for(let i=0;i<innerCount;i++){
      const ang = (i/innerCount)*Math.PI*2;
      const speed = rand(1.0,2.0)*speedScale;
      particles.push(makeParticle(x,y,ang,speed,'#ffffff',{maxLife:rand(40,55),gravity:0.04,trailLen:2,size:1.4,z:clamp(burstZ+0.15,0.5,1.7)}));
    }
  } else if(shape==='botan'){
    const c = pick(palette);
    for(let i=0;i<count;i++){
      const ang = (i/count)*Math.PI*2 + rand(-.04,.04);
      const speed = rand(2.6,4.2)*speedScale;
      particles.push(makeParticle(x,y,ang,speed,c,{maxLife:rand(50,68),gravity:0.045,trailLen:1,size:2.2,z:z(),omega:rand(-0.006,0.006)}));
    }
  } else {
    // kiku - default
    for(let i=0;i<count;i++){
      const ang = (i/count)*Math.PI*2 + rand(-.06,.06);
      const speed = rand(2.4,4.6)*speedScale;
      particles.push(makeParticle(x,y,ang,speed,pick(palette),{maxLife:rand(55,85),gravity:0.045,trailLen:3,twinkle:Math.random()<0.3,z:z(),crackle:Math.random()<0.16}));
    }
  }

  if(particles.length > 2200){
    particles.splice(0, particles.length-2200);
  }

  spawnFlash(x,y, 0.9 + tierIdx*0.28 + (isAuto?0:0.2));
  addShake((isAuto?0.5:1.1) + tierIdx*0.7);
}

function spawnFlash(x,y,scale){
  flashes.push({x,y,life:0,maxLife:16,scale:scale||1});
}
function updateFlashes(){
  for(let i=flashes.length-1;i>=0;i--){
    flashes[i].life++;
    if(flashes[i].life>=flashes[i].maxLife) flashes.splice(i,1);
  }
}
function drawFlashes(){
  ctx.globalCompositeOperation='lighter';
  for(const f of flashes){
    const t = f.life/f.maxLife;
    const r = lerp(3, 50*f.scale, Math.min(1,t*1.6));
    const alpha = (1-t)*0.6;
    if(alpha<=0) continue;
    const grad = ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,r);
    grad.addColorStop(0, `rgba(255,255,240,${alpha})`);
    grad.addColorStop(0.35, `rgba(255,225,170,${alpha*0.55})`);
    grad.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(f.x,f.y,r,0,Math.PI*2); ctx.fill();
  }
}

function spawnRocket(targetX, targetY, shape, tierIdx, isAuto, onExplode){
  const startX = targetX + rand(-16,16);
  rockets.push({
    x:startX, y:H+6, tx:targetX, ty:targetY,
    sway: rand(-0.4,0.4), t:0,
    color: pick(SHAPE_PALETTE[shape]||SHAPE_PALETTE.kiku),
    trail:[], shape, tierIdx, isAuto, onExplode
  });
}

function addFloatingText(x,y,text,color){
  texts.push({x,y,text,color,life:0,maxLife:60});
}

function maybeSpawnSmoke(r){
  if(Math.random()<0.55){
    smokePuffs.push({x:r.x+rand(-2,2), y:r.y+rand(-2,2), size:rand(1.6,3.2), life:0, maxLife:rand(28,46), vy:rand(-0.08,0.05), vx:rand(-0.05,0.05)});
  }
}
function updateSmoke(){
  for(let i=smokePuffs.length-1;i>=0;i--){
    const s = smokePuffs[i];
    s.life++; s.y+=s.vy; s.x+=s.vx; s.size += 0.035;
    if(s.life>=s.maxLife) smokePuffs.splice(i,1);
  }
  if(smokePuffs.length>180) smokePuffs.splice(0, smokePuffs.length-180);
}
function drawSmoke(){
  ctx.globalCompositeOperation='source-over';
  for(const s of smokePuffs){
    const t = s.life/s.maxLife;
    ctx.globalAlpha = (1-t)*0.14;
    ctx.fillStyle = '#e8e6f2';
    ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function updateRockets(dt){
  for(let i=rockets.length-1;i>=0;i--){
    const r = rockets[i];
    r.t += dt*2.2;
    r.x = r.x + Math.sin(r.t*3)*r.sway;
    r.y = lerp(H+6, r.ty, clamp(r.t,0,1));
    r.trail.push({x:r.x,y:r.y});
    if(r.trail.length>8) r.trail.shift();
    maybeSpawnSmoke(r);
    if(r.t>=1){
      spawnBurst(r.x, r.y, r.shape, r.tierIdx, r.isAuto);
      if(r.onExplode) r.onExplode();
      rockets.splice(i,1);
    }
  }
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.trail.push({x:p.x,y:p.y});
    if(p.trail.length>p.trailLen) p.trail.shift();

    // gentle spin curl for organic, "alive" trajectories
    if(p.omega){
      const c = Math.cos(p.omega), s = Math.sin(p.omega);
      const nvx = p.vx*c - p.vy*s;
      const nvy = p.vx*s + p.vy*c;
      p.vx = nvx; p.vy = nvy;
    }
    p.vx *= p.drag; p.vy *= p.drag;
    p.vy += p.gravity;
    p.x += p.vx * p.z; // depth subtly scales apparent motion (parallax)
    p.y += p.vy * p.z;
    p.life++;

    if(p.secondary && !p.secondaryDone && p.life>p.maxLife*0.45){
      p.secondaryDone = true;
      for(let k=0;k<7;k++){
        const ang = rand(0,Math.PI*2);
        particles.push(makeParticle(p.x,p.y,ang,rand(0.8,1.8),p.color,{maxLife:rand(24,34),gravity:0.04,trailLen:2,size:1.3,z:p.z}));
      }
    }
    if(p.crackle && !p.crackleDone && p.life>p.maxLife*0.55){
      p.crackleDone = true;
      for(let k=0;k<4;k++){
        const ang = rand(0,Math.PI*2);
        particles.push(makeParticle(p.x,p.y,ang,rand(0.6,1.4),'#fff8d8',{maxLife:rand(13,20),gravity:0.02,trailLen:1,size:1,z:p.z}));
      }
    }
    if(p.life>=p.maxLife) particles.splice(i,1);
  }
  if(particles.length>2200) particles.splice(0, particles.length-2200);
}
function updateTexts(){
  for(let i=texts.length-1;i>=0;i--){
    const t = texts[i];
    t.y -= 0.5; t.life++;
    if(t.life>=t.maxLife) texts.splice(i,1);
  }
}

/* ---- background per map ---- */
function drawBackground(t){
  const m = mapDef();
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, m.sky[0]);
  g.addColorStop(0.55, m.sky[1]);
  g.addColorStop(1, m.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  ctx.globalCompositeOperation='source-over';
  for(const s of stars){
    const a = 0.2+0.35*Math.abs(Math.sin(t*0.001*s.speed+s.phase));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.size, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if(state.map==='mountain'){
    ctx.fillStyle = 'rgba(4,5,10,0.9)';
    ctx.beginPath();
    ctx.moveTo(0,H);
    ctx.lineTo(0,H*0.82);
    ctx.lineTo(W*0.18,H*0.62);
    ctx.lineTo(W*0.34,H*0.78);
    ctx.lineTo(W*0.52,H*0.55);
    ctx.lineTo(W*0.7,H*0.76);
    ctx.lineTo(W*0.86,H*0.6);
    ctx.lineTo(W,H*0.8);
    ctx.lineTo(W,H);
    ctx.closePath();
    ctx.fill();
  } else if(state.map==='festival'){
    ctx.fillStyle = 'rgba(6,4,10,0.92)';
    const baseY = H*0.86;
    ctx.fillRect(0,baseY,W,H-baseY);
    for(let i=0;i<7;i++){
      const sx = (i+0.5)*(W/7);
      ctx.fillRect(sx-14, baseY-38, 28, 38);
      ctx.fillStyle = i%2===0 ? 'rgba(200,60,40,0.5)' : 'rgba(232,182,77,0.35)';
      ctx.beginPath(); ctx.ellipse(sx, baseY-46, 6,8,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(6,4,10,0.92)';
    }
    const glow = ctx.createLinearGradient(0,baseY-10,0,baseY+2);
    glow.addColorStop(0,'rgba(255,170,90,0.12)'); glow.addColorStop(1,'rgba(255,170,90,0)');
    ctx.fillStyle = glow; ctx.fillRect(0,baseY-10,W,14);
  } else {
    const baseY = H*0.82;
    const rg = ctx.createLinearGradient(0,baseY,0,H);
    rg.addColorStop(0,'rgba(20,40,80,0.35)'); rg.addColorStop(1,'rgba(4,6,16,0.85)');
    ctx.fillStyle = rg; ctx.fillRect(0,baseY,W,H-baseY);
  }
}

function particleColorAt(p, lifeRatio){
  const base = (p.colorShift && lifeRatio>0.4) ? p.colorShift : p.color;
  if(lifeRatio<0.12){
    return mixColor('#ffffff', base, lifeRatio/0.12);
  } else if(lifeRatio>0.7){
    const t = clamp((lifeRatio-0.7)/0.3, 0, 1);
    return mixColor(base, '#4a1508', t);
  }
  return base;
}

function drawParticleList(list){
  for(const p of list){
    const lifeRatio = p.life/p.maxLife;
    const alpha = clamp(1-lifeRatio,0,1);
    if(alpha<=0) continue;
    const color = particleColorAt(p, lifeRatio);
    const z = p.z;
    const farSoft = z < 0.95;

    for(let i=0;i<p.trail.length;i++){
      const pt = p.trail[i];
      ctx.globalAlpha = alpha*(i/(p.trail.length||1))*0.42;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,p.size*0.55*z,0,Math.PI*2); ctx.fill();
    }
    // soft halo (glow / bloom, simulates depth-of-field for far shells)
    const haloR = p.size*z*(farSoft?3.4:2.1);
    ctx.globalAlpha = alpha*(farSoft?0.20:0.32);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x,p.y,haloR,0,Math.PI*2); ctx.fill();
    // bright core
    let coreSize = p.size*z;
    if(p.twinkle) coreSize *= (0.7+0.6*Math.abs(Math.sin(p.life*0.6)));
    ctx.globalAlpha = alpha*(farSoft?0.72:1);
    ctx.fillStyle = lifeRatio<0.12 ? mixColor('#ffffff', color, lifeRatio/0.12) : color;
    ctx.beginPath(); ctx.arc(p.x,p.y,coreSize,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRiverReflection(){
  if(state.map!=='river') return;
  const baseY = H*0.82;
  ctx.save();
  ctx.beginPath(); ctx.rect(0,baseY,W,H-baseY); ctx.clip();
  ctx.translate(0, baseY*2);
  ctx.scale(1,-1);
  const far = particles.filter(p=>p.z<0.95);
  const near = particles.filter(p=>p.z>=0.95);
  drawParticleListDim(far, 0.16, baseY);
  drawParticleListDim(near, 0.24, baseY);
  ctx.restore();
}
function drawParticleListDim(list, alphaMult, minY){
  for(const p of list){
    if(p.y < minY-60) continue;
    const lifeRatio = p.life/p.maxLife;
    const a = clamp(1-lifeRatio,0,1)*alphaMult;
    if(a<=0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = particleColorAt(p,lifeRatio);
    ctx.beginPath(); ctx.arc(p.x+rand(-0.6,0.6), p.y, p.size*p.z*0.9, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
}

function render(now){
  const sx = shakeMag>0.06 ? rand(-1,1)*shakeMag : 0;
  const sy = shakeMag>0.06 ? rand(-1,1)*shakeMag : 0;

  drawBackground(now);
  drawRiverReflection();

  ctx.save();
  ctx.translate(sx,sy);

  drawSmoke();

  ctx.globalCompositeOperation = 'lighter';
  drawFlashes();

  // rockets: flame trail + glow head
  for(const r of rockets){
    for(let i=0;i<r.trail.length;i++){
      const pt = r.trail[i];
      const a = i/r.trail.length;
      ctx.globalAlpha = a*0.55;
      ctx.fillStyle = r.color;
      ctx.beginPath(); ctx.arc(pt.x,pt.y, 1.4+a*2.2, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = r.color;
    ctx.beginPath(); ctx.arc(r.x,r.y,5,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(r.x,r.y,1.8,0,Math.PI*2); ctx.fill();
  }

  // depth-ordered particles: far layer first (hazy), near layer on top (sharp/bright)
  const far = [], near = [];
  for(const p of particles){ (p.z<0.95 ? far : near).push(p); }
  drawParticleList(far);
  drawParticleList(near);

  ctx.globalCompositeOperation='source-over';
  ctx.restore();

  // floating gain texts (not shaken, stays readable)
  for(const t of texts){
    const a = clamp(1-t.life/t.maxLife,0,1);
    ctx.globalAlpha = a;
    ctx.fillStyle = t.color;
    ctx.font = "600 15px 'Shippori Mincho', serif";
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  // vignette for cinematic depth
  if(vignetteGrad){
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0,0,W,H);
  }
}

let lastTime = performance.now();
let autoAccumulator = 0;
function loop(now){
  const dt = Math.min((now-lastTime)/16.67, 3);
  lastTime = now;

  const gain = totalCps() * (dt*16.67/1000);
  if(gain>0){ state.currency += gain; state.lifetimeEarned += gain; }

  const genCount = state.generators.reduce((a,g)=>a+g.count,0);
  const rate = clamp(0.15 + genCount*0.035, 0, 4.5);
  autoAccumulator += rate * (dt*16.67/1000);
  while(autoAccumulator>=1){
    autoAccumulator -= 1;
    const shapes = unlockedShapes();
    const shp = pick(shapes).id;
    const tx = rand(W*0.15,W*0.85);
    const ty = rand(H*0.18,H*0.55);
    spawnRocket(tx,ty,shp, Math.min(state.shellIdx,3), true);
  }

  updateRockets(dt);
  updateParticles(dt);
  updateTexts();
  updateFlashes();
  updateSmoke();
  shakeMag *= 0.87;
  if(shakeMag<0.05) shakeMag = 0;

  render(now);
  updateHud();

  requestAnimationFrame(loop);
}

/* ============================================================
   ACTIONS
============================================================ */
function launchAt(px,py){
  const targetY = py!=null ? clamp(py, H*0.12, H*0.65) : rand(H*0.18,H*0.55);
  const targetX = px!=null ? clamp(px, W*0.08, W*0.92) : rand(W*0.2,W*0.8);
  const crit = critInfo();
  const isCrit = Math.random() < crit.chance;
  const value = currentClickValue() * (isCrit? crit.mult : 1);

  spawnRocket(targetX, targetY, state.currentShape, state.shellIdx, false, ()=>{
    state.currency += value;
    state.lifetimeEarned += value;
    state.totalLaunches += 1;
    addFloatingText(targetX, targetY-6, (isCrit? '会心! +':'+')+fmt(value), isCrit? '#ffd77a':'#ffffff');
  });
}

function buyShell(){
  const nx = nextShell();
  if(!nx) return;
  if(state.currency>=nx.cost){
    state.currency -= nx.cost;
    state.shellIdx += 1;
    renderTab();
  }
}
function buyGenerator(id){
  const g = state.generators.find(x=>x.id===id);
  const cost = generatorCost(g);
  if(state.currency>=cost){
    state.currency -= cost;
    g.count += 1;
    renderTab();
  }
}
function buyPowder(id){
  const p = state.powders.find(x=>x.id===id);
  const def = POWDERS.find(d=>d.id===id);
  if(p.bought) return;
  if(state.currency>=def.cost){
    state.currency -= def.cost;
    p.bought = true;
    renderTab();
  }
}
function selectShape(id){
  const s = SHAPES.find(x=>x.id===id);
  if(state.totalLaunches < s.req) return;
  state.currentShape = id;
  renderTab();
}
function doPrestige(){
  const gain = Math.floor(Math.sqrt(state.lifetimeEarned/1e6));
  if(gain<1) return;
  const ok = window.confirm('来年へ継承しますか？花火玉・玉の等級・職人の数がリセットされ、伝統点 +'+gain+' を獲得します。(進化と地図は引き継がれます)');
  if(!ok) return;
  state.prestigePoints += gain;
  state.currency = 0;
  state.shellIdx = 0;
  state.generators.forEach(g=>g.count=0);
  state.powders.forEach(p=>p.bought=false);
  renderTab();
}
function doReset(){
  const ok = window.confirm('本当に最初からやり直しますか？この操作は取り消せません。');
  if(!ok) return;
  state = {
    currency:0, lifetimeEarned:0, totalLaunches:0, shellIdx:0,
    generators: GENERATORS.map(g=>({id:g.id,count:0})),
    powders: POWDERS.map(p=>({id:p.id,bought:false})),
    currentShape:'kiku', map:'river', prestigePoints:0,
  };
  renderTab();
  save();
}

/* ============================================================
   UI RENDER
============================================================ */
const tabContent = document.getElementById('tabContent');

function cardHTML({badge,name,desc,right,rightSub,cls,dataAttr}){
  return `<div class="card ${cls||''}" ${dataAttr||''}>
    <div class="badge">${badge}</div>
    <div class="info"><div class="name">${name}</div><div class="desc">${desc}</div></div>
    <div class="right"><div class="cost">${right}</div><div class="count">${rightSub||''}</div></div>
  </div>`;
}

function renderTab(){
  let html = '';
  if(activeTab==='artisans'){
    html += `<div class="section-title"><span class="dot"></span>自動で花火を打ち上げる職人たち</div>`;
    for(const def of GENERATORS){
      const g = state.generators.find(x=>x.id===def.id);
      const cost = generatorCost(g);
      const afford = state.currency>=cost;
      html += cardHTML({
        badge: def.name[0],
        name: def.name, desc: def.desc,
        right: fmt(cost)+' 玉', rightSub: '所有 '+g.count+'　毎秒+'+fmt(def.baseCps*g.count),
        cls: afford?'affordable':'', dataAttr:`data-buy-gen="${def.id}"`
      });
    }
  } else if(activeTab==='shells'){
    html += `<div class="section-title"><span class="dot"></span>玉の等級(威力・見た目が変化)</div>`;
    SHELLS.forEach((s,i)=>{
      if(i < state.shellIdx){
        html += cardHTML({badge:'済', name:s.name, desc:s.note, right:'取得済', cls:'disabled'});
      } else if(i === state.shellIdx){
        html += cardHTML({badge:'現', name:s.name, desc:s.note+'（現在の等級）', right:'—', cls:'selected'});
      } else if(i === state.shellIdx+1){
        const afford = state.currency>=s.cost;
        html += cardHTML({badge:'次', name:s.name, desc:s.note, right:fmt(s.cost)+' 玉', cls:afford?'affordable':'', dataAttr:'data-buy-shell="1"'});
      } else {
        html += cardHTML({badge:'鍵', name:s.name, desc:'前の等級を取得すると解放', right:'未解放', cls:'disabled'});
      }
    });
  } else if(activeTab==='powder'){
    html += `<div class="section-title"><span class="dot"></span>火薬配合(永続効果・一度きり)</div>`;
    for(const def of POWDERS){
      const p = state.powders.find(x=>x.id===def.id);
      if(p.bought){
        html += cardHTML({badge:'済', name:def.name, desc:def.desc, right:'取得済', cls:'disabled'});
      } else {
        const afford = state.currency>=def.cost;
        html += cardHTML({badge:'薬', name:def.name, desc:def.desc, right:fmt(def.cost)+' 玉', cls:afford?'affordable':'', dataAttr:`data-buy-powder="${def.id}"`});
      }
    }
  } else if(activeTab==='evolution'){
    html += `<div class="section-title"><span class="dot"></span>形状の進化(打ち上げ数で解放・選択可)</div>`;
    for(const s of SHAPES){
      const unlocked = state.totalLaunches >= s.req;
      const selected = state.currentShape===s.id;
      html += cardHTML({
        badge: unlocked? s.name[0] : '?',
        name: s.name, desc: unlocked? s.desc : `総打ち上げ ${fmt(s.req)} 回で解放`,
        right: unlocked? (selected?'選択中':'選ぶ') : '未解放',
        cls: unlocked? (selected?'selected affordable':'affordable') : 'disabled',
        dataAttr: unlocked? `data-select-shape="${s.id}"` : ''
      });
    }
  }
  tabContent.innerHTML = html;
}

function updateHud(){
  document.getElementById('currencyVal').textContent = fmt(state.currency);
  document.getElementById('cpsLine').textContent = '毎秒 +'+fmt(totalCps())+'　打上回数 '+fmt(state.totalLaunches);
  document.getElementById('rankLine').textContent = '称号: '+currentRank();
  document.getElementById('lifetimeEarned').textContent = fmt(state.lifetimeEarned);
  const pg = Math.floor(Math.sqrt(state.lifetimeEarned/1e6));
  document.getElementById('prestigeGain').textContent = '+'+pg;
  document.getElementById('prestigeBtn').disabled = pg<1;

  if(hudTick % 20 === 0) renderTab();
  hudTick++;
}
let hudTick=0;

/* ============================================================
   EVENT WIRING
============================================================ */
document.getElementById('tabBar').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-tab]');
  if(!btn) return;
  activeTab = btn.dataset.tab;
  document.querySelectorAll('#tabBar button').forEach(b=>b.classList.toggle('active', b===btn));
  renderTab();
});

tabContent.addEventListener('click', (e)=>{
  const genBtn = e.target.closest('[data-buy-gen]');
  if(genBtn){ buyGenerator(genBtn.dataset.buyGen); return; }
  const shellBtn = e.target.closest('[data-buy-shell]');
  if(shellBtn){ buyShell(); return; }
  const powderBtn = e.target.closest('[data-buy-powder]');
  if(powderBtn){ buyPowder(powderBtn.dataset.buyPowder); return; }
  const shapeBtn = e.target.closest('[data-select-shape]');
  if(shapeBtn){ selectShape(shapeBtn.dataset.selectShape); return; }
});

document.getElementById('mapTabs').addEventListener('click',(e)=>{
  const btn = e.target.closest('button[data-map]');
  if(!btn) return;
  state.map = btn.dataset.map;
  document.querySelectorAll('#mapTabs button').forEach(b=>b.classList.toggle('active', b===btn));
});

document.getElementById('prestigeBtn').addEventListener('click', doPrestige);
document.getElementById('resetBtn').addEventListener('click', doReset);

canvas.addEventListener('pointerdown', (e)=>{
  const rect = canvas.getBoundingClientRect();
  launchAt(e.clientX-rect.left, e.clientY-rect.top);
});
document.getElementById('launchBtn').addEventListener('click', (e)=>{
  e.stopPropagation();
  launchAt(null,null);
});

/* ---- hidden fuzei mode ---- */
const fuzei = document.getElementById('fuzei');
document.getElementById('emberBtn').addEventListener('click', ()=>{
  fuzei.classList.add('show');
});
document.getElementById('fuzeiBack').addEventListener('click', ()=>{
  fuzei.classList.remove('show');
});
document.getElementById('fuzeiBtn').addEventListener('click', ()=>{
  const shapes = unlockedShapes();
  const shp = pick(shapes).id;
  const tx = rand(W*0.2,W*0.8);
  const ty = rand(H*0.15,H*0.5);
  spawnRocket(tx,ty,shp, Math.max(2,state.shellIdx), false);
});

/* ============================================================
   SAVE / LOAD (persistent storage)
============================================================ */
async function save(){
  try{
    if(window.storage && window.storage.set){
      await window.storage.set(saveVersion, JSON.stringify(state), false);
    }
  }catch(err){ console.error('save failed', err); }
}
async function load(){
  try{
    if(window.storage && window.storage.get){
      const res = await window.storage.get(saveVersion, false);
      if(res && res.value){
        const loaded = JSON.parse(res.value);
        state = Object.assign(state, loaded);
        state.generators = GENERATORS.map(def=>{
          const found = (loaded.generators||[]).find(g=>g.id===def.id);
          return {id:def.id, count: found? found.count:0};
        });
        state.powders = POWDERS.map(def=>{
          const found = (loaded.powders||[]).find(p=>p.id===def.id);
          return {id:def.id, bought: found? !!found.bought:false};
        });
      }
    }
  }catch(err){ console.error('load failed (starting fresh)', err); }
}

/* ============================================================
   INIT
============================================================ */
async function init(){
  resize();
  initStars();
  await load();
  document.querySelectorAll('#mapTabs button').forEach(b=>b.classList.toggle('active', b.dataset.map===state.map));
  renderTab();
  updateHud();
  lastTime = performance.now();
  requestAnimationFrame(loop);
  setInterval(save, 6000);
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeunload', save);
  setTimeout(()=>{ const h=document.getElementById('hint'); h.style.transition='opacity 1s'; h.style.opacity='0'; }, 6000);
}
init();

})();
