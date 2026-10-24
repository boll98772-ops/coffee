import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fluid } from '../src/fluid.js';

test('pressure projection reduces divergence and enforces no-through solid walls', () => {
  const f=new Fluid(12);
  for(const [i,j,k,a] of f.cells) { f.u[a]=Math.sin(i*1.7+j); f.v[a]=Math.cos(j*2+k); f.w[a]=Math.sin(k*2+i); }
  f.project(160);
  assert.ok(f.afterProjection < f.beforeProjection*.015, `${f.beforeProjection} -> ${f.afterProjection}`);
  for(const [i,j,k,a] of f.cells) {
    if(!f.mask[a-1]) assert.equal(f.u[a],0);
    if(!f.mask[a-f.s]) assert.equal(f.v[a],0);
    if(!f.mask[a-f.s*f.s]) assert.equal(f.w[a],0);
  }
});

test('unforced coffee stays at rest; reset clears fields and clocks', () => {
  const f=new Fluid(12);f.step(.05);
  assert.equal(f.stats().energy,0);assert.equal(f.stats().milk,0);
  f.step(.05,{injecting:true,speed:2});assert.ok(f.stats().milk>0);
  f.reset();assert.equal(f.time,0);assert.equal(f.stats().energy,0);assert.equal(f.stats().milk,0);
});

test('jet advects milk downward, generates return flow, and stays bounded', () => {
  const f=new Fluid(12);
  for(let t=0;t<70;t++) f.step(1/30,{injecting:t<35,x:.15,z:0,speed:1.8,tilt:20,azimuth:90});
  let lower=0,up=0,down=0;
  for(const [i,j,k,a] of f.cells) {
    assert.ok(Number.isFinite(f.c[a])&&f.c[a]>=0&&f.c[a]<=1);
    if(j<f.n*.65) lower+=f.c[a];
    up=Math.max(up,f.v[a]);down=Math.min(down,f.v[a]);
  }
  assert.ok(lower>.1,`lower milk ${lower}`);assert.ok(up>.005,`return ${up}`);assert.ok(down<-.005);
  assert.ok(f.stats().speed<3);
});

test('nozzle position, direction, speed, and duration change numerical output', () => {
  const run=(params,frames=10)=>{const f=new Fluid(10);for(let i=0;i<frames;i++)f.step(1/30,{injecting:true,...params});return f;};
  const a=run({x:-.2,speed:1,tilt:0}),b=run({x:.2,speed:1,tilt:0});
  let momentA=0,momentB=0;for(const [i,j,k,q] of a.cells){momentA+=(i-5.5)*a.c[q];momentB+=(i-5.5)*b.c[q];}
  assert.ok(momentA<0&&momentB>0);
  const fast=run({x:-.2,speed:2.5,tilt:0});assert.ok(fast.stats().energy>a.stats().energy*1.2);
  const tilted=run({x:-.2,speed:1,tilt:45,azimuth:90});
  assert.ok(tilted.w.some((v,i)=>Math.abs(v-a.w[i])>.01));
  assert.ok(run({speed:1},20).stats().milk>run({speed:1},5).stats().milk);
});

test('explicit diffusion reduces scalar variance and preserves no-flux mass at rest',()=>{
  const f=new Fluid(12);for(const [i,j,k,a] of f.cells)f.c[a]=i<6?1:0;
  const total=()=>f.cells.reduce((s,[i,j,k,a])=>s+f.c[a],0);
  const variance=()=>f.cells.reduce((s,[i,j,k,a])=>s+(f.c[a]-.5)**2,0);
  const mass=total(),v=variance();f.advectConcentration(.01,.005);
  assert.ok(variance()<v);assert.ok(Math.abs(total()-mass)<.001);
});

test('opposite tangential jets produce opposite angular momentum',()=>{
  function angularMomentum(azimuth){
    const f=new Fluid(12);
    for(let t=0;t<20;t++)f.step(1/30,{injecting:true,x:.22,z:0,speed:2,tilt:45,azimuth});
    let momentum=0;
    for(const [i,j,k,a]of f.cells){const x=(i-.5)*f.h-.5,z=(k-.5)*f.h-.5;momentum+=x*f.w[a]-z*f.u[a];}
    return momentum;
  }
  const forward=angularMomentum(90),reverse=angularMomentum(270);
  assert.ok(forward>1,`forward torque ${forward}`);assert.ok(reverse< -1,`reverse torque ${reverse}`);
});

test('maximum input remains finite with CFL substeps and flow persists after pouring',()=>{
  const f=new Fluid(12);
  for(let t=0;t<50;t++)f.step(.05,{injecting:t<35,x:.3,z:.1,speed:3,tilt:60,azimuth:200,diffusion:.001});
  assert.ok(f.lastSubsteps>1);assert.ok(f.stats().energy>1e-5);
  assert.ok(f.stats().speed<4);assert.ok(f.stats().milk>0);
  for(const field of [f.u,f.v,f.w,f.c]) for(const value of field)assert.ok(Number.isFinite(value));
  for(const value of f.c)assert.ok(value>=0&&value<=1);
  const sum=f.cells.reduce((s,[i,j,k,a])=>s+f.div[a],0);
  assert.ok(Math.abs(sum)<.001,`closed-domain net divergence ${sum}`);
});
