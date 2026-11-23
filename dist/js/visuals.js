const tau=Math.PI*2, rad=Math.PI/180;
const mix=(a,b,t)=>a+(b-a)*t;
function ctxFor(canvas,w,h){
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width||!height)return null;
  const ratio=Math.min(2,window.devicePixelRatio||1);
  const bw=Math.round(width*ratio), bh=Math.round(height*ratio);
  if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  ctx.setTransform(bw/w,0,0,bh/h,0,0);ctx.clearRect(0,0,w,h);ctx.lineWidth=1;ctx.setLineDash([]);
  return ctx;
}
const line=(c,x1,y1,x2,y2)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
const circle=(c,x,y,r,fill=false)=>{c.beginPath();c.arc(x,y,r,0,tau);fill?c.fill():c.stroke();};
function caption(c,text,x,y,color='#698762',align='left'){
  c.fillStyle=color;c.font='9px "Lucida Console",monospace';c.textAlign=align;c.fillText(text,x,y);c.textAlign='left';
}
function grid(c,w,h){
  c.lineWidth=.45;c.strokeStyle='#233428';
  for(let x=16;x<w;x+=18)line(c,x,0,x,h);
  for(let y=14;y<h;y+=18)line(c,0,y,w,y);
  c.strokeStyle='#3f5842';c.lineWidth=.8;
  for(const [x,sx] of [[10,1],[w-10,-1]])for(const [y,sy] of [[10,1],[h-10,-1]]){
    line(c,x,y,x+6*sx,y);line(c,x,y,x,y+6*sy);
  }
}
function fromLonLat([lon,lat]){const a=lon*rad,b=lat*rad;return [Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b),Math.sin(b)];}
function projectGlobe(v,r,angle,tilt,cx,cy){
  const x=v[0]*angle[0]+v[1]*angle[1],y=-v[0]*angle[1]+v[1]*angle[0];
  return [cx+r*y,cy-r*(v[2]*tilt[0]-x*tilt[1]),x*tilt[0]+v[2]*tilt[1]];
}
function drawPath(c,points,project){
  let last=null;c.beginPath();
  for(const p of points){const v=project(p);if(v[2]>=0){if(last&&last[2]>=0)c.lineTo(v[0],v[1]);else c.moveTo(v[0],v[1]);}last=v;}
  c.stroke();
}
function globe(c,t,assets,connected,glow){
  const W=360,H=214,cx=181,cy=107,r=85;
  grid(c,W,H);
  const angle=(-39+Math.sin(t*.035)*10)*rad, tilt=[Math.cos(24*rad),Math.sin(24*rad)], rot=[Math.cos(angle),Math.sin(angle)];
  const pr=v=>projectGlobe(v,r,rot,tilt,cx,cy);
  const halo=c.createRadialGradient(cx,cy,10,cx,cy,107);halo.addColorStop(0,'#1b3c24');halo.addColorStop(.83,'#101f15');halo.addColorStop(1,'#0b140f00');
  c.fillStyle=halo;circle(c,cx,cy,107,true);
  c.lineWidth=.7;c.strokeStyle='#365b3c';c.setLineDash([1,4]);circle(c,cx,cy,r+10);c.setLineDash([]);
  c.strokeStyle='#497548';c.lineWidth=.6;
  for(const g of assets.graticules)drawPath(c,g,pr);
  c.fillStyle=connected?'#79b968':'#587e54';
  for(const dot of assets.dots){const [x,y,z]=pr(dot);if(z>.018)c.fillRect(x,y,1.0+.24*z,1.0+.24*z);}
  c.strokeStyle=connected?'#a0db80':'#75a16d';c.lineWidth=.87;
  for(const ring of assets.xyz)drawPath(c,ring,pr);
  c.strokeStyle='#80b46c';c.lineWidth=1;circle(c,cx,cy,r);
  c.lineWidth=.65;c.strokeStyle='#548452';c.setLineDash([3,4]);c.beginPath();c.ellipse(cx,cy,123,37,-.42,0,tau);c.stroke();c.setLineDash([]);
  c.strokeStyle='#587854';c.lineWidth=.65;line(c,18,cy,76,cy);line(c,287,cy,342,cy);
  for(const x of [35,51,67,292,308,324])line(c,x,cy-2,x,cy+2);
  for(const [lon,lat] of [[-78,36],[1,44],[-42,-14]]){
    const [x,y,z]=pr(fromLonLat([lon,lat]));if(z<0)continue;
    c.strokeStyle='#a6ee83';c.lineWidth=.8;circle(c,x,y,3.8);c.fillStyle='#b1ef8a';c.fillRect(x-1,y-1,2,2);
  }
  const a=(t*.16+.2)%tau, ox=123*Math.cos(a),oy=37*Math.sin(a),cos=Math.cos(-.42),sin=Math.sin(-.42);
  const px=cx+ox*cos-oy*sin,py=cy+ox*sin+oy*cos;
  c.strokeStyle='#a4d98d';circle(c,px,py,2.4);if(glow){c.shadowColor='#99f88b';c.shadowBlur=5;}
  c.fillStyle='#bfeba0';circle(c,px,py,1.35,true);c.shadowBlur=0;
  caption(c,'ORB-01',17,22);caption(c,'+',30,190,'#526d4d');caption(c,'+',325,25,'#526d4d');caption(c,'SYNC',344,200,'#698762','right');
}
const nodes=[[.16,.35],[.37,.53],[.60,.31],[.75,.58],[.49,.70],[.86,.37]];
function warMap(c,t,w,assets){
  const W=360,H=214;grid(c,W,H);
  const pt=(lon,lat)=>[(lon+180)/360*W,(80-lat)/145*(H-29)+13];
  c.lineWidth=.7;c.strokeStyle='#77a66d';c.fillStyle='#162a1a';
  for(const ring of assets.rings){c.beginPath();let prior=null;for(const [lon,lat] of ring){const [x,y]=pt(lon,lat);if(prior===null||Math.abs(lon-prior)>180)c.moveTo(x,y);else c.lineTo(x,y);prior=lon;}c.fill();c.stroke();}
  c.strokeStyle='#4f734e';c.lineWidth=.55;
  for(let i=0;i<nodes.length;i++){const x=nodes[i][0]*W,y=nodes[i][1]*H;c.strokeRect(x-3,y-3,6,6);caption(c,'R'+(i+1),x+7,y+3,'#93b084');}
  const showTracks=w.decision==='ESCALATE'||w.outcome==='MUTUAL LOSS'||w.phase==='analysis';
  if(showTracks){
    for(let i=0;i<3;i++){
      const a=nodes[i],b=nodes[(i+3)%nodes.length];
      const xy=u=>[mix(a[0]*W,b[0]*W,u),mix(a[1]*H,b[1]*H,u)-Math.sin(Math.PI*u)*(34+i*5)];
      c.strokeStyle='#70a765';c.setLineDash([2,3]);c.lineWidth=1;c.beginPath();
      for(let j=0;j<=40;j++){const [x,y]=xy(j/40);if(j===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();c.setLineDash([]);
      const [x,y]=xy((t*.21+i*.27)%1);c.fillStyle='#c1ff94';circle(c,x,y,2.4,true);
    }
  }else{
    const at=nodes[w.side==='SOVIET UNION'?2:0], x=at[0]*W,y=at[1]*H;
    c.strokeStyle='#7cb36d';c.lineWidth=.8;circle(c,x,y,5+(t*8)%21);
    c.setLineDash([2,3]);circle(c,x,y,30);c.setLineDash([]);
  }
  caption(c,'EXERCISE GRID',15,24,'#a2cb94');caption(c,'SYNTHETIC TRACKS',344,198,'#8fab83','right');
}
function waveform(c,t,connected,war){
  const W=350,H=38;
  c.strokeStyle='#293e2b';c.lineWidth=.6;for(let x=0;x<=W;x+=17)line(c,x,3,x,H-2);
  for(const y of [8,19,30])line(c,0,y,W,y);
  const sample=(x,phase)=>{
    const beat=war?1.3:1;
    const carrier=Math.sin(x*.38+t*4+phase)+.38*Math.sin(x*.77+t*2+phase);
    const envelope=Math.pow(.5+.5*Math.sin(x*.105*beat-t*2.6),2);
    return 19+(connected?1:0)*carrier*(1.15+7*envelope)+Math.sin(x*.08+t)*.75;
  };
  for(const layer of [1,0]){c.strokeStyle=layer?'#3e653e':'#95d582';c.lineWidth=layer?.65:1.05;c.beginPath();for(let x=0;x<=W;x++){const y=sample(x,layer*.9);if(!x)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
}
export function startVisuals(scope,wave,getState){
  const assets={rings:[],xyz:[],dots:[],graticules:[]};
  for(let lat=-75;lat<=75;lat+=15)assets.graticules.push(Array.from({length:121},(_,i)=>fromLonLat([-180+i*3,lat])));
  for(let lon=-180;lon<180;lon+=20)assets.graticules.push(Array.from({length:61},(_,i)=>fromLonLat([lon,-90+i*3])));
  let dirty=true;
  Promise.all([fetch('./assets/land.json').then(r=>r.json()),fetch('./assets/land-dots.json').then(r=>r.json())]).then(([rings,dots])=>{assets.rings=rings;assets.xyz=rings.map(r=>r.map(fromLonLat));assets.dots=dots.map(fromLonLat);dirty=true;}).catch(()=>{dirty=true;});
  let prev=0,globeTime=0,trackTime=0,waveTime=0,lastKey='';
  function frame(now){
    requestAnimationFrame(frame);
    if(document.hidden||now-prev<75)return;
    const {linked,war,prefs}=getState();
    const delta=prefs.motion&&prev?Math.min(.2,(now-prev)/1000)*prefs.animation:0;
    if(prefs.globeMotion)globeTime+=delta;if(prefs.trackMotion)trackTime+=delta;if(prefs.waveMotion)waveTime+=delta;
    prev=now;
    const key=[linked,war?.phase,war?.decision,war?.scenario,prefs.glow,scope.clientWidth,scope.clientHeight,wave.clientWidth].join('|');
    if(!prefs.motion&&!dirty&&key===lastKey)return;
    dirty=false;lastKey=key;
    const c=ctxFor(scope,360,214), wc=ctxFor(wave,350,38);
    if(c){if(war)warMap(c,trackTime,war,assets);else globe(c,globeTime,assets,linked,prefs.glow);}
    if(wc)waveform(wc,waveTime,linked,!!war);
  }
  requestAnimationFrame(frame);
}
