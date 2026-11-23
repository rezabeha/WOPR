import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../dist/vendor/chess.js';
import {parseMove,restoreChess,asciiBoard,openingName,canClaim,gameOutcome,repetitionCount} from '../dist/js/chess.js';
import {chooseMove} from '../dist/js/search.js';
import {place,initialTic,runTrials,newTrial,TRIAL_SIZE} from '../dist/js/tictac.js';
import {initialBJ,deal,total,cardAction} from '../dist/js/blackjack.js';
import {initialWar,warCommand,tickWar,project,scenarios,conclusion} from '../dist/js/war.js';
import {freshSession,issue,advance,computerMove,catalogue} from '../dist/js/terminal.js';
import {renderGame,settingsContent,helpContent} from '../dist/js/views.js';
import {defaults} from '../dist/js/audio.js';
const session=()=>{const s=freshSession();issue(s,'JOSHUA');return s;};
const lines=(s,c)=>issue(s,c).lines.join(' ');
const play=(g,s)=>{const parsed=parseMove(g,s);assert.ok(parsed.move,JSON.stringify(parsed));return g.move(parsed.move);};

test('dial-in, progressive clues, shell help, reconnect, hangup and locked directory',()=>{
  const s=freshSession();assert.equal(s.auth,false);assert.equal(s.linked,true);
  assert.match(lines(s,'LIST GAMES'),/LOCKED/);assert.match(lines(s,'bad account'),/NOT RECOGNIZED/);
  assert.doesNotMatch(lines(s,'HINT'),/JOSHUA|J O S H U A/);assert.match(lines(s,'CLUE'),/SON/);assert.match(lines(s,'HINT'),/J O S H U A/);
  for(const k of ['HELP','?','F1','MAN','COMMANDS'])assert.equal(issue(s,k).ui,'help');
  for(const [k,ui] of [['CONFIG','settings'],['FULL SCREEN','fullscreen'],['SOUND OFF','audio'],['AUDIO ON','audio']])assert.equal(issue(s,k).ui,ui);
  assert.match(lines(s,'logon as joshua'),/GREETINGS, PROFESSOR FALKEN\. SHALL WE PLAY A GAME\?/);
  assert.equal(issue(s,'CLS').clear,true);assert.match(lines(s,'LOGOFF'),/NO CARRIER/);assert.match(lines(s,'JOSHUA'),/NO CARRIER/);
  assert.equal(issue(s,'RECONNECT').reboot,true);assert.equal(s.auth,false);assert.equal(s.linked,true);
});
test('all ten directory selections agree with the online bank and resume each game',()=>{
  const s=session();
  for(const [i,[title,id]] of catalogue.entries()){
    issue(s,'LIST GAMES');assert.match(renderGame(s),/04 ONLINE/);
    const out=lines(s,String(i+1));if(!id){assert.match(out,/OFFLINE/);assert.ok(s.menu);continue;}
    assert.equal(s.module,id);assert.ok(renderGame(s).includes(title));assert.ok(helpContent(s).length>100);
    issue(s,'EXIT');assert.match(lines(s,title),/RESTORED/);assert.equal(s.module,id);issue(s,'NEW GAME');
  }
});
test('terminal utilities, memory, diagnostics, conversation and follow-up',()=>{
  const s=session();
  for(const [c,p] of [['VER',/4\.8/],['DATE',/GMT/],['TIME',/GMT/],['ATI',/DUPLEX/],['STATUS',/STANDBY/],['NORAD',/STANDBY/],['DIAG',/SELF-TEST/],['DIR',/FALKEN.MEM/],['TYPE FALKEN',/PERSONAL LOG/],['WHO CREATED YOU',/FALKEN/],['TELL ME MORE',/EXPERIMENTS/],['WHO CREATED YOU',/HIS SON/],['DAVID LIGHTMAN',/ANOTHER CALLER/],['MY NAME IS DAVID',/REMEMBER/],['WHAT IS MY NAME',/DAVID/],['WHOAMI',/DAVID/],['HELLO',/DAVID/],['WHAT IS LEARNING',/TERMINAL CONDITION/],['XYZ',/NOT RECOGNIZED/]])assert.match(lines(s,c),p,c);
  assert.equal(issue(s,'README').ui,'source');
  assert.equal(issue(s,'SOUND ON').value,true);assert.equal(issue(s,'SOUND OFF').value,false);
  assert.match(lines(s,'can we play chess'),/YOU HAVE WHITE/);issue(s,'EXIT');assert.match(lines(s,'WHAT WAS MY LAST GAME'),/CHESS/);
});
test('chess notation, including all four requested inputs and Black descriptive ranks',()=>{
  for(const text of ['P-K4','PAWN TO KING FOUR','e4','e2e4','move my pawn from e2 to e4','P-E4']){
    const g=new Chess();assert.equal(play(g,text).san,'e4',text);assert.equal(g.get('e4').type,'p');assert.equal(g.get('e2'),null);
  }
  const g=new Chess();play(g,'P-K4');assert.equal(play(g,'P-K4').san,'e5');assert.equal(play(g,'KNIGHT TO KING BISHOP THREE').san,'Nf3');
  assert.equal(play(g,'QKT-QB3').san,'Nc6');assert.equal(play(g,'B-B4').san,'Bc4');
  const amb=new Chess('4k3/8/8/8/8/2N1N3/8/4K3 w - - 0 1');
  assert.match(parseMove(amb,'KNIGHT TO D5').error,/AMBIGUOUS/);assert.equal(play(amb,'Ncd5').san,'Ncd5');
  assert.match(parseMove(new Chess(),'e2e5').error,/ILLEGAL/);
});
test('starting-position move generation matches perft at depth four',()=>{
  assert.equal(new Chess().perft(4),197281);
});
test('both castling sides, attacked transit square, and castling rights lost after a rook moves',()=>{
  const g=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.equal(play(g,'castle queenside').san,'O-O-O');assert.equal(g.get('c1').type,'k');assert.equal(g.get('d1').type,'r');
  assert.equal(play(g,'0-0').san,'O-O');assert.equal(g.get('f8').type,'r');
  const h=new Chess('4kr2/8/8/8/8/8/8/4K2R w K - 0 1');assert.ok(parseMove(h,'O-O').error);
  const j=new Chess('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1'); for(const m of ['Rh2','Kd7','Rh1','Ke8'])assert.ok(j.move(m));assert.ok(parseMove(j,'O-O').error);
});
test('en passant is immediate and cannot expose the king',()=>{
  const g=new Chess();for(const m of ['e4','a6','e5','d5'])g.move(m);
  const before=g.fen();assert.equal(play(g,'e5d6').san,'exd6');assert.equal(g.get('d5'),null);assert.equal(g.get('d6').color,'w');
  g.undo();assert.equal(g.fen(),before);g.move('Nf3');g.move('Nf6');assert.ok(parseMove(g,'e5d6').error);
  const pinned=new Chess('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');assert.ok(parseMove(pinned,'e5d6').error);
});
test('all promotion choices, deferred choice and coordinate underpromotion',()=>{
  const fen='7k/P7/8/8/8/8/8/4K3 w - - 0 1';
  for(const promo of ['q','r','b','n']){const g=new Chess(fen);assert.equal(play(g,'a7a8'+promo).promotion,promo);assert.equal(g.get('a8').type,promo);}
  assert.deepEqual(parseMove(new Chess(fen),'a7a8').promotion,{from:'a7',to:'a8'});
  assert.equal(play(new Chess(fen),'a8=N').promotion,'n');
});
test('checkmate, stalemate, dead position, fifty/75 moves and repetition thresholds',()=>{
  const g=new Chess();for(const m of ['f3','e5','g4','Qh4#'])g.move(m);assert.match(gameOutcome(g),/CHECKMATE. JOSHUA/);
  assert.match(gameOutcome(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')),/STALEMATE/);
  assert.match(gameOutcome(new Chess('8/8/8/8/8/5k2/8/7K w - - 0 1')),/INSUFFICIENT/);
  assert.ok(canClaim(new Chess('7k/8/8/8/8/8/R7/4K3 w - - 100 80')));
  assert.match(gameOutcome(new Chess('7k/8/8/8/8/8/R7/4K3 w - - 150 80')),/SEVENTY-FIVE/);
  const repeat=new Chess();
  for(let n=0;n<4;n++){for(const m of ['Nf3','Nf6','Ng1','Ng8'])repeat.move(m);if(n===1){assert.ok(canClaim(repeat));assert.equal(gameOutcome(repeat),'');}}
  assert.equal(repetitionCount(repeat),5);assert.match(gameOutcome(repeat),/FIVEFOLD/);assert.equal(repeat.history().length,16);
});
test('chess command flow, history, opening explanation, board, hint, difficulty, undo and restart',()=>{
  const s=session();issue(s,'CHESS');
  assert.equal(issue(s,'HINT').effect,'chessHint');
  assert.equal(issue(s,'P-K4').effect,'chessReply');
  assert.match(computerMove(s,{from:'e7',to:'e5'}).join(' '),/e5/);
  assert.match(lines(s,'HISTORY'),/1\. e4 e5/);assert.match(lines(s,'EXPLAIN OPENING'),/BOTH KING PAWNS/);
  assert.match(asciiBoard(restoreChess(s.games.chess)),/4  .  .  .  .  P/);
  assert.match(lines(s,'GRAPHIC'),/GRAPHIC/);assert.match(renderGame(s),/data-square="e4"/);
  assert.match(lines(s,'DIFFICULTY'),/CADET/);assert.match(renderGame(s),/data-command="EXPERT"/);lines(s,'LEVEL HARD');assert.equal(s.games.chess.level,'EXPERT');
  assert.match(lines(s,'DRAW'),/UNAVAILABLE/);issue(s,'UNDO');assert.equal(s.games.chess.moves.length,0);
  assert.match(lines(s,'RESIGN'),/RESIGNED/);issue(s,'NEW GAME');assert.equal(s.games.chess.result,'');assert.equal(s.games.chess.level,'EXPERT');
  assert.equal(openingName(['e4','e5','Nf3','Nc6','Bb5']),'RUY LOPEZ');
});
test('all search levels return legal moves and find mate in one outside the opening book',()=>{
  const fen='7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';
  for(const level of ['CADET','OPERATOR','EXPERT']){
    const g=new Chess(fen);const m=chooseMove(fen,[],level,false);assert.ok(g.move(m));assert.ok(g.in_checkmate());
    const initial=new Chess();assert.ok(initial.move(chooseMove(initial.fen(),[],level)));
  }
});
test('tic-tac-toe cannot lose against any human sequence, including nonoptimal play',()=>{
  let terminals=0;
  function explore(t){
    if(t.result){terminals++;assert.notEqual(t.result,'X');return;}
    for(let i=0;i<9;i++)if(!t.board[i]){const copy=structuredClone(t);assert.ok(place(copy,i));explore(copy);}
  }
  explore(initialTic());assert.ok(terminals>100);
});
test('4,096 actual perfect self-play games all draw, resumable and capped',()=>{
  const t=newTrial();assert.equal(runTrials(t,23),false);const copy=structuredClone(t);assert.ok(runTrials(copy,9999));assert.equal(copy.count,4096);assert.equal(copy.draws,4096);assert.equal(copy.xWins+copy.oWins,0);
  runTrials(copy,100);assert.equal(copy.count,4096);
  const s=session();issue(s,'TIC-TAC-TOE');assert.match(lines(s,'CENTER'),/TURN/);assert.match(lines(s,'CENTER'),/EMPTY/);issue(s,'LEARN');assert.ok(advance(s,96).length===0);assert.match(lines(s,'SKIP'),/4,096 DRAWS/);assert.ok(s.memory.practice);
});
function stackFor(s,cards){s.deck=Array(60).fill('2♣').concat([...cards].reverse());}
test('blackjack naturals pay 3:2, pushes refund, busts lose and soft 17 stands',()=>{
  const s=initialBJ();stackFor(s,['A♠','9♣','K♥','7♦']);assert.match(deal(s,20),/BLACKJACK/);assert.equal(s.bank,1030);
  stackFor(s,['A♠','A♣','K♥','Q♦']);assert.match(deal(s,20),/PUSH/);assert.equal(s.bank,1030);
  stackFor(s,['10♠','A♣','7♥','6♦']);deal(s,20);assert.match(cardAction(s,'STAND'),/PUSH/);assert.equal(s.dealer.length,2);
  stackFor(s,['10♠','6♣','7♥','9♦','K♠']);deal(s,20);assert.match(cardAction(s,'HIT'),/BUST/);assert.equal(s.bank,1010);
  assert.deepEqual(total(['A♠','A♥','9♦']),{value:21,soft:true});
});
test('blackjack split aces, double, round locking, invalid stakes and bankroll',()=>{
  const b=initialBJ();stackFor(b,['A♠','10♣','A♥','7♦','K♠','9♥']);deal(b,20);
  assert.match(deal(b,2),/IN PROGRESS/);cardAction(b,'SPLIT');assert.equal(b.phase,'settled');assert.equal(b.bank,1040);
  stackFor(b,['5♠','10♣','6♥','7♦','K♠']);deal(b,20);assert.match(cardAction(b,'DOUBLE'),/WIN/);assert.equal(b.bank,1080);
  assert.match(deal(b,1081),/BETWEEN/);assert.match(deal(b,1.5),/WHOLE-CHIP/);
  const s=session();issue(s,'BLACK JACK');assert.match(lines(s,'RULES'),/SOFT 17/);assert.match(lines(s,'BALANCE'),/BANK/);
});
test('all scenarios and both sides support escalation, verified restraint, unilateral restraint and bilateral contact',()=>{
  for(const side of ['UNITED STATES','SOVIET UNION']) for(const sc of scenarios) for(const [steps,outcome] of [
    [['VERIFY SIGNAL','STAND DOWN'],'FALSE ALARM RESOLVED'],[['STAND DOWN'],'UNILATERAL RESTRAINT'],[['OPEN CHANNEL','HOLD','OPEN CHANNEL'],'BILATERAL STAND-DOWN'],[['ESCALATE','CONTINUE'],'MUTUAL LOSS']]){
    const w=initialWar();warCommand(w,side);warCommand(w,sc.name);assert.equal(w.phase,'signal');
    for(const step of steps)warCommand(w,step);assert.equal(w.outcome,outcome);assert.equal(w.phase,'analysis');assert.equal(w.trial.count,0);
  }
});
test('war timeout and learning sequence accumulate actual results before the conclusion',()=>{
  const s=session();issue(s,'WAR');issue(s,'1');issue(s,'2');const w=s.games.war;w.seconds=1;assert.match(tickWar(w).join(' '),/EXPIRED/);w.seconds=1;tickWar(w);
  assert.equal(w.phase,'analysis');assert.equal(s.memory.learned,false);assert.doesNotMatch(renderGame(s),/THE ONLY WINNING MOVE/);
  assert.deepEqual(advance(s,128),[]);assert.equal(w.projections,128);assert.equal(project(w,32),false);
  const end=advance(s,TRIAL_SIZE);assert.deepEqual(end.slice(-3),conclusion);assert.equal(w.losses+w.quiet,TRIAL_SIZE);assert.ok(w.losses>0&&w.quiet>0);assert.equal(w.trial.draws,TRIAL_SIZE);
  assert.equal(w.phase,'conclusion');assert.ok(s.memory.learned);assert.match(lines(s,'CHESS'),/CHESS/);
});
test('game state and discovered identity survive JSON round trips, preferences cover every sound/effect',()=>{
  const s=session();issue(s,'MY NAME IS DAVID');issue(s,'WAR');issue(s,'2');issue(s,'3');issue(s,'VERIFY SIGNAL');issue(s,'HOLD');
  const restored=JSON.parse(JSON.stringify(s));assert.equal(renderGame(restored),renderGame(s));assert.match(lines(restored,'OPEN CHANNEL'),/BILATERAL/);
  assert.equal(defaults.sound,false);assert.equal(defaults.voice,false);
  for(const k of Object.keys(defaults))assert.ok(settingsContent(defaults).includes('data-pref="'+k+'"'),k);
});
