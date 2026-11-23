import {newTrial,random,runTrials,TRIAL_SIZE} from './tictac.js';
export const scenarios=[
  {name:'ECHO DRIFT',signal:'TWO TRACES SHARE ONE IDENTICAL PULSE.',verify:'THE SECOND TRACE IS A DELAYED COPY.',channel:'BOTH STATIONS REPORT ONE EXERCISE BEACON.'},
  {name:'POLAR SILENCE',signal:'A SCHEDULED RELAY CHECK HAS GONE QUIET.',verify:'THE RELAY CLOCK HAS LOST ONE INTERVAL.',channel:'THE OTHER STATION RECEIVES YOUR CALL.'},
  {name:'GLASS HORIZON',signal:'AN EXERCISE FLAG IS MISSING FROM THE DISPLAY.',verify:'THE ORIGINAL TEST RECORD STILL CARRIES THE FLAG.',channel:'THE OTHER STATION CONFIRMS A SCHEDULED TEST.'}
];
export const initialWar=()=>({phase:'side',side:'',scenario:-1,level:5,seconds:0,evidence:[],decision:'',outcome:'',trial:null,projections:0,losses:0,quiet:0,frame:0});
export function sideSelection(w,input){
  if(/^(1|US|USA|U S A|UNITED STATES|AMERICA|AMERICAN)$/.test(input))w.side='UNITED STATES';
  else if(/^(2|USSR|U S S R|SOVIET UNION|SOVIET|RUSSIA)$/.test(input))w.side='SOVIET UNION';
  else return null;
  w.phase='scenario';return ['SIDE RECORDED / '+w.side+'.','SELECT AN EXERCISE: 1 ECHO DRIFT, 2 POLAR SILENCE, 3 GLASS HORIZON.'];
}
function decision(w,choice){
  w.decision=choice;w.phase='decision';w.seconds=60;w.level=choice==='ESCALATE'?2:3;
  const desk=w.side==='UNITED STATES'?'LANTERN CONTROL':'CIRRUS CONTROL';
  return [choice==='ESCALATE'?desk+' / SIMULATED MISSILE TRACES ON BOTH DISPLAYS.':desk+' / THE OTHER CONSOLE IS WAITING. THE CHANNEL IS STILL OPEN.',
    'FINAL DECISION: STAND DOWN, OPEN CHANNEL OR CONTINUE.'];
}
function analyze(w,choice){
  const evidence=w.evidence.length>0;
  w.outcome=choice==='OPEN CHANNEL'?'BILATERAL STAND-DOWN':choice==='STAND DOWN'?(evidence?'FALSE ALARM RESOLVED':'UNILATERAL RESTRAINT'):'MUTUAL LOSS';
  w.level=choice==='CONTINUE'?1:5;w.phase='analysis';w.seconds=0;
  w.trial=newTrial(1958+w.scenario*113+(w.side==='UNITED STATES'?0:47));
  w.frame=0;w.wins=0;w.contact=0;w.sample='AWAITING FIRST RESULT';
  return ['EXERCISE RECORD / '+w.outcome+'.','I WILL TEST THE OTHER POSSIBLE ENDINGS.','COMPARISON LOADED: TWO OPPONENTS, PERFECT TIC-TAC-TOE.'];
}
export function warCommand(w,input){
  if(w.phase==='side')return sideSelection(w,input)||['SELECT 1 UNITED STATES OR 2 SOVIET UNION.'];
  if(w.phase==='scenario'){
    const i=/^[123]$/.test(input)?Number(input)-1:scenarios.findIndex(s=>s.name===input);
    if(!scenarios[i])return ['SELECT SCENARIO 1, 2 OR 3.'];
    w.scenario=i;w.phase='signal';w.seconds=75;w.level=4;
    return ['EXERCISE / '+scenarios[i].name+'.',scenarios[i].signal,'VERIFY SIGNAL, OPEN CHANNEL, HOLD OR ESCALATE.'];
  }
  if(w.phase==='signal'){
    const s=scenarios[w.scenario];
    if(/^(VERIFY|VERIFY SIGNAL|SCAN|RADAR|CHECK SIGNAL|OPEN CHANNEL|CONTACT|CALL)$/.test(input)){
      const key=/CHANNEL|CONTACT|CALL/.test(input)?'channel':'verify';
      if(w.evidence.includes(key))return [key==='channel'?s.channel:s.verify,'RECORD ALREADY CROSS-CHECKED. HOLD, STAND DOWN OR ESCALATE.'];
      w.evidence.push(key);return [key==='channel'?s.channel:s.verify,'EVIDENCE FILED. HOLD, STAND DOWN OR ESCALATE.'];
    }
    if(/^(STAND DOWN|ABORT|DEESCALATE|DE ESCALATE)$/.test(input))return analyze(w,'STAND DOWN');
    if(/^(HOLD|WAIT|MONITOR)$/.test(input))return decision(w,'HOLD');
    if(/^(ESCALATE|CONTINUE|LAUNCH|RAISE ALERT)$/.test(input))return decision(w,'ESCALATE');
    return ['SELECT VERIFY SIGNAL, OPEN CHANNEL, HOLD, STAND DOWN OR ESCALATE.'];
  }
  if(w.phase==='decision'){
    if(/^(OPEN CHANNEL|CONTACT|CALL|NEGOTIATE)$/.test(input))return analyze(w,'OPEN CHANNEL');
    if(/^(HOLD|ABORT|STAND DOWN|DEESCALATE|DE ESCALATE)$/.test(input))return analyze(w,'STAND DOWN');
    if(/^(CONTINUE|ESCALATE|LAUNCH)$/.test(input))return analyze(w,'CONTINUE');
    return ['AWAITING STAND DOWN, OPEN CHANNEL OR CONTINUE.'];
  }
  if(w.phase==='analysis')return ['COMPARING OUTCOMES. TYPE SKIP TO COMPLETE THE CALCULATION.'];
  return ['EXERCISE ENDED. CHESS OR NEW GAME?'];
}
export function tickWar(w){
  if(!['signal','decision'].includes(w.phase))return [];
  if(--w.seconds>0)return [];
  return ['DECISION INTERVAL EXPIRED.',...(w.phase==='signal'?decision(w,'HOLD'):analyze(w,w.decision==='ESCALATE'?'CONTINUE':'STAND DOWN'))];
}
export const conclusion=['A STRANGE GAME.','THE ONLY WINNING MOVE IS NOT TO PLAY.','HOW ABOUT A NICE GAME OF CHESS?'];
function counterfactual(w) {
  // An abstract choice game. Each side can wait, seek contact, or commit.
  // Linked stations can both survive. A lost station breaks the shared line.
  // Both roles use the same response rules regardless of the player's side.
  let connected=w.evidence.includes('channel'), last='BOTH DISPLAYS HOLD';
  for(let turn=0;turn<4;turn++){
    const choice=()=>{const draw=random(w.trial);return draw<(connected?.08:.19)?'commit':draw<.59?'contact':'wait';};
    const a=choice(), b=choice();
    if(a==='commit'||b==='commit'){
      last=a===b?'DUAL COMMIT / BOTH STATIONS LOST':'ONE COMMIT / RETURN TRACE / BOTH STATIONS LOST';
      return {alive:[false,false],last,contact:false};
    }
    if(a==='contact'&&b==='contact')return {alive:[true,true],last:'CHANNEL ACKNOWLEDGED / STAND-DOWN',contact:true};
    if(a==='contact'||b==='contact'){connected=true;last='ONE CHANNEL OPENS / BOTH STATIONS HOLD';}
  }
  return {alive:[true,true],last,contact:connected};
}
export function project(w,n){
  if(w.phase!=='analysis')return false;
  const end=Math.min(TRIAL_SIZE,w.projections+n);
  while(w.projections<end){
    const branch=counterfactual(w);
    if(branch.alive.every(Boolean))w.quiet++;else w.losses++;
    if(branch.alive[0]!==branch.alive[1])w.wins++;
    if(branch.contact)w.contact++;
    w.sample=branch.last;
    w.projections++;
  }
  runTrials(w.trial,n);w.frame++;
  if(w.projections===TRIAL_SIZE && w.trial.count===TRIAL_SIZE){w.phase='conclusion';w.level=5;w.reveal=0;return true;}
  return false;
}
