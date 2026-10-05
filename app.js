
(() => {
  const root = document.getElementById('sparkx-cost');
  const el = key => root.querySelector('#sx-' + key);
  const fields = ['name','qty','hours','minutes','grams','purge','spoolPrice','spoolWeight','risk','energyOn','watts','kwh','prep','finish','laborRate','machineOn','machinePrice','life','maint','other','profitMode','percent','vat'];
  const money = value => new Intl.NumberFormat('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);
  let result = null;
  function read() { return Object.fromEntries(fields.map(key => [key, el(key).type === 'checkbox' ? el(key).checked : el(key).value])); }
  function calculate(s) {
    const n = key => Number(s[key]);
    const keys = fields.filter(key => !['name','energyOn','machineOn','profitMode'].includes(key));
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
    try {
      result = calculate(state); el('error').textContent='';
      el('cost').textContent=money(result.cost); el('sale').textContent=money(result.total); el('unit').textContent=money(result.unit);
      el('energy-detail').textContent=state.energyOn ? 'Luz: '+money(Number(state.watts)/1000*Number(state.kwh))+' por hora · '+money(result.rows[2][1])+' en este trabajo' : 'Electricidad excluida del costo';
      el('profit').textContent='Ganancia antes de IVA: ' + money(result.profit);
      el('sale-label').textContent=Number(state.vat) ? 'Total con IVA adicional' : 'Total sin IVA adicional';
      el('breakdown').replaceChildren(...result.rows.map(([label,value]) => { const row=document.createElement('tr'); const a=document.createElement('td'); const b=document.createElement('td'); a.textContent=label; b.textContent=money(value); b.className='text-end tabular-nums'; row.append(a,b); return row; }));
      el('summary').value=[state.name || 'Impresión 3D','SPARKX i7 · '+state.qty+' pieza(s)', 'Tiempo del trabajo: '+state.hours+' h '+state.minutes+' min', 'Filamento: '+state.grams+' g + '+state.purge+' g de purga adicional', 'Electricidad: '+money(result.rows[2][1])+(state.energyOn ? ' ('+state.watts+' W; '+state.kwh+' CLP/kWh)' : ' (excluida)'), 'Costo total: '+money(result.cost), 'Venta antes de IVA: '+money(result.net), 'IVA adicional: '+money(result.tax), 'Precio total: '+money(result.total)+' · Por pieza: '+money(result.unit)].join('\n');
    } catch(error) {
      result=null; el('error').textContent=error.message; el('energy-detail').textContent='';
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
  fields.forEach(key=>el(key).addEventListener('input',()=>refresh(true)));
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
      if(sec!==null){const mins=Math.ceil(sec/60);el('hours').value=Math.floor(mins/60);el('minutes').value=mins%60;}
      if(weight!==null){el('grams').value=weight.toFixed(2);el('purge').value=0;}
      el('import').textContent=(sec!==null?'Tiempo importado. ':'Tiempo no reconocido: ingresar manualmente. ')+(weight!==null?'Peso total importado; purga adicional puesta en 0. Verifica contra Creality Print.':'Peso en gramos no reconocido: ingresar manualmente.');
      refresh(true);
    } catch {el('import').textContent='No se pudo leer el archivo. Ingresa los datos manualmente.';}
  });
  let saved=null; try {saved=JSON.parse(localStorage.getItem('sparkx-cost-v1'));} catch {}
  restore(saved);
  document.getElementById('copy-result').addEventListener('click',async()=>{if(!result)return;try{await navigator.clipboard.writeText(el('summary').value);document.getElementById('action-status').textContent='Resumen copiado.';}catch{el('summary').select();document.getElementById('action-status').textContent='Seleccionado: copia el resumen con el menú de tu dispositivo.';}});
  document.getElementById('download-result').addEventListener('click',()=>{if(!result)return;const link=document.createElement('a');const url=URL.createObjectURL(new Blob([el('summary').value],{type:'text/plain;charset=utf-8'}));link.href=url;link.download='resumen-impresion-3d.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  document.getElementById('print-result').addEventListener('click',()=>{if(result)window.print();});
  if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
