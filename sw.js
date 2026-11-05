/* KT Schule: Offline-Speicher für die App-Dateien.
   Netz zuerst (höchstens 3 Sekunden), sonst die gespeicherte Kopie. version.txt und Datenbank-Aufrufe immer übers Netz.
   Alle Apps teilen sich talib47.github.io: hier werden nur Caches mit dem Präfix „kts-“ gelöscht. */
const CACHE="kts-v1";
const CORE=["./","index.html","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","fonts/newsreader-latin.woff2","fonts/newsreader-latin-ext.woff2",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{})))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("kts-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET")return;
  const same=u.origin===location.origin&&u.pathname.startsWith(new URL(self.registration.scope).pathname);
  const lib=u.hostname==="cdn.jsdelivr.net";
  if(!same&&!lib)return;
  if(same&&u.pathname.endsWith("version.txt"))return;
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    const net=fetch(r).then(res=>{if(res&&res.ok)c.put(r.mode==="navigate"?"index.html":r,res.clone());return res});
    const timeout=new Promise(res=>setTimeout(()=>res(null),3000));
    try{const res=await Promise.race([net,timeout]);if(res)return res}catch(err){}
    const hit=await c.match(r.mode==="navigate"?"index.html":r,{ignoreSearch:true});
    if(hit)return hit;
    return net;
  })());
});
