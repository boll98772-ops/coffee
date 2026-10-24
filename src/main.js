import './style.css';
import { createScene } from './scene.js';

const icons={play:'<path d="m8 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',drop:'<path d="M12 3c-2 4-7 8-7 12a7 7 0 0 0 14 0c0-4-5-8-7-12Z"/>',expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',home:'<path d="m3 10 9-7 9 7v10H3Zm6 10v-7h6v7"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',cube:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5M3 7l9 5v10"/>'};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const range=(id,label,min,max,value,step,unit,help='')=>`<div class="control"><label for="${id}">${label}<output id="${id}-value">${value}${unit}</output></label><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" data-unit="${unit}"/>${help?`<p>${help}</p>`:''}</div>`;

document.querySelector('#app').innerHTML=`
<header class="topbar"><a href="./" class="brand" aria-label="Coffee Fluid Lab 首页"><span class="brand-mark">${icon('drop')}</span><span>COFFEE<span class="brand-light"> / FLUID LAB</span></span></a><span class="header-note">一杯咖啡里的流体力学</span><button class="text-button" id="about">模型说明 ${icon('info')}</button></header>
<main>
  <section class="intro"><div><div class="eyebrow"><span></span> INTERACTIVE FLUID EXPERIMENT · 001</div><h1>让混合，<span>慢慢发生。</span></h1><p>调整一束牛奶，观察下沉、旋流与回流。每一次相遇，都由流体方程计算。</p></div><div class="intro-aside"><span>COFFEE + MILK</span><div class="tiny-dots"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><small>从秩序，到交融。</small></div></section>
  <div class="lab-layout">
    <aside class="panel controls-panel"><div class="panel-heading"><span class="section-number">01</span><h2>注入设置</h2><span class="tiny-label">INPUT</span></div>
      <div class="position-heading"><span>注入位置</span><span id="position-value">X +0.12 · Z +0.00</span></div>
      <div id="position-pad" role="application" aria-label="注入位置俯视图，拖动调整；也可用下方 X 和 Z 滑块"><div class="pad-cross x"></div><div class="pad-cross z"></div><div class="pad-cup"></div><span class="pad-direction">Z −</span><span class="pad-x">X +</span><div id="pad-point"></div><span class="pad-caption">俯视杯口 · 拖动定位</span></div>
      <div class="position-sliders">${range('x','X 位置',-.36,.36,.12,.01,'')}${range('z','Z 位置',-.36,.36,0,.01,'')}</div>
      <div class="divider"></div>
      ${range('speed','注入速度',.3,3,1.8,.1,' ×','速度越高，射流动量越强')}
      <div class="two-controls">${range('tilt','倾斜角度',0,60,18,1,'°')}${range('azimuth','水平方向',0,360,100,5,'°')}</div>
      ${range('duration','注入时长',.5,10,4,.5,' s')}
      <button id="pour" class="primary-button">${icon('drop')}<span>开始注入</span>${icon('arrow')}</button>
      <p class="control-footnote">注入参数实时生效 · 时长在开始时锁定</p>
      <div class="preset-row"><span>快速实验</span><button id="central-preset">垂直射流</button><button id="swirl-preset">偏心旋流</button></div>
    </aside>
    <section class="viewport-panel" aria-label="流体实验视图">
      <div class="viewport-top"><div class="live-badge"><i></i><span id="status-text">等待注入</span></div><span class="viewport-tag">VOLUME / 3D</span></div>
      <div id="viewport"></div><div id="scene-error" hidden></div>
      <div class="view-label"><span>01 / 侧向观察</span><strong>COFFEE<br/>MEETS MILK<span>实时三维体渲染</span></strong></div>
      <div class="view-actions"><button id="side-view" title="侧面视角" aria-label="切换侧面视角">${icon('cube')}</button><button id="home-view" title="重置视角" aria-label="重置视角">${icon('home')}</button><button id="fullscreen" title="全屏实验视图" aria-label="全屏实验视图">${icon('expand')}</button></div>
      <div class="legend"><span>咖啡</span><i></i><span>牛奶</span></div>
      <div class="viewport-hint"><span class="mouse-icon"></span>拖动旋转 <span>·</span> 滚轮缩放</div>
      <div class="transport"><button id="pause" class="transport-main" aria-label="暂停模拟">${icon('pause')}</button><button id="reset" class="reset-button">${icon('reset')} 重置实验</button><div class="time-display"><span>SIMULATION TIME</span><strong id="sim-time">00:00.00</strong></div><div class="transport-progress"><div id="pour-progress"></div></div><span id="pour-caption">READY TO POUR</span></div>
    </section>
    <aside class="panel analysis-panel"><div class="panel-heading"><span class="section-number">02</span><h2>实验观察</h2><span class="tiny-label">LIVE</span></div>
      <div class="metric primary-metric"><span>牛奶平均浓度</span><strong><b id="milk-value">0.0</b><small>%</small></strong><div class="concentration-track"><i id="concentration-bar"></i></div><p>网格内的体积平均示踪浓度</p></div>
      <div class="metric-grid"><div><span>最大分量速度</span><strong id="velocity-value">0.00<small> u/s</small></strong></div><div><span>投影后散度 RMS</span><strong id="div-value">0.000</strong></div></div>
      <div class="divider"></div>
      <div class="section-subheading">可视化 <span>DISPLAY</span></div>
      <label class="toggle-row" for="vectors"><span>速度场<span class="subtle">显示流动方向与强度</span></span><input id="vectors" type="checkbox"/><span class="toggle"></span></label>
      <label class="select-label" for="resolution">模拟网格<select id="resolution"><option value="16">16³ · 流畅优先</option><option value="20">20³ · 更多细节</option><option value="24">24³ · 较高负载</option></select></label>
      <p class="field-note">切换网格会重置实验。性能不足时，请使用 16³。</p>
      ${range('diffusion','浓度扩散',0,10,3,1,'','扩散系数 = 滑块值 × 10⁻⁴')}
      <div class="compute-status"><span class="status-dot"></span><span>CPU / WEB WORKER</span><strong id="step-cost">— ms</strong></div>
      <div class="model-card"><span class="model-icon">${icon('cube')}</span><h3>真实求解，自然混合。</h3><p>三维速度场 + 浓度输运<br/>MAC 网格 · 压力投影</p><button id="model-link">了解物理近似 ${icon('arrow')}</button></div>
    </aside>
  </div>
  <footer><span><i></i> NUMERICAL FLOW. NO SCRIPTED SWIRLS.</span><span>固定液面 · 等密度 · 无浮力 <span class="footer-divider">/</span> Coffee Fluid Lab <b>v0.1</b></span></footer>
</main>
<div class="toast" id="toast" role="status"></div>
<dialog id="model-dialog"><div class="dialog-heading"><span class="eyebrow">BEHIND THE SIMULATION</span><button id="close-dialog" aria-label="关闭模型说明">×</button></div><h2>杯中的运动，<br/><em>来自数值计算。</em></h2><p>使用低分辨率三维交错网格（MAC）存储速度，通过半拉格朗日平流、压力泊松方程迭代和压力投影，近似求解不可压缩流动。牛奶是随速度输运、扩散的被动浓度场。</p><dl><dt>动量与注入</dt><dd>液面下的小区域向设定的射流速度松弛，同时补充牛奶浓度。位置、方向、速度影响求解结果；这不是预设旋涡。注入是固定体积内的局部替换，不增加液体总体积。</dd><dt>边界与液面</dt><dd>圆柱杯壁以阶梯网格近似；固体边界和固定液面均不可穿透，切向速度采用自由滑移近似。固定液面相当于刚性盖板，不模拟波浪、溅射或液面上升。</dd><dt>数值限制</dt><dd>等密度、无温差、无浮力。牛奶的下沉来自注入动量。半拉格朗日法有数值耗散，浓度不严格守恒；扩散采用显式无通量离散，速度含少量线性阻尼。压力迭代后仍可能有残余散度，尤其注入期间。无高精度湍流或分子尺度细节。</dd><dt>性能与时间</dt><dd>默认 16³ 网格，每个模拟步推进 1/30 秒，按速度和扩散稳定性细分子步。计算在 Worker 中完成；设备较慢时，模拟时间会慢于现实时间。不会替换成视觉动画。速度单位为杯径/模拟秒（u/s），不是实测物理标定。</dd><dt>显示与诊断</dt><dd>体渲染直接采样计算得到的三维牛奶浓度。牛奶平均浓度不等同于累计倒入体积。速度箭头来自交错网格插值；按空格暂停或继续，按 R 重置。16³ 是计算域网格数，圆柱外的格点不参与求解。</dd></dl><button class="primary-button" id="understood">返回实验 ${icon('arrow')}</button></dialog>
`;

const $=(id)=>document.getElementById(id);
const settings={x:.12,z:0,speed:1.8,tilt:18,azimuth:100,duration:4,diffusion:.0003};
let scene,worker,running=true,busy=false,frame=null,pourDuration=4,resetting=false,timer,stepSamples=[];
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function updatePosition(){
  $('pad-point').style.left=`${50+settings.x/.48*37}%`;$('pad-point').style.top=`${50+settings.z/.48*37}%`;
  const signed=v=>`${v>=0?'+':''}${v.toFixed(2)}`;
  $('position-value').textContent=`X ${signed(settings.x)} · Z ${signed(settings.z)}`;
}
function syncSettings(){worker?.postMessage({type:'settings',settings});scene?.setNozzle(settings,running&&(frame?.remaining??0)>0);updatePosition();}
for(const id of ['x','z','speed','tilt','azimuth','duration','diffusion']){
  $(id).addEventListener('input',()=>{
    let value=Number($(id).value);
    if(id==='x'||id==='z'){
      const other=id==='x'?'z':'x';const max=Math.sqrt(.38**2-settings[other]**2);
      value=Math.max(-max,Math.min(max,value));$(id).value=value;
    }
    settings[id]=id==='diffusion'?value*.0001:value;
    $(`${id}-value`).textContent=(id==='x'||id==='z'?value.toFixed(2):value)+$(id).dataset.unit;syncSettings();
  });
}
function applyPreset(values){for(const [id,value]of Object.entries(values)){$(id).value=value;$(id).dispatchEvent(new Event('input'));}}
$('central-preset').onclick=()=>{applyPreset({x:0,z:0,tilt:0,azimuth:0,speed:1.8});toast('垂直射流：观察下沉与杯底回流');};
$('swirl-preset').onclick=()=>{applyPreset({x:.22,z:0,tilt:45,azimuth:90,speed:2.2});toast('偏心旋流：倾斜射流传递角动量');};
let dragging=false;
function padMove(event){
  if(!dragging)return;const r=$('position-pad').getBoundingClientRect();
  let x=((event.clientX-r.left)/r.width-.5)*(.96/.74),z=((event.clientY-r.top)/r.height-.5)*(.96/.74);
  const distance=Math.hypot(x,z);if(distance>.36){x*=.36/distance;z*=.36/distance;}
  settings.x=x;settings.z=z;for(const id of ['x','z']){$(id).value=settings[id];$(`${id}-value`).textContent=settings[id].toFixed(2);}syncSettings();
}
$('position-pad').onpointerdown=e=>{dragging=true;$('position-pad').setPointerCapture(e.pointerId);padMove(e);};
$('position-pad').onpointermove=padMove;$('position-pad').onpointerup=()=>dragging=false;$('position-pad').onpointercancel=()=>dragging=false;
function setRunning(value){running=value;if(window.__fluidLab)window.__fluidLab.running=value;$('pause').innerHTML=icon(running?'pause':'play');$('pause').setAttribute('aria-label',running?'暂停模拟':'继续模拟');scene?.setNozzle(settings,running&&(frame?.remaining??0)>0);updateStatus();}
function updateStatus(){
  $('status-text').textContent=!running?'模拟已暂停':(frame?.remaining??0)>0?'正在注入':(frame?.milk??0)>.00001?'混合进行中':'等待注入';
  document.querySelector('.live-badge').classList.toggle('paused',!running);
}
$('pause').onclick=()=>setRunning(!running);
$('pour').onclick=()=>{if(!worker||resetting)return;pourDuration=settings.duration;worker.postMessage({type:'pour'});setRunning(true);toast(`注入已开始 · ${settings.duration.toFixed(1)} 模拟秒`);};
function reset(n){if(!worker)return;resetting=true;worker.postMessage({type:'reset',n});stepSamples=[];toast(n?'网格已切换，实验已重置':'实验已重置，保留当前注入设置');}
$('reset').onclick=()=>reset();$('resolution').onchange=()=>reset(Number($('resolution').value));
$('vectors').onchange=()=>scene?.vectors($('vectors').checked);
$('home-view').onclick=()=>{scene?.home();toast('已恢复初始视角');};$('side-view').onclick=()=>{scene?.side();toast('已切换为正侧面视角');};
$('fullscreen').onclick=async()=>{try{const panel=document.querySelector('.viewport-panel');if(document.fullscreenElement)await document.exitFullscreen();else await panel.requestFullscreen();}catch{toast('当前浏览器不支持全屏，请使用视角缩放');}};
const dialog=$('model-dialog');for(const id of ['about','model-link'])$(id).onclick=()=>dialog.showModal();for(const id of ['close-dialog','understood'])$(id).onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('keydown',e=>{if(dialog.open||['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();setRunning(!running);}if(e.code==='KeyR')reset();});
function showError(error){$('scene-error').hidden=false;$('scene-error').textContent=`三维实验无法启动：${error.message}。请使用支持 WebGL 2 的现代浏览器，并启用硬件加速。`;setRunning(false);$('pour').disabled=true;console.error(error);}
try{
  scene=createScene($('viewport'));scene.setNozzle(settings,false);
  worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
  worker.onerror=e=>showError(new Error(e.message||'计算 Worker 启动失败'));
  worker.onmessage=({data})=>{
    busy=false;resetting=false;frame=data;scene.update(data);scene.setNozzle(settings,running&&data.remaining>0);
    $('sim-time').textContent=`${Math.floor(data.time/60).toString().padStart(2,'0')}:${(data.time%60).toFixed(2).padStart(5,'0')}`;
    $('milk-value').textContent=(data.milk*100).toFixed(1);$('concentration-bar').style.width=`${data.milk*100}%`;
    $('velocity-value').innerHTML=`${data.speed.toFixed(2)}<small> u/s</small>`;$('div-value').textContent=data.divergence<.001?data.divergence.toExponential(1):data.divergence.toFixed(3);
    $('step-cost').textContent=`${data.ms.toFixed(0)} ms`;
    $('pour-progress').style.width=data.remaining>0?`${100*(1-data.remaining/pourDuration)}%`:'0%';
    $('pour-caption').textContent=data.remaining>0?`${data.remaining.toFixed(1)}s REMAINING`:'READY TO POUR';
    $('pour').querySelector('span').textContent=data.remaining>0?'重新注入':'开始注入';updateStatus();
    if(data.ms>0){stepSamples.push(data.ms);if(stepSamples.length>30)stepSamples.shift();if(stepSamples.length===30&&stepSamples.every(v=>v>90)&&data.n>16){toast('当前计算较慢，可切换到 16³ 网格；模拟仍在真实计算。');stepSamples=[];}}
    // Expose read-only numerical diagnostics for reproducible browser smoke tests.
    window.__fluidLab={time:data.time,milk:data.milk,speed:data.speed,divergence:data.divergence,n:data.n,remaining:data.remaining,running};
  };
  syncSettings();
  timer=setInterval(()=>{if(running&&!busy&&!resetting&&frame){busy=true;worker.postMessage({type:'step'});}},1000/30);
  let lastRender=-Infinity;function animate(now){requestAnimationFrame(animate);if(now-lastRender>=1000/30){scene.render();lastRender=now;}}requestAnimationFrame(animate);
  scene.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showError(new Error('WebGL 上下文丢失，请刷新页面'));});
}catch(error){showError(error);}
window.addEventListener('pagehide',()=>{clearInterval(timer);worker?.terminate();});
updatePosition();
