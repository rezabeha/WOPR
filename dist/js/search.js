import {Chess} from '../vendor/chess.js';
import {bookMove} from './chess.js';
const pieceValue={p:100,n:315,b:335,r:510,q:945,k:20000};
const limits={CADET:[2,100],OPERATOR:[4,390],EXPERT:[6,1050]};
const nameSquare=i=>'abcdefgh'[i&7]+(8-(i>>4));
function evaluate(game) {
  const board=game.search.position();
  let net=0, end=0;
  for(let i=0;i<120;i++){if(i&0x88){i+=7;continue;} const p=board[i];if(p && !'pk'.includes(p.type)) end+=pieceValue[p.type];}
  for(let i=0;i<120;i++){
    if(i&0x88){i+=7;continue;}
    const p=board[i];if(!p) continue;
    const file=i&7, rank=i>>4, advance=p.color==='w'?6-rank:rank-1;
    const central=7-Math.abs(file-3.5)-Math.abs(rank-3.5);
    let positional=0;
    switch(p.type){
      case 'p': positional=advance*7+central*4+(advance>3?advance*4:0);break;
      case 'n': positional=central*10+(advance>=0?10:-10);break;
      case 'b': positional=central*5+(advance>=0?9:0);break;
      case 'r': positional=advance*2;break;
      case 'q': positional=central*2;break;
      case 'k': positional=end<2200?central*9:-(central*6)+((file===6||file===2)&&advance<0?35:0);break;
    }
    net+=(p.color==='w'?1:-1)*(pieceValue[p.type]+positional);
  }
  return (game.turn()==='w'?net:-net);
}
const priority=m=>(m.captured?10000+10*pieceValue[m.captured]-pieceValue[m.piece]:0)+(m.promotion?pieceValue[m.promotion]:0)+((m.flags&96)?65:0);
export function chooseMove(fen, history=[], level='OPERATOR', useBook=true) {
  const game=new Chess(fen), api=game.search;
  const opening=useBook && bookMove(history,level);
  if(opening) { const m=game.move(opening); if(m) return {from:m.from,to:m.to,...(m.promotion?{promotion:m.promotion}:{})}; }
  const legal=api.moves();if(!legal.length) return null;
  const [maxDepth,ms]=limits[level]||limits.OPERATOR;
  const deadline=performance.now()+ms, cutoff=Symbol('time');
  let nodes=0, best=legal[0];
  const ordered=moves=>moves.sort((a,b)=>priority(b)-priority(a));
  function search(depth,alpha,beta,ply,quietLeft) {
    if((++nodes&127)===0 && performance.now()>deadline) throw cutoff;
    const check=game.in_check();
    const list=api.moves();
    if(!list.length) return check?-100000+ply:0;
    if(depth<=0 && (!check || quietLeft<=0)){
      const standing=evaluate(game);
      if(!quietLeft || standing>=beta) return standing;
      alpha=Math.max(alpha,standing);
    }
    const candidates=depth>0 || check ? list : list.filter(m=>m.captured||m.promotion);
    for(const m of ordered(candidates)){
      api.make(m);let score;
      try {score=-search(depth-1,-beta,-alpha,ply+1,depth<=0?Math.max(0,quietLeft-1):quietLeft);} finally {api.undo();}
      if(score>=beta) return score;
      if(score>alpha) alpha=score;
    }
    return alpha;
  }
  for(let depth=1;depth<=maxDepth;depth++){
    let candidate=best, alpha=-Infinity;
    try{
      const sorted=[best,...ordered(legal.filter(x=>x!==best))];
      for(const m of sorted){
        api.make(m);let score;
        try{score=-search(depth-1,-Infinity,-alpha,1,level==='CADET'?0:2);}finally{api.undo();}
        if(score>alpha){alpha=score;candidate=m;}
      }
    }catch(e){if(e!==cutoff) throw e;break;}
    best=candidate;
    if(alpha>99000)break;
  }
  return {from:nameSquare(best.from),to:nameSquare(best.to),...(best.promotion?{promotion:best.promotion}:{})};
}
