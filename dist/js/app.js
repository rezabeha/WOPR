import {freshSession,issue,advance,tick,computerMove} from './terminal.js';
import {defaults,enableAudio,muteAudio,sound,say} from './audio.js';
import {renderGame,helpContent,settingsContent,formatTimer,paintTrial} from './views.js';
import {restoreChess} from './chess.js';
import {TRIAL_SIZE} from './tictac.js';
import {conclusion} from './war.js';
import {startVisuals} from './visuals.js';
const $=id=>document.getElementById(id);
const input=$('command'),log=$('log'),panel=$('panel'),area=$('game-area'),consoleEl=$('console');
const sessionKey='wopr.session.1',prefsKey='wopr.prefs.1';
function read(kind,key){
  try{return JSON.parse(window[kind].getItem(key));}catch{return null;}
}
function write(kind,key,obj){
  try{window[kind].setItem(key,JSON.stringify(obj));}catch{}
}
function readSession(){
  const data=read('sessionStorage',sessionKey);
  if(data?.version!==1||!data.memory||!Array.isArray(data.log)||!Array.isArray(data.recall)||!data.games)return null;
  try {if(data.games.chess)restoreChess(data.games.chess);renderGame(data,null);return data;}catch{return null;}
}
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const savedPrefs=read('localStorage',prefsKey)||{};
const prefs={...defaults,...(reduced?{motion:false,flicker:false,cursor:false,speed:'INSTANT'}:{}),...savedPrefs};
const restored=readSession(),s=restored||freshSession();
let booting=false,bootDone=null,bootTimers=[],historyIndex=s.recall.length,workingText='',picked=null;
let queue=[],typingFrame=0,lastChar=0,remainder=0,worker=null,jobId=0,pendingKey='',timerAccum=0;
const save=()=>write('sessionStorage',sessionKey,s);
function focusEntry(force=false){if(!panel.open && (force||window.matchMedia('(pointer:fine)').matches))input.focus({preventScroll:true});}
function followLog(){log.scrollTop=log.scrollHeight;}
function announce(lines){const text=lines.filter(Boolean).join(' ');if(text)$('announcer').textContent=text;}
function row(item,complete=true){
  const el=document.createElement('div');el.className='line '+(item.style||'')+(item.gap?' gap':'');
  if(complete)el.textContent=item.text;log.append(el);return el;
}
function flush(){
  if(typingFrame)cancelAnimationFrame(typingFrame);typingFrame=0;
  for(const item of queue)item.el.textContent=item.text;
  queue=[];lastChar=0;remainder=0;followLog();
}
function animate(time){
  typingFrame=0;if(!queue.length)return;
  const cps={SLOW:32,NORMAL:105,FAST:260,INSTANT:100000}[prefs.speed]||105;
  const dt=lastChar?Math.min(time-lastChar,100):16;lastChar=time;
  remainder+=dt*cps/1000;let budget=Math.floor(remainder);remainder-=budget;
  while(budget>0&&queue.length){
    const v=queue[0], count=Math.min(budget,v.text.length-v.n);
    v.n+=count;budget-=count;v.el.textContent=v.text.slice(0,v.n);
    if(v.n===v.text.length)queue.shift();
  }
  followLog();if(queue.length)typingFrame=requestAnimationFrame(animate);else{lastChar=0;remainder=0;}
}
function append(text,style='',options={}){
  if(!text)return;
  const item={text:String(text),style,gap:!!options.gap};s.log.push(item);
  if(s.log.length>120){s.log.shift();log.firstElementChild?.remove();}
  const immediate=options.instant||prefs.speed==='INSTANT'||document.hidden;
  const el=row(item,immediate);
  if(!immediate){queue.push({el,text:item.text,n:0});if(!typingFrame)typingFrame=requestAnimationFrame(animate);}
  followLog();
}
function addLines(lines=[],className='',voice=false){
  for(const text of lines)append(text,className||(/^(GREETINGS|SHALL WE|CONNECT 1200|A STRANGE|THE ONLY|HOW ABOUT A NICE|CHECKMATE|4,096 DRAWS)/.test(text)?'hot':''));
  announce(lines);if(voice)say(prefs,lines);save();
}
function caret(){
  const root=input.parentElement;root.classList.toggle('empty',!input.value);
  root.classList.toggle('selecting',input.selectionStart!==input.selectionEnd);
  root.style.setProperty('--caret-pos',String(input.selectionStart??input.value.length));
  root.style.setProperty('--text-offset',input.scrollLeft+'px');
}
function updatePrompt(){
  $('prompt').textContent=booting?'DIAL:':!s.linked?'MODEM:':!s.auth?'LOGON:':s.module?({chess:'MOVE:',tic:'INPUT:',blackjack:'TABLE:',war:'CMD:'})[s.module]:'WOPR>';
  caret();
  input.setAttribute('aria-label',(!s.auth&&s.linked)?'Logon name or terminal command':'Terminal command');
  $('entry-note').hidden=s.auth||!s.linked||booting;
  $('line-speed').textContent=s.linked&&!booting?'1200 BAUD':'MODEM IDLE';
  const war=s.module==='war'?s.games.war:null;
  $('scope-title').textContent=war?'EARLY WARNING':'SIGNAL MONITOR';
  $('scope-state').textContent=war?'DEFCON '+war.level:!s.linked?'NO CARRIER':booting?'ACQUIRING':'CARRIER LOCKED';
  $('wave-title').textContent=war?'RADAR SWEEP':'CARRIER WAVE';
  $('wave-value').textContent=war?'EXERCISE':s.linked&&!booting?'1200 HZ':'STANDBY';
  $('scope-mode').textContent=war?'SIM / LOCAL':'RX / TX';
  $('scope-canvas').setAttribute('aria-label',war?'Fictional exercise map with abstract relay and track markers':'Wireframe globe with projected coastlines and simulated carrier trace');
}
function render(){
  const cmd=document.activeElement?.closest('#game-area [data-command]')?.dataset.command;
  consoleEl.classList.toggle('game-on',Boolean(s.auth&&(s.menu||s.module)));
  consoleEl.classList.toggle('war-mode',s.module==='war');
  area.innerHTML=renderGame(s,picked);
  if(cmd){const target=[...area.querySelectorAll('[data-command]')].find(b=>b.dataset.command===cmd);target?.focus({preventScroll:true});}
  updatePrompt();
}
function applyPrefs(){
  for(const k of ['scanlines','glow','flicker','curvature','contrast'])document.body.classList.toggle(k,!!prefs[k]);
  document.body.classList.toggle('cursor-blink',!!prefs.cursor);
  $('audio-label').textContent='SOUND '+(prefs.sound?'ON':'OFF');
  $('audio-icon').setAttribute('href','#i-'+(prefs.sound?'sound':'mute'));
  $('audio-button').setAttribute('aria-pressed',String(prefs.sound));
  write('localStorage',prefsKey,prefs);
  if(prefs.speed==='INSTANT')flush();
}
function changeSound(value){
  prefs.sound=value==null?!prefs.sound:value;
  if(prefs.sound){if(!enableAudio()){prefs.sound=false;addLines(['AUDIO DEVICE UNAVAILABLE IN THIS BROWSER.']);}else sound(prefs,'beeps');}
  else muteAudio();
  applyPrefs();
}
function clearLog(){
  flush();s.log=[];log.replaceChildren();
}
function finishBoot(){
  if(!booting)return;
  bootTimers.forEach(clearTimeout);bootTimers=[];
  if(bootDone)bootDone();
  bootDone=null;booting=false;s.dialing=false;flush();render();save();
}
function dial(){
  bootTimers.forEach(clearTimeout);bootTimers=[];clearLog();
  booting=true;s.dialing=true;s.linked=true;s.auth=false;s.menu=false;s.module=null;picked=null;render();save();
  const messages=[['ATDT 555-0193','dim',0],['DIALING . . .','dim',390],['CARRIER DETECTED','',1070],['CONNECT 1200','hot',1560]];
  const factor=prefs.speed==='INSTANT'?.11:prefs.speed==='FAST'?.55:prefs.speed==='SLOW'?1.25:1;
  let next=0;
  const addThrough=i=>{while(next<=i){const [line,sty]=messages[next];append(line,sty,{gap:next===3});next++;}};
  bootDone=()=>{addThrough(3);announce(['CONNECT 1200. LOGON.']);};
  addThrough(0);for(let i=1;i<messages.length;i++)bootTimers.push(setTimeout(()=>addThrough(i),messages[i][2]*factor));
  bootTimers.push(setTimeout(finishBoot,2090*factor));sound(prefs,'modem');
}
function closePanel(){if(panel.open)panel.close();}
function openPanel(which){
  const source=which==='source';$('panel-title').textContent=source?'SOURCE ARCHIVE':which==='help'?'TERMINAL HELP':'STATION SETTINGS';
  $('panel-body').innerHTML=source?'<p>Download the terminal, game engines, tests and operator README.</p><div class="panel-actions"><a href="./wopr-source.zip" download>DOWNLOAD SOURCE ZIP</a><a href="./README.txt" target="_blank" rel="noopener">READ DOCUMENTATION</a></div>':which==='help'?helpContent(s):settingsContent(prefs);
  if(!panel.open)panel.showModal();panel.scrollTop=0;$('close-panel').focus();
}
async function fullscreen(){
  try{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if(document.body.classList.contains('full-fallback')){document.body.classList.remove('full-fallback');updateFull();return;}
    if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();return;}
  }catch{}
  document.body.classList.toggle('full-fallback');updateFull();
}
function updateFull(){
  const el=document.querySelector('.keys [data-command="FULLSCREEN"]'),on=Boolean(document.fullscreenElement||document.body.classList.contains('full-fallback'));
  el.setAttribute('aria-pressed',String(on));el.title=on?'Leave full screen':'Enter full screen';
}
document.addEventListener('fullscreenchange',updateFull);
function cancelJob(){jobId++;worker?.terminate();worker=null;pendingKey='';}
async function compute(hint=false){
  if(s.module!=='chess'||s.games.chess.result)return;
  const c=s.games.chess,g=restoreChess(c),fen=g.fen(),key=fen+'|'+c.level+'|'+hint;
  if(pendingKey===key)return;
  cancelJob();const token=jobId;pendingKey=key;
  const data={fen,history:[...c.moves],level:c.level};
  const complete=move=>{
    if(token!==jobId)return;
    cancelJob();
    if(s.module!=='chess'||s.games.chess!==c||c.result||restoreChess(c).fen()!==fen||!move)return;
    if(hint){const suggested=g.move(move);if(suggested)addLines(['CANDIDATE MOVE: '+suggested.san+' ('+move.from+'–'+move.to+').']);}
    else{const lines=computerMove(s,move);addLines(lines);say(prefs,lines);sound(prefs,'activity');}
    render();save();
  };
  const fallback=async()=>{if(token!==jobId)return;try{const {chooseMove}=await import('./search.js');if(token===jobId)complete(chooseMove(fen,data.history,'CADET'));}catch{const m=g.moves({verbose:true})[0];if(m)complete({from:m.from,to:m.to,promotion:m.promotion});}};
  try{
    worker=new Worker(new URL('./chess-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=e=>{if(e.data?.move)complete(e.data.move);else fallback();};
    worker.onerror=e=>{e.preventDefault();fallback();};
    worker.postMessage(data);
  }catch{fallback();}
}
function resumeOpponent(){
  if(s.module==='chess'&&!s.games.chess.result&&s.games.chess.moves.length%2)compute();
}
function submit(raw,{shortcut=false}={}){
  const clean=String(raw||'').trim();
  if(!clean){if(booting)finishBoot();flush();return;}
  if(prefs.sound)enableAudio();
  if(booting && !['SOUND','SETTINGS','HELP','FULLSCREEN'].includes(clean.toUpperCase()))finishBoot();
  flush();
  if(!shortcut){
    if(s.recall.at(-1)!==clean)s.recall.push(clean);if(s.recall.length>60)s.recall.shift();
    append($('prompt').textContent+' '+clean.toUpperCase(),'echo',{instant:true});input.value='';
  }
  historyIndex=s.recall.length;workingText='';picked=null;
  try{
    const oldModule=s.module,oldGame=s.games.chess,oldMoves=oldGame?.moves.length;
    const r=issue(s,clean);
    if(oldModule!==s.module||oldGame!==s.games.chess||oldMoves!==s.games.chess?.moves.length||s.games.chess?.result)cancelJob();
    if(r.clear)clearLog();
    if(r.reboot){cancelJob();dial();return;}
    if(r.ui==='help'||r.ui==='settings'||r.ui==='source'){openPanel(r.ui);}
    else if(r.ui==='fullscreen'){fullscreen();}
    else if(r.ui==='audio'){changeSound(r.value);}
    if(r.lines.length){
      const finalReport=s.module==='war'&&s.games.war.phase==='conclusion'&&r.lines.includes(conclusion[0]);
      addLines(finalReport?r.lines.slice(0,1):r.lines,'',s.auth && (r.voice || s.module!=='chess'));
      if(finalReport){announce(conclusion);say(prefs,conclusion);}
      sound(prefs,s.module==='war'&&s.games.war.level<=2?'radar':'beeps');
    }
    render();save();
    if(r.effect==='chessHint')compute(true);else resumeOpponent();
    if(!r.ui)focusEntry();
  }catch{
    addLines(['INPUT COULD NOT BE PROCESSED. TYPE HELP FOR THE ACTIVE COMMANDS.'],'dim');updatePrompt();
  }
}
$('command-form').addEventListener('submit',e=>{e.preventDefault();submit(input.value);});
input.addEventListener('input',()=>{caret();sound(prefs,'keys');});
for(const event of ['keyup','click','scroll','select','focus'])input.addEventListener(event,caret);
document.addEventListener('selectionchange',()=>{if(document.activeElement===input)caret();});
input.addEventListener('keydown',e=>{
  if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
  if(!s.recall.length)return;e.preventDefault();
  if(historyIndex===s.recall.length)workingText=input.value;
  historyIndex=Math.max(0,Math.min(s.recall.length,historyIndex+(e.key==='ArrowUp'?-1:1)));
  input.value=historyIndex===s.recall.length?workingText:s.recall[historyIndex];input.setSelectionRange(input.value.length,input.value.length);updatePrompt();
});
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  const keys={F1:'HELP',F2:'SETTINGS',F3:'RECONNECT',F4:'FULLSCREEN'};
  if(keys[e.key]){e.preventDefault();if(panel.open)closePanel();submit(keys[e.key],{shortcut:true});return;}
  if(e.key==='Escape'&&document.body.classList.contains('full-fallback')&&!panel.open){document.body.classList.remove('full-fallback');updateFull();}
  if(!panel.open && e.target===document.body && e.key.length===1){focusEntry(true);}
});
document.addEventListener('click',e=>{
  const sq=e.target.closest('[data-square]');
  if(sq && s.module==='chess'){
    const pos=restoreChess(s.games.chess),square=sq.dataset.square;
    if(pos.turn()!=='w'||s.games.chess.result)return;
    if(pos.get(square)?.color==='w'){picked=picked===square?null:square;render();area.querySelector('[data-square="'+square+'"]')?.focus({preventScroll:true});}
    else if(picked){const from=picked;picked=null;submit(from+square);}
    return;
  }
  const el=e.target.closest('[data-command]');
  if(el){if(panel.open)closePanel();submit(el.dataset.command,{shortcut:el.closest('.controls')!==null});return;}
  if(e.target===log || e.target.parentElement===log){if(!window.getSelection()?.toString())focusEntry();}
});
$('close-panel').addEventListener('click',closePanel);
panel.addEventListener('close',()=>focusEntry());
panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel();}});
panel.addEventListener('change',e=>{
  const key=e.target.dataset.pref;if(!(key in defaults))return;
  if(key==='sound'){changeSound(e.target.checked);e.target.checked=prefs.sound;}
  else{prefs[key]=e.target.type==='checkbox'?e.target.checked:key==='animation'?Number(e.target.value):e.target.value;applyPrefs();if(key==='voice'&&!prefs.voice)window.speechSynthesis?.cancel();}
});
let lastSim=performance.now(),endingTime=0;
setInterval(()=>{
  const now=performance.now(),delta=Math.min(500,now-lastSim);lastSim=now;
  if(document.hidden||panel.open)return;
  const w=s.module==='war'?s.games.war:null, t=s.module==='tic'?s.games.tic.trial:null;
  if(w?.phase==='analysis'||(t&&t.count<TRIAL_SIZE)){
    const lines=advance(s,Math.max(1,Math.round(64*prefs.animation)));
    if(lines.length&&w?.phase==='conclusion'){endingTime=0;addLines(lines.slice(0,1),'hot');}
    else if(lines.length){addLines(lines,'hot',true);sound(prefs,'beeps');}
    if(lines.length)render();else if(prefs.motion||Math.floor((w?.trial||t).count/64)%6===0)paintTrial(area,w?.trial||t,w,prefs.motion&&prefs.boardMotion);
    save();
    if((w?.frame||t?.count||0)%8===0)sound(prefs,'activity');
  }else if(w?.phase==='conclusion' && (w.reveal??3)<3){
    endingTime+=delta*prefs.animation;
    if(endingTime>=1100||prefs.speed==='INSTANT'){
      endingTime=0;const line=conclusion[w.reveal++];render();announce([line]);say(prefs,[line],true);save();
    }
  }else if(w&&['signal','decision'].includes(w.phase)){
    timerAccum+=delta*prefs.animation;
    if(timerAccum>=1000){timerAccum-=1000;const lines=tick(s);
      if(lines.length){render();addLines(lines,'',true);sound(prefs,'radar');}else if($('war-timer'))$('war-timer').textContent=formatTimer(w.seconds);
      save();
    }
  }else timerAccum=0;
},135);
function showClock(){$('clock').textContent=new Date().toISOString().slice(11,19)+' UTC';}
showClock();setInterval(showClock,1000);
applyPrefs();updateFull();
if(restored&&!s.dialing){for(const item of s.log)row(item);render();followLog();resumeOpponent();}else dial();
startVisuals($('scope-canvas'),$('wave'),()=>({linked:s.linked&&!booting,war:s.module==='war'?s.games.war:null,prefs}));
focusEntry();
