/* Local STL/3MF reading. Geometry estimates are not slicer results. */
(function(scope){
 'use strict';
 const MAX=100*1024*1024, decoder=new TextDecoder();
 function mesh(triangles){
  if(!triangles.length||triangles.length>1000000)throw Error('Modelo vacío o demasiado complejo (máximo un millón de triángulos).');
  let volume=0,area=0;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const [a,b,c] of triangles){
   for(const p of [a,b,c])for(let i=0;i<3;i++){if(!Number.isFinite(p[i]))throw Error('El modelo contiene coordenadas inválidas.');min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
   volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
   const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);area+=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;
  }
  volume=Math.abs(volume);if(volume<0.001||!Number.isFinite(volume+area))throw Error('No se puede estimar un volumen válido. Repara la malla en Creality Print.');
  return{volume,area,dimensions:max.map((x,i)=>x-min[i]),triangles:triangles.length};
 }
 function stl(buffer){
  const view=new DataView(buffer),triangles=[];
  if(buffer.byteLength>=84&&84+view.getUint32(80,true)*50===buffer.byteLength){
   const count=view.getUint32(80,true);if(count>1000000)throw Error('STL demasiado complejo.');
   for(let i=0;i<count;i++){const p=84+i*50+12;triangles.push([0,1,2].map(j=>[0,1,2].map(k=>view.getFloat32(p+j*12+k*4,true))));}
  }else{
   const text=decoder.decode(buffer);if(!/^\s*solid\b/i.test(text))throw Error('El archivo no es un STL válido.');
   const vertices=[];for(const m of text.matchAll(/\bvertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi)){vertices.push(m.slice(1).map(Number));if(vertices.length>3000000)throw Error('STL demasiado complejo.');}
   if(vertices.length%3)throw Error('STL incompleto.');for(let i=0;i<vertices.length;i+=3)triangles.push(vertices.slice(i,i+3));
  }
  return mesh(triangles);
 }
 function xml(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('XML no permitido.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('XML del 3MF inválido.');return doc;}
 const children=(n,name)=>Array.from(n.children).filter(x=>x.localName===name);
 const descendants=(n,name)=>Array.from(n.getElementsByTagNameNS('*',name));
 async function unzip(buffer){
  const v=new DataView(buffer),bytes=new Uint8Array(buffer);let end=-1;
  for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw Error('El archivo 3MF no es un ZIP válido.');
  const count=v.getUint16(end+10,true);let offset=v.getUint32(end+16,true),total=0;const files=new Map();
  if(count>10000)throw Error('3MF con demasiados archivos.');
  for(let i=0;i<count;i++){
   if(offset+46>bytes.length||v.getUint32(offset,true)!==0x02014b50)throw Error('Directorio 3MF dañado.');
   const flags=v.getUint16(offset+8,true),method=v.getUint16(offset+10,true),compressed=v.getUint32(offset+20,true),size=v.getUint32(offset+24,true),n=v.getUint16(offset+28,true),extra=v.getUint16(offset+30,true),comment=v.getUint16(offset+32,true),local=v.getUint32(offset+42,true);
   const name=decoder.decode(bytes.subarray(offset+46,offset+46+n));offset+=46+n+extra+comment;
   if(!/\.(model|config|gcode|rels)$/i.test(name))continue;
   total+=size;if(total>MAX||flags&1)throw Error('3MF demasiado grande o cifrado.');
   if(local+30>bytes.length||v.getUint32(local,true)!==0x04034b50)throw Error('Entrada 3MF dañada.');
   const start=local+30+v.getUint16(local+26,true)+v.getUint16(local+28,true);if(start+compressed>bytes.length)throw Error('3MF incompleto.');
   let data=bytes.subarray(start,start+compressed);
   if(method===8){
    if(typeof DecompressionStream==='undefined')throw Error('Este navegador no descomprime 3MF. Usa una versión actual de Chrome o Edge.');
    const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let length=0;
    while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>size||length>MAX){await reader.cancel();throw Error('Entrada 3MF demasiado grande.');}chunks.push(r.value);}
    data=new Uint8Array(length);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length;}
   }else if(method!==0)throw Error('Compresión 3MF no compatible.');
   if(data.length!==size)throw Error('Entrada 3MF incompleta.');files.set(name.replace(/^\//,''),decoder.decode(data));
  }
  return files;
 }
 function plates(files){
  const entry=Array.from(files).find(([name])=>name.toLowerCase()==='metadata/slice_info.config');if(!entry)return[];
  return descendants(xml(entry[1]),'plate').map((p,i)=>{
   const meta=Object.fromEntries(children(p,'metadata').map(x=>[x.getAttribute('key'),x.getAttribute('value')]));
   const positive=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))&&Number(x)>0?Number(x):null;
   const seconds=positive(meta.prediction);let grams=positive(meta.weight);
   if(grams===null){const weights=children(p,'filament').map(f=>positive(f.getAttribute('used_g')));if(weights.length&&weights.every(x=>x!==null))grams=weights.reduce((a,b)=>a+b,0);}
   return{label:'Placa '+(meta.index||i+1),seconds,grams};
  }).filter(p=>p.seconds!==null&&p.grams!==null);
 }
 function geometry(files){
  const models=new Map();for(const [name,text] of files)if(/\.model$/i.test(name))models.set(name,xml(text));
  let main='3D/3dmodel.model';if(!models.has(main))main=Array.from(models.keys()).find(x=>descendants(models.get(x),'build').length);
  if(!main)throw Error('No se encontró geometría 3D en el 3MF.');
  const triangles=[];const units={micron:0.001,millimeter:1,centimeter:10,inch:25.4,foot:304.8,meter:1000};
  const identity=[1,0,0,0,1,0,0,0,1,0,0,0];
  function transform(s){if(!s)return identity;const t=s.trim().split(/\s+/).map(Number);if(t.length!==12||!t.every(Number.isFinite))throw Error('Transformación 3MF inválida.');return t;}
  const apply=(p,t)=>[0,1,2].map(i=>p[0]*t[i]+p[1]*t[3+i]+p[2]*t[6+i]+t[9+i]);
  function visit(path,id,chain,stack){
   const key=path+'#'+id;if(stack.includes(key)||stack.length>30)throw Error('Componentes 3MF circulares o demasiado profundos.');
   const doc=models.get(path);if(!doc)throw Error('Falta un componente externo del 3MF.');
   const scale=units[doc.documentElement.getAttribute('unit')||'millimeter'];if(!scale)throw Error('Unidad 3MF no compatible.');
   const obj=descendants(doc,'object').find(x=>x.getAttribute('id')===id);if(!obj)throw Error('Objeto 3MF no encontrado.');
   const m=children(obj,'mesh')[0];
   if(m){const vertices=descendants(m,'vertex').map(x=>['x','y','z'].map(k=>Number(x.getAttribute(k))));for(const t of descendants(m,'triangle')){
    const tri=['v1','v2','v3'].map(k=>{const index=Number(t.getAttribute(k));if(!Number.isInteger(index)||!vertices[index])throw Error('Índice de triángulo inválido.');let p=vertices[index];for(const tr of chain)p=apply(p,tr);return p.map(x=>x*scale);});triangles.push(tri);if(triangles.length>1000000)throw Error('3MF demasiado complejo.');
   }}
   for(const comp of descendants(obj,'component')){
    const external=Array.from(comp.attributes).find(a=>a.localName==='path')?.value;
    const next=external?new URL(external,'https://model.local/'+path).pathname.slice(1):path;
    visit(next,comp.getAttribute('objectid'),[transform(comp.getAttribute('transform')),...chain],[...stack,key]);
   }
  }
  const build=children(models.get(main).documentElement,'build')[0];if(!build)throw Error('El 3MF no contiene una lista de objetos para imprimir.');
  for(const item of descendants(build,'item'))if(item.getAttribute('printable')!=='0')visit(main,item.getAttribute('objectid'),[transform(item.getAttribute('transform'))],[]);
  return mesh(triangles);
 }
 function estimate(g,o){
  const n=k=>Number(o[k]);for(const k of ['density','infill','wall','flow','overhead','support','scale'])if(!Number.isFinite(n(k)))throw Error('Completa los ajustes de estimación.');
  if(n('density')<=0||n('flow')<=0||n('scale')<=0||n('scale')>100||n('wall')<0||n('overhead')<0||n('support')<0||n('infill')<0||n('infill')>100)throw Error('Revisa densidad, escala, relleno y flujo.');
  const volume=g.volume*n('scale')**3,area=g.area*n('scale')**2;
  const shell=Math.min(volume,area*n('wall')),plastic=(shell+(volume-shell)*n('infill')/100)*(1+n('support')/100);
  const grams=plastic/1000*n('density'),seconds=plastic/n('flow')*(1+n('overhead')/100)+300;
  if(!Number.isFinite(grams+seconds))throw Error('Los ajustes producen una estimación demasiado grande.');
  return{grams,seconds,dimensions:g.dimensions.map(x=>x*n('scale'))};
 }
 async function read(file){
  if(file.size>MAX)throw Error('Máximo 100 MB por archivo.');const buffer=await file.arrayBuffer();
  if(/\.stl$/i.test(file.name))return{geometry:stl(buffer),plates:[],kind:'STL'};
  if(!/\.3mf$/i.test(file.name))throw Error('Selecciona un archivo STL o 3MF.');
  const files=await unzip(buffer),sliced=plates(files);let g=null;try{g=geometry(files);}catch(e){if(!sliced.length)throw e;}
  return{geometry:g,plates:sliced,kind:'3MF'};
 }
 scope.SparkxFiles={read,stl,mesh,estimate,unzip,plates,geometry};if(typeof module!=='undefined')module.exports=scope.SparkxFiles;
})(typeof globalThis!=='undefined'?globalThis:this);
