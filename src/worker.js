import { Fluid } from './fluid.js';
let fluid=new Fluid(16), settings={x:.12,z:0,speed:1.8,tilt:18,azimuth:100,duration:4,diffusion:.0003}, remaining=0;
function snapshot(ms=0) {
  const data=fluid.textureData(new Uint8Array(fluid.n**3));
  const vectors=[];
  for(const [i,j,k,a] of fluid.cells) if(i%3===2&&j%3===2&&k%3===2) {
    const x=(i-.5)*fluid.h-.5,y=(j-.5)*fluid.dy,z=(k-.5)*fluid.h-.5;
    vectors.push(x,y,z,...fluid.velocity(x,y,z));
  }
  self.postMessage({type:'frame',n:fluid.n,data,vectors,time:fluid.time,remaining,ms,substeps:fluid.lastSubsteps,...fluid.stats()},[data.buffer]);
}
self.onmessage=({data})=>{
  if(data.type==='settings') settings={...settings,...data.settings};
  if(data.type==='pour') remaining=settings.duration;
  if(data.type==='reset') {fluid=new Fluid(data.n??fluid.n);remaining=0;snapshot();}
  if(data.type==='step') {
    const t=performance.now(),dt=1/30, injected=Math.min(dt,remaining);
    if(injected>0) fluid.step(injected,{...settings,injecting:true});
    if(injected<dt) fluid.step(dt-injected,{...settings,injecting:false});
    remaining=Math.max(0,remaining-dt);snapshot(performance.now()-t);
  }
};
snapshot();
