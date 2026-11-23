const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const order=[4,0,2,6,8,1,3,5,7], memo=new Map();
export const initialTic=()=>({board:Array(9).fill(''),result:'',trial:null});
export function winner(board) {
  for(const [a,b,c] of lines) if(board[a] && board[a]===board[b] && board[b]===board[c])return board[a];
  return board.every(Boolean)?'DRAW':'';
}
const other=p=>p==='X'?'O':'X';
function score(board,side) {
  const key=side+board.map(x=>x||'.').join('');
  if(memo.has(key))return memo.get(key);
  const result=winner(board);
  let value=0;
  if(result) value=result==='DRAW'?0:(result===side?1:-1)*(10-board.filter(Boolean).length);
  else {
    value=-Infinity;
    for(const i of order)if(!board[i]){
      board[i]=side;value=Math.max(value,-score(board,other(side)));board[i]='';
    }
  }
  memo.set(key,value);return value;
}
export function bestSquares(board,side) {
  if(winner(board))return [];
  let best=-Infinity, choices=[];
  for(const i of order)if(!board[i]){
    board[i]=side;const v=-score(board,other(side));board[i]='';
    if(v>best){best=v;choices=[i];}else if(v===best)choices.push(i);
  }
  return choices;
}
export function place(tic,i) {
  if(tic.result || !Number.isInteger(i)||i<0||i>8||tic.board[i]) return false;
  tic.board[i]='X';tic.result=winner(tic.board);
  if(!tic.result){
    tic.board[bestSquares(tic.board,'O')[0]]='O';tic.result=winner(tic.board);
  }
  return true;
}
export const TRIAL_SIZE=4096;
export function newTrial(seed=1983){return {count:0,draws:0,xWins:0,oWins:0,seed,board:Array(9).fill('')};}
export function random(trial) {
  trial.seed=(Math.imul(trial.seed,1664525)+1013904223)>>>0;
  return trial.seed/4294967296;
}
export function runTrials(trial,n) {
  const stop=Math.min(TRIAL_SIZE,trial.count+n);
  while(trial.count<stop){
    const board=Array(9).fill('');let side='X',result='';
    while(!result){
      const choices=bestSquares(board,side);
      board[choices[Math.floor(random(trial)*choices.length)]]=side;
      result=winner(board);side=other(side);
    }
    trial.count++;
    if(result==='DRAW')trial.draws++;else if(result==='X')trial.xWins++;else trial.oWins++;
    trial.board=board;
  }
  return trial.count===TRIAL_SIZE;
}
