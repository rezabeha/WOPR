export const defaults={
  speed:'NORMAL',animation:1,scanlines:true,glow:true,flicker:true,curvature:false,cursor:true,motion:true,contrast:false,
  globeMotion:true,waveMotion:true,trackMotion:true,boardMotion:true,
  sound:false,volume:75,modem:true,keys:true,beeps:true,radar:true,activity:true,voice:false
};

let device=null;
let activation=null;

export function volumePercent(value) {
  const n=Number(value);
  return Number.isFinite(n)?Math.min(100,Math.max(0,n)):defaults.volume;
}

export function audioState() {
  if(device?.context.state==='running')return 'running';
  return activation?'starting':device?.context.state||'idle';
}

export function setVolume(value) {
  if(device)device.gain.gain.value=volumePercent(value)/100;
}

// Create/resume synchronously inside the initiating gesture. The returned
// promise only succeeds once this exact device is ready to render samples.
export function enableAudio(onStateChange=()=>{}, volume=defaults.volume) {
  try {
    if(!device || device.context.state==='closed'){
      const Context=window.AudioContext||window.webkitAudioContext;
      if(!Context)throw new Error('Web Audio is unavailable in this browser.');
      const context=new Context();
      const gain=context.createGain(), analyser=context.createAnalyser();
      analyser.fftSize=1024;
      gain.connect(analyser);analyser.connect(context.destination);
      context.onstatechange=onStateChange;
      device={context,gain,analyser};
    }
    setVolume(volume);
    const current=device, ctx=current.context;
    if(ctx.state==='running')return Promise.resolve(true);
    if(activation)return activation;
    const resume=ctx.resume();
    let timer;
    const deadline=new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('Audio is paused. Tap RESUME SOUND to try again.')),2500);
    });
    const attempt=Promise.race([resume,deadline]).then(()=>{
      if(device!==current||ctx.state!=='running')throw new Error('Audio was interrupted.');
      return true;
    }).finally(()=>{
      clearTimeout(timer);
      if(activation===attempt){activation=null;onStateChange();}
    });
    activation=attempt;
    return attempt;
  } catch(error) {return Promise.reject(error);}
}

function emit(current,key) {
  const {context,gain}=current, start=context.currentTime+.008;
  function tone(freq,duration,type,amplitude,delay=0,endFreq=freq) {
    const at=start+delay,osc=context.createOscillator(),envelope=context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),at+duration);
    envelope.gain.setValueAtTime(0,at);
    envelope.gain.linearRampToValueAtTime(amplitude,at+.006);
    envelope.gain.setValueAtTime(amplitude,at+duration*.52);
    envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(envelope);envelope.connect(gain);
    osc.onended=()=>{osc.disconnect();envelope.disconnect();};
    osc.start(at);osc.stop(at+duration+.005);
  }
  switch(key){
    case 'modem':
      [697,770,852,770,941,697,852].forEach((frequency,i)=>{
        tone(frequency,.085,'sine',.13,i*.105);
        tone([1209,1336,1477][i%3],.085,'sine',.115,i*.105);
      });
      tone(1100,.28,'sine',.19,.82);tone(2100,.32,'sine',.17,1.13);
      for(let i=0;i<12;i++)tone(i%2?1210:2100,.054,'sawtooth',.087,1.45+i*.05,i%2?980:1700);
      break;
    case 'keys': tone(510,.038,'square',.075,0,160);break;
    case 'beeps': tone(765,.15,'sine',.23);break;
    case 'radar': tone(840,.20,'sine',.23);tone(630,.22,'sine',.19,.24);break;
    case 'activity': tone(550,.065,'triangle',.105);break;
    case 'test': tone(523.25,.34,'sine',.28);tone(783.99,.36,'sine',.28,.4);break;
  }
}

export function sound(p,key) {
  const current=device;
  if(!p.sound||!p[key]||!current)return;
  if(current.context.state==='running'){emit(current,key);return;}
  // A click/keystroke can arrive in the same gesture that starts a saved
  // preference. Keep that cue, but never replay old keystrokes after a pause.
  if(activation){
    const when=Date.now();
    activation.then(()=>{
      if(device===current && current.context.state==='running' && p.sound && p[key] &&
         (key==='modem'||Date.now()-when<350))emit(current,key);
    },()=>{});
  }
}

// Measure the post-volume signal going to the browser's output. This does not
// require microphone permission or access to other tabs or device audio.
export function testOutput(p) {
  const current=device;
  if(!p.sound || current?.context.state!=='running')return Promise.resolve(null);
  const samples=new Float32Array(current.analyser.fftSize);
  const end=performance.now()+900;
  emit(current,'test');
  return new Promise(resolve=>{
    let peak=0;
    function sample() {
      if(device!==current || !p.sound || current.context.state!=='running'){resolve(null);return;}
      current.analyser.getFloatTimeDomainData(samples);
      for(const value of samples)peak=Math.max(peak,Math.abs(value));
      if(performance.now()>=end){resolve(peak);return;}
      setTimeout(sample,24);
    }
    sample();
  });
}

export function say(p,lines,queue=false,onError) {
  if(!p.sound||!p.voice||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return false;
  try {
    const speech=new window.SpeechSynthesisUtterance(lines.join(' '));
    speech.lang='en-US';speech.rate=.83;speech.pitch=.65;speech.volume=volumePercent(p.volume)/100;
    if(onError)speech.onerror=event=>{if(!['canceled','interrupted'].includes(event.error))onError();};
    if(!queue)window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);return true;
  }catch{return false;}
}

export function muteAudio() {
  const current=device;
  activation=null;device=null;
  if(current){
    current.context.onstatechange=null;
    current.gain.disconnect();current.analyser.disconnect();
    if(current.context.state!=='closed')current.context.close().catch(()=>{});
  }
  window.speechSynthesis?.cancel();
}
