// MAC grid: u(i,j,k) is the left face of cell (i,j,k), etc.
// SI-inspired nondimensional units: cup diameter 1, liquid height 1.15.
export class Fluid {
  constructor(n = 20) {
    this.n = n; this.s = n + 2; this.size = this.s ** 3;
    this.h = 1 / n; this.height = 1.15; this.dy = this.height / n;
    for (const key of ['u', 'v', 'w', 'u0', 'v0', 'w0', 'c', 'c0', 'p', 'div']) this[key] = new Float32Array(this.size);
    this.mask = new Uint8Array(this.size); this.cells = [];
    for (let k = 1; k <= n; k++) for (let j = 1; j <= n; j++) for (let i = 1; i <= n; i++) {
      const x = (i - .5) * this.h - .5, z = (k - .5) * this.h - .5;
      if (x*x + z*z < .48 ** 2) { const a = this.idx(i,j,k); this.mask[a] = 1; this.cells.push([i,j,k,a]); }
    }
    this.time = 0; this.injectedTime = 0; this.steps = 0; this.lastSubsteps = 1;
  }
  idx(i,j,k) { return i + this.s * (j + this.s * k); }
  reset() {
    for (const key of ['u','v','w','u0','v0','w0','c','c0','p','div']) this[key].fill(0);
    this.time = 0; this.injectedTime = 0; this.steps = 0;
  }
  sample(a, x, y, z, axis = 'c') {
    const n = this.n, s = this.s;
    let gx = (x + .5) / this.h + (axis === 'u' ? 1 : .5);
    let gy = y / this.dy + (axis === 'v' ? 1 : .5);
    let gz = (z + .5) / this.h + (axis === 'w' ? 1 : .5);
    gx = Math.max(0, Math.min(n + .999, gx));
    gy = Math.max(0, Math.min(n + .999, gy));
    gz = Math.max(0, Math.min(n + .999, gz));
    const i = Math.floor(gx), j = Math.floor(gy), k = Math.floor(gz);
    const tx = gx-i, ty = gy-j, tz = gz-k;
    let value = 0, weight = 0;
    for (let dz=0; dz<2; dz++) for (let dy=0; dy<2; dy++) for (let dx=0; dx<2; dx++) {
      const q = i+dx + s*(j+dy+s*(k+dz));
      const w = (dx ? tx : 1-tx)*(dy ? ty : 1-ty)*(dz ? tz : 1-tz);
      // Renormalize scalar interpolation near solid walls (zero normal gradient).
      if (axis !== 'c' || this.mask[q]) { value += a[q]*w; weight += w; }
    }
    return weight > 1e-9 ? value/weight : 0;
  }
  velocity(x,y,z, u=this.u, v=this.v, w=this.w) {
    return [this.sample(u,x,y,z,'u'),this.sample(v,x,y,z,'v'),this.sample(w,x,y,z,'w')];
  }
  trace(x,y,z,dt,u,v,w) {
    const a = this.velocity(x,y,z,u,v,w);
    const b = this.velocity(x-.5*dt*a[0],y-.5*dt*a[1],z-.5*dt*a[2],u,v,w);
    let bx = x-dt*b[0], by = Math.max(.5*this.dy,Math.min(this.height-.5*this.dy,y-dt*b[1])), bz = z-dt*b[2];
    const r = Math.hypot(bx,bz), limit = .48-1e-6;
    if (r > limit) { bx *= limit/r; bz *= limit/r; }
    return [bx,by,bz];
  }
  boundaries() {
    const n=this.n;
    for (let k=1;k<=n+1;k++) for(let j=1;j<=n+1;j++) for(let i=1;i<=n+1;i++) {
      const a=this.idx(i,j,k);
      if (!(this.mask[a] && this.mask[a-1])) this.u[a]=0;
      if (!(this.mask[a] && this.mask[a-this.s])) this.v[a]=0;
      if (!(this.mask[a] && this.mask[a-this.s*this.s])) this.w[a]=0;
    }
  }
  divergence() {
    let sum=0, max=0;
    for (const [i,j,k,a] of this.cells) {
      const d=(this.u[a+1]-this.u[a])/this.h+(this.v[a+this.s]-this.v[a])/this.dy+(this.w[a+this.s*this.s]-this.w[a])/this.h;
      this.div[a]=d; sum+=d*d; max=Math.max(max,Math.abs(d));
    }
    return {rms:Math.sqrt(sum/this.cells.length), max};
  }
  project(iterations=45) {
    this.boundaries(); this.beforeProjection=this.divergence().rms; this.p.fill(0);
    const offsets=[1,-1,this.s,-this.s,this.s*this.s,-this.s*this.s];
    const weights=[1/this.h**2,1/this.h**2,1/this.dy**2,1/this.dy**2,1/this.h**2,1/this.h**2];
    // Solve Laplacian(p)=div(u); p includes dt/rho. Neumann at solids.
    for(let iter=0;iter<iterations;iter++) for(let color=0;color<2;color++) {
      for(const [i,j,k,a] of this.cells) {
        if((i+j+k)%2!==color) continue;
        let sum=0, diagonal=0;
        for(let f=0;f<6;f++) if(this.mask[a+offsets[f]]) {sum+=weights[f]*this.p[a+offsets[f]];diagonal+=weights[f];}
        this.p[a]=(sum-this.div[a])/diagonal;
      }
    }
    for(const [i,j,k,a] of this.cells) {
      if(this.mask[a-1]) this.u[a]-=(this.p[a]-this.p[a-1])/this.h;
      if(this.mask[a-this.s]) this.v[a]-=(this.p[a]-this.p[a-this.s])/this.dy;
      if(this.mask[a-this.s*this.s]) this.w[a]-=(this.p[a]-this.p[a-this.s*this.s])/this.h;
    }
    this.afterProjection=this.divergence().rms;
  }
  inject(dt, params) {
    const {x=0,z=0,speed=1.5,tilt=15,azimuth=0}=params;
    const angle=tilt*Math.PI/180, phi=azimuth*Math.PI/180;
    const direction=[Math.sin(angle)*Math.cos(phi),-Math.cos(angle),Math.sin(angle)*Math.sin(phi)];
    const radius=Math.max(.075,1.3*this.h);
    for(const [i,j,k,a] of this.cells) {
      const px=(i-.5)*this.h-.5, py=(j-.5)*this.dy, pz=(k-.5)*this.h-.5;
      const d=((px-x)**2+(pz-z)**2)/radius**2;
      if(d>1 || py<this.height-2.5*this.dy) continue;
      const blend=1-Math.exp(-dt*speed*32*(1-d));
      this.c[a]+=(1-this.c[a])*blend;
      // Relax the jet-region velocity toward the nozzle velocity: finite momentum input.
      for(const [field,q] of [[this.u,0],[this.v,1],[this.w,2]]) field[a]+=(direction[q]*speed-field[a])*blend;
    }
    this.injectedTime+=dt;
  }
  advectVelocity(dt) {
    this.u0.set(this.u); this.v0.set(this.v); this.w0.set(this.w);
    for(const [i,j,k,a] of this.cells) {
      const x=(i-.5)*this.h-.5,y=(j-.5)*this.dy,z=(k-.5)*this.h-.5;
      for(const [field,old,axis,px,py,pz,neighbor] of [
        [this.u,this.u0,'u',x-.5*this.h,y,z,a-1],
        [this.v,this.v0,'v',x,y-.5*this.dy,z,a-this.s],
        [this.w,this.w0,'w',x,y,z-.5*this.h,a-this.s*this.s]]) {
        if(!this.mask[neighbor]) continue;
        const b=this.trace(px,py,pz,dt,this.u0,this.v0,this.w0);
        field[a]=this.sample(old,...b,axis)*Math.exp(-.025*dt);
      }
    }
  }
  advectConcentration(dt, diffusivity) {
    this.c0.set(this.c);
    for(const [i,j,k,a] of this.cells) {
      const b=this.trace((i-.5)*this.h-.5,(j-.5)*this.dy,(k-.5)*this.h-.5,dt,this.u,this.v,this.w);
      this.c[a]=this.sample(this.c0,...b);
    }
    this.c0.set(this.c);
    for(const [i,j,k,a] of this.cells) {
      let lap=0;
      for(const [offset,h] of [[1,this.h],[-1,this.h],[this.s,this.dy],[-this.s,this.dy],[this.s*this.s,this.h],[-this.s*this.s,this.h]])
        if(this.mask[a+offset]) lap+=(this.c0[a+offset]-this.c0[a])/(h*h);
      this.c[a]=Math.max(0,Math.min(1,this.c0[a]+dt*diffusivity*lap));
    }
  }
  maxSpeed() {
    let max=0;
    for(const [i,j,k,a] of this.cells) max=Math.max(max,Math.abs(this.u[a]),Math.abs(this.v[a]),Math.abs(this.w[a]));
    return max;
  }
  step(dt,params={}) {
    const diffusion=params.diffusion??.0003;
    const speed=Math.max(this.maxSpeed(),params.injecting?params.speed??1.5:0,.01);
    const stableDt=Math.min(.65*this.h/(speed*3),.45/(diffusion*(4/this.h**2+2/this.dy**2)||1));
    const count=Math.max(1,Math.ceil(dt/stableDt)); this.lastSubsteps=count;
    const subdt=dt/count;
    for(let step=0;step<count;step++) {
      this.advectVelocity(subdt);
      if(params.injecting) this.inject(subdt,params);
      this.project(params.pressureIterations??40);
      this.advectConcentration(subdt,diffusion);
      this.time+=subdt;this.steps++;
    }
  }
  stats() {
    let milk=0,energy=0;
    for(const [i,j,k,a] of this.cells) {milk+=this.c[a];energy+=this.u[a]**2+this.v[a]**2+this.w[a]**2;}
    return {milk:milk/this.cells.length, speed:this.maxSpeed(),energy:energy/this.cells.length, divergence:this.afterProjection??0};
  }
  textureData(target) {
    let q=0;
    for(let k=1;k<=this.n;k++) for(let j=1;j<=this.n;j++) for(let i=1;i<=this.n;i++) target[q++]=Math.round(255*this.c[this.idx(i,j,k)]);
    return target;
  }
}
