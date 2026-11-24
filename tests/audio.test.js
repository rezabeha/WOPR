import test from 'node:test';
import assert from 'node:assert/strict';
import {issue,freshSession} from '../dist/js/terminal.js';

function endpoint(props={}) {
  return {
    connect(to){this.output=to;},
    disconnect(){this.output=null;},
    ...props
  };
}

function parameter() {
  return {value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
}

// The browser can keep resume() pending after the first user gesture.
class DelayedContext {
  static instances=[];
  constructor(){
    this.state='suspended';
    this.currentTime=0;
    this.destination={};
    this.gains=[];
    this.starts=[];
    DelayedContext.instances.push(this);
  }
  resume(){
    this.resumeCalls=(this.resumeCalls||0)+1;
    return new Promise((resolve,reject)=>{this.allow=resolve;this.deny=reject;});
  }
  ready(){this.state='running';this.onstatechange?.();this.allow();}
  close(){this.state='closed';return Promise.resolve();}
  createAnalyser(){return this.meter=endpoint({fftSize:0,getFloatTimeDomainData(data){data.fill(.2);}});}
  createGain(){
    const node=endpoint({gain:parameter()});
    this.gains.push(node);
    return node;
  }
  createOscillator(){
    return endpoint({frequency:parameter(),start:at=>this.starts.push(at),stop(){}});
  }
}

let importId=0;
async function fixture(t){
  const previous=globalThis.window;
  globalThis.window={AudioContext:DelayedContext};
  DelayedContext.instances=[];
  const audio=await import('../dist/js/audio.js?audio-case='+ ++importId);
  t.after(()=>{
    audio.muteAudio();
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  });
  return {audio,prefs:{...audio.defaults,sound:true}};
}

test('a first cue survives asynchronous activation and is routed to the output',async t=>{
  const {audio,prefs}=await fixture(t);
  assert.equal(audio.defaults.sound,false);
  const ready=audio.enableAudio();
  const ctx=DelayedContext.instances[0];
  assert.equal(ctx.resumeCalls,1);
  assert.equal(audio.enableAudio(),ready);
  assert.equal(audio.audioState(),'starting');
  audio.sound(prefs,'beeps');
  assert.deepEqual(ctx.starts,[]);
  ctx.ready();
  await ready;
  assert.equal(audio.audioState(),'running');
  assert.equal(ctx.starts.length,1);
  assert.equal(ctx.gains[0].output,ctx.meter);
  assert.equal(ctx.meter.output,ctx.destination);
  assert.equal(ctx.gains[1].output,ctx.gains[0]);
});

test('muting a pending start discards its tones even if a new device is already active',async t=>{
  const {audio,prefs}=await fixture(t);
  const previous=audio.enableAudio();
  const old=DelayedContext.instances[0];
  audio.sound(prefs,'modem');
  audio.muteAudio();
  assert.equal(old.state,'closed');
  assert.equal(old.gains[0].output,null);
  assert.equal(old.meter.output,null);
  const next=audio.enableAudio();
  const current=DelayedContext.instances[1];
  current.ready();
  await next;
  old.allow();
  await assert.rejects(previous,/interrupted/);
  assert.deepEqual(old.starts,[]);
  assert.deepEqual(current.starts,[]);
  assert.equal(audio.audioState(),'running');
});

test('an interrupted or denied device can be resumed on a later gesture',async t=>{
  const {audio,prefs}=await fixture(t);
  const denied=audio.enableAudio();
  const ctx=DelayedContext.instances[0];
  ctx.deny(new Error('permission denied'));
  await assert.rejects(denied,/permission denied/);
  assert.equal(audio.audioState(),'suspended');
  const retry=audio.enableAudio();
  ctx.ready();await retry;
  ctx.state='interrupted';
  assert.equal(audio.audioState(),'interrupted');
  const resumed=audio.enableAudio();
  audio.sound(prefs,'radar');
  ctx.ready();await resumed;
  assert.equal(ctx.resumeCalls,3);
  assert.equal(ctx.starts.length,2);
});

test('all five effect switches, the master switch and the volume control work independently',async t=>{
  const {audio,prefs}=await fixture(t);
  const ready=audio.enableAudio(undefined,75);
  const ctx=DelayedContext.instances[0];
  ctx.ready();await ready;
  for(const [key,count] of [['modem',28],['keys',1],['beeps',1],['radar',2],['activity',1]]){
    const initial=ctx.starts.length;
    audio.sound({...prefs,[key]:false},key);
    audio.sound({...prefs,sound:false},key);
    assert.equal(ctx.starts.length,initial);
    audio.sound(prefs,key);
    assert.equal(ctx.starts.length,initial+count,key);
  }
  assert.equal(ctx.gains[0].gain.value,.75);
  audio.setVolume(25);assert.equal(ctx.gains[0].gain.value,.25);
  audio.setVolume(0);assert.equal(ctx.gains[0].gain.value,0);
  audio.setVolume(200);assert.equal(ctx.gains[0].gain.value,1);
  audio.setVolume('bad');assert.equal(ctx.gains[0].gain.value,.75);
});

test('output check recognizes missing devices and discards interrupted readings',async t=>{
  const {audio,prefs}=await fixture(t);
  assert.equal(await audio.testOutput(prefs),null);
  window.AudioContext=undefined;
  await assert.rejects(audio.enableAudio(),/unavailable/);
  window.AudioContext=DelayedContext;
  const ready=audio.enableAudio();
  const ctx=DelayedContext.instances[0];
  ctx.ready();await ready;
  const measurement=audio.testOutput(prefs);
  assert.equal(ctx.starts.length,2);
  audio.muteAudio();
  assert.equal(await measurement,null);
});

test('speech uses the selected master volume and observes both opt-ins',async t=>{
  const {audio,prefs}=await fixture(t);
  const spoken=[];
  window.speechSynthesis={cancel(){},speak(line){spoken.push(line);}};
  window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
  assert.equal(audio.say(prefs,['ONLINE']),false);
  prefs.voice=true;prefs.volume=40;
  assert.equal(audio.say(prefs,['ONLINE']),true);
  assert.equal(spoken[0].volume,.4);
  assert.equal(spoken[0].text,'ONLINE');
  assert.equal(audio.say({...prefs,sound:false},['OFFLINE']),false);
  assert.equal(spoken.length,1);
});

test('sound checks are available before logon and during a game',()=>{
  const s=freshSession();
  for(const k of ['TEST SOUND','SOUND TEST','TEST AUDIO','AUDIO TEST'])assert.equal(issue(s,k).ui,'audioTest');
  issue(s,'JOSHUA');issue(s,'CHESS');
  assert.equal(issue(s,'TEST SOUND').ui,'audioTest');
});
