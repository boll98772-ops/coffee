import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const vertex=`varying vec3 vLocal; void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`precision highp float;
precision highp sampler3D;
uniform sampler3D uMilk;
uniform vec3 uEye;
uniform float uDetail;
uniform float uExposure;
varying vec3 vLocal;
vec2 boxHit(vec3 o,vec3 d){vec3 a=(-vec3(.5)-o)/d;vec3 b=(vec3(.5)-o)/d;return vec2(max(max(min(a.x,b.x),min(a.y,b.y)),min(a.z,b.z)),min(min(max(a.x,b.x),max(a.y,b.y)),max(a.z,b.z)));}
void main(){
 vec3 rd=normalize(vLocal-uEye);vec2 hit=boxHit(uEye,rd);
 float t=max(hit.x,0.);float end=hit.y;
 if(t>=end)discard;
 float ds=(end-t)/uDetail;
 vec3 accumulated=vec3(0.);float alpha=0.;
 for(int i=0;i<160;i++){
   if(float(i)>=uDetail||alpha>.985)break;
   vec3 p=uEye+rd*(t+(float(i)+.5)*ds);
   if(dot(p.xz,p.xz)>.48*.48)continue;
   vec3 uv=p+vec3(.5);float milk=texture(uMilk,uv).r;
   float sigma=mix(2.8,13.,pow(milk,.65));
   float a=1.-exp(-sigma*ds);
   vec3 coffee=vec3(.045,.012,.004);
   vec3 cream=vec3(.94,.88,.73);
   float shade=.78+.22*uv.y;
   // Sample scalar gradient for local shading only; motion comes entirely from the solver.
   float grad=texture(uMilk,uv+vec3(-.025,.025,.02)).r-texture(uMilk,uv+vec3(.025,-.025,-.02)).r;
   vec3 color=mix(coffee,cream,pow(milk,.42))*shade+grad*.15;
   accumulated+=(1.-alpha)*a*color*uExposure;
   alpha+=(1.-alpha)*a;
 }
 gl_FragColor=vec4(accumulated/max(alpha,.0001),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function createScene(container) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.setClearColor(0x171d20,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','三维玻璃杯流体视图，拖动旋转，滚轮缩放');
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.01,50);camera.position.set(1.65,1.4,3.5);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.61,0);controls.enableDamping=true;controls.minDistance=1.6;controls.maxDistance=5;controls.maxPolarAngle=Math.PI*.87;controls.enablePan=false;
  scene.add(new THREE.HemisphereLight(0xe9f3ff,0x5d4531,2.7));
  const light=new THREE.DirectionalLight(0xf5e7ca,3);light.position.set(-3,4,3);scene.add(light);
  const blue=new THREE.DirectionalLight(0x90cfe5,2);blue.position.set(3,1,-2);scene.add(blue);
  const cup=new THREE.Group();scene.add(cup);
  const glass=new THREE.MeshPhysicalMaterial({color:0xcbe8e8,transparent:true,opacity:.105,roughness:.13,metalness:.1,side:THREE.DoubleSide,depthWrite:false});
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(.515,.515,1.35,96,1,true),glass);wall.position.y=.63;wall.renderOrder=3;cup.add(wall);
  const rimMat=new THREE.MeshStandardMaterial({color:0xc8e6e7,transparent:true,opacity:.5,roughness:.17,metalness:.45,depthWrite:false});
  for(const y of [-.04,1.305]){
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.515,.009,12,96),rimMat);rim.rotation.x=Math.PI/2;rim.position.y=y;rim.renderOrder=4;cup.add(rim);
  }
  const bottom=new THREE.Mesh(new THREE.CylinderGeometry(.514,.514,.045,96),glass);bottom.position.y=-.025;cup.add(bottom);
  const surface=new THREE.Mesh(new THREE.RingGeometry(.472,.482,96),new THREE.MeshBasicMaterial({color:0xe9b77f,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false}));surface.rotation.x=-Math.PI/2;surface.position.y=1.151;surface.renderOrder=3;cup.add(surface);
  // Restrained glass reflections: geometry only, no fluid animation.
  for(const angle of [-.7,2.3]){
    const curve=new THREE.LineCurve3(new THREE.Vector3(Math.sin(angle)*.516,.06,Math.cos(angle)*.516),new THREE.Vector3(Math.sin(angle)*.516,1.24,Math.cos(angle)*.516));
    const line=new THREE.Mesh(new THREE.TubeGeometry(curve,1,.003,5,false),new THREE.MeshBasicMaterial({color:0xd5eded,transparent:true,opacity:.35,depthWrite:false}));line.renderOrder=4;cup.add(line);
  }
  const coaster=new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,.035,96),new THREE.MeshStandardMaterial({color:0x252c2d,roughness:.85,metalness:.2}));coaster.position.y=-.085;scene.add(coaster);
  const edge=new THREE.Mesh(new THREE.TorusGeometry(.63,.002,6,96),new THREE.MeshBasicMaterial({color:0x718386}));edge.rotation.x=Math.PI/2;edge.position.y=-.065;scene.add(edge);
  const grid=new THREE.GridHelper(5,40,0x414c50,0x283236);grid.position.y=-.108;grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
  const disk=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.1}));disk.rotation.x=-Math.PI/2;disk.position.y=-.11;scene.add(disk);
  let texture;
  const uniforms={uMilk:{value:null},uEye:{value:new THREE.Vector3()},uDetail:{value:88},uExposure:{value:1.0}};
  const material=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,side:THREE.BackSide,transparent:true,depthWrite:false});
  const volume=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);volume.scale.y=1.15;volume.position.y=.575;volume.renderOrder=2;scene.add(volume);
  const nozzle=new THREE.Group();scene.add(nozzle);
  const nozzleMesh=new THREE.Mesh(new THREE.CylinderGeometry(.024,.035,.19,24),new THREE.MeshStandardMaterial({color:0xbad0d4,metalness:.65,roughness:.25}));nozzle.add(nozzleMesh);
  const tip=new THREE.Mesh(new THREE.TorusGeometry(.035,.004,8,24),rimMat);tip.rotation.x=Math.PI/2;tip.position.y=-.095;nozzle.add(tip);
  const stream=new THREE.Mesh(new THREE.CylinderGeometry(.014,.022,1,12),new THREE.MeshBasicMaterial({color:0xffe9c6,transparent:true,opacity:.8}));scene.add(stream);stream.visible=false;
  const marker=new THREE.Mesh(new THREE.RingGeometry(.048,.053,48),new THREE.MeshBasicMaterial({color:0xe2bd85,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.y=1.157;marker.renderOrder=5;scene.add(marker);
  const arrows=new THREE.Group();arrows.visible=false;scene.add(arrows);
  const arrowPool=[];
    const inverse=new THREE.Matrix4();
  let width=0,height=0;
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(w===width&&h===height)return;width=w;height=h;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  function setNozzle(p,active){
    const tilt=p.tilt*Math.PI/180,phi=p.azimuth*Math.PI/180;
    const dir=new THREE.Vector3(Math.sin(tilt)*Math.cos(phi),-Math.cos(tilt),Math.sin(tilt)*Math.sin(phi));
    const target=new THREE.Vector3(p.x,1.15,p.z);
    nozzle.position.copy(target).addScaledVector(dir,-.32);nozzle.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),dir);
    marker.position.set(p.x,1.157,p.z);
    stream.position.copy(target).addScaledVector(dir,-.115);stream.scale.y=.23;stream.quaternion.copy(nozzle.quaternion);stream.visible=active;
  }
  function update(frame){
    if(!texture||texture.image.width!==frame.n){
      texture?.dispose();texture=new THREE.Data3DTexture(frame.data,frame.n,frame.n,frame.n);texture.format=THREE.RedFormat;texture.type=THREE.UnsignedByteType;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.unpackAlignment=1;uniforms.uMilk.value=texture;
    }else texture.image.data=frame.data;
    texture.needsUpdate=true;
    for(let a=0;a<frame.vectors.length/6;a++){
      if(!arrowPool[a]){const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.05,0x8fd8de,.014,.009);arrow.line.material.transparent=true;arrow.line.material.opacity=.7;arrowPool[a]=arrow;arrows.add(arrow);}
      const q=a*6,[x,y,z,u,v,w]=frame.vectors.slice(q,q+6),length=Math.hypot(u,v,w);
      const arrow=arrowPool[a];arrow.position.set(x,y,z);arrow.visible=length>.003;
      if(arrow.visible){arrow.setDirection(new THREE.Vector3(u,v,w).normalize());arrow.setLength(Math.min(.16,.025+length*.16),.014,.009);}
    }
    for(let a=frame.vectors.length/6;a<arrowPool.length;a++)arrowPool[a].visible=false;
  }
  return {update,setNozzle,canvas:renderer.domElement,
    render(){controls.update();volume.updateMatrixWorld();inverse.copy(volume.matrixWorld).invert();uniforms.uEye.value.copy(camera.position).applyMatrix4(inverse);renderer.render(scene,camera);},
    vectors(value){arrows.visible=value;},
    detail(value){uniforms.uDetail.value=value;},
    home(){camera.position.set(1.65,1.4,3.5);controls.target.set(0,.61,0);controls.update();},
    side(){camera.position.set(0,.62,3.1);controls.target.set(0,.62,0);controls.update();},
    dispose(){observer.disconnect();controls.dispose();texture?.dispose();renderer.dispose();}
  };
}
