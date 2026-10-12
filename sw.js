const CACHE='sparkx-app-v8';
const FILES=['./','./index.html','./styles.css','./app.js','./excel.js','./model-import.js','./file-import.js','./workshop-core.js','./workshop.js','./workshop-sync.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(new URL(event.request.url).pathname.startsWith('/api/')||new URL(event.request.url).pathname.includes('signin-with-chatgpt')||new URL(event.request.url).pathname.includes('signout-with-chatgpt')||event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));});

