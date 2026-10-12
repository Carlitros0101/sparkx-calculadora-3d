(function(scope){
'use strict';
const number=(v,label='valor')=>{const n=Number(v);if(v===''||!Number.isFinite(n)||n<0)throw Error('Revisa '+label+'.');return n;};
const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
function materialCost(rows){
 if(!Array.isArray(rows)||rows.length>30)throw Error('Máximo 30 filamentos por trabajo.');
 let material=0,purge=0,grams=0,purgeGrams=0;
 for(const r of rows){const weight=number(r.weight,'peso de bobina');if(weight<=0)throw Error('Peso de bobina debe ser mayor que cero.');const price=number(r.price,'precio'),g=number(r.grams,'gramos'),p=number(r.purge,'purga');material+=g*price/weight;purge+=p*price/weight;grams+=g;purgeGrams+=p;}
 return{material,purge,grams,purgeGrams};
}
function totals(items){return items.reduce((a,x)=>{for(const key of ['cost','net','tax','total','profit','hours'])a[key]+=number(x.result[key]||0,key);a.qty+=number(x.state.qty,'cantidad');a.grams+=number(x.state.grams)+number(x.state.purge);return a;},{cost:0,net:0,tax:0,total:0,profit:0,hours:0,qty:0,grams:0});}
function payments(order){const paid=(order.payments||[]).reduce((sum,p)=>sum+number(p.amount,'abono'),0);return{paid,balance:Math.max(0,order.result.total-paid),overpaid:Math.max(0,paid-order.result.total)};}
function requirements(items){const usage=new Map();for(const item of items){const s=item.state,rows=JSON.parse(s.materialsJson||'[]');if(rows.length){materialCost(rows);for(const r of rows)if(r.id)usage.set(r.id,(usage.get(r.id)||0)+Number(r.grams)+Number(r.purge));}else if(s.materialId)usage.set(s.materialId,(usage.get(s.materialId)||0)+number(s.grams)+number(s.purge));}return usage;}
function complete(order,materials,actual,calculate){
 if(order.stockCommitted)throw Error('Este pedido ya tiene su consumo de stock registrado.');
 const grams=number(actual.grams,'gramos reales'),hours=number(actual.hours,'horas reales');if(!grams||!hours)throw Error('Completa gramos y horas reales positivos.');
 const estimated=totals(order.items),ratio=estimated.grams?grams/estimated.grams:1,timeRatio=estimated.hours?hours/estimated.hours:1,usage=new Map();let cost=0;
 for(const item of order.items){const s={...item.state,grams:Number(item.state.grams)*ratio,purge:Number(item.state.purge)*ratio,hours:Math.floor(item.result.hours*timeRatio),minutes:Math.round((item.result.hours*timeRatio%1)*60),risk:0};if(s.minutes===60){s.hours++;s.minutes=0;}
  let rows=[];try{rows=JSON.parse(s.materialsJson||'[]');}catch{throw Error('Datos de materiales del pedido inválidos.');}
  if(rows.length){rows=rows.map(r=>({...r,grams:Number(r.grams)*ratio,purge:Number(r.purge)*ratio}));s.materialsJson=JSON.stringify(rows);for(const r of rows)if(r.id)usage.set(r.id,(usage.get(r.id)||0)+r.grams+r.purge);}
  else if(s.materialId)usage.set(s.materialId,(usage.get(s.materialId)||0)+Number(s.grams)+Number(s.purge));
  cost+=calculate(s).cost;
 }
 if(actual.cost!==''&&actual.cost!==undefined)cost=number(actual.cost,'costo real');
 const next=materials.map(m=>({...m}));for(const [key,g] of usage){const m=next.find(x=>x.id===key);if(!m)throw Error('Falta la bobina usada en el pedido.');if(Number(m.remaining)+0.001<g)throw Error('Stock insuficiente de '+m.name+'. Registra o corrige el stock antes de finalizar.');m.remaining=Math.max(0,Number(m.remaining)-g);}
 return{materials:next,order:{...order,status:'Terminado',stockCommitted:true,actual:{grams,hours,cost,profit:order.result.net-cost,recordedAt:new Date().toISOString()},stockUsage:Array.from(usage,([id,grams])=>({id,grams}))}};
}
function monthReport(orders,month){const selected=orders.filter(o=>(o.createdAt||'').slice(0,7)===month&&o.status!=='Cancelado');const accepted=selected.filter(o=>o.status!=='Cotizado');return{quotes:selected.length,orders:accepted.length,sales:accepted.reduce((s,o)=>s+o.result.net,0),cost:accepted.reduce((s,o)=>s+(o.actual?.cost??o.result.cost),0),profit:accepted.reduce((s,o)=>s+o.result.net-(o.actual?.cost??o.result.cost),0),paid:accepted.reduce((s,o)=>s+payments(o).paid,0),hours:accepted.reduce((s,o)=>s+(o.actual?.hours??o.result.hours),0),actual:accepted.filter(o=>o.actual).length};}
function schedule(orders,capacity,start){const daily=number(capacity,'horas disponibles por día');if(!daily||daily>24)throw Error('La capacidad diaria debe estar entre 1 y 24 horas.');let cursor=new Date(start+'T12:00:00Z'),remaining=daily;return orders.filter(o=>['Aceptado','Pendiente de pago','En impresión'].includes(o.status)).map(o=>{let hours=Math.max(0,o.result.hours),first=cursor.toISOString().slice(0,10);while(hours>remaining){hours-=remaining;cursor.setUTCDate(cursor.getUTCDate()+1);remaining=daily;}remaining-=hours;const end=cursor.toISOString().slice(0,10);if(remaining===0){cursor.setUTCDate(cursor.getUTCDate()+1);remaining=daily;}return{id:o.id,name:o.name,start:first,end,hours:o.result.hours};});}
function validate(data){
 if(!data||data.version!==1)throw Error('Formato de taller no compatible.');
 for(const key of ['materials','customers','orders','maintenance','basket'])if(!Array.isArray(data[key])||data[key].length>5000)throw Error('Colección inválida: '+key);
 if(!data.brand||typeof data.brand!=='object'||typeof data.brand.logo!=='string'||data.brand.logo.length>350000||typeof data.brand.color!=='string'||typeof data.brand.terms!=='string')throw Error('Marca inválida.');
 if(Number(data.capacity)<=0||Number(data.capacity)>24||!Number.isFinite(Number(data.capacity)))throw Error('Capacidad diaria inválida.');
 for(const m of data.materials){if(typeof m.id!=='string'||typeof m.name!=='string')throw Error('Bobina inválida.');for(const k of ['density','price','weight','remaining'])number(m[k],k);if(!Number(m.weight)||!Number(m.density))throw Error('Peso y densidad deben ser positivos.');}
 for(const c of data.customers)if(typeof c.id!=='string'||typeof c.name!=='string'||typeof c.contact!=='string')throw Error('Cliente inválido.');
 for(const o of data.orders){if(typeof o.id!=='string'||typeof o.name!=='string'||!Array.isArray(o.items)||!o.result||typeof o.createdAt!=='string'||!Number.isFinite(Date.parse(o.createdAt)))throw Error('Pedido inválido.');totals(o.items);for(const k of ['cost','net','tax','total','hours'])number(o.result[k],k);payments(o);if(o.actual)for(const k of ['cost','grams','hours'])number(o.actual[k],k);}
 for(const item of [...data.basket,...data.orders.flatMap(o=>o.items)]){const s=item.state;if(!Number.isInteger(Number(s.qty))||Number(s.qty)<1)throw Error('Cantidad inválida.');for(const k of ['grams','purge','hours','minutes'])number(s[k],k);if(Number(s.minutes)>59)throw Error('Minutos inválidos.');if(s.materialsJson)materialCost(JSON.parse(s.materialsJson));}
 for(const item of data.basket)totals([item]);for(const m of data.maintenance){number(m.cost,'mantenimiento');number(m.hours,'horas');}
 return data;
}
scope.WorkshopCore={number,id,materialCost,totals,payments,requirements,complete,monthReport,schedule,validate};if(typeof module!=='undefined')module.exports=scope.WorkshopCore;
})(typeof globalThis!=='undefined'?globalThis:this);
