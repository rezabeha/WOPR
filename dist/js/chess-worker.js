import {chooseMove} from './search.js';
self.onmessage=({data})=>{try{self.postMessage({move:chooseMove(data.fen,data.history,data.level)});}catch{self.postMessage({error:true});}};
