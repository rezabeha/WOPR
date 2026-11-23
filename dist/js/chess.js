import {Chess} from '../vendor/chess.js';

export const levels = ['CADET', 'OPERATOR', 'EXPERT'];
export const initialChess = () => ({moves: [], level: 'OPERATOR', view: 'ASCII', result: '', promotion: null});
export function restoreChess(state) {
  const game = new Chess();
  for (const san of state.moves) if (!game.move(san)) throw new Error('Invalid stored move');
  return game;
}
const files = 'abcdefgh';
const names = {PAWN:'P', KNIGHT:'N', BISHOP:'B', ROOK:'R', QUEEN:'Q', KING:'K'};
const words = {ONE:'1', TWO:'2', THREE:'3', FOUR:'4', FIVE:'5', SIX:'6', SEVEN:'7', EIGHT:'8'};
const descFiles = {QR:'a', QN:'b', QB:'c', Q:'d', K:'e', KB:'f', KN:'g', KR:'h'};
const normalize = s => s.toUpperCase().replace(/[+#?!\s]/g,'').replace(/0/g,'O');
const plain = m => ({from:m.from, to:m.to, ...(m.promotion ? {promotion:m.promotion} : {})});
function matches(moves) {
  if (!moves.length) return {error:'ILLEGAL OR UNRECOGNIZED MOVE. TYPE HINT OR HELP.'};
  if (moves.every(m => m.from===moves[0].from && m.to===moves[0].to) && moves.length>1 && moves[0].promotion) {
    return {promotion:{from:moves[0].from,to:moves[0].to}};
  }
  if (moves.length>1) return {error:'AMBIGUOUS MOVE. SPECIFY THE ORIGIN SQUARE OR USE COORDINATES.'};
  return {move:plain(moves[0])};
}
export function parseMove(game, input) {
  const all = game.moves({verbose:true});
  // Preserve SAN's distinction between a b-file pawn capture and a bishop.
  const exact=all.find(m=>m.san.replace(/[+#?!]/g,'')===input.trim().replace(/[+#?!]/g,''));
  if(exact)return {move:plain(exact)};
  let s = input.trim().toUpperCase().replace(/[’']/g,'').replace(/[.!?]+$/g,'')
    .replace(/^(?:PLEASE\s+)?(?:I(?:LL| WILL| WOULD LIKE TO| WANT TO)?\s+)?(?:MOVE|PLAY|ADVANCE|PUSH)\s+/,'').replace(/\b(?:MY|THE|FROM|SQUARE)\s+/g,'').trim();
  if (/^(?:CASTLE|CASTLES|CASTLING)(?:\s+(?:ON\s+)?(?:THE\s+)?)?(?:KING\s*SIDE|SHORT)?$/.test(s)) s='O-O';
  if (/^(?:CASTLE|CASTLES|CASTLING)\s+(?:ON\s+)?(?:QUEEN\s*SIDE|LONG)$/.test(s)) s='O-O-O';
  const direct = all.filter(m=>normalize(m.san)===normalize(s));
  if(direct.length) return matches(direct);
  for(const [word,num] of Object.entries(words)) s=s.replace(new RegExp('\\b'+word+'\\b','g'),num);
  s=s.replace(/(?:\s+AND)?\s+PROMOT(?:E|ES|ING)(?:\s+TO)?\s+/,'=')
    .replace(/KING(?:S)?[\s-]*(?:SIDE[\s-]*)?KNIGHT/g,'KN').replace(/QUEEN(?:S)?[\s-]*(?:SIDE[\s-]*)?KNIGHT/g,'QN')
    .replace(/KING(?:S)?[\s-]*BISHOP/g,'KB').replace(/QUEEN(?:S)?[\s-]*BISHOP/g,'QB')
    .replace(/KING(?:S)?[\s-]*ROOK/g,'KR').replace(/QUEEN(?:S)?[\s-]*ROOK/g,'QR');
  for (const [word,p] of Object.entries(names)) s=s.replace(new RegExp('\\b'+word+'S?\\b','g'),p);
  s=s.replace(/\b(?:TAKES|CAPTURES)\b/g,'X').replace(/\bTO\b/g,'-').replace(/KT/g,'N').replace(/[\s+#]/g,'');
  let m=s.match(/^(?:[KQRBNP])?([A-H][1-8])[-X]?([A-H][1-8])(?:=?([QRBN]))?$/);
  if(m) return matches(all.filter(a=>a.from===m[1].toLowerCase() && a.to===m[2].toLowerCase() && (!m[3] || a.promotion===m[3].toLowerCase())));
  m=s.match(/^([KQRBNP])?[-X]?([A-H][1-8])(?:=?([QRBN]))?$/);
  if(m) {
    const candidates=all.filter(a=>a.piece===(m[1]||'P').toLowerCase() && a.to===m[2].toLowerCase() && (!m[3] || a.promotion===m[3].toLowerCase()));
    if(candidates.length)return matches(candidates);
  }
  // Descriptive files are named for the pieces' home files. Ranks are counted
  // from the moving side. KN and QN can also identify the originating knight.
  m=s.match(/^(K[NRBP]|Q[NRBP]|[KQRBNP])([-X])(?:(K[NRB]|Q[NRB]|[KQNRB]))?([1-8])(?:=?([QRBN]))?$/);
  if(m) {
    const [,origin,sep,file,rank,promo] = m;
    const originPiece=origin.slice(-1).toLowerCase();
    const rankText=String(game.turn()==='w'?Number(rank):9-Number(rank));
    const destFiles=descFiles[file]||({B:'cf',N:'bg',R:'ah'}[file])||'';
    return matches(all.filter(a=>a.piece===originPiece && a.to[1]===rankText && destFiles.includes(a.to[0])
      && (origin.length===1 || (originPiece==='p' ? a.from[0]===descFiles[origin[0]] : a.from[0]===descFiles[origin]))
      && (sep!=='X'||a.captured) && (!promo||a.promotion===promo.toLowerCase())));
  }
  m=s.match(/^([KQRBNP])X([KQRBNP])$/);
  if(m) return matches(all.filter(a=>a.piece===m[1].toLowerCase()&&a.captured===m[2].toLowerCase()));
  return {error:'ILLEGAL OR UNRECOGNIZED MOVE. TYPE HINT OR HELP.'};
}
export const openingLines = [
  ['ITALIAN GAME','e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6'],
  ['RUY LOPEZ','e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6'],
  ['SCOTCH GAME','e4 e5 Nf3 Nc6 d4 exd4 Nxd4'],
  ['SICILIAN DEFENSE','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6'],
  ['FRENCH DEFENSE','e4 e6 d4 d5 Nc3 Nf6'],
  ['CARO-KANN DEFENSE','e4 c6 d4 d5 Nc3 dxe4'],
  ['QUEEN’S GAMBIT','d4 d5 c4 e6 Nc3 Nf6'],
  ['KING’S INDIAN DEFENSE','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6'],
  ['ENGLISH OPENING','c4 e5 Nc3 Nf6 g3 d5'],
  ['RÉTI OPENING','Nf3 d5 g3 Nf6 Bg2 g6']
];
export function openingName(history) {
  const prefix=history.join(' ');
  const definitions=[['e4','KING’S PAWN OPENING'],['d4','QUEEN’S PAWN OPENING'],['e4 e5','OPEN GAME'],['d4 d5','CLOSED GAME'],
    ['e4 e5 Nf3','KING’S KNIGHT OPENING'], ...openingLines.map(([name,line],i)=>[line.split(' ').slice(0,[5,5,5,2,2,2,3,6,1,1][i]).join(' '),name])];
  return definitions.filter(([p])=>prefix===p || prefix.startsWith(p+' ')).sort((a,b)=>b[0].length-a[0].length)[0]?.[1]||'OUT OF BOOK';
}
export function bookMove(history, level) {
  const ordered=level==='EXPERT'?[openingLines[3],...openingLines]:openingLines;
  for (const [,line] of ordered) {
    const moves=line.split(' ');
    if(history.length<moves.length && history.every((m,i)=>m===moves[i])) return moves[history.length];
  }
  return null;
}
export const openingNotes={
  'KING’S PAWN OPENING':'E4 CLAIMS CENTRAL SPACE AND OPENS LINES FOR THE KING’S BISHOP AND QUEEN.',
  'QUEEN’S PAWN OPENING':'D4 OCCUPIES THE CENTER WITH A PAWN THAT THE QUEEN ALREADY DEFENDS.',
  'OPEN GAME':'BOTH KING PAWNS HAVE ADVANCED TWO SQUARES. EACH SIDE CAN DEVELOP ITS BISHOP.',
  'CLOSED GAME':'THE QUEEN PAWNS FACE EACH OTHER. A FLANK PAWN CAN CHALLENGE THE CENTER.',
  'KING’S KNIGHT OPENING':'WHITE DEVELOPS THE KING’S KNIGHT TO F3 AND ATTACKS E5.',
  'ITALIAN GAME':'THE WHITE BISHOP ON C4 POINTS AT F7, THE SQUARE INITIALLY GUARDED ONLY BY THE BLACK KING.',
  'RUY LOPEZ':'BB5 PRESSURES THE KNIGHT THAT DEFENDS E5. THE OPENING IS NAMED FOR A SPANISH PRIEST.',
  'SCOTCH GAME':'D4 CHALLENGES THE E5 PAWN IMMEDIATELY AND OPENS THE CENTER.',
  'SICILIAN DEFENSE':'BLACK ANSWERS E4 WITH C5. THE C-PAWN CONTESTS D4 FROM THE FLANK.',
  'FRENCH DEFENSE':'E6 PREPARES D5. BLACK CHALLENGES THE WHITE CENTER WITH A SUPPORTED PAWN.',
  'CARO-KANN DEFENSE':'C6 SUPPORTS A D5 ADVANCE WHILE KEEPING THE C8 BISHOP’S DIAGONAL OPEN.',
  'QUEEN’S GAMBIT':'WHITE OFFERS THE C-PAWN TO DRAW THE BLACK D-PAWN AWAY FROM THE CENTER.',
  'KING’S INDIAN DEFENSE':'BLACK DEVELOPS THE KING’S BISHOP TO G7, AIMING ALONG THE LONG DIAGONAL.',
  'ENGLISH OPENING':'C4 CONTROLS D5 FROM THE FLANK AND KEEPS THE CENTRAL PAWNS FLEXIBLE.',
  'RÉTI OPENING':'NF3 DEVELOPS A PIECE AND CONTROLS E5 BEFORE WHITE CHOOSES A PAWN STRUCTURE.'
};
function repetitionKey(game) {
  const parts=game.fen().split(' ').slice(0,4);
  if(parts[3]!=='-' && !game.search.moves().some(m=>(m.flags&8)!==0)) parts[3]='-';
  return parts.join(' ');
}
export function repetitionCount(game) {
  const target=repetitionKey(game), backward=[];
  let count=1, remaining=Number(game.fen().split(' ')[4]);
  while(remaining-->0) {
    const m=game.undo();
    if(!m) break;
    backward.push(plain(m));
    if(repetitionKey(game)===target) count++;
  }
  while(backward.length) game.move(backward.pop());
  return count;
}
export function gameOutcome(game) {
  if(game.in_checkmate()) return 'CHECKMATE. '+(game.turn()==='w'?'JOSHUA':'OPERATOR')+' WINS.';
  if(game.in_stalemate()) return 'STALEMATE. DRAW.';
  if(game.insufficient_material()) return 'DRAW. INSUFFICIENT MATERIAL.';
  const halfmoves=Number(game.fen().split(' ')[4]);
  if(halfmoves>=150) return 'DRAW. SEVENTY-FIVE MOVE RULE.';
  if(halfmoves>=16 && repetitionCount(game)>=5) return 'DRAW. FIVEFOLD REPETITION.';
  return '';
}
export function canClaim(game) {return Number(game.fen().split(' ')[4])>=100 || repetitionCount(game)>=3;}
export function formatHistory(moves) {
  return moves.reduce((out,san,i)=>out+(i%2?' ':' '+(i/2+1)+'. ')+san,'').trim() || 'NO MOVES RECORDED.';
}
export function asciiBoard(game) {
  const rows=game.board().map((row,i)=>(8-i)+'  '+row.map(p=>p?(p.color==='w'?p.type.toUpperCase():p.type):'.').join('  '));
  return rows.join('\n')+'\n   '+files.split('').join('  ');
}
