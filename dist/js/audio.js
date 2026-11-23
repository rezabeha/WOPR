export const defaults={
  speed:'NORMAL',animation:1,scanlines:true,glow:true,flicker:true,curvature:false,cursor:true,motion:true,contrast:false,
  globeMotion:true,waveMotion:true,trackMotion:true,boardMotion:true,
  sound:false,modem:true,keys:true,beeps:true,radar:true,activity:true,voice:false
};
let context=null;
export function enableAudio(){
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;context||=new Audio();if(context.state==='suspended')context.resume().catch(()=>{});return true;}catch{return false;}
}
function tone(freq,duration,type,volume,delay=0,endFreq=freq){
  if(!context||context.state!=='running')return;
  const at=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),at+duration);
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
  o.connect(g);g.connect(context.destination);o.start(at);o.stop(at+duration+.01);
  o.onended=()=>{o.disconnect();g.disconnect();};
}
export function sound(p,key){
  if(!p.sound||!p[key])return;
  if(key==='modem'){
    [697,770,852,770,941,697,852].forEach((v,i)=>{tone(v,.085,'sine',.028,i*.105);tone([1209,1336,1477][i%3],.085,'sine',.026,i*.105);});
    tone(1100,.3,'sine',.037,.85);tone(2100,.32,'sine',.029,1.18);
    for(let i=0;i<12;i++)tone(i%2?1210:2100,.055,'sawtooth',.011,1.47+i*.048,i%2?980:1700);
  }else if(key==='keys')tone(165,.029,'square',.014,0,83);
  else if(key==='radar'){tone(790,.16,'sine',.05);tone(610,.19,'sine',.035,.2);}
  else if(key==='activity')tone(270,.041,'triangle',.021);
  else tone(682,.095,'sine',.04);
}
export function say(p,lines,queue=false){
  if(!p.sound||!p.voice||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
  try{const speech=new SpeechSynthesisUtterance(lines.join(' '));speech.lang='en-US';speech.rate=.83;speech.pitch=.65;speech.volume=.65;if(!queue)window.speechSynthesis.cancel();window.speechSynthesis.speak(speech);}catch{}
}
export function muteAudio(){if(context?.state==='running')context.suspend().catch(()=>{});window.speechSynthesis?.cancel();}
