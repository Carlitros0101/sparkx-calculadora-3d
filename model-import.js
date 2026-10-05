/* Lee fichas públicas; las referencias publicadas nunca sustituyen el laminado. */
(function(scope){
 'use strict';
 function normalize(value){
  const raw=String(value).trim();if(raw.length>2000)throw Error('El enlace es demasiado largo.');
  let u;try{u=new URL(raw);}catch{throw Error('Pega un enlace completo, comenzando con https://.');}
  if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Usa un enlace público HTTPS sin credenciales.');
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  const sites={'makerworld.com':'MakerWorld','printables.com':'Printables','thingiverse.com':'Thingiverse'};
  if(!sites[host])throw Error('Por ahora puedes importar MakerWorld, Printables y Thingiverse.');
  const valid=host==='makerworld.com'?/^\/[a-z]{2}(?:-[a-z]{2})?\/models\/\d+(?:-[^/]*)?\/?$/i.test(u.pathname):host==='printables.com'?/^\/(?:[a-z]{2}\/)?model\/\d+(?:-[^/]*)?(?:\/(?:files|details|collections))?\/?$/i.test(u.pathname):/^\/thing:\d+\/?$/.test(u.pathname);
  if(!valid)throw Error('Pega la ficha de un modelo, no una búsqueda o un perfil de usuario.');
  const profile=host==='makerworld.com'&&/^#profileId-\d+$/.test(u.hash)?u.hash:'';
  u.hostname=host==='makerworld.com'?host:'www.'+host;u.search='';u.hash='';
  return{site:sites[host],fetchUrl:u.href,url:u.href+profile,requestedProfile:profile.replace('#profileId-','')};
 }
 const plain=s=>String(s).replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`]/g,'').trim();
 function minutes(text){
  const t=String(text).toLowerCase().trim().replace(/([a-záí])(?=\d)/g,'$1 ');let total=0,found=false;
  const pattern=/(\d+(?:[.,]\d+)?)\s*(days?|días?|d|hours?|horas?|hrs?|h|minutes?|minutos?|mins?|min|m|seconds?|segundos?|secs?|s)\b/g;
  for(const m of t.matchAll(pattern)){found=true;const unit=m[2];total+=Number(m[1].replace(',','.'))*(/^(d|day|día)/.test(unit)?1440:/^(h|hour|hora)/.test(unit)?60:/^(s|sec|seg)/.test(unit)?1/60:1);}
  return found&&total>0&&total<525600?Math.ceil(total):null;
 }
 function parse(text,source){
  if(typeof text!=='string'||text.length>2000000)throw Error('La página devolvió demasiado contenido.');
  const rawTitle=text.match(/^Title:\s*(.+)$/m)?.[1]||'';
  if(/just a moment|access denied|security verification|captcha|page not found|404 not found/i.test(rawTitle))throw Error('El sitio bloqueó la lectura automática. Abre el modelo y usa Pegar texto de la página.');
  let title=rawTitle.replace(/\s*[-|]\s*(?:Free 3D Print Model.*|MakerWorld.*|Download free STL.*|Printables\.com.*)$/i,'').trim();
  let author='';
  if(source.site==='Printables'){const m=title.match(/^(.*?)\s+(?:by|por)\s+(.+?)(?:\s*\|.*)?$/i);if(m){title=m[1];author=m[2];}}
  if(source.site==='Thingiverse'){const m=title.match(/^(.*)\s+by\s+([^|]+)$/i);if(m){title=m[1];author=m[2];}}
  const content=text.split('Markdown Content:')[1]||text;
  if(!title){
   const slug=new URL(source.url).pathname.replace(/\/(?:files|details|collections)\/?$/,'').split('/').filter(Boolean).pop().replace(/^\d+-/,'').replace(/-/g,' ');
   const comparable=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
   title=content.split('\n').map(plain).find(x=>comparable(x)===comparable(slug))||plain(content.match(/^#\s+(.+)$/m)?.[1]||'');
  }
  if(!title||title.length>250)throw Error('No se reconoció el nombre del modelo. Usa el texto de su ficha.');
  if(source.site==='MakerWorld')author=content.match(/\]\([^\n]*\)\s+([^\]\n]+)\]\(https:\/\/makerworld\.com\/[^/]+\/@[^)]+\)/)?.[1]||content.match(/\[([^\]\n]+)\]\(https:\/\/makerworld\.com\/[^/]+\/@[^)]+\)/)?.[1]||'';
  const profiles=[];
  if(source.site==='MakerWorld'){
   const section=content.match(/(?:#{2,5}\s*)?(?:Print Files|Archivos de impresión)[^\n]*\n([\s\S]*?)(?=Open in Bambu Studio|Abrir en Bambu Studio|### Description|### Descripción|$)/i)?.[1]||'';
   const lines=section.split('\n').map(x=>x.trim()).filter(Boolean);let label='';
   for(let i=0;i<lines.length&&profiles.length<12;i++){
    const image=lines[i].match(/^!\[Image\s+\d+:\s*(.*?)\]\(/);if(image)label=image[1];
    if(/^(?:\d+(?:[.,]\d+)?\s*(?:d|h|hr|min|m|s|hours?|minutes?)\s*)+$/i.test(lines[i])&&/^\d+\s*(?:plates?|placas?)$/i.test(lines[i+1]||'')){
     if(!label){const previous=lines.slice(Math.max(0,i-3),i).filter(x=>!/^!\[|^Designer$|^Diseñador$|^https?:/i.test(x));label=previous.pop()||'';}
     const time=minutes(lines[i]);if(time!==null)profiles.push({label:plain(label)||'Perfil publicado '+(profiles.length+1),minutes:time,grams:null});label='';
    }
   }
  }else{
   // Solo etiquetas explícitas, antes de comentarios/recomendaciones.
   const section=content.split(/\n#{1,4}\s*(?:Comments|Comentarios|Reviews|Related|Makes)\b/i)[0];
   const time=section.match(/(?:Print(?:ing)? time|Tiempo de impresión)\s*[:：]\s*([^\n]+)/i);
   const weight=section.match(/(?:Filament (?:used|weight)|Material weight|Peso (?:del filamento|total))\s*[:：]\s*(\d+(?:[.,]\d+)?)\s*(?:g|grams?|gramos?)\b/i);
   const mins=time?minutes(time[1]):null,grams=weight?Number(weight[1].replace(',','.')):null;
   if(mins!==null||grams!==null)profiles.push({label:'Referencia publicada en la ficha',minutes:mins,grams:grams>0&&grams<100000?grams:null});
  }
  return{...source,title:plain(title).slice(0,100),author:plain(author).slice(0,120),profiles,readAt:new Date().toISOString()};
 }
 async function load(value){
  const source=normalize(value),controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);
  try{
   const response=await fetch('https://r.jina.ai/'+source.fetchUrl,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)throw Error(response.status===429?'El lector alcanzó su límite. Prueba más tarde o pega el texto.':'No se pudo leer la ficha. Abre el modelo y pega el texto de la página.');
   return parse(await response.text(),source);
  }catch(error){if(error.name==='AbortError')throw Error('La lectura tardó demasiado. Prueba de nuevo o pega el texto de la página.');if(error instanceof TypeError)throw Error('No se pudo conectar al lector. Revisa internet o pega el texto de la página.');throw error;}
  finally{clearTimeout(timer);}
 }
 scope.SparkxModels={normalize,parse,minutes,load};if(typeof module!=='undefined'&&module.exports)module.exports=scope.SparkxModels;
})(globalThis);