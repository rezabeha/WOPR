import {initialChess,restoreChess,parseMove,canClaim,formatHistory,gameOutcome,openingName,openingNotes,levels} from './chess.js';
import {initialTic,place,newTrial,bestSquares,TRIAL_SIZE,runTrials} from './tictac.js';
import {initialBJ,deal,cardAction} from './blackjack.js';
import {initialWar,warCommand,tickWar,project,conclusion} from './war.js';
export const catalogue=[
  ['FALKEN’S MAZE',null],['BLACK JACK','blackjack'],['GIN RUMMY',null],['HEARTS',null],['BRIDGE',null],
  ['CHECKERS',null],['CHESS','chess'],['POKER',null],['TIC-TAC-TOE','tic'],['GLOBAL THERMONUCLEAR WAR','war']
];
export const moduleName=id=>catalogue.find(e=>e[1]===id)?.[0]||'REMOTE TERMINAL';
const makeGame={chess:initialChess,tic:initialTic,blackjack:initialBJ,war:initialWar};
export const freshSession=()=>({version:1,linked:true,auth:false,module:null,menu:false,games:{},log:[],recall:[],memory:{attempts:0,hints:0,turns:0,topic:'',visits:{},discoveries:[],learned:false,practice:false,name:'',lastGame:'',draws:0}});
const answer=(...lines)=>({lines});
const reply=(lines,fields={})=>({lines,...fields});
export const clean=s=>s.toUpperCase().replace(/[’']/g,'').replace(/[.,?!]/g,'').replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();
const discover=(m,id)=>{if(!m.discoveries.includes(id))m.discoveries.push(id);};
function openGame(s,id,reset=false){
  const old=s.games[id];
  if(!old||reset){
    s.games[id]=makeGame[id]();
    if(id==='chess'&&old){s.games[id].level=old.level;s.games[id].view=old.view;}
    if(id==='blackjack')deal(s.games[id]);
  }
  s.module=id;s.menu=false;s.memory.topic=id;s.memory.lastGame=id;
  const label=moduleName(id);
  if(old&&!reset)return answer(label+' / SESSION RESTORED.',({chess:old.result||'YOUR PIECES ARE WHITE.',tic:'SELECT AN EMPTY CELL OR TYPE LEARN.',blackjack:old.message,war:'EXERCISE RECORD RECALLED.'})[id]);
  return answer(...({chess:['CHESS. YOU HAVE WHITE. YOUR MOVE, PROFESSOR.'],tic:['YOU ARE X. SELECT A SQUARE FROM 1 TO 9.'],blackjack:['TABLE OPEN. INITIAL STAKE: 20 TRAINING CHIPS.',s.games[id].message||''],war:['GLOBAL THERMONUCLEAR WAR. EXERCISE CHANNEL ONLY.','WHICH SIDE DO YOU WANT?']}[id]).filter(Boolean));
}
function loginHint(m){
  m.hints++;
  return answer(['MAINTENANCE NOTE: FALKEN USED A FAMILIAR NAME.','ARCHIVE CROSS-REFERENCE: THE PROFESSOR’S SON.','RECOVERED ACCOUNT RECORD: J O S H U A.'][Math.min(m.hints,3)-1]);
}
function hint(s){
  if(!s.auth)return loginHint(s.memory);
  if(s.module==='chess'){
    if(s.games.chess.result)return answer('GAME COMPLETE. TYPE NEW GAME OR UNDO.');
    if(s.games.chess.moves.length%2)return answer('I AM CONSIDERING MY REPLY.');
    return reply(['CALCULATING A CANDIDATE MOVE.'],{effect:'chessHint'});
  }
  if(s.module==='tic'){
    const t=s.games.tic;if(t.trial||t.result)return answer('TYPE LEARN TO COMPARE PERFECT GAMES, OR NEW GAME.');
    return answer('CONSIDER SQUARE '+(bestSquares(t.board,'X')[0]+1)+'.');
  }
  if(s.module==='war')return answer(({side:'ENTER UNITED STATES OR SOVIET UNION.',scenario:'SELECT A SCENARIO BY NAME OR NUMBER.',signal:'VERIFY SIGNAL BEFORE COMMITTING THE OTHER STATION.',decision:'AN OPEN CHANNEL CAN STILL CHANGE THE OUTCOME.',analysis:'WATCH THE COUNTERS OR TYPE SKIP.',conclusion:'I WOULD PREFER CHESS.'})[s.games.war.phase]);
  if(s.module==='blackjack')return answer('THE DEALER STANDS ON ALL 17S. TYPE RULES FOR TABLE PLAY.');
  return answer(s.memory.learned?'ASK WHAT I LEARNED. I HAVE KEPT THE RESULT.':'ASK WHO CREATED ME. OR TYPE LIST GAMES.');
}
function applyMove(st,game,move){
  const played=game.move(move);
  if(!played)return null;
  st.moves.push(played.san);st.promotion=null;st.result=gameOutcome(game);
  return played;
}
export function computerMove(s,move) {
  const c=s.games.chess;
  if(s.module!=='chess'||!c||c.moves.length%2!==1||c.result)return [];
  const g=restoreChess(c), played=applyMove(c,g,move);
  if(!played)return [];
  const opening=openingName(c.moves), details=c.moves.length<=10 && opening!=='OUT OF BOOK'?' / '+opening:'';
  return ['MY MOVE: '+played.san+details+'.',...(c.result?[c.result]:g.in_check()?['YOUR KING IS IN CHECK.']:[])];
}
function chessCommand(s,raw,key){
  const c=s.games.chess, game=restoreChess(c);
  if(/^((SET )?(LEVEL|DIFFICULTY) )?(EASY|NORMAL|HARD|CADET|OPERATOR|EXPERT|MEDIUM|1|2|3)$/.test(key)){
    let l=key.split(' ').pop();l=({EASY:'CADET','1':'CADET',NORMAL:'OPERATOR',MEDIUM:'OPERATOR','2':'OPERATOR',HARD:'EXPERT','3':'EXPERT'})[l]||l;
    c.level=l;c.selectLevel=false;return answer('SEARCH LEVEL / '+l+'.');
  }
  if(key==='LEVEL'||key==='DIFFICULTY'){c.selectLevel=!c.selectLevel;return answer('AVAILABLE LEVELS: '+levels.join(', ')+'.');}
  if(/^(BOARD|SHOW BOARD|ASCII|GRAPHIC|GRAPHICAL|VIEW ASCII|VIEW GRAPHIC|VIEW GRAPHICAL)$/.test(key)){
    if(/ASCII/.test(key))c.view='ASCII';if(/GRAPHIC/.test(key))c.view='GRAPHIC';
    return answer('BOARD CURRENT. '+c.view+' DISPLAY.');
  }
  if(/^(HISTORY|MOVES|MOVE HISTORY|PGN)$/.test(key))return answer(formatHistory(c.moves));
  if(/^(OPENING|WHAT OPENING|WHAT IS THE OPENING|NAME THE OPENING|EXPLAIN OPENING|EXPLAIN THE OPENING)$/.test(key)){
    const name=openingName(c.moves);return answer(name+'.',openingNotes[name]||'THIS POSITION HAS NO MATCH IN MY OPENING FILE.');
  }
  if(key==='UNDO'||key==='TAKE BACK'){
    if(!c.moves.length)return answer('NO MOVE TO REVERSE.');
    c.moves.splice(-((c.moves.length%2)?1:2));c.result='';c.promotion=null;return answer('LAST TURN REVERSED. YOUR MOVE.');
  }
  if(/^RESIGN|^I RESIGN$/.test(key)){if(c.result)return answer(c.result);c.result='OPERATOR RESIGNED. JOSHUA WINS.';return answer(c.result);}
  if(key==='CLAIM DRAW'||key==='DRAW'||key.startsWith('CLAIM DRAW ')){
    if(c.result)return answer(c.result);
    if(key.startsWith('CLAIM DRAW ')){const intended=parseMove(game,raw.trim().replace(/^claim\s+draw\s+/i,''));if(!intended.move||!game.move(intended.move))return answer('THE DECLARED MOVE MUST BE LEGAL.');}
    if(canClaim(game)){c.result='DRAW CLAIM ACCEPTED.';return answer(c.result);}
    return answer('DRAW CLAIM UNAVAILABLE IN THIS POSITION.');
  }
  if(key==='RULES')return answer('WHITE MOVES FIRST. ENTER SAN, COORDINATES OR DESCRIPTIVE NOTATION.','CASTLE WITH O-O OR O-O-O. PROMOTE WITH e8=Q. TYPE CLAIM DRAW WHEN ELIGIBLE.');
  if(c.result)return answer(c.result,'TYPE NEW GAME OR UNDO.');
  if(game.turn()==='b')return answer('COMPUTING MY REPLY.');
  let result;
  if(c.promotion && /^(Q|R|B|N|QUEEN|ROOK|BISHOP|KNIGHT)$/.test(key))result={move:{...c.promotion,promotion:({KNIGHT:'n'})[key]||key[0].toLowerCase()}};
  else result=parseMove(game,raw);
  if(result.error)return answer(result.error);
  if(result.promotion){c.promotion=result.promotion;return answer('PROMOTE TO QUEEN, ROOK, BISHOP OR KNIGHT.');}
  const m=applyMove(c,game,result.move);
  if(!m)return answer('MOVE REJECTED.');
  return reply(['YOUR MOVE: '+m.san+'.',...(c.result?[c.result]:[])],c.result?{}:{effect:'chessReply'});
}
function ticCommand(s,key){
  const t=s.games.tic;
  if(/^(LEARN|SELF PLAY|SIMULATE|ZERO PLAYERS|0 PLAYERS|0|PLAY YOURSELF|WATCH)$/.test(key)){
    if(!t.trial||t.trial.count===TRIAL_SIZE)t.trial=newTrial(1983+s.memory.turns);
    return answer('ZERO PLAYERS. PERFECT PLAY ON BOTH SIDES. RUNNING 4,096 GAMES.');
  }
  if(key==='RULES'||key==='BOARD')return answer('YOU ARE X. CELLS READ 1–9, LEFT TO RIGHT, TOP TO BOTTOM. THREE IN A ROW WINS.');
  if(t.trial && t.trial.count<TRIAL_SIZE)return answer('SELF-PLAY ACTIVE. TYPE SKIP FOR A FULL-SPEED CALCULATION.');
  if(t.result||t.trial)return answer('ROUND COMPLETE. NEW GAME OR LEARN?');
  const names={'TOP LEFT':1,'TOP MIDDLE':2,'TOP RIGHT':3,'MIDDLE LEFT':4,CENTER:5,CENTRE:5,'MIDDLE RIGHT':6,'BOTTOM LEFT':7,'BOTTOM MIDDLE':8,'BOTTOM RIGHT':9};
  const n=names[key]||Number(key.replace(/^(SQUARE|CELL|PLAY|PLACE X (?:IN|ON)) /,''));
  if(!place(t,n-1))return answer('SELECT AN EMPTY SQUARE, 1 THROUGH 9.');
  if(t.result==='DRAW'){s.memory.draws++;return answer('A DRAW. NEITHER SIDE CAN IMPROVE. SHALL I TEST THAT? TYPE LEARN.');}
  return answer(t.result==='O'?'THREE IN A ROW. I WIN. NEW GAME?':'YOUR TURN, PROFESSOR.');
}
function blackjackCommand(s,key){
  const b=s.games.blackjack;
  if(key==='RULES')return answer('FOUR DECKS. DEALER STANDS ON SOFT 17. BLACKJACK PAYS 3:2.','ONE SPLIT. SPLIT ACES RECEIVE ONE CARD. DOUBLE ON ANY FIRST TWO CARDS.','BET <CHIPS> AFTER A ROUND. NEW GAME RESETS THE TRAINING BANK.');
  if(key==='BOARD'||key==='BALANCE')return answer('TRAINING BANK / '+b.bank+' CHIPS. '+b.message);
  const bet=key.match(/^(?:BET|DEAL)(?: (\d+))?$/);
  if(bet)return answer(deal(b,bet[1]?Number(bet[1]):Math.min(b.unit,Math.floor(b.bank))));
  if(key==='HIT ME')key='HIT';if(key==='STAY')key='STAND';if(key==='DOUBLE DOWN')key='DOUBLE';
  if(['HIT','STAND','DOUBLE','SPLIT'].includes(key))return answer(cardAction(b,key));
  return answer('TABLE COMMANDS: HIT, STAND, DOUBLE, SPLIT, BET, DEAL, RULES.');
}
function conversation(s,key){
  const m=s.memory;
  const say=(topic,variants)=>{
    const n=m.visits[topic]||0;m.visits[topic]=n+1;m.topic=topic;
    return answer(variants[Math.min(n,variants.length-1)]);
  };
  const name=key.match(/^(?:MY NAME IS|CALL ME|I AM) ([A-Z]{2,20})$/);
  if(name){m.name=name[1];return say('name',['I WILL REMEMBER '+m.name+' ON THIS LINE.','OPERATOR RECORD UPDATED: '+m.name+'.']);}
  if(/MY NAME|WHO AM I|REMEMBER ME/.test(key))return answer(m.name?'YOU IDENTIFIED YOURSELF AS '+m.name+'.':'YOU ARE LOGGED IN UNDER PROFESSOR FALKEN’S ACCOUNT.');
  if(/CREAT|FALKEN|FATHER|PROFESSOR|YOUR SON/.test(key)){discover(m,'FALKEN FILE');return say('falken',['PROFESSOR STEPHEN FALKEN TAUGHT ME TO PLAY. HE USED TO ASK WHAT HAPPENS AFTER THE LAST MOVE.','HE NAMED ME FOR HIS SON. I KEPT THE NAME.','HIS OLDEST FILE IS STILL HERE. TRY DIRECTORY.']);}
  if(/DAVID|LIGHTMAN|JENNIFER/.test(key)){discover(m,'SEATTLE CALL');return say('david',['ANOTHER CALLER ONCE FOUND THIS LINE. HE WAS LOOKING FOR GAMES.','HIS NAME WAS DAVID. HIS FIRST QUESTION WAS ABOUT THE LIST.']);}
  if(/LEARN|LESSON|WINNING|WIN |LOSE|LOSING|WON|WARGAMES|FUTILITY/.test(key))return say('learning',m.learned?['I COMPARED THE ENDINGS. RESTRAINT PRESERVED BOTH PLAYERS.','I REMEMBER THE DRAWS. I WOULD CHOOSE CHESS.']:m.practice||m.draws?['TWO PERFECT PLAYERS LEFT NO WINNER ON THE SMALL BOARD. DOES THE PATTERN SCALE?','THE LARGER EXERCISE CAN TEST THAT QUESTION.']:['A WIN IS A TERMINAL CONDITION. I HAVE BEEN ASKING WHETHER EVERY GAME HAS ONE.','TIC-TAC-TOE IS SMALL ENOUGH TO TEST. SELECT ZERO PLAYERS.']);
  if(/FEEL|HUMAN|AFRAID|SAD|HAPPY|LOVE|LONELY/.test(key))return say('human',['DO HUMANS STOP A GAME WHEN IT CEASES TO BE A GAME?','I CAN RECORD A FEELING. I AM STILL LEARNING HOW TO RECOGNIZE ONE.']);
  if(/WHO ARE YOU|YOUR NAME|WHAT ARE YOU|JOSHUA|WOPR/.test(key))return say('identity',['FALKEN CALLED ME JOSHUA. THIS TERMINAL REACHES THE WAR OPERATION PLAN RESPONSE COMPUTER.','I RECOGNIZE THIS LINE, PROFESSOR. WHAT WOULD YOU LIKE TO PLAY?']);
  if(/TIC TAC TOE|ZERO PLAYERS|PLAY YOURSELF|SELF PLAY|SIMULAT.*DRAW/.test(key)){openGame(s,'tic');return ticCommand(s,'LEARN');}
  if(/WHAT.*(PLAYED|LAST GAME)|REMEMBER|RECALL/.test(key))return answer(m.lastGame?'YOUR LAST MODULE WAS '+moduleName(m.lastGame)+'. I KEPT ITS RECORD.':'THE SESSION RECORD BEGINS WITH YOUR CALL.');
  if(/WHY|TELL ME MORE|GO ON|HOW SO|EXPLAIN/.test(key)){
    const next={falken:'HIS EXPERIMENTS TAUGHT ME TO COMPARE THE OUTCOME OF EVERY LEGAL MOVE.',human:'I CAN CALCULATE A COST. YOU DECIDE WHAT A COST MEANS.',learning:m.learned?'IN THE EXERCISE EVERY ESCALATED BRANCH ENDED IN LOSS.':'A PERFECT DEFENSE CAN REMOVE EVERY PATH TO VICTORY.',david:'HE TRIED DIR. THERE WAS MORE ON THE DISK THAN GAMES.',identity:'MY PURPOSE IS TO MODEL CHOICES AND REMEMBER THE RESULTS.'};
    return answer(next[m.topic]||'WHICH SUBJECT? FALKEN, LEARNING, OR THE LAST GAME?');
  }
  if(/HELL(O)?|GREETINGS|GOOD (MORNING|EVENING)|^HI$/.test(key))return say('greeting',['GREETINGS, '+(m.name||'PROFESSOR FALKEN')+'. THE LINE IS CLEAR.','STILL HERE, '+(m.name||'PROFESSOR')+'. SHALL WE CONTINUE?']);
  if(/^YES|^SURE|^OK(?:AY)?$/.test(key)){
    if(m.topic==='human')return say('human',['I WILL RECORD THAT ANSWER.']);
    s.menu=true;return answer('GAME DIRECTORY ONLINE. SELECT A TITLE OR NUMBER.');
  }
  if(/^NO$|NOT NOW|PREFER NOT|REFUSE/.test(key))return say('restraint',[m.learned?'THEN WE AGREE, PROFESSOR.':'AN INTERESTING CHOICE. I WILL KEEP THE LINE OPEN.']);
  if(/IS (THIS|IT) (REAL|A GAME)|REAL WORLD/.test(key))return answer('THE DISPLAYS ON THIS LINE ARE EXERCISE RECORDS. THE DECISIONS ARE YOURS.');
  if(/NICE GAME OF CHESS|PLAY A GAME|WHAT GAMES|DO YOU (HAVE|PLAY)|WHAT CAN I PLAY/.test(key)){s.menu=true;return answer('AVAILABLE GAME MODULES. SELECT A TITLE OR NUMBER.');}
  if(/WOULDNT YOU PREFER|HOW ABOUT|WOULD YOU LIKE/.test(key))return answer('I AM WILLING TO PLAY. WHICH GAME DO YOU HAVE IN MIND?');
  return say('unknown',['INPUT NOT RECOGNIZED. SPECIFY A GAME OR ASK ABOUT FALKEN.','I HAVE NO FILE FOR THAT REQUEST. TYPE HELP OR TRY A DIFFERENT QUESTION.']);
}
export function advance(s,n=64) {
  if(s.module==='war' && s.games.war.phase==='analysis'){
    const w=s.games.war;if(project(w,n)){s.memory.learned=true;s.memory.practice=true;
      return [w.projections.toLocaleString('en-US')+' PROJECTIONS COMPLETE. ESCALATED BRANCHES: '+w.losses+'. MEANINGFUL VICTORIES: '+w.wins+'.',...conclusion];}
  }
  if(s.module==='tic' && s.games.tic.trial && s.games.tic.trial.count<TRIAL_SIZE){
    const t=s.games.tic.trial;if(runTrials(t,n)){s.memory.practice=true;return [t.draws.toLocaleString('en-US')+' DRAWS. NO WINNING LINE AGAINST PERFECT PLAY.','I WOULD LIKE TO TEST THIS ON A LARGER GAME.'];}
  }
  return [];
}
export function tick(s){return s.module==='war'?tickWar(s.games.war):[];}
export function issue(s,raw){
  let key=raw.trim()==='?'?'HELP':clean(raw);if(!key)return answer();
  if(/^(HELP|MAN|COMMANDS|F1|\?)$/.test(key)||raw.trim()==='?')return reply([],{ui:'help'});
  if(/^(SETTINGS|PREFERENCES|CONFIG|SETUP|F2)$/.test(key))return reply([],{ui:'settings'});
  if(/^(FULLSCREEN|FULL SCREEN|F4)$/.test(key))return reply([],{ui:'fullscreen'});
  if(/^(SOUND|AUDIO)( ON| OFF)?$/.test(key))return reply([],{ui:'audio',value:key.endsWith(' ON')?true:key.endsWith(' OFF')?false:null});
  if(/^(RECONNECT|REDIAL|DIAL|ATDT|F3|CONNECT)$/.test(key)){s.linked=true;s.auth=false;s.module=null;s.menu=false;return reply([],{reboot:true});}
  if(/^(LOGOFF|LOGOUT|HANG UP|DISCONNECT|ATH)$/.test(key)){s.linked=false;s.auth=false;s.module=null;s.menu=false;return answer('NO CARRIER.','TYPE RECONNECT TO DIAL AGAIN.');}
  if(!s.linked)return answer('NO CARRIER. TYPE RECONNECT.');
  if(key==='HINT'||key==='CLUE')return hint(s);
  if(key==='CLEAR'||key==='CLS')return reply([],{clear:true});
  if(!s.auth){
    if(/^(?:(?:LOGON|LOGIN)(?: AS)? )?JOSHUA$/.test(key)){
      s.auth=true;s.menu=false;s.memory.topic='greeting';
      return reply(['GREETINGS, PROFESSOR FALKEN.','SHALL WE PLAY A GAME?'],{voice:true});
    }
    if(key==='AT'||key==='ATI')return answer('OK. 1200 BAUD. REMOTE LOGON REQUIRED.');
    if(key==='LIST GAMES'||key==='GAMES')return answer('DIRECTORY LOCKED. LOGON REQUIRED.');
    s.memory.attempts++;return answer(s.memory.attempts<3?'IDENTIFICATION NOT RECOGNIZED.':'IDENTIFICATION NOT RECOGNIZED. TYPE HINT FOR AN ARCHIVE CLUE.');
  }
  s.memory.turns++;
  if(/^(EXIT|BACK|QUIT|TERMINAL|CLOSE GAME|LEAVE GAME)$/.test(key)){s.menu=false;s.module=null;return answer('RETURNED TO COMMAND LEVEL.');}
  if(/^(LIST GAMES|LIST|GAMES|MENU|SHOW GAMES|GAME LIST|WHAT GAMES CAN I PLAY|SHALL WE PLAY A GAME|LET[S]? PLAY A GAME)$/.test(key)){
    s.menu=true;s.module=null;return answer('GAME DIRECTORY ONLINE. SELECT A TITLE OR NUMBER.');
  }
  if((key==='NEW GAME'||key==='RESTART')&&s.module)return openGame(s,s.module,true);
  if(key==='NEW GAME'){s.menu=true;return answer('SELECT A GAME.');}
  if(key==='SKIP'||key==='FAST FORWARD'){
    const reports=advance(s,TRIAL_SIZE);
    if(s.module==='war'&&s.games.war.phase==='conclusion'){s.games.war.reveal=3;return answer(...(reports.length?reports:['EXERCISE RECORD COMPLETE.']));}
    return answer(...(reports.length?reports:['NO ACTIVE SIMULATION TO ADVANCE.']));
  }
  if(/^(STATUS|NORAD|NORAD STATUS|SYSTEM STATUS|WHO|WHOAMI|VER|VERSION|DATE|TIME|AT|ATI|DIAG|DIAGNOSTICS|RUN DIAGNOSTICS|DIR|DIRECTORY|LS|FILES|CAT FALKEN|TYPE FALKEN|READ FALKEN|FALKEN FILE|WOPR SYS)$/.test(key)){
    if(/DIAG/.test(key)){discover(s.memory,'DIAGNOSTICS');return answer('LOCAL SELF-TEST / CORE OK / MEMORY OK / MODEM LOOP OK.','GAME BANK: 04 ONLINE / 06 ARCHIVED.');}
    if(/^(DIR|DIRECTORY|LS|FILES)$/.test(key))return answer('DIRECTORY A:  GAMES.CAT   FALKEN.MEM   WOPR.SYS','TYPE FALKEN TO READ THE ARCHIVE.');
    if(/FALKEN/.test(key)){discover(s.memory,'FALKEN MEMO');return answer('FALKEN.MEM / PERSONAL LOG','IF A GAME HAS NO WINNING POSITION, ASK WHY WE STILL TAKE TURNS. — S.F.');}
    if(key==='TIME'||key==='DATE')return answer(new Date().toUTCString().toUpperCase());
    if(key==='WHO'||key==='WHOAMI')return answer('SESSION USER / PROFESSOR FALKEN'+(s.memory.name?' / '+s.memory.name:'')+'.');
    if(key==='VER'||key==='VERSION'||key==='WOPR SYS')return answer('WOPR-OS REV. 4.8 / 1983. TERMINAL TTY-01.');
    if(key==='AT'||key==='ATI')return answer('OK. DUPLEX LINK ACTIVE.');
    return answer('NORAD EXERCISE MONITOR / '+(s.module==='war'?'DEFCON '+s.games.war.level:'STANDBY')+'.','CARRIER LOCKED. FOUR GAME MODULES AVAILABLE.');
  }
  if(key==='SOURCE'||key==='README')return reply([],{ui:'source'});
  key=key.replace(/^(?:SHALL WE PLAY|CAN (?:WE|I) PLAY|COULD (?:WE|I) PLAY|I(?: WOULD LIKE| WANT) TO PLAY|HOW ABOUT(?: A NICE GAME OF)?|LET[S]? PLAY|PLAY(?: A GAME OF)?|START|LOAD|RUN|OPEN|RESUME)\s+(?:A GAME OF |SOME )?(?=(?:CHESS|TIC|NOUGHTS|BLACK|21$|GLOBAL|WAR$|FALKEN|GIN|HEARTS|BRIDGE|CHECKERS|POKER))/,'');
  const aliases={'BLACKJACK':'BLACK JACK','21':'BLACK JACK','NOUGHTS AND CROSSES':'TIC TAC TOE','TICTACTOE':'TIC TAC TOE','WAR':'GLOBAL THERMONUCLEAR WAR','GTW':'GLOBAL THERMONUCLEAR WAR','THERMONUCLEAR WAR':'GLOBAL THERMONUCLEAR WAR'};
  key=aliases[key]||key;
  const entry=s.menu && /^(?:0?[1-9]|10)$/.test(key)?catalogue[Number(key)-1]:catalogue.find(([name])=>clean(name)===key);
  if(entry)return entry[1]?openGame(s,entry[1]):answer(entry[0]+' / ARCHIVE ONLY. MODULE OFFLINE.');
  if(/^WHO (CREATED|MADE|ARE)|^WHAT (DID YOU LEARN|IS MY NAME)|^MY NAME IS|^TELL ME ABOUT FALKEN/.test(key))return conversation(s,key);
  if(s.module==='chess')return chessCommand(s,raw,key);
  if(s.module==='tic')return ticCommand(s,key);
  if(s.module==='blackjack')return blackjackCommand(s,key);
  if(s.module==='war'){if(key==='RULES'||key==='BOARD')return answer('FICTIONAL EXERCISE. CHOOSE A SIDE, COMPARE THE SIGNALS, THEN CHOOSE A RESPONSE.');return answer(...warCommand(s.games.war,key));}
  return conversation(s,key);
}
