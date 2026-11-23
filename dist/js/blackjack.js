const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const suits=['♠','♥','♦','♣'];
export const initialBJ=()=>({bank:1000,unit:20,deck:[],hands:[],dealer:[],active:0,phase:'ready',message:''});
const cash=n=>Number.isInteger(n)?String(n):n.toFixed(1);
const rank=c=>c.slice(0,-1);
const value=c=>rank(c)==='A'?11:Math.min(10,Number(rank(c))||10);
export function total(cards) {
  let v=cards.reduce((n,c)=>n+value(c),0),aces=cards.filter(c=>rank(c)==='A').length;
  while(v>21&&aces>0){v-=10;aces--;}
  return {value:v,soft:aces>0};
}
function shoe(){
  const d=Array.from({length:4},()=>suits.flatMap(s=>ranks.map(r=>r+s))).flat();
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}
const draw=s=>s.deck.pop();
function settle(s,opening=false){
  if(!opening && s.hands.some(h=>total(h.cards).value<=21))
    while(total(s.dealer).value<17)s.dealer.push(draw(s));
  const dealer=total(s.dealer).value;
  const natural=dealer===21&&s.dealer.length===2;
  for(const h of s.hands){
    const points=total(h.cards).value;
    const blackjack=points===21&&h.cards.length===2&&s.hands.length===1&&!h.split;
    if(points>21)h.result='BUST';
    else if(blackjack && !natural){h.result='BLACKJACK';s.bank+=h.bet*2.5;}
    else if(natural && !blackjack)h.result='DEALER BLACKJACK';
    else if(dealer>21 || points>dealer){h.result='WIN';s.bank+=h.bet*2;}
    else if(points===dealer){h.result='PUSH';s.bank+=h.bet;}
    else h.result='DEALER WINS';
    h.done=true;
  }
  s.phase='settled';s.message=s.hands.map((h,i)=>(s.hands.length>1?'HAND '+(i+1)+' / ':'')+h.result).join(' · ')+'. BALANCE '+cash(s.bank)+'.';
  return s.message;
}
export function deal(s,amount=s.unit) {
  if(s.phase==='play')return 'A HAND IS IN PROGRESS.';
  if(!Number.isInteger(amount)||amount<1||amount>s.bank)return 'ENTER A WHOLE-CHIP BET BETWEEN 1 AND '+Math.floor(s.bank)+'.';
  if(s.deck.length<52)s.deck=shoe();
  s.unit=amount;s.bank-=amount;
  const h={cards:[draw(s)],bet:amount,done:false,result:'',split:false};
  s.dealer=[draw(s)];h.cards.push(draw(s));s.dealer.push(draw(s));
  s.hands=[h];s.active=0;s.phase='play';
  if(total(h.cards).value===21 || total(s.dealer).value===21)return settle(s,true);
  return s.message='YOUR HAND. HIT OR STAND.';
}
function next(s){
  while(s.active<s.hands.length && s.hands[s.active].done)s.active++;
  if(s.active>=s.hands.length)return settle(s);
  return s.message='HAND '+(s.active+1)+'. HIT OR STAND.';
}
export function cardAction(s,action) {
  if(s.phase!=='play')return 'ROUND CLOSED. TYPE DEAL OR BET <AMOUNT>.';
  const h=s.hands[s.active];
  if(action==='SPLIT'){
    if(s.hands.length>1||h.cards.length!==2||value(h.cards[0])!==value(h.cards[1]))return 'SPLIT REQUIRES AN INITIAL PAIR OF EQUAL VALUE.';
    if(s.bank<h.bet)return 'INSUFFICIENT CHIPS TO SPLIT.';
    s.bank-=h.bet;const c=h.cards.pop();h.split=true;
    const second={cards:[c],bet:h.bet,done:false,result:'',split:true};
    h.cards.push(draw(s));second.cards.push(draw(s));s.hands.push(second);
    for(const hand of s.hands)hand.done=rank(c)==='A'||total(hand.cards).value===21;
    return next(s);
  }
  if(action==='DOUBLE'){
    if(h.cards.length!==2||s.bank<h.bet)return 'DOUBLE REQUIRES TWO CARDS AND A MATCHING STAKE.';
    s.bank-=h.bet;h.bet*=2;h.cards.push(draw(s));h.done=true;
  }else if(action==='HIT'){
    h.cards.push(draw(s));h.done=total(h.cards).value>=21;
  }else if(action==='STAND')h.done=true;
  else return 'SELECT HIT, STAND, DOUBLE OR SPLIT.';
  return h.done?next(s):(s.message='CARD RECEIVED. YOUR TOTAL IS '+total(h.cards).value+'.');
}
