/* ================= 游戏引擎 ================= */
const $ = id => document.getElementById(id);
const elTitle = $('titleScreen'), elName = $('nameScreen'), elGame = $('gameScreen'), elEnd = $('endScreen');
const elBg = $('bg'), elBgFx = $('bgFx'), elBox = $('dialogBox'), elText = $('text');
const elSpeaker = $('speaker'), elNext = $('nextInd'), elChoices = $('choices');
const elAffFill = $('affFill'), elAffNum = $('affNum'), elPop = $('affPop');
const elCC = $('chapterCard'), elCCT = $('ccTitle'), elCCS = $('ccSub'), elToast = $('toast');
const elTag = $('chapterTag');
const SAVE_KEY = 'galgame_save_v1';

const st = { name:'悠真', aff:0, i:0, chapter:'序章' };
let LABELS = {}, typing=false, typeTimer=null, fullText='', locked=false;

/* 建立 label 索引 */
SCRIPT.forEach((n,i)=>{ if(n.type==='label') LABELS[n.name]=i; });

const sub = t => String(t||'').replace(/\{name\}/g, st.name);

/* ---------- 小工具 ---------- */
function show(elm){ [elTitle,elName,elGame,elEnd].forEach(e=>e.classList.remove('on')); elm.classList.add('on'); }
function toast(msg){
  elToast.textContent = msg; elToast.classList.add('on');
  clearTimeout(elToast._t); elToast._t = setTimeout(()=>elToast.classList.remove('on'),1100);
}
function updateAff(delta){
  elAffFill.style.width = Math.min(100, Math.max(0, st.aff/20*100)) + '%';
  elAffNum.textContent = st.aff;
  if(delta){
    elPop.textContent = (delta>0?'+':'') + delta + ' ❤';
    elPop.style.color = delta>0 ? '#ff9ecb' : '#8fb8ff';
    elPop.classList.remove('show'); void elPop.offsetWidth; elPop.classList.add('show');
    clearTimeout(elPop._t); elPop._t = setTimeout(()=>elPop.classList.remove('show'),900);
  }
}
function setBg(cls, fx){
  elBg.className = cls || 'bg-day';
  elBgFx.className = fx || '';
}

/* ---------- 打字机 ---------- */
let tick = 0;
function audioBlip(){
  try{
    const C = window.AudioContext || window.webkitAudioContext; if(!C) return;
    window._ac = window._ac || new C();
    const ac = window._ac, o = ac.createOscillator(), g = ac.createGain();
    o.type='sine'; o.frequency.value = 1400 + Math.random()*300;
    g.gain.value = 0.012; o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.02);
  }catch(e){}
}
function say(node){
  const who = node.who;
  elSpeaker.textContent = (who==='me' ? st.name : who==='ynn' ? 'ynn' : '');
  elSpeaker.style.display = (who==='me'||who==='ynn') ? 'block' : 'none';
  elSpeaker.style.background = who==='ynn'
    ? 'linear-gradient(90deg,#ff5f9e,#ffa5cc)'
    : 'linear-gradient(90deg,#2b5cff,#79a9ff)';
  elBox.classList.toggle('narr', !(who==='me'||who==='ynn'));
  elBox.classList.add('on');

  fullText = sub(node.text);
  elText.textContent = '';
  elNext.style.opacity = 0;
  typing = true; tick = 0;
  let i = 0;
  clearInterval(typeTimer);
  typeTimer = setInterval(()=>{
    i++;
    elText.textContent = fullText.slice(0, i);
    if(++tick % 3 === 0) audioBlip();
    if(i >= fullText.length) finishType();
  }, 26);
}
function finishType(){
  clearInterval(typeTimer); typing = false;
  elText.textContent = fullText;
  elNext.style.opacity = 1;
}

/* ---------- 章节卡 ---------- */
function chapterCard(title, sub2, cb){
  elCCT.textContent = title; elCCS.textContent = sub2 || '';
  elTag.textContent = title.replace(/\s/g,'');
  elCC.classList.add('on');
  setTimeout(()=>{ elCC.classList.remove('on'); cb(); }, 1900);
}

/* ---------- 选项 ---------- */
function ask(node){
  elChoices.innerHTML = '';
  elChoices.style.display = 'flex';
  node.options.forEach(o=>{
    const b = document.createElement('button');
    b.className = 'choice'; b.type = 'button';
    b.textContent = o.text;
    b.onclick = ev=>{
      ev.stopPropagation();
      elChoices.style.display = 'none'; elChoices.innerHTML = '';
      if(o.aff){ st.aff = Math.max(0, st.aff + o.aff); updateAff(o.aff); }
      st.i = LABELS[o.to]; run();
    };
    elChoices.appendChild(b);
  });
}

/* ---------- 主循环 ---------- */
function run(){
  if(st.i >= SCRIPT.length) return;
  const n = SCRIPT[st.i];
  switch(n.type){
    case 'chapter':
      doSave(true);
      chapterCard(n.title, n.sub, ()=>{ st.i++; run(); });
      break;
    case 'bg':
      setBg(n.cls, n.fx); st.i++; run(); break;
    case 'say':
      doSave(true); say(n); break;
    case 'choice':
      ask(n); break;
    case 'label':
      st.i++; run(); break;
    case 'jump':
      st.i = LABELS[n.to]; run(); break;
    case 'check': {
      let target = null;
      for(const b of n.branches){ if(st.aff >= b.min){ target = b.to; break; } }
      st.i = LABELS[target]; run(); break;
    }
    case 'end':
      showEnding(n); break;
    default:
      st.i++; run();
  }
}
function next(){
  if(st.i >= SCRIPT.length) return;
  const n = SCRIPT[st.i];
  if(n.type === 'choice') return;          // 选项时不响应点击
  if(typing){ finishType(); return; }       // 第一次点：显示全部
  if(n.type === 'say'){ st.i++; run(); }    // 第二次点：下一句
}

/* ---------- 存档 ---------- */
function doSave(silent){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({name:st.name, aff:st.aff, i:st.i, ts:Date.now()}));
    if(!silent) toast('已存档');
  }catch(e){}
}
function loadSave(){
  try{
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if(!s) return null;
    return s;
  }catch(e){ return null; }
}
function applySave(s){
  st.name = s.name; st.aff = s.aff; st.i = s.i;
  updateAff(0);
  // 回退到一个安全的起点（say 或 choice）
  while(st.i > 0 && SCRIPT[st.i] && SCRIPT[st.i].type === 'say' ) { break; }
  show(elGame);
  run();
  if(typing) finishType();
}

/* ---------- 结局 ---------- */
function showEnding(n){
  $('endKind').textContent = n.kind;
  $('endTitle').textContent = n.title;
  $('endText').textContent = sub(n.text);
  $('endScore').textContent = (n.affText||'好感度：') + ' ' + st.aff;
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  elBox.classList.remove('on');
  show(elEnd);
}

/* ---------- 开始流程 ---------- */
$('startBtn').onclick = ()=>{ show(elName); setTimeout(()=>$('nameInput').focus(), 260); };
$('okBtn').onclick = startGame;
$('nameInput').addEventListener('keydown', e=>{ if(e.key === 'Enter') startGame(); });

function startGame(){
  const v = $('nameInput').value.trim();
  st.name = v || '悠真';
  st.aff = 0; st.i = 0;
  updateAff(0); setBg('bg-day','');
  show(elGame);
  run();
}
function backToTitle(){
  clearInterval(typeTimer); typing=false;
  elChoices.style.display='none'; elBox.classList.remove('on');
  show(elTitle);
  $('continueBtn').style.display = loadSave() ? 'block' : 'none';
}

/* 继续游戏 */
const sv = loadSave();
if(sv) $('continueBtn').style.display = 'block';
$('continueBtn').onclick = ()=>{ const s = loadSave(); if(s) applySave(s); };

/* 游戏内点击推进 */
elGame.addEventListener('click', e=>{
  if(e.target.closest('#menuBar') || e.target.closest('.choice')) return;
  next();
});
document.addEventListener('keydown', e=>{
  if(!elGame.classList.contains('on')) return;
  if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); next(); }
});

/* 菜单按钮 */
$('btnSave').onclick = ()=>{ clearInterval(typeTimer); typing=false; elText.textContent=fullText; elNext.style.opacity=1; doSave(false); };
$('btnLoad').onclick = ()=>{ const s = loadSave(); if(s){ applySave(s); toast('已读档'); } else toast('没有存档'); };
$('btnTitle').onclick = backToTitle;
$('btnAgain').onclick = ()=>{ st.i = 0; st.aff = 0; updateAff(0); setBg('bg-day',''); show(elName); setTimeout(()=>$('nameInput').focus(),260); };
$('btnBackTitle').onclick = backToTitle;

/* 图片加载失败时的兜底提示 */
$('sprite').onerror = ()=>{ console.warn('立绘图片未找到：images/protagonist.png'); };
