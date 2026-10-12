
(() => {
  const root = document.getElementById('sparkx-cost');
  const el = key => root.querySelector('#sx-' + key);
  const quoteFields=['business','contact','client','quoteNumber','quoteDate','validity','delivery','quoteCosts'];
  const fields = ['name','notes','status','modelUrl','modelAuthor','modelProfile','timeSource','weightSource','qty','hours','minutes','grams','purge','spoolPrice','spoolWeight','risk','energyOn','watts','kwh','prep','finish','laborRate','machineOn','machinePrice','life','maint','other','profitMode','percent','vat',...quoteFields];
  const textFields=['name','notes','status','modelUrl','modelAuthor','modelProfile','timeSource','weightSource','energyOn','machineOn','profitMode',...quoteFields];
  const money = value => new Intl.NumberFormat('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);
  let result = null;
  function read() { return Object.fromEntries(fields.map(key => [key, el(key).type === 'checkbox' ? el(key).checked : el(key).value])); }
  function calculate(s) {
    const n = key => Number(s[key]);
    const keys = fields.filter(key => !textFields.includes(key));
    if (keys.some(key => s[key] === '' || !Number.isFinite(n(key)) || n(key) < 0)) throw Error('Completa los campos numéricos con valores válidos, desde cero.');
    if (n('qty') < 1 || !Number.isInteger(n('qty'))) throw Error('La cantidad de piezas debe ser un número entero de al menos 1.');
    if (n('minutes') > 59 || !Number.isInteger(n('minutes'))) throw Error('Los minutos adicionales deben ser un entero entre 0 y 59.');
    if (n('spoolWeight') <= 0 || (s.machineOn && n('life') <= 0)) throw Error('El peso de bobina y las horas de recuperación deben ser mayores que cero.');
    if (n('vat') > 100) throw Error('Revisa el porcentaje de IVA.');
    if (s.profitMode === 'margin' && n('percent') >= 100) throw Error('El margen sobre venta debe ser menor que 100 %.');
    const hours = n('hours') + n('minutes')/60;
    const material = n('grams') * n('spoolPrice') / n('spoolWeight');
    const purge = n('purge') * n('spoolPrice') / n('spoolWeight');
    const energy = s.energyOn ? hours * n('watts') / 1000 * n('kwh') : 0;
    const machine = s.machineOn ? hours * n('machinePrice') / n('life') : 0;
    const maint = s.machineOn ? hours * n('maint') : 0;
    const risk = (material + purge + energy + machine + maint) * n('risk') / 100;
    const labor = (n('prep') + n('finish')) / 60 * n('laborRate');
    const cost = material + purge + energy + machine + maint + risk + labor + n('other');
    const net = s.profitMode === 'margin' ? cost / (1-n('percent')/100) : cost * (1+n('percent')/100);
    const tax = net * n('vat')/100;
    if (![cost,net,tax].every(Number.isFinite)) throw Error('Los valores son demasiado grandes. Revisa los datos.');
    return {hours,cost,net,tax,total:net+tax,profit:net-cost,unit:(net+tax)/n('qty'),rows:[['Piezas y soportes',material],['Purga y torre multicolor',purge],['Electricidad',energy],['Recuperación de impresora',machine],['Mantenimiento',maint],['Reserva por fallas',risk],['Tu tiempo de trabajo',labor],['Otros gastos',n('other')],['Costo total',cost],['Ganancia antes de IVA',net-cost],['Venta antes de IVA',net],['IVA adicional',tax]]};
  }
  function refresh(save=false) {
    const state = read();
    el('data-origin').textContent='Origen del tiempo: '+(state.timeSource||'Manual')+' · Origen del peso: '+(state.weightSource||'Manual');
    try {
      result = calculate(state); el('error').textContent='';
      el('cost').textContent=money(result.cost); el('sale').textContent=money(result.total); el('unit').textContent=money(result.unit);
      el('energy-detail').textContent=state.energyOn ? 'Luz: '+money(Number(state.watts)/1000*Number(state.kwh))+' por hora · '+money(result.rows[2][1])+' en este trabajo' : 'Electricidad excluida del costo';
      el('profit').textContent='Ganancia antes de IVA: ' + money(result.profit);
      el('sale-label').textContent=Number(state.vat) ? 'Total con IVA adicional' : 'Total sin IVA adicional';
      el('breakdown').replaceChildren(...result.rows.map(([label,value]) => { const row=document.createElement('tr'); const a=document.createElement('td'); const b=document.createElement('td'); a.textContent=label; b.textContent=money(value); b.className='text-end tabular-nums'; row.append(a,b); return row; }));
      el('summary').value=[state.name || 'Impresión 3D','SPARKX i7 · '+state.qty+' pieza(s)', 'Tiempo del trabajo: '+state.hours+' h '+state.minutes+' min', 'Filamento: '+state.grams+' g + '+state.purge+' g de purga adicional', 'Electricidad: '+money(result.rows[2][1])+(state.energyOn ? ' ('+state.watts+' W; '+state.kwh+' CLP/kWh)' : ' (excluida)'), 'Costo total: '+money(result.cost), 'Venta antes de IVA: '+money(result.net), 'IVA adicional: '+money(result.tax), 'Precio total: '+money(result.total)+' · Por pieza: '+money(result.unit),...(state.modelUrl?['Modelo: '+state.modelUrl,'Autor: '+(state.modelAuthor||'No reconocido')]:[]),'Origen del tiempo: '+(state.timeSource||'Manual'),'Origen del peso: '+(state.weightSource||'Manual')].join('\n');
      renderQuote(state,result);
      if(document.getElementById('quote-status').textContent==='Revisa los datos del cálculo antes de generar una cotización.')document.getElementById('quote-status').textContent='';
      const estimated=/Estimación|Referencia|Pendiente/.test((state.timeSource||'')+(state.weightSource||''));
      const missing=result.hours<=0||Number(state.grams)<=0;
      const manual=[state.timeSource,state.weightSource].some(x=>!x||x==='Manual');
      el('quality').textContent=missing?'Faltan tiempo o gramos del trabajo. El costo puede estar incompleto.':estimated?'Cotización estimada: confirma en Creality Print el tiempo y los gramos de todas las placas que vas a entregar.':manual?'Datos manuales: revisa tiempo y gramos contra Creality Print antes de cotizar.':'Tiempo y peso con origen registrado. Revisa que correspondan al trabajo completo y a tu impresora.';
      el('maintenance-detail').textContent=state.machineOn?'Mantenimiento: '+money(Number(state.maint))+'/h × '+result.hours.toFixed(2)+' h = '+money(result.rows[4][1])+' por trabajo. '+(result.cost>0&&result.rows[4][1]/result.cost>0.3?'Representa '+(result.rows[4][1]/result.cost*100).toFixed(0)+' % del costo: revisa tu presupuesto de mantenimiento.':''):'Mantenimiento y recuperación de compra excluidos.';
      el('margin-detail').textContent='Recargo real sobre costo: '+(result.cost>0?result.profit/result.cost*100:0).toFixed(1)+' % · Margen real sobre venta neta: '+(result.net>0?result.profit/result.net*100:0).toFixed(1)+' %.';
    } catch(error) {
      result=null; el('error').textContent=error.message; el('energy-detail').textContent='';
      document.getElementById('quote-sheet').setAttribute('data-invalid','true');
      document.getElementById('quote-status').textContent='Revisa los datos del cálculo antes de generar una cotización.';
      el('quality').textContent='Revisa los campos indicados antes de cotizar.';el('maintenance-detail').textContent='';el('margin-detail').textContent='';
      ['cost','sale','unit'].forEach(key=>el(key).textContent='—'); el('profit').textContent='Revisa los valores'; el('breakdown').replaceChildren(); el('summary').value='';
    }
    if (save) {try {localStorage.setItem('sparkx-cost-v1', JSON.stringify({privateContent:{inputs:state,tariffVersion:3}}));} catch {document.getElementById('action-status').textContent='Tu navegador no permite guardar ajustes. Puedes seguir calculando.';}}
  }
  function restore(saved) {
    const state=saved?.privateContent?.inputs;
    if (state && typeof state==='object') fields.forEach(key=>{if(state[key]!==undefined) {if(el(key).type==='checkbox') el(key).checked=Boolean(state[key]); else el(key).value=state[key];}});
    if(saved?.privateContent?.tariffVersion!==3){el('energyOn').checked=true;el('kwh').value='249.56';}
    refresh();
  }
  fields.forEach(key=>el(key).addEventListener('input',()=>{if(['hours','minutes'].includes(key))el('timeSource').value='Manual';if(['grams','purge'].includes(key))el('weightSource').value='Manual';refresh(true);}));
  document.getElementById('use-maintenance-reserve').addEventListener('click',()=>{el('maint').value=100;refresh(true);document.getElementById('action-status').textContent='Reserva provisional de $100/h aplicada. Ajusta este valor con tus gastos y horas reales; se cobra solo si incluyes uso de impresora.';});
  document.getElementById('confirm-slicer').addEventListener('click',()=>{
    if(!result||result.hours<=0||Number(el('grams').value)<=0){el('quality').textContent='Primero completa tiempo y gramos positivos del trabajo.';return;}
    el('timeSource').value='Creality Print · verificado por el usuario';el('weightSource').value='Creality Print · verificado por el usuario';refresh(true);
  });
  let loadedFile=null,fileSequence=0;
  const fileNode=id=>document.getElementById('file-'+id);
  function applyFile(){
    if(!loadedFile)return;
    try{
      const {data,name}=loadedFile,mode=fileNode('mode').value;
      let values,origin;
      if(mode==='estimate'){
        if(!data.geometry)throw Error('Este archivo no contiene geometría compatible para estimar.');
        const options=Object.fromEntries(['density','infill','wall','flow','overhead','support','scale'].map(k=>[k,fileNode(k).value]));
        values=SparkxFiles.estimate(data.geometry,options);
        origin='Estimación '+name+' · relleno '+options.infill+' %, espesor '+options.wall+' mm, densidad '+options.density+' g/cm³, escala '+options.scale+', soportes '+options.support+' %, flujo '+options.flow+' mm³/s, movimientos '+options.overhead+' %';
        fileNode('message').textContent='Estimación aproximada: '+values.grams.toFixed(1)+' g · '+Math.ceil(values.seconds/60)+' min. Extensión de '+(data.kind==='3MF'?'todo el proyecto (puede incluir varias placas)':'la geometría')+': '+values.dimensions.map(x=>x.toFixed(1)).join(' × ')+' mm. '+(data.kind==='3MF'?'Se suman todos los objetos imprimibles; no se ha identificado una placa individual. ':'')+'Verifica en Creality Print antes de cotizar; requiere una malla cerrada y orientación correcta. La purga multicolor se agrega por separado.';
      }else{
        values=mode==='all'?{label:'Todas las placas con resultados ('+data.plates.length+')',seconds:data.plates.reduce((sum,p)=>sum+p.seconds,0),grams:data.plates.reduce((sum,p)=>sum+p.grams,0)}:data.plates[Number(mode)];if(!values)throw Error('Elige una placa válida.');
        origin='Datos del laminador en '+name+' · '+values.label;
        fileNode('message').textContent='Tiempo y peso leídos del 3MF: '+values.label+'. '+(mode==='all'?'La suma incluye solo las placas con tiempo y peso reconocidos; verifica si falta alguna placa del pedido. ':'')+'Confirma que corresponde a tu SPARKX en Creality Print. Peso total importado; purga adicional en cero.';
      }
      const minutes=Math.max(1,Math.ceil(values.seconds/60));el('hours').value=Math.floor(minutes/60);el('minutes').value=minutes%60;el('grams').value=values.grams.toFixed(2);
      el('timeSource').value=origin;el('weightSource').value=origin;el('name').value=name.replace(/\.(stl|3mf)$/i,'').slice(0,100);
      el('modelUrl').value='';el('modelAuthor').value='';el('modelProfile').value='';
      if(mode!=='estimate')el('purge').value=0;
      fileNode('message').textContent+=' Revisa Piezas obtenidas: el archivo no determina automáticamente cuántas unidades completas entregarás.';
      refresh(true);
    }catch(error){fileNode('message').textContent=error.message;}
  }
  fileNode('upload').addEventListener('change',async event=>{
    const seq=++fileSequence,file=event.target.files[0];loadedFile=null;fileNode('apply').disabled=true;fileNode('settings').hidden=true;
    if(!file)return;fileNode('message').textContent='Leyendo archivo en tu dispositivo…';
    try{
      const data=await SparkxFiles.read(file);if(seq!==fileSequence)return;
      loadedFile={data,name:file.name};const options=data.plates.map((p,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=p.label+' · '+p.grams.toFixed(1)+' g · '+Math.ceil(p.seconds/60)+' min';return o;});
      if(data.plates.length>1){const o=document.createElement('option');o.value='all';o.textContent='Sumar todas las placas con resultados ('+data.plates.length+')';options.unshift(o);}
      if(data.geometry){const o=document.createElement('option');o.value='estimate';o.textContent='Estimar desde el modelo 3D';options.push(o);}
      fileNode('mode').replaceChildren(...options);fileNode('mode').value=data.plates.length>1?'all':data.plates.length?'0':'estimate';fileNode('settings').hidden=false;fileNode('apply').disabled=false;applyFile();
    }catch(error){if(seq===fileSequence)fileNode('message').textContent='No se importó: '+error.message+' El cálculo anterior se conserva.';}
  });
  fileNode('apply').addEventListener('click',applyFile);
  fileNode('mode').addEventListener('change',applyFile);
  el('file').addEventListener('change',async()=>{
    const file=el('file').files[0]; if(!file)return;
    if(file.size>50*1024*1024){el('import').textContent='Archivo demasiado grande (máximo 50 MB). Ingresa tiempo y gramos manualmente.';return;}
    try {
      const text=await file.text();
      const seconds=text.match(/^;\s*(?:TIME|estimated printing time \[s\])\s*[:=]\s*(\d+(?:\.\d+)?)\s*$/mi);
      const duration=text.match(/^;\s*estimated printing time.*?=\s*((?:\d+\s*d\s*)?(?:\d+\s*h\s*)?(?:\d+\s*m\s*)?(?:\d+\s*s\s*)?)\s*$/mi);
      let sec=seconds?Number(seconds[1]):null;
      if(sec===null&&duration&&duration[1].trim()) {sec=0;for(const match of duration[1].matchAll(/(\d+)\s*([dhms])/g))sec+=Number(match[1])*({d:86400,h:3600,m:60,s:1}[match[2]]);}
      const grams=text.match(/^;\s*(?:filament used \[g\]|total filament used \[g\]|total filament weight \[g\])\s*[:=]\s*([\d.,\s]+)\s*$/mi);
      let weight=null;
      if(grams){const values=grams[1].split(',').map(x=>Number(x.trim())).filter(x=>Number.isFinite(x));if(values.length)weight=values.reduce((a,b)=>a+b,0);}
      if(sec!==null){el('timeSource').value='G-code '+(file.name||'de Creality Print / laminador');const mins=Math.ceil(sec/60);el('hours').value=Math.floor(mins/60);el('minutes').value=mins%60;}
      else el('timeSource').value='Pendiente de confirmar: tiempo anterior conservado';
      if(weight!==null){el('weightSource').value='G-code '+(file.name||'')+' (peso total)';el('grams').value=weight.toFixed(2);el('purge').value=0;}
      else el('weightSource').value='Pendiente de confirmar: peso anterior conservado';
      el('import').textContent=(sec!==null?'Tiempo importado. ':'Tiempo no reconocido: ingresar manualmente. ')+(weight!==null?'Peso total importado; purga adicional puesta en 0. Verifica contra Creality Print.':'Peso en gramos no reconocido: ingresar manualmente.');
      refresh(true);
    } catch {el('import').textContent='No se pudo leer el archivo. Ingresa los datos manualmente.';}
  });
  let saved=null; try {saved=JSON.parse(localStorage.getItem('sparkx-cost-v1'));} catch {}
  restore(saved);
  document.getElementById('copy-result').addEventListener('click',async()=>{if(!result)return;try{await navigator.clipboard.writeText(el('summary').value);document.getElementById('action-status').textContent='Resumen copiado.';}catch{el('summary').select();document.getElementById('action-status').textContent='Seleccionado: copia el resumen con el menú de tu dispositivo.';}});
  document.getElementById('download-result').addEventListener('click',()=>{if(!result)return;const link=document.createElement('a');const url=URL.createObjectURL(new Blob([el('summary').value],{type:'text/plain;charset=utf-8'}));link.href=url;link.download='resumen-impresion-3d.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  function prepareQuote(){
    if(!result)return false;
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    if(!el('quoteNumber').value.trim())el('quoteNumber').value='COT-'+parts.year+parts.month+parts.day+'-'+parts.hour+parts.minute+parts.second;
    if(!el('quoteDate').value)el('quoteDate').value=parts.year+'-'+parts.month+'-'+parts.day;
    refresh(true);return !!result;
  }
  function renderQuote(s,r){
    const q=id=>document.getElementById('quote-'+id),text=(id,value)=>q(id).textContent=value;
    document.getElementById('quote-sheet').setAttribute('data-invalid','false');
    text('title',/Estimación|Referencia|Pendiente/.test((s.timeSource||'')+(s.weightSource||''))?'COTIZACIÓN ESTIMADA':'COTIZACIÓN');
    text('business',s.business.trim()||'Mi taller 3D');text('contact',s.contact);text('number',s.quoteNumber||'Se asignará al imprimir');
    const rawDate=s.quoteDate||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const date=/^\d{4}-\d{2}-\d{2}$/.test(rawDate)?rawDate.split('-').reverse().join('/'):rawDate;
    text('date',date);text('client',s.client.trim()||'Por completar');text('validity',s.validity||'Por acordar');text('delivery',s.delivery||'Por acordar');
    text('job',s.name||'Impresión 3D');text('qty',s.qty);text('unit',new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',minimumFractionDigits:2,maximumFractionDigits:2}).format(r.net/Number(s.qty)));text('line',money(r.net));
    text('net',money(r.net));text('tax',money(r.tax));text('tax-label','IVA adicional ('+s.vat+' %)');text('total',money(r.total));text('unit-total',money(r.unit));
    text('time',s.hours+' h '+s.minutes+' min');text('material',s.grams+' g + '+s.purge+' g de purga adicional');
    text('notes',s.notes||'Sin observaciones adicionales.');text('origin',s.timeSource===s.weightSource?(s.timeSource||'Manual'):'Tiempo: '+(s.timeSource||'Manual')+' · Peso: '+(s.weightSource||'Manual'));
    text('model',s.modelUrl||'');q('model').hidden=!s.modelUrl;
    q('costs').hidden=!s.quoteCosts;
    q('breakdown').replaceChildren(...r.rows.slice(0,10).map(([label,value])=>{const row=document.createElement('tr');for(const x of [label,money(value)]){const c=document.createElement('td');c.textContent=x;row.append(c);}return row;}));
    text('assumptions','Bobina: '+money(Number(s.spoolPrice))+' / '+s.spoolWeight+' g · Electricidad: '+(s.energyOn?s.watts+' W × '+s.kwh+' CLP/kWh':'excluida')+' · Ganancia: '+s.percent+' % ('+(s.profitMode==='margin'?'margen sobre venta':'recargo sobre costo')+').');
    text('estimate-note',/Estimación|Referencia|Pendiente/.test((s.timeSource||'')+(s.weightSource||''))?'Hay datos estimados, de referencia o pendientes. Confirmar material y tiempo al laminar en Creality Print antes de aceptar la cotización.':'Confirmar que el material y tiempo corresponden a la configuración final de Creality Print.');
  }
  document.getElementById('preview-quote').addEventListener('click',()=>{if(prepareQuote()){document.getElementById('quote-sheet').hidden=false;document.getElementById('quote-status').textContent='Vista previa actualizada. Usa Imprimir / PDF para imprimir o guardar como PDF.';}});
  document.getElementById('new-quote').addEventListener('click',()=>{el('quoteNumber').value='';el('quoteDate').value='';el('client').value='';el('notes').value='';el('delivery').value='';document.getElementById('quote-sheet').hidden=true;refresh(true);document.getElementById('quote-status').textContent='Nueva cotización preparada con los valores actuales. Completa el cliente y las observaciones; el número y la fecha se asignarán al generar el documento.';});
  document.getElementById('print-result').addEventListener('click',()=>{if(prepareQuote())window.print();});
  window.addEventListener?.('beforeprint',()=>{if(result)renderQuote(read(),result);});
  const dbKey='sparkx-jobs-v1';
  const dbStatus=document.getElementById('history-status');
  let records=[],storageDamaged=false;
  function validateRecords(items){
    if(!Array.isArray(items)||items.length>5000)throw Error('El respaldo debe contener hasta 5.000 trabajos.');
    return items.map(item=>{
      if(!item||typeof item.id!=='string'||item.id.length>100||!item.state||typeof item.createdAt!=='string'||!Number.isFinite(Date.parse(item.createdAt)))throw Error('El respaldo contiene un trabajo inválido.');
      const state=Object.fromEntries(fields.map(key=>[key,item.state[key]??(textFields.includes(key)?'':undefined)]));
      if(typeof state.name!=='string'||state.name.length>100||typeof state.notes!=='string'||state.notes.length>500)throw Error('Nombre o notas inválidos.');
      const calculated=calculate(state);
      return{id:item.id,createdAt:item.createdAt,state,result:calculated};
    });
  }
  try {const raw=localStorage.getItem(dbKey);if(raw)records=validateRecords(JSON.parse(raw));}
  catch {storageDamaged=true;dbStatus.textContent='No se pudo leer la base guardada. No se sobrescribirá; restaura un respaldo válido.';}
  const localDate=iso=>new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'short',timeStyle:'short'}).format(new Date(iso));
  function persist(next){localStorage.setItem(dbKey,JSON.stringify(next));records=next;renderHistory();}
  function renderHistory(){
    document.getElementById('history-count').textContent=records.length+' trabajo(s) guardado(s)';
    const tbody=document.getElementById('history-rows');
    tbody.replaceChildren(...records.slice().reverse().map(record=>{
      const row=document.createElement('tr');
      [localDate(record.createdAt),record.state.name,record.state.status||'Cotización',record.state.qty,money(record.result.cost),money(record.result.total)].forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.append(cell);});
      const cell=document.createElement('td'),button=document.createElement('button');button.type='button';button.className='btn btn-small';button.textContent='Cargar';button.setAttribute('aria-label','Cargar '+record.state.name);button.addEventListener('click',()=>{restore({privateContent:{inputs:record.state,tariffVersion:3}});refresh(true);document.getElementById('action-status').textContent='Cargado '+record.state.name+'. Guardar creará un registro nuevo.';el('name').focus();});cell.append(button);row.append(cell);return row;
    }));
    document.getElementById('export-history').disabled=!records.length;
  }
  function currentRecord(){if(!result)throw Error('Revisa los datos antes de guardar o exportar.');const state=read();if(!state.name.trim())throw Error('Escribe un nombre para este trabajo.');return{id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2),createdAt:new Date().toISOString(),state,result:calculate(state)};}
  function download(data,name,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  document.getElementById('save-job').addEventListener('click',()=>{
    try {if(storageDamaged)throw Error('Restaura un respaldo antes de guardar para proteger la base existente.');if(records.length>=5000)throw Error('La base alcanzó 5.000 trabajos. Exporta un respaldo.');const record=currentRecord();const last=records[records.length-1];if(last&&JSON.stringify(last.state)===JSON.stringify(record.state)&&Date.now()-Date.parse(last.createdAt)<10000){dbStatus.textContent='Este trabajo ya se guardó; no se creó un duplicado.';return;}persist([...records,record]);dbStatus.textContent='Trabajo guardado: '+record.state.name+'.';}
    catch(error){dbStatus.textContent=error.message+' Si el navegador está lleno, exporta tu historial.';}
  });
  const exportFields=[['qty','Piezas'],['grams','Piezas y soportes (g)'],['purge','Purga adicional (g)'],['spoolPrice','Bobina (CLP)'],['spoolWeight','Bobina (g)'],['watts','Consumo promedio (W)'],['kwh','Tarifa (CLP/kWh)'],['risk','Reserva fallas (%)'],['prep','Preparación (min)'],['finish','Terminación (min)'],['laborRate','Trabajo (CLP/h)'],['machinePrice','Impresora (CLP)'],['life','Recuperación (h)'],['maint','Mantenimiento (CLP/h)'],['other','Otros (CLP)'],['percent','Ganancia (%)'],['vat','IVA adicional (%)']];
  function exportExcel(items,filename){
    const headers=['ID','Fecha (Chile)','Trabajo','Estado','Notas','Horas impresión','Costo total (CLP)','Venta neta (CLP)','IVA (CLP)','Venta total (CLP)','Precio por pieza (CLP)','Ganancia (CLP)',...exportFields.map(x=>x[1]),'Electricidad incluida','Máquina incluida','Método ganancia','Material (CLP)','Purga (CLP)','Luz (CLP)','Recuperación (CLP)','Mantenimiento (CLP)','Reserva fallas (CLP)','Trabajo manual (CLP)','Enlace del modelo','Autor del modelo','Perfil de referencia','Origen del tiempo','Origen del peso'];
    const rows=items.map(x=>[x.id,localDate(x.createdAt),x.state.name,x.state.status||'Cotización',x.state.notes,x.result.hours,x.result.cost,x.result.net,x.result.tax,x.result.total,x.result.unit,x.result.profit,...exportFields.map(([key])=>Number(x.state[key])),x.state.energyOn?'Sí':'No',x.state.machineOn?'Sí':'No',x.state.profitMode==='margin'?'Margen sobre venta':'Recargo sobre costo',...x.result.rows.slice(0,7).map(row=>row[1]),x.state.modelUrl||'',x.state.modelAuthor||'',x.state.modelProfile||'',x.state.timeSource||'Manual',x.state.weightSource||'Manual']);
    download(SparkxExcel.create(headers,rows),filename,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
  document.getElementById('export-current').addEventListener('click',()=>{try{exportExcel([currentRecord()],'trabajo-3d.xlsx');document.getElementById('action-status').textContent='Excel del trabajo descargado. Para añadirlo a tu base, usa Guardar trabajo.';}catch(error){document.getElementById('action-status').textContent=error.message;}});
  document.getElementById('export-history').addEventListener('click',()=>{try{if(records.length)exportExcel(records,'base-trabajos-3d.xlsx');dbStatus.textContent='Base exportada a Excel: '+records.length+' trabajo(s).';}catch(error){dbStatus.textContent=error.message;}});
  document.getElementById('backup-history').addEventListener('click',()=>{download(JSON.stringify({version:1,records},null,2),'respaldo-taller-3d.json','application/json');dbStatus.textContent='Respaldo descargado. Puedes restaurarlo en otro navegador.';});
  document.getElementById('restore-history').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{if(file.size>15*1024*1024)throw Error('Respaldo demasiado grande (máximo 15 MB).');const data=JSON.parse(await file.text());if(data.version!==1)throw Error('Versión de respaldo no compatible.');const incoming=validateRecords(data.records);const merged=new Map(records.map(x=>[x.id,x]));for(const record of incoming)if(!merged.has(record.id))merged.set(record.id,record);if(merged.size>5000)throw Error('La base combinada supera 5.000 trabajos.');persist([...merged.values()].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)));storageDamaged=false;dbStatus.textContent='Respaldo restaurado. Los registros repetidos se conservaron una sola vez.';}catch(error){dbStatus.textContent='No se importó: '+error.message;}finally{event.target.value='';}
  });

  let importedModel=null,importSequence=0;
  const modelNode=id=>document.getElementById('model-'+id);
  function resetModel(){importedModel=null;modelNode('preview').hidden=true;document.getElementById('use-reference').disabled=true;modelNode('profiles').replaceChildren();}
  modelNode('link').addEventListener('input',()=>{++importSequence;resetModel();document.getElementById('load-model').disabled=false;document.getElementById('open-model').hidden=true;});
  function showModel(data){
    importedModel=data;modelNode('preview').hidden=false;modelNode('name').textContent=data.title;modelNode('author').textContent=data.site+' · Autor: '+(data.author||'No publicado / no reconocido');
    el('name').value=data.title;el('modelUrl').value=data.url;el('modelAuthor').value=data.author;
    const link=document.getElementById('open-model');link.href=data.url;link.hidden=false;
    const empty=document.createElement('option');empty.value='';empty.textContent='Elige un perfil de referencia';
    modelNode('profiles').replaceChildren(empty,...data.profiles.map((x,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=x.label+' · '+(x.minutes===null?'Tiempo no publicado':x.minutes+' min')+(x.grams===null?' · Peso no publicado':' · '+x.grams+' g');return o;}));modelNode('profiles').value='';
    modelNode('reference').textContent=data.profiles.length?'Elige un perfil; no se ha cambiado el tiempo ni el peso del cálculo.':'No se encontraron tiempo y peso explícitos. Completa estos datos desde Creality Print.';
    modelNode('message').textContent='Nombre y origen importados. Revisa los gramos actuales: todavía corresponden a lo que tenías ingresado. '+(data.requestedProfile?'El ID de perfil de tu enlace es '+data.requestedProfile+', pero la lectura no permite vincularlo a un perfil: selecciona uno por su nombre.':'');
    refresh(true);
  }
  document.getElementById('load-model').addEventListener('click',async()=>{
    const seq=++importSequence,button=document.getElementById('load-model');resetModel();button.disabled=true;modelNode('message').textContent='Leyendo ficha pública… Puede tardar hasta 45 segundos.';
    try{const data=await SparkxModels.load(modelNode('link').value);if(seq===importSequence)showModel(data);}catch(error){if(seq===importSequence)modelNode('message').textContent=error.message;}finally{if(seq===importSequence)button.disabled=false;}
  });
  document.getElementById('read-model-text').addEventListener('click',()=>{
    ++importSequence;document.getElementById('load-model').disabled=false;resetModel();try{showModel(SparkxModels.parse(modelNode('text').value,SparkxModels.normalize(modelNode('link').value)));}catch(error){modelNode('message').textContent=error.message;}
  });
  modelNode('profiles').addEventListener('change',()=>{
    const value=modelNode('profiles').value,p=importedModel&&value!==''?importedModel.profiles[Number(value)]:null;document.getElementById('use-reference').disabled=!p;
    modelNode('reference').textContent=p?'Referencia de '+importedModel.site+' para otra configuración de impresión. '+(p.grams===null?'Peso no publicado: conserva los gramos de tu cálculo.':'Peso publicado; verifica si incluye soportes y purga.'):'Elige un perfil de referencia.';
  });
  document.getElementById('use-reference').addEventListener('click',()=>{
    const value=modelNode('profiles').value,p=importedModel&&value!==''?importedModel.profiles[Number(value)]:null;if(!p)return;
    el('modelProfile').value=p.label;
    if(p.minutes!==null){el('hours').value=Math.floor(p.minutes/60);el('minutes').value=p.minutes%60;el('timeSource').value='Referencia '+importedModel.site+' · '+p.label;}
    if(p.grams!==null){el('grams').value=p.grams;el('weightSource').value='Referencia '+importedModel.site+' · purga y soportes por confirmar';}
    refresh(true);modelNode('message').textContent='Referencia aplicada. Confirma los datos al laminar en Creality Print. '+(p.grams===null?'Los gramos no se cambiaron: el sitio no publicó un peso verificable.':'');
  });
  renderHistory();
  if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
