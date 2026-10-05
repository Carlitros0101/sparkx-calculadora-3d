const {test}=require('node:test');const assert=require('node:assert/strict');const m=require('../model-import.js');
const source=m.normalize('https://makerworld.com/es/models/3000181-hanging-monkey-banana-holder?from=recommend#profileId-3368322');
test('enlace público: conserva perfil, elimina seguimiento y rechaza sitios o credenciales',()=>{
 assert.equal(source.requestedProfile,'3368322');assert(!source.url.includes('?'));assert.throws(()=>m.normalize('https://makerworld.com.evil.test/es/models/123-model'));
 assert.throws(()=>m.normalize('https://user:secret@makerworld.com/es/models/123-model'));assert.throws(()=>m.normalize('https://makerworld.com/es/search'));
 assert.equal(m.normalize('https://www.thingiverse.com/thing:763622').site,'Thingiverse');assert.equal(m.normalize('https://www.printables.com/model/3161-3d-benchy/files').site,'Printables');
});
test('perfiles MakerWorld: distingue tiempo, no inventa gramos ni el ID seleccionado',()=>{
 const text='Title: Hanging Monkey Banana Holder - Free 3D Print Model - MakerWorld\nMarkdown Content:\n[Alino3DWorld](https://makerworld.com/en/@StampAlino)\n#### Print Files (3)\n![Image 6: Perfil A](https://example.org/a.png)\nDesigner\n41 min\n1 plate\n![Image 7: Perfil B](https://example.org/b.png)\n58 min\n1 plate\nOpen in Bambu Studio\n### Description\nExample description\n';
 const x=m.parse(text,source);assert.equal(x.title,'Hanging Monkey Banana Holder');assert.equal(x.author,'Alino3DWorld');assert.deepEqual(x.profiles.map(p=>p.minutes),[41,58]);assert(x.profiles.every(p=>p.grams===null));assert.equal(x.requestedProfile,'3368322');
});
test('no toma comentarios, longitud de filamento ni dimensiones como peso',()=>{
 const x=m.parse('Title: A useful model by Example | Download free STL model | Printables.com\nMarkdown Content:\nLength: 40 m\nSize: 100 mm\n## Comments\nFilament weight: 123 g\nPrint time: 3h\n',m.normalize('https://printables.com/model/123-model'));
 assert.equal(x.author,'Example');assert.deepEqual(x.profiles,[]);
});
test('etiquetas explícitas: números decimales y duración compuesta',()=>{
 const x=m.parse('Title: Model by Creator\nMarkdown Content:\nPrint time: 1h 20min\nFilament weight: 45,5 g',m.normalize('https://thingiverse.com/thing:123'));
 assert.equal(x.profiles[0].minutes,80);assert.equal(x.profiles[0].grams,45.5);assert.equal(m.minutes('2h 30m'),150);
});
test('CAPTCHA se informa sin importar un nombre falso',()=>{assert.throws(()=>m.parse('Title: Just a moment...\nMarkdown Content: CAPTCHA',source),/bloqueó/);});
test('texto pegado de MakerWorld reconoce nombre y perfiles sin markdown',()=>{
 const x=m.parse('Home\nHanging Monkey Banana Holder\nPrint Files (1)\nAll\nP1S\n0.2mm layer, 2 walls, 15% infill supports on\nDesigner\n41 min\n1 plate\nOpen in Bambu Studio',source);
 assert.equal(x.title,'Hanging Monkey Banana Holder');assert.equal(x.profiles[0].minutes,41);
});
