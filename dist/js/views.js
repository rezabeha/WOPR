import {asciiBoard,formatHistory,openingName,restoreChess} from './chess.js';
import {catalogue,moduleName} from './terminal.js';
import {total} from './blackjack.js';
import {scenarios,conclusion} from './war.js';
import {TRIAL_SIZE} from './tictac.js';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const action=(cmd,label=cmd,cl='')=>'<button type="button" class="'+cl+'" data-command="'+esc(cmd)+'">'+esc(label)+'</button>';
const actions=commands=>'<div class="action-line">'+commands.map(item=>Array.isArray(item)?action(...item):action(item)).join('')+'</div>';
const heading=(title,tag='')=>'<div class="game-heading"><h3>'+esc(title)+'</h3><span class="tag">'+esc(tag)+'</span></div>';
const note=t=>'<p class="module-note">'+esc(t)+'</p>';
const symbols={w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}};
const pieces={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
function chessView(st,picked){
  const g=restoreChess(st),title=st.result||((st.moves.length%2)?'COMPUTING REPLY':'WHITE TO MOVE');
  const cells=g.board().map((row,i)=>row.map((p,j)=>{
    const sq='abcdefgh'[j]+(8-i);
    return '<button type="button" data-square="'+sq+'" class="'+((i+j)%2?'dark ':'')+(picked===sq?'picked':'')+'" aria-pressed="'+(picked===sq)+'" aria-label="'+sq+(p?' '+(p.color==='w'?'white ':'black ')+pieces[p.type]:' empty square')+'">'+(p?symbols[p.color][p.type]:'')+'<small aria-hidden="true">'+sq+'</small></button>';
  }).join('')).join('');
  const board=st.view==='ASCII'?'<pre class="board-ascii" aria-label="ASCII chessboard. Uppercase pieces are white.">'+esc(asciiBoard(g))+'</pre>':'<div class="board-graphic" role="group" aria-label="Chessboard. Select an origin and a destination.">'+cells+'</div>';
  const recent=st.moves.length?formatHistory(st.moves).split(/ (?=\d+\.)/).slice(-3).join(' '):'NO MOVES RECORDED';
  return heading('CHESS',st.level+' / '+st.view)+board+'<div class="game-meta"><span>'+esc(title)+'</span><span>'+esc(openingName(st.moves))+'</span></div>'+note(recent)+
    (st.promotion?note('PROMOTE PAWN TO')+actions(['QUEEN','ROOK','BISHOP','KNIGHT']):'')+
    (st.selectLevel?actions(['CADET','OPERATOR','EXPERT']):'')+
    actions(['HINT','UNDO',[st.view==='ASCII'?'GRAPHIC':'ASCII',st.view==='ASCII'?'GRAPHIC BOARD':'ASCII BOARD'],'HISTORY','LEVEL','NEW GAME','EXIT']);
}
function grid(board,playable){
  return '<div class="ttt-grid" role="group" aria-label="Tic-tac-toe grid">'+board.map((v,i)=>playable?'<button type="button" data-command="'+(i+1)+'" class="'+(v?'':'available')+'" aria-label="Square '+(i+1)+', '+(v||'empty')+'" '+(v?'disabled':'')+'>'+(v||i+1)+'</button>':'<span>'+(v||'·')+'</span>').join('')+'</div>';
}
const fmt=n=>Number(n).toLocaleString('en-US');
const trialRows=(trial,war)=>war?[['RUNS',fmt(war.projections)],['ESCALATED / LOSS',fmt(war.losses)],['RESTRAINT',fmt(war.quiet)],['GRID DRAWS',fmt(trial.draws)]]:[['GAMES',fmt(trial.count)+' / '+fmt(TRIAL_SIZE)],['X WINS',fmt(trial.xWins)],['O WINS',fmt(trial.oWins)],['DRAWS',fmt(trial.draws)]];
function trialView(trial,war){
  return '<div class="trial-row">'+grid(trial.board,false)+'<dl class="counts">'+trialRows(trial,war).map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('')+'</dl></div><div class="gauge"><span style="width:'+(trial.count/TRIAL_SIZE*100)+'%"></span></div>';
}
export function paintTrial(area,trial,war,animateBoard=true){
  const values=trialRows(trial,war);
  if(animateBoard)area.querySelectorAll('.trial-row .ttt-grid span').forEach((el,i)=>{el.textContent=trial.board[i]||'·';});
  area.querySelectorAll('.counts dd').forEach((el,i)=>{el.textContent=values[i][1];});
  const meter=area.querySelector('.gauge span');if(meter)meter.style.width=trial.count/TRIAL_SIZE*100+'%';
  const sample=area.querySelector('[data-model-report]');if(sample&&war)sample.textContent='MODEL / '+war.sample;
}
function ticView(t){
  let body='';
  if(t.trial)body=trialView(t.trial)+actions(t.trial.count===TRIAL_SIZE?['NEW GAME','GLOBAL THERMONUCLEAR WAR','EXIT']:[['SKIP','FINISH CALCULATION'],'EXIT']);
  else body=grid(t.board,!t.result)+note(t.result?(t.result==='DRAW'?'RESULT / DRAW':'RESULT / '+t.result+' WINS'):'OPERATOR / X     COMPUTER / O')+actions(['HINT',['LEARN','ZERO PLAYERS'],'NEW GAME','EXIT']);
  return heading('TIC-TAC-TOE',t.trial?'SELF-PLAY':'LOGIC MODULE')+body;
}
function bjView(b){
  function hand(label,cards,hide=false){
    return '<div class="card-hand"><span class="hand-label">'+esc(label)+'</span><div class="cards">'+cards.map((c,i)=>hide&&i===1?'<span class="playing-card hidden" aria-label="Face-down card">▒</span>':'<span class="playing-card">'+esc(c)+'</span>').join('')+'</div></div>';
  }
  const open=b.phase==='play';
  return heading('BLACK JACK','BANK '+fmt(b.bank)+' CHIPS')+hand('DEALER'+(open?'':' / '+total(b.dealer).value),b.dealer,open)+b.hands.map((h,i)=>hand((b.hands.length>1?'HAND '+(i+1):'OPERATOR')+' / '+total(h.cards).value+' / BET '+h.bet+(open?(b.hands.length>1 && !h.done && i===b.active?' / ACTIVE':''):' / '+h.result),h.cards)).join('')+actions(open?['HIT','STAND','DOUBLE','SPLIT','RULES','EXIT']:['DEAL','RULES','NEW GAME','EXIT']);
}
const timer=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
export const formatTimer=timer;
function warView(w){
  let body='';
  if(w.phase==='side')body=note('SELECT AN EXERCISE SIDE')+['UNITED STATES','SOVIET UNION'].map((n,i)=>action(n,(i+1)+'  '+n,'choice')).join('');
  if(w.phase==='scenario')body=note('SELECT A FICTIONAL SCENARIO')+scenarios.map((s,i)=>action(String(i+1),(i+1)+'  '+s.name,'choice')).join('');
  if(['signal','decision'].includes(w.phase)){
    body='<div class="war-strip"><strong>DEFCON '+w.level+'</strong><span>INTERVAL <b id="war-timer">'+timer(w.seconds)+'</b></span></div>'+note(scenarios[w.scenario].name+' / '+w.side)+note(w.phase==='signal'?scenarios[w.scenario].signal:w.decision==='ESCALATE'?'SIMULATED LAUNCH TRACES DETECTED.':'RELAY HOLDING. AWAITING BOTH STATIONS.')+(w.evidence.length?note('FILED / '+w.evidence.map(e=>e==='verify'?'SIGNAL VERIFIED':'CHANNEL CONTACT').join(' + ')):'')+
    actions(w.phase==='signal'?['VERIFY SIGNAL','OPEN CHANNEL','HOLD','STAND DOWN','ESCALATE']:['STAND DOWN','OPEN CHANNEL','CONTINUE']);
  }
  if(w.phase==='analysis')body=note('EXERCISE RECORD / '+w.outcome)+trialView(w.trial,w)+'<p class="module-note" data-model-report>MODEL / '+esc(w.sample)+'</p>'+actions([['SKIP','FINISH CALCULATION']]);
  if(w.phase==='conclusion')body=note('EXERCISE RECORD / '+w.outcome)+trialView(w.trial,w)+'<div class="terminal-end">'+conclusion.slice(0,w.reveal??3).join('<br>')+'</div>'+((w.reveal??3)>=3?actions(['CHESS','NEW GAME','EXIT']):actions([['SKIP','COMPLETE TRANSMISSION']]));
  return heading('GLOBAL THERMONUCLEAR WAR','EXERCISE')+body;
}
export function renderGame(s,picked){
  if(s.menu)return heading('GAME DIRECTORY','04 ONLINE / 06 ARCHIVED')+'<div class="menu-list">'+catalogue.map(([name,id],i)=>'<button type="button" data-command="'+(i+1)+'" class="'+(id?'active':'archive')+'"><span class="n">'+String(i+1).padStart(2,'0')+'</span><span>'+esc(name)+'</span><span class="bank">'+(id?'ONLINE':'OFFLINE')+'</span></button>').join('')+'</div>';
  if(s.module==='chess')return chessView(s.games.chess,picked);
  if(s.module==='tic')return ticView(s.games.tic);
  if(s.module==='blackjack')return bjView(s.games.blackjack);
  if(s.module==='war')return warView(s.games.war);
  return '';
}
const helpRows=rows=>'<dl class="help-list">'+rows.map(([a,b])=>'<div class="help-row"><dt>'+esc(a)+'</dt><dd>'+esc(b)+'</dd></div>').join('')+'</dl>';
export function helpContent(s){
  const common=[['HELP / F1','Operator reference'],['SETTINGS / F2','Display and audio'],['TEST SOUND','Play two notes and check the output level'],['RECONNECT / F3','Dial the remote line'],['FULLSCREEN / F4','Expand the terminal']];
  let rows;
  if(!s.auth)rows=[['LOGON','Type an account name'],['HINT','Request an archive clue'],['LOGOFF','Hang up the line']];
  else rows=({chess:[['e4 / e2e4 / P-K4','Move a piece'],['PAWN TO KING FOUR','Descriptive language'],['LEVEL CADET / OPERATOR / EXPERT','Set search difficulty'],['BOARD / ASCII / GRAPHIC','Display the position'],['HINT / UNDO / HISTORY','Analyze or review'],['RESIGN / CLAIM DRAW','End the game'],['NEW GAME / EXIT','Restart or leave']],
    tic:[['1 – 9','Choose a square'],['LEARN / ZERO PLAYERS','Run 4,096 perfect games'],['HINT / NEW GAME','Study or restart']],
    blackjack:[['HIT / STAND','Play the current hand'],['DOUBLE / SPLIT','Change your stake'],['BET 25 / DEAL','Start the next round'],['RULES / BALANCE','Read the table record']],
    war:[['1 / 2 / 3','Choose a side or scenario'],['VERIFY SIGNAL / OPEN CHANNEL','Gather evidence'],['HOLD / ESCALATE','Change alert status'],['STAND DOWN / CONTINUE','Resolve the exercise'],['SKIP','Finish active projections']]}
    )[s.module]||[['LIST GAMES','Read the game directory'],['HINT','Request a clue'],['STATUS / DIR','Inspect local records'],['LOGOFF','Hang up the line']];
  const visibleActions=!s.auth?[['HINT','REQUEST A CLUE']]:s.module?[['EXIT','RETURN TO TERMINAL'],['LIST GAMES','GAME DIRECTORY']]:[['LIST GAMES','GAME DIRECTORY'],['SOURCE','SOURCE FILES']];
  return '<h3>'+(s.module?esc(moduleName(s.module)):'OPERATOR REFERENCE')+'</h3>'+helpRows(rows)+'<h3>STATION CONTROLS</h3>'+helpRows(common)+'<p class="panel-note">Enter sends a command. Up and down recall previous input. An empty Enter completes the current transmission.</p><div class="panel-actions">'+visibleActions.map(v=>action(...v)).join('')+'</div>';
}
export function settingsContent(p){
  const check=(key,title)=>'<label class="setting-row"><span>'+title+'</span><input type="checkbox" data-pref="'+key+'" '+(p[key]?'checked':'')+'></label>';
  const select=(key,title,options)=>'<label class="setting-row"><span>'+title+'</span><select data-pref="'+key+'">'+options.map(([v,label])=>'<option value="'+v+'" '+(String(p[key])===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';
  return '<h3>DISPLAY</h3>'+select('speed','Typing speed',[['SLOW','Slow'],['NORMAL','Normal'],['FAST','Fast'],['INSTANT','Instant']])+select('animation','Simulation speed',[['0.5','0.5×'],['1','1×'],['2','2×'],['4','4×']])+
    [['scanlines','Scanlines'],['glow','Phosphor glow'],['flicker','CRT flicker'],['curvature','Screen curvature'],['cursor','Blinking cursor'],['contrast','High contrast']].map(x=>check(...x)).join('')+
    '<h3>MOTION</h3>'+[['motion','Enable instrument motion'],['globeMotion','Rotate globe and relay'],['waveMotion','Animate carrier wave'],['trackMotion','Animate radar and tracks'],['boardMotion','Animate self-play boards']].map(x=>check(...x)).join('')+
    '<h3>AUDIO</h3>'+check('sound','Enable sound')+
    '<label class="setting-row" for="volume-control"><span>Output volume</span><span class="volume-controls"><input id="volume-control" data-pref="volume" type="range" min="0" max="100" step="5" value="'+esc(p.volume)+'"><span id="volume-value" aria-hidden="true">'+esc(p.volume)+'%</span></span></label>'+
    '<div class="panel-actions"><button type="button" id="audio-test">Test sound</button></div><p class="panel-note" id="audio-status" role="status"></p>'+
    [['modem','Modem handshake'],['keys','Keyboard clicks'],['beeps','Terminal beeps'],['radar','Radar alerts'],['activity','Computer activity'],['voice','Joshua speech']].map(x=>check(...x)).join('')+
    '<p class="panel-note">Joshua speech uses a voice installed in your browser.</p>';
}
