/* =====================================================================
   KT Schule — ein Programm, zwei Bereiche:
   Schüler: Anmeldung mit Code, tägliche Übungsrunde, Üben, Fortschritt.
   Lehrkräfte: Schüler, Aufgaben, Plan (mit Team).
   Online (talib47.github.io): Supabase. Sonst: Vorschau mit Beispieldaten nur auf diesem Gerät.
   ===================================================================== */
const CLOUD=/github\.io$/.test(location.hostname)&&!!window.supabase;
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const gcd=(a,b)=>b?gcd(b,a%b):a;
const uid=()=>Math.random().toString(36).slice(2,10);
const today=()=>new Date().toLocaleDateString("sv");
const addDays=(d,n)=>{const x=new Date(d+"T12:00");x.setDate(x.getDate()+n);return x.toLocaleDateString("sv")};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=q=>document.querySelector(q);
const fdate=d=>d?new Date(d.slice(0,10)+"T12:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}):"";
const wday=d=>new Date(d+"T12:00").toLocaleDateString("de-DE",{weekday:"short"}).replace(".","");
const avg=a=>{a=a.filter(x=>x!=null);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null};
const fmt=n=>n==null||isNaN(n)?"–":n.toFixed(1).replace(".",",");
const plural=(n,a,b)=>`${n} ${n===1?a:b}`;
/* Hinweis mit „Rückgängig“: Löschen wird erst nach ein paar Sekunden endgültig */
const HOLD=new Set();
function undoToast(t,undo,commit){
  document.querySelectorAll(".toast").forEach(x=>x.remove());
  const el=document.createElement("div");el.className="toast undo";el.setAttribute("role","status");
  el.innerHTML=`<span>${esc(t)}</span><button type="button">Rückgängig</button>`;document.body.append(el);
  let done=false;const fin=()=>{if(done)return;done=true;el.remove();commit&&commit()};
  el.querySelector("button").onclick=()=>{if(done)return;done=true;el.remove();undo();render()};
  setTimeout(fin,6000);
}
function toast(t){document.querySelectorAll(".toast").forEach(x=>x.remove());const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=t;document.body.append(el);setTimeout(()=>el.remove(),2000)}
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const lsDel=k=>{try{localStorage.removeItem(k)}catch(e){}};

/* ---------- Feste Listen ---------- */
const GROUPS={jungs:{label:"Jungs"},maedchen:{label:"Mädchen"},leitung:{label:"Leitung"}};
const SCHULFORMEN=["Grundschule","Hauptschule","Realschule","Sekundarschule","Gesamtschule","Gymnasium","Förderschule"];
const SUBJECTS=["Deutsch","Englisch","Mathe","Sachunterricht","Biologie","Physik","Chemie","NW","GL","Erdkunde","Geschichte","Politik","Französisch","Latein","Türkisch","Informatik","Religion","Kunst","Musik","Sport","Technik"];
const GRADES=["1+","1","1-","2+","2","2-","3+","3","3-","4+","4","4-","5+","5","5-","6"];
const DAYS=["Mo","Di","Mi","Do","Fr"];
const COME=["Di","Mi","Do"];
const gval=g=>{if(!g)return null;const b=parseInt(g,10);return g.endsWith("+")?b-.3:g.endsWith("-")?b+.3:b};
const gcls=n=>n==null?"":n<=2.5?"g1":n<=3.5?"g2":"g3";
const lern=s=>s.schulform==="Gesamtschule";

/* ---------- Aufgaben-Bibliothek: Themen erzeugen beliebig viele Aufgaben ---------- */
const VERBS=[["go","went"],["see","saw"],["buy","bought"],["eat","ate"],["take","took"],["come","came"],["write","wrote"],["read","read"],["run","ran"],["swim","swam"],["drink","drank"],["give","gave"],["get","got"],["make","made"],["think","thought"],["find","found"],["have","had"],["know","knew"],["sing","sang"],["sleep","slept"],["speak","spoke"],["tell","told"],["leave","left"],["bring","brought"],["catch","caught"],["fly","flew"],["drive","drove"],["sit","sat"],["win","won"]];
const DASS=[["Ich hoffe, ___ du morgen kommst.",1],["___ Buch liegt auf dem Tisch.",0],["Das Auto, ___ dort steht, ist rot.",0],["Er sagt, ___ es regnet.",1],["Ich weiß, ___ du recht hast.",1],["___ ist mein Bruder.",0],["Das Spiel, ___ wir gestern gespielt haben, war toll.",0],["Es ist wichtig, ___ wir pünktlich sind.",1],["Sie freut sich, ___ die Ferien beginnen.",1],["___ Haus, in dem ich wohne, ist alt.",0],["Ich glaube, ___ wir gewinnen.",1],["Hast du ___ gesehen?",0],["Mama sagt, ___ wir essen sollen.",1],["Das Bild, ___ an der Wand hängt, ist schön.",0],["Schade, ___ du krank bist.",1],["Kennst du ___ Lied?",0]];
const WORDS=[["Hund","Nomen"],["laufen","Verb"],["schnell","Adjektiv"],["Schule","Nomen"],["schreiben","Verb"],["groß","Adjektiv"],["Freundin","Nomen"],["lachen","Verb"],["müde","Adjektiv"],["Baum","Nomen"],["spielen","Verb"],["leise","Adjektiv"],["Fenster","Nomen"],["denken","Verb"],["bunt","Adjektiv"],["Ferien","Nomen"],["helfen","Verb"],["warm","Adjektiv"]];
const PRON=[["He ___ football every day.",["play","plays"],1],["They ___ in Duisburg.",["live","lives"],0],["She ___ English.",["speak","speaks"],1],["I ___ my homework.",["do","does"],0],["My brother ___ TV.",["watch","watches"],1],["We ___ to school.",["go","goes"],0],["It ___ a lot here.",["rain","rains"],1],["You ___ fast.",["run","runs"],0]];
const TOPICS={
  "m-1x1":{s:"Mathe",n:"Einmaleins",k:[2,6],kind:"pad",gen(){const a=R(2,10),b=R(2,10);return Math.random()<.7?{q:`${a} · ${b}`,a:[String(a*b)],ex:`${a} · ${b} = ${a*b}`}:{q:`${a*b} : ${a}`,a:[String(b)],ex:`${a} · ${b} = ${a*b}, also ${a*b} : ${a} = ${b}`}}},
  "m-pm":{s:"Mathe",n:"Plus und Minus bis 1000",k:[2,5],kind:"pad",gen(){const a=R(100,800),b=R(20,199);return Math.random()<.5?{q:`${a} + ${b}`,a:[String(a+b)],ex:`${a} + ${b} = ${a+b}`}:{q:`${a} − ${b}`,a:[String(a-b)],ex:`${a} − ${b} = ${a-b}`}}},
  "m-kuerzen":{s:"Mathe",n:"Brüche kürzen",k:[6,8],kind:"pad",frac:1,gen(){let x,y;do{x=R(1,9);y=R(2,12)}while(x>=y||gcd(x,y)!==1);const f=R(2,6);return{q:`Kürze ${x*f}/${y*f}`,a:[`${x}/${y}`],ex:`Größter gemeinsamer Teiler ist ${f}: ${x*f} : ${f} = ${x}, ${y*f} : ${f} = ${y}`}}},
  "m-erweitern":{s:"Mathe",n:"Brüche erweitern",k:[6,7],kind:"pad",frac:1,gen(){let x,y;do{x=R(1,7);y=R(2,9)}while(x>=y);const f=R(2,6);return{q:`${x}/${y} = ?/${y*f}`,a:[String(x*f),`${x*f}/${y*f}`],ex:`Nenner mal ${f}, also Zähler auch: ${x} · ${f} = ${x*f}`}}},
  "m-prozent":{s:"Mathe",n:"Prozent berechnen",k:[7,9],kind:"pad",gen(){for(;;){const p=pick([10,20,25,50,5,15,30,75]),G=pick([20,40,60,80,120,200,240,300,400]),W=p*G/100;if(Number.isInteger(W))return{q:`${p} % von ${G}`,a:[String(W)],ex:`${G} : 100 · ${p} = ${W}`}}}},
  "m-gleichung":{s:"Mathe",n:"Gleichungen lösen",k:[7,9],kind:"pad",neg:1,gen(){const x=R(-5,9),a=R(2,7),b=R(-9,12),c=a*x+b;return{q:`${a}x ${b<0?"− "+(-b):"+ "+b} = ${c}`,a:[String(x)],ex:`${b<0?"+ "+(-b):"− "+b} auf beiden Seiten: ${a}x = ${c-b}, dann : ${a}, also x = ${x}`}}},
  "e-past":{s:"Englisch",n:"Simple Past (unregelmäßig)",k:[5,9],kind:"text",gen(){const [v,p]=pick(VERBS);return{q:`${v} → simple past`,a:[p],ex:`${v} – ${p}`}}},
  "e-s":{s:"Englisch",n:"he, she, it – das s",k:[5,6],kind:"choice",gen(){const [q,o,c]=pick(PRON);return{q,opts:o,c,ex:c?"Bei he, she, it hängt im Simple Present ein s an.":"Bei I, you, we, they kein s."}}},
  "d-dass":{s:"Deutsch",n:"das oder dass",k:[4,9],kind:"choice",gen(){const [q,c]=pick(DASS);return{q,opts:["das","dass"],c,ex:c?"„dass“ leitet einen Nebensatz ein und lässt sich nicht durch „dieses“ oder „welches“ ersetzen.":"Hier passt „dieses“ oder „welches“, also „das“."}}},
  "d-wortart":{s:"Deutsch",n:"Wortarten",k:[3,6],kind:"choice",gen(){const [w,t]=pick(WORDS);const o=["Nomen","Verb","Adjektiv"];return{q:`Welche Wortart ist „${w}“?`,opts:o,c:o.indexOf(t),ex:{Nomen:"Nomen schreibt man groß, „der, die, das“ passt davor.",Verb:"Verben sagen, was jemand tut.",Adjektiv:"Adjektive sagen, wie etwas ist."}[t]}}}
};
const SUBJ_BASE=["Mathe","Deutsch","Englisch"];
/* Fächer: Mathe, Deutsch, Englisch sind fest, weitere legen Lehrkräfte selbst an */
const allSubj=()=>[...SUBJ_BASE,...((DB.state.subjects)||[]).filter(x=>!SUBJ_BASE.includes(x))];
const stuSubj=()=>[...new Set([...SUBJ_BASE,...SH.sheets.map(x=>x.subject)])];
const SUBJ_PAL={Mathe:"--math",Deutsch:"--de",Englisch:"--en",Biologie:"--bio",Physik:"--phy",Chemie:"--phy",GL:"--gl",Geschichte:"--gl",Erdkunde:"--gl",Politik:"--gl",Religion:"--rel",Türkisch:"--de",Französisch:"--en",Informatik:"--phy",Sachunterricht:"--bio"};
const PAL=["--c1","--c2","--c3","--c4"];
const scol=n=>SUBJ_PAL[n]||PAL[[...n].reduce((a,c)=>a+c.charCodeAt(0),0)%PAL.length];
const G=b=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg>`;
const SVG={
  Mathe:G('<path d="M7 4.5v5M4.5 7h5M14.5 7h5M5.2 14.7l3.6 3.6M8.8 14.7l-3.6 3.6M14.5 15h5M14.5 18.2h5"/>'),
  Deutsch:G('<path d="M4 18.5 8.6 6h.8l4.6 12.5M5.6 14.2h6.8"/><path d="M15.5 10.4c.6-.6 1.4-.9 2.3-.9 1.6 0 2.4.9 2.4 2.5v6.5M20.2 14.3c-2.9 0-4.9.5-4.9 2.3 0 1.2.9 1.9 2.1 1.9 1.5 0 2.8-1.1 2.8-2.8"/>'),
  Englisch:G('<path d="M5 5.5h14a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H11l-4.4 3.3v-3.3H5a1.6 1.6 0 0 1-1.6-1.6V7.1A1.6 1.6 0 0 1 5 5.5Z"/><path d="M8.5 9.5v4M8.5 11.5h3M11.5 9.5v4M15 9.5v4"/>'),
  Biologie:G('<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z"/><path d="M5 19 13 11"/>'),
  GL:G('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.3 2.3 3.4 5 3.4 8s-1.1 5.7-3.4 8c-2.3-2.3-3.4-5-3.4-8S9.7 6.3 12 4Z"/>'),
  book:G('<path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5v-13ZM5 18.5A1.5 1.5 0 0 0 6.5 20H19"/>'),
  bolt:G('<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z"/>'),
  redo:G('<path d="M19 8a7.5 7.5 0 1 0 1.3 6"/><path d="M19.5 3.5V8H15"/>'),
  pdf:G('<path d="M7 3.5h7l4.5 4.5v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M14 3.5V8h4.5M8.5 13h7M8.5 16.5h5"/>'),
  img:G('<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 16-5-5-8.5 8"/>'),
  mail:G('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>'),
  more:G('<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>'),
  plus:G('<path d="M12 5v14M5 12h14"/>')};
SVG.Geschichte=SVG.GL;SVG.Erdkunde=SVG.GL;SVG.Politik=SVG.GL;SVG.Sachunterricht=SVG.Biologie;
const sicon=n=>SVG[n]||SVG.book;
const badge=n=>`<span class="sb" style="--sc:var(${scol(n)})">${sicon(n)}</span>`;
const ibadge=(k,c="--accent")=>`<span class="sb" style="--sc:var(${c})">${SVG[k]}</span>`;
const initials=n=>esc(String(n).trim().split(/\s+/).map(w=>w[0]||"").join("").slice(0,2).toUpperCase());
const av=(name,g)=>`<span class="av g-${g}">${initials(name)}</span>`;
function subjPick(act,sel,canAdd){
  return`<div class="spick">${allSubj().map(n=>`<button type="button" class="sp${sel===n?" on":""}" data-act="${act}" data-v="${esc(n)}" aria-pressed="${sel===n}" style="--sc:var(${scol(n)})">${sicon(n)}<span>${esc(n)}</span></button>`).join("")}
    ${canAdd?`<button type="button" class="sp add" data-act="addSubj">${SVG.plus}<span>Fach</span></button>`:""}</div>`;
}
const TS=SUBJ_BASE;
const fits=(t,k)=>TOPICS[t]&&k>=TOPICS[t].k[0]&&k<=TOPICS[t].k[1];
const sheetFits=(x,s)=>x.groups.includes(s.group)&&s.klasse>=x.minK&&s.klasse<=x.maxK;
function sheetItems(x){return x.items.map(it=>it.type==="choice"?{kind:"choice",ctx:x.subject+" · "+x.title,it:{q:it.q,opts:it.options,c:it.correct,ex:""}}:{kind:"text",ctx:x.subject+" · "+x.title,it:{q:it.q,a:it.answers,ex:""}})}

/* ---------- Gemeinsamer Zustand ---------- */
let DB={me:null,teachers:[],students:[],sheets:[],attempts:[],duty:{entries:[]},invites:[],progress:{},state:{},docs:[]};
/* Bei Terminen zählt die Seite: Jungs-Termine nur Männer, Mädchen-Termine nur Frauen. Bei der Leitung legt man die Seite fest. */
const side=t=>t.group==="leitung"?((DB.state.sides||{})[t.id]||"jungs"):t.group;
const DOCKINDS=["Vertrag","Zeugnis","Erklärung","Stundenplan","Kalender","Sonstiges"];
const ui={mode:"start",tab:"students",sid:null,filter:"alle",q:"",sheet:null,confirm:null,brush:"Mathe",stab:"home",subj:null,run:null,authUp:false,showPast:false};
const me=()=>DB.teachers.find(t=>t.id===DB.me)||{id:null,name:"?",group:"jungs"};
const lead=()=>me().group==="leitung";
const visible=()=>DB.students.filter(s=>lead()||s.group===me().group);
const cur=()=>DB.students.find(s=>s.id===ui.sid);
const CODECH="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode(){let c;do{c=Array.from({length:6},()=>pick([...CODECH])).join("")}while(DB.students.some(s=>s.code===c));return c}
function seedSheets(){
  const C=(q,opts)=>({id:uid(),type:"choice",q,options:opts.map(o=>o.replace(/^\*/,"")),correct:opts.findIndex(o=>o.startsWith("*"))});
  const I=(q,ans)=>({id:uid(),type:"input",q,answers:ans});
  return[{id:uid(),subject:"Englisch",title:"Wörter Unit 2 (Beispiel)",minK:5,maxK:7,groups:["jungs","maedchen"],created:today(),items:[I("Hund → Englisch",["dog"]),I("Schule → Englisch",["school"]),C("„often“ heißt …",["*oft","selten","nie"]),I("Freund → Englisch",["friend"])]}];
}

/* ---------- Vorschau: Beispieldaten nur auf diesem Gerät ---------- */
const DKEY="kt-schule-demo-v2";
function nextWd(wd){const d=new Date();d.setHours(12);const diff=(wd-d.getDay()+7)%7;d.setDate(d.getDate()+diff);return d.toLocaleDateString("sv")}
function demoSeed(){
  const t=[["Talib","leitung"],["Serdar","jungs"],["Tuğce","maedchen"],["Hazal","maedchen"]].map(([name,group])=>({id:uid(),name,group}));
  const E=(subject,kind,d,grade,topic)=>({id:uid(),subject,kind,date:addDays(today(),-d),grade,topic:topic||""});
  const base={schule:"",note:"",strengths:[],focus:[],reports:[],plan:{},log:[],created:today()};
  const st=[
    {...base,id:uid(),code:"YUSUF7",first:"Yusuf",last:"B.",group:"jungs",klasse:7,schulform:"Gesamtschule",come:["Mi"],subjects:["Deutsch","Englisch","Mathe"],goals:["m-kuerzen","e-past"],strengths:["Kopfrechnen"],focus:["Textaufgaben"],note:"Braucht beim Start eine klare Aufgabe, dann arbeitet er konzentriert.",
      exams:[E("Mathe","Klassenarbeit",60,"4"),E("Mathe","Test",20,"3-","Brüche"),E("Deutsch","Klassenarbeit",30,"3+"),E("Englisch","Klassenarbeit",25,"2-")],
      reports:[{id:uid(),label:"Halbjahr 6.2",date:addDays(today(),-130),grades:{Deutsch:"3",Englisch:"2",Mathe:"4"}}],
      plan:{"0-0":"Mathe","0-1":"Mathe","1-0":"Englisch","2-0":"Deutsch","2-1":"GL","3-0":"Mathe","4-0":"Sport"},
      log:[{id:uid(),date:addDays(today(),0),kind:"Lernzeit-Aufgaben",subject:"Mathe",status:"erledigt",note:"Brüche erweitern, Buch S. 54"}]},
    {...base,id:uid(),code:"EMRE45",first:"Emre",last:"K.",group:"jungs",klasse:5,schulform:"Realschule",come:["Mi"],subjects:["Deutsch","Englisch","Mathe"],goals:["d-dass"],exams:[E("Deutsch","Test",12,"4+","Diktat"),E("Mathe","Klassenarbeit",30,"2")],
      log:[{id:uid(),date:addDays(today(),0),kind:"Hausaufgaben",subject:"Deutsch",status:"teilweise",note:"Lernwörter"}]},
  ];
  const wed=nextWd(3),entries=[];
  for(let i=0;i<6;i++){entries.push({id:uid(),date:addDays(wed,7*i),grp:"jungs",time:"16:30–19:30",who:[t[i%2===0?0:1].id],note:""})}
  const prog={};prog[st[0].id]={topics:{"m-kuerzen":{h:[1,0,1,1,0,1],n:6}},days:{[addDays(today(),-1)]:12,[addDays(today(),-2)]:8},wrongs:[],todayDone:null};
  return{me:t[0].id,teachers:t,students:st,sheets:seedSheets(),attempts:[],duty:{entries},invites:[],progress:prog,state:{sides:{[t[0].id]:"jungs"}},docs:[{id:uid(),sid:st[0].id,kind:"Vertrag",name:"Mitgliedschaft Yusuf.pdf",mime:"application/pdf",size:182000,date:addDays(today(),-20),data:null}]};
}
function demoLoad(){const r=lsGet(DKEY);let d=null;if(r){try{d=JSON.parse(r)}catch(e){}}d=d||demoSeed();d.docs=d.docs||[];d.state=d.state||{};return d}

/* ---------- Online: Supabase ---------- */
const SB_URL="https://xypbtkbnhgihbizxttdt.supabase.co";
/* öffentlicher Schlüssel: darf im Code stehen, den Zugriff regeln die Regeln in der Datenbank */
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGJ0a2JuaGdpaGJpenh0dGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MTc2MDgsImV4cCI6MjEwOTM5MzYwOH0.9IU81s7ATneda9mdrv65yOWTIRSBNZ3oLxaQd2XiAWI";
const sb=CLOUD?window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,storageKey:"kt-schule-auth"}}):null;
let session=null,loaded=false,pushTimer=null,pushing=false,again=false,dirty=false;
let SNAP={students:{},sheets:{},duty:""};
const chk=r=>{if(r.error)throw r.error;return r.data};
const studentRow=s=>({id:s.id,grp:s.group,code:s.code,klasse:+s.klasse,first_name:s.first,data:s});
async function pull(){
  const [t,st,sh,at,ap,inv,dc]=await Promise.all([sb.from("teachers").select("id,name,grp"),sb.from("students").select("*"),sb.from("sheets").select("data"),
    sb.from("attempts").select("id,student_id,sheet_id,score,total,created_at"),sb.from("app_state").select("key,value"),sb.from("teacher_invites").select("email,name,grp"),
    sb.from("documents").select("id,student_id,kind,name,path,mime,size,created_at")]);
  DB.me=session?.user?.id||null;
  DB.teachers=chk(t).map(x=>({id:x.id,name:x.name,group:x.grp})).sort((a,b)=>a.name.localeCompare(b.name,"de"));
  const rows=chk(st);DB.students=rows.map(x=>x.data);DB.progress=Object.fromEntries(rows.map(x=>[x.id,x.progress||{}]));
  DB.sheets=chk(sh).map(x=>x.data);
  DB.attempts=chk(at).map(x=>({id:x.id,sid:x.student_id,sheetId:x.sheet_id,score:x.score,total:x.total,date:x.created_at}));
  DB.state=Object.fromEntries(chk(ap).map(x=>[x.key,x.value]));
  DB.duty=DB.state.duty&&DB.state.duty.entries?DB.state.duty:{entries:[]};
  DB.invites=inv.error?[]:inv.data;
  DB.docs=dc.error?[]:dc.data.map(x=>({id:x.id,sid:x.student_id,kind:x.kind,name:x.name,path:x.path,mime:x.mime,size:x.size,date:x.created_at.slice(0,10)}));DB.docsReady=!dc.error;
  for(const k of ["sides","subjects"])SNAP["st_"+k]=JSON.stringify(DB.state[k]||null);
  SNAP.students=Object.fromEntries(DB.students.map(x=>[x.id,JSON.stringify(x)]));
  SNAP.sheets=Object.fromEntries(DB.sheets.map(x=>[x.id,JSON.stringify(x)]));
  SNAP.duty=JSON.stringify(DB.duty);
}
function save(){
  if(!CLOUD){lsSet(DKEY,JSON.stringify(DB));return}
  dirty=true;clearTimeout(pushTimer);pushTimer=setTimeout(push,500);setSync("busy");
}
function setSync(st){const el=$("#sync");if(el){el.textContent={busy:"Speichert …",ok:"",err:"Nicht gespeichert"}[st];el.hidden=st==="ok"}}
async function push(){
  pushTimer=null;if(!session||!loaded)return;if(pushing){again=true;return}pushing=true;
  try{
    const cs=Object.fromEntries(DB.students.map(x=>[x.id,JSON.stringify(x)]));
    const up=DB.students.filter(x=>cs[x.id]!==SNAP.students[x.id]),del=Object.keys(SNAP.students).filter(id=>!(id in cs)&&!HOLD.has(id));
    if(up.length){let r=await sb.from("students").upsert(up.map(studentRow));
      if(r.error&&r.error.code==="23505"){up.filter(x=>!(x.id in SNAP.students)).forEach(x=>{x.code=newCode();cs[x.id]=JSON.stringify(x)});r=await sb.from("students").upsert(up.map(studentRow))}
      chk(r);up.forEach(x=>SNAP.students[x.id]=cs[x.id])}
    if(del.length){chk(await sb.from("students").delete().in("id",del));del.forEach(id=>delete SNAP.students[id])}
    const ch=Object.fromEntries(DB.sheets.map(x=>[x.id,JSON.stringify(x)]));
    const sup=DB.sheets.filter(x=>ch[x.id]!==SNAP.sheets[x.id]),sdel=Object.keys(SNAP.sheets).filter(id=>!(id in ch)&&!HOLD.has(id));
    if(sup.length){chk(await sb.from("sheets").upsert(sup.map(x=>({id:x.id,data:x,updated_at:new Date().toISOString()}))));sup.forEach(x=>SNAP.sheets[x.id]=ch[x.id])}
    if(sdel.length){chk(await sb.from("attempts").delete().in("sheet_id",sdel));chk(await sb.from("sheets").delete().in("id",sdel));sdel.forEach(id=>delete SNAP.sheets[id])}
    for(const k of ["sides","subjects"]){const j=JSON.stringify(DB.state[k]||null);if(j!==SNAP["st_"+k]){chk(await sb.from("app_state").upsert({key:k,value:DB.state[k]||(k==="sides"?{}:[]),updated_at:new Date().toISOString()}));SNAP["st_"+k]=j}}
    const dj=JSON.stringify(DB.duty);
    if(dj!==SNAP.duty){chk(await sb.from("app_state").upsert({key:"duty",value:DB.duty,updated_at:new Date().toISOString()}));SNAP.duty=dj}
    if(!again)dirty=false;setSync("ok");
  }catch(e){console.error(e);setSync("err");setTimeout(()=>{if(dirty&&!pushTimer)push()},8000)}
  pushing=false;if(again){again=false;push()}
}
const editing=()=>{const a=document.activeElement;return a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)};
async function refresh(){if(!CLOUD||ui.mode!=="teacher"||!session||dirty||pushing||ui.sheet||editing())return;try{await pull();if(!dirty&&!editing()&&!ui.sheet)render()}catch(e){}}
if(CLOUD){setInterval(refresh,60000);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh()})}
async function enterTeacher(){
  if(!CLOUD){DB=demoLoad();ui.mode="teacher";ui.tab="students";lsSet("kt-schule-lead",lead()?"1":"0");lsSet("kt-schule-teacher","1");render(true);return}
  if(!session){ui.mode="auth";render(true);return}
  ui.mode="loading";render();
  try{
    await pull();
    if(!DB.teachers.some(t=>t.id===DB.me)){try{const r=await sb.rpc("claim_invite");if(r.data===true)await pull()}catch(e){}}
    loaded=true;
    if(lead()){try{const r=await sb.rpc("team_code");DB.teamCode=r.data||""}catch(e){}}
    if(!DB.teachers.some(t=>t.id===DB.me))ui.mode="wait";
    else{ui.mode="teacher";ui.tab="students";lsSet("kt-schule-lead",lead()?"1":"0");lsSet("kt-schule-teacher","1");
      if(lead()&&!DB.sheets.length&&!DB.state.seeded){DB.sheets=seedSheets();chk(await sb.from("app_state").upsert({key:"seeded",value:true}));DB.state.seeded=true;save()}}
  }catch(e){console.error(e);ui.mode="auth";ui.authErr="Keine Verbindung zum Speicher. Prüfe dein Internet und versuch es noch einmal."}
  render(true);
}
const authDe=m=>/Invalid login/i.test(m)?"E-Mail oder Passwort stimmt nicht.":/not confirmed/i.test(m)?"Bitte bestätige zuerst deine E-Mail (Link im Postfach).":/already registered/i.test(m)?"Für diese E-Mail gibt es schon ein Konto. Melde dich an.":/at least|Password should/i.test(m)?"Das Passwort braucht mindestens 8 Zeichen.":/rate limit/i.test(m)?"Zu viele Versuche. Warte ein paar Minuten.":/valid email|invalid format/i.test(m)?"Bitte eine gültige E-Mail-Adresse eintragen.":m;

/* ---------- Schülerbereich: Daten ---------- */
let STU=null,P=null,SH={sheets:[],attempts:[]},pTimer=null;
const blankP=()=>({topics:{},days:{},wrongs:[],todayDone:null});
function normP(p){p=p&&typeof p==="object"?p:{};return{topics:p.topics||{},days:p.days||{},wrongs:p.wrongs||[],todayDone:p.todayDone||null,last:p.last||null}}
async function stuLogin(code){
  code=code.trim().toUpperCase();
  if(!CLOUD){const D=demoLoad(),s=D.students.find(x=>x.code===code);if(!s)return false;
    STU={id:s.id,first:s.first,klasse:s.klasse,group:s.group,goals:s.goals||[],code};P=normP(D.progress[s.id]);
    SH={sheets:D.sheets.filter(x=>sheetFits(x,s)),attempts:D.attempts.filter(a=>a.sid===s.id).map(a=>({sheetId:a.sheetId,score:a.score,total:a.total,date:a.date}))};}
  else{const r=await sb.rpc("student_login",{p_code:code});if(r.error)throw r.error;if(!r.data)return false;const d=r.data;
    STU={id:d.id,first:d.first,klasse:d.klasse,group:d.grp,goals:d.goals||[],code};
    const local=lsGet("kts-p-"+d.id);P=normP(d.progress&&Object.keys(d.progress).length?d.progress:local?JSON.parse(local):null);
    const s2=await sb.rpc("student_sheets",{p_code:code});SH=s2.error||!s2.data?{sheets:[],attempts:[]}:{sheets:s2.data.sheets||[],attempts:s2.data.attempts||[]}}
  lsSet("kt-schule-code",code);return true;
}
function saveP(){
  if(!STU)return;
  if(ui.watch)return; /* Lehrkraft schaut nur zu: nichts beim Kind speichern */
  P.last=new Date().toISOString();
  if(!CLOUD){const D=demoLoad();D.progress[STU.id]=P;lsSet(DKEY,JSON.stringify(D));return}
  lsSet("kts-p-"+STU.id,JSON.stringify(P));
  clearTimeout(pTimer);pTimer=setTimeout(()=>sb.rpc("student_save_progress",{p_code:STU.code,p_progress:P}).then(()=>{}),1200);
}
function submitSheet(sheetId,score,total){
  if(ui.watch)return;
  SH.attempts.unshift({sheetId,score,total,date:new Date().toISOString()});
  if(!CLOUD){const D=demoLoad();D.attempts.push({id:uid(),sid:STU.id,sheetId,score,total,date:new Date().toISOString()});lsSet(DKEY,JSON.stringify(D));return}
  sb.rpc("student_submit",{p_code:STU.code,p_sheet:sheetId,p_score:score,p_total:total}).then(r=>{if(r.error||r.data!==true)toast("Ergebnis konnte nicht gespeichert werden")});
}
const mastery=(p,t)=>{const h=p.topics[t]?.h||[];return h.length?h.reduce((a,b)=>a+b,0)/h.length:null};
function record(t,ok){const o=P.topics[t]=P.topics[t]||{h:[],n:0};o.h.push(ok?1:0);if(o.h.length>20)o.h.shift();o.n++;P.days[today()]=(P.days[today()]||0)+1}
function countDay(){P.days[today()]=(P.days[today()]||0)+1}
const myTopics=()=>Object.keys(TOPICS).filter(t=>fits(t,STU.klasse));
const openSheets=()=>SH.sheets.filter(x=>!SH.attempts.some(a=>a.sheetId===x.id));
function streak(p){let n=0;const d=new Date();if(!p.days[today()])d.setDate(d.getDate()-1);for(;;){const k=d.toLocaleDateString("sv");if(!p.days[k])break;n++;d.setDate(d.getDate()-1)}return n}
function week(p){const out=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=d.toLocaleDateString("sv");out.push({d,k,v:p.days[k]||0})}return out}
/* Tagesrunde: erst Fehler von neulich, dann ein neues Blatt der Lehrkräfte, dann die Förderziele (sonst die schwächsten Themen) */
function planToday(){
  let goals=STU.goals.filter(t=>fits(t,STU.klasse));
  if(!goals.length)goals=myTopics().sort((a,b)=>(mastery(P,a)??.5)-(mastery(P,b)??.5)).slice(0,2);
  const steps=[],rev=P.wrongs.slice(0,5);
  if(rev.length)steps.push({label:"Wiederholen",sub:plural(rev.length,"Aufgabe","Aufgaben")+", die neulich nicht geklappt haben",items:rev.map(w=>({...w,rev:1}))});
  const os=openSheets()[0];if(os)steps.push({label:`${os.subject} · ${os.title}`,sub:"Neues Blatt von deinen Lehrkräften",items:sheetItems(os).map(x=>({...x,sheet:os.id}))});
  goals.forEach(t=>steps.push({label:`${TOPICS[t].s} · ${TOPICS[t].n}`,sub:"8 Aufgaben"+(STU.goals.includes(t)?" · Förderziel":""),items:Array.from({length:8},()=>({t,kind:TOPICS[t].kind,ctx:TOPICS[t].s+" · "+TOPICS[t].n,it:TOPICS[t].gen()}))}));
  return steps;
}

/* ---------- Symbole ---------- */
const svg=b=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg>`;
const ICON={book:svg('<path class="f" d="M12 6.6C10.1 5.3 7.5 4.7 3.8 4.9v13.5c3.7-.2 6.3.4 8.2 1.7 1.9-1.3 4.5-1.9 8.2-1.7V4.9c-3.7-.2-6.3.4-8.2 1.7Z"/><path d="M12 6.6v13.5"/>'),
  target:svg('<circle cx="12" cy="12" r="8.6"/><circle class="f" cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>'),
  bars:svg('<rect class="f" x="4" y="12.5" width="4" height="7.5" rx="1.4"/><rect class="f" x="10" y="8" width="4" height="12" rx="1.4"/><rect class="f" x="16" y="4" width="4" height="16" rx="1.4"/>'),
  people:svg('<circle class="f" cx="9" cy="8" r="3.4"/><path d="M3.2 19.2c.6-3.3 3-5.2 5.8-5.2s5.2 1.9 5.8 5.2"/><path d="M15.6 5.2a3.2 3.2 0 0 1 0 6.1M17.4 14.3c1.8.6 3 2.2 3.4 4.9"/>'),
  sheet:svg('<rect class="f" x="4" y="3.6" width="16" height="16.8" rx="3"/><path d="m7.8 9.2 1.6 1.6 2.8-3M7.8 15.4l1.6 1.6 2.8-3M15 9.6h1.6M15 15.8h1.6"/>'),
  cal:svg('<rect class="f" x="3.8" y="5.2" width="16.4" height="15" rx="3"/><path d="M3.8 9.8h16.4M8.2 3.4v3.4M15.8 3.4v3.4"/>'),
  x:svg('<path d="M6 6l12 12M18 6 6 18"/>')};

const FLAME=`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.6 2.5c.3 2.6-.8 4.2-2.1 5.7-1.4 1.6-3 3.3-3 6.1A5.4 5.4 0 0 0 12 19.8a5.4 5.4 0 0 0 5.4-5.5c0-2-.8-3.6-1.7-4.8-.2 1.3-.8 2.2-1.8 2.6.4-3.4-.2-7-1.3-9.6Z"/></svg>`;
const SUBJ_ICON={Mathe:"1+2",Deutsch:"Aa",Englisch:"Hi"};
const CONFETTI=`<div class="confetti" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--x:${(i*37)%100}%;--d:${(i%6)*.08}s;--r:${(i*53)%360}deg;--c:var(--cf${i%4})"></i>`).join("")}</div>`;

/* Kleiner Info-Punkt: Erklärung nur auf Antippen */
function info(k,t){return`<button class="info" data-act="info" data-v="${k}" aria-label="Info" aria-expanded="${ui.info===k}">i</button>${ui.info===k?`<span class="tip">${t}</span>`:""}`}

/* ---------- Grundgerüst ---------- */
function render(anim){try{renderInner(anim)}catch(err){console.error(err);$("#app").innerHTML=`<div class="block empty"><h2>Da hat etwas nicht geklappt</h2><p class="note2">Deine Daten sind gespeichert.</p><button class="btn" onclick="location.reload()">Neu laden</button></div>`}}
/* Solange der Aufgabenbereich entsteht: Lehrkräfte sehen unter „Aufgaben“ und Schüler nach der Anmeldung einen Hinweis.
   Die Leitung sieht alles (auf ihrem Gerät auch den Schülerbereich). Freigeben: TASKS_OPEN auf true setzen. */
const TASKS_OPEN=false;
const isPreview=()=>lsGet("kt-schule-lead")==="1";
const tasksLocked=()=>!TASKS_OPEN&&!(ui.mode==="teacher"||ui.watch?lead():isPreview());
function viewSoon(who){
  return`<div class="soon">${ibadge("bolt","--c2")}<h1>Bald da</h1><p class="muted">${who==="stu"?"Hier kannst du bald üben. Wir sagen dir Bescheid!":"Dieser Bereich wird gerade programmiert."}</p>${who==="stu"&&!ui.watch?`<button class="btn ghost small" data-act="toStart">Zurück</button>`:""}</div>`;
}
function renderInner(anim){
  const app=$("#app"),nav=$("#nav"),fb=$("#fbar");
  document.body.classList.toggle("focus",!!ui.run);
  fb.hidden=!ui.run;nav.hidden=true;
  let html="";
  if(ui.mode==="student"&&STU&&tasksLocked()){html=viewSoon("stu")}
  else if(ui.mode==="student"&&STU){
    if(ui.run){html=viewRun();fb.innerHTML=focusBar()}
    else html=ui.stab==="home"?viewStuHome():ui.stab==="practice"?viewStuPractice():viewStuStats();
    nav.hidden=false;nav.innerHTML=[["home","Heute",ICON.book],["practice","Üben",ICON.target],["stats","Fortschritt",ICON.bars]].map(([k,l,i])=>`<button data-act="stab" data-v="${k}" ${ui.stab===k?'aria-current="page"':""}>${i}${l}</button>`).join("");
  }else if(ui.mode==="teacher"){
    html=ui.tab==="students"?(ui.sid&&cur()?viewStudent():viewStudents()):ui.tab==="tasks"?(tasksLocked()?viewSoon("t"):viewTasks()):viewPlan();
    nav.hidden=false;nav.innerHTML=[["students","Schüler",ICON.people],["tasks","Aufgaben",ICON.sheet],["plan","Plan",ICON.cal]].map(([k,l,i])=>`<button data-act="tab" data-v="${k}" ${ui.tab===k?'aria-current="page"':""}>${i}${l}</button>`).join("");
  }else if(ui.mode==="pick")html=viewPick();
  else if(ui.mode==="code")html=viewCode();
  else if(ui.mode==="auth")html=viewAuth();
  else if(ui.mode==="newpw")html=viewNewPw();
  else if(ui.mode==="wait")html=viewWait();
  else if(ui.mode==="loading")html=`<div class="empty">Lädt …</div>`;
  else html=viewStart();
  if(ui.watch&&ui.mode==="student"&&!ui.run)html=WATCHBAR()+html;
  else if((ui.mode==="teacher"&&!ui.sid)||(ui.mode==="student"&&STU&&!ui.run&&!ui.subj&&!tasksLocked()))html=APPBAR+html;
  app.innerHTML=html;
  try{renderSheet()}catch(err){console.error(err);ui.sheet=null;$("#layer").innerHTML="";toast("Das Fenster ließ sich nicht öffnen.")}
  if(anim){app.classList.remove("vin");void app.offsetWidth;app.classList.add("vin")}
}
const LOGO=`<img class="logo" src="__ICON__" alt="Kocatepe Gençlik Ruhrort" width="88" height="88">`;
/* Kleine Leiste oben: Logo führt zurück zur Startseite (Schüler / Lehrkräfte), ohne abzumelden */
const APPBAR=`<div class="appbar"><button class="homebtn" data-act="toStart" aria-label="Zur Startseite"><img src="__ICON__" alt="" width="30" height="30"><span>KT Schule</span></button></div>`;
function viewStart(){
  return`<div class="startwrap">${LOGO}<h1>KT Schule</h1>
    <button class="door kid" data-act="asStudent">${MARK}<b>Schüler</b><span class="go">›</span></button>
    <button class="door" data-act="asTeacher"><b>Lehrkräfte</b><span class="go">›</span></button>
    ${CLOUD?"":`<div class="infoline">${info("demo","Vorschau mit Beispieldaten. Schüler-Codes: YUSUF7, EMRE45")}</div>`}
  </div>`;
}
function viewCode(){
  return`<button class="crumb" data-act="home">‹ Zurück</button>
  <div style="display:grid;gap:18px">${LOGO}<h1>Dein Code</h1>
  <form id="fcode" class="block" style="display:grid;gap:12px;margin:0">
    <input id="code" class="codein" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123" aria-label="Dein Code">
    ${ui.codeErr?`<div class="err">${esc(ui.codeErr)}</div>`:""}
    <button class="btn wide">Los geht's</button></form></div>`;
}
function viewAuth(){
  const up=ui.authUp;
  return`<button class="crumb" data-act="home">‹ Zurück</button><h1>${up?"Konto erstellen":"Anmelden"}</h1>
  <form id="fauth" class="block" style="display:grid;gap:14px">
    ${up?`<label class="f">Vorname<input id="au-name" autocomplete="given-name" value="${esc(ui.authName||"")}"></label>
    <div class="f">Ich betreue${choice("authGrp",[["jungs","Jungs"],["maedchen","Mädchen"]],ui.authGrp)}</div>
    <label class="f"><span class="infoline">Teamcode ${info("tc","Bekommst du von der Leitung.")}</span><input id="au-code" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(ui.authCode||"")}"></label>`:""}
    <label class="f">E-Mail<input id="au-mail" type="email" autocomplete="email" value="${esc(ui.authMail||"")}"></label>
    <label class="f">Passwort${up?" (mindestens 8 Zeichen)":""}<input id="au-pw" type="password" autocomplete="${up?"new-password":"current-password"}"></label>
    ${ui.authErr?`<div class="err">${esc(ui.authErr)}</div>`:""}${ui.authMsg?`<p class="note2">${esc(ui.authMsg)}</p>`:""}
    <button class="btn wide" ${ui.busy?"disabled":""}>${up?"Konto erstellen":"Anmelden"}</button>
  </form>
  <div class="row"><button class="btn ghost small" data-act="authToggle">${up?"Ich habe schon ein Konto":"Neues Konto erstellen"}</button>${up?"":'<button class="btn ghost small" data-act="authReset">Passwort vergessen</button>'}</div>`;
}
function viewNewPw(){return`<h1>Neues Passwort</h1><form id="fnewpw" class="block" style="display:grid;gap:14px"><label class="f">Neues Passwort (mindestens 8 Zeichen)<input id="np" type="password" autocomplete="new-password"></label>${ui.authErr?`<div class="err">${esc(ui.authErr)}</div>`:""}<button class="btn wide">Speichern</button></form>`}
function viewWait(){return`<h1>Fast geschafft</h1><form id="fjoin" class="block" style="display:grid;gap:14px">
  <div class="f">Ich betreue${choice("authGrp",[["jungs","Jungs"],["maedchen","Mädchen"]],ui.authGrp)}</div>
  <label class="f"><span class="infoline">Teamcode ${info("tc2","Bekommst du von der Leitung.")}</span><input id="jn-code" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
  ${ui.authErr?`<div class="err">${esc(ui.authErr)}</div>`:""}<button class="btn wide">Beitreten</button></form>
  <div class="row"><button class="btn ghost small" data-act="logout">Abmelden</button></div>`}

/* ---------- Lehrkräfte schauen in den Schülerbereich: Liste, dann Ansicht wie beim Kind (live) ---------- */
const isTeacherDevice=()=>lsGet("kt-schule-teacher")==="1"&&(!CLOUD||!!session);
async function ensureTeacherData(){
  if(!CLOUD){if(!DB.teachers.length)DB=demoLoad();return true}
  if(loaded&&DB.teachers.some(t=>t.id===DB.me))return true;
  await pull();loaded=true;return DB.teachers.some(t=>t.id===DB.me);
}
async function openPick(){
  ui.mode="loading";render();
  try{if(!(await ensureTeacherData())){ui.mode="code";render(true);return}}catch(e){toast("Keine Verbindung");ui.mode="start";render();return}
  ui.mode="pick";ui.watch=false;render(true);scrollTo(0,0);
}
const liveNow=p=>p?.last&&(Date.now()-new Date(p.last).getTime())<3*60000;
function viewPick(){
  let L=visible();if(lead()&&ui.pfilter&&ui.pfilter!=="alle")L=L.filter(s=>s.group===ui.pfilter);
  if(ui.pq){const q=ui.pq.toLowerCase();L=L.filter(s=>(s.first+" "+s.last).toLowerCase().includes(q))}
  L.sort((a,b)=>(liveNow(normP(DB.progress[b.id]))-liveNow(normP(DB.progress[a.id])))||a.first.localeCompare(b.first,"de"));
  const live=L.filter(s=>liveNow(normP(DB.progress[s.id]))).length;
  return`<button class="crumb" data-act="toStart">‹ Start</button><div class="head" style="margin-bottom:14px"><h1>Schüler</h1>${live?`<span class="livechip"><i></i>${live} übt gerade</span>`:""}</div>
  <div class="row" style="margin:0 0 12px">${lead()?`<div class="seg" role="group" aria-label="Gruppe">${["alle","jungs","maedchen"].map(f=>`<button data-act="pfilter" data-v="${f}" aria-pressed="${(ui.pfilter||"alle")===f}">${f==="alle"?"Alle":GROUPS[f].label}</button>`).join("")}</div>`:""}
    <input id="pq" type="search" placeholder="Suchen" value="${esc(ui.pq||"")}" aria-label="Suchen" class="search"></div>
  ${L.length?`<div class="list">${L.map(s=>{const p=normP(DB.progress[s.id]),t=p.days[today()]||0,on=liveNow(p);
    return`<button class="item" data-act="pickStu" data-v="${s.id}">${av(s.first+" "+s.last,s.group)}<span class="t">${esc(s.first)} ${esc(s.last)}</span><span class="r">${on?'<span class="livechip"><i></i>live</span>':t?`<span class="chip good">${t} heute</span>`:""}›</span><span class="d">Klasse ${s.klasse}${p.last&&!on?" · zuletzt "+ago(p.last):""}</span></button>`}).join("")}</div>`
  :`<div class="block empty">${visible().length?"Niemand passt zur Suche.":"Noch keine Schüler."}</div>`}
  <div class="row" style="justify-content:center;margin-top:16px"><button class="btn ghost small" data-act="asCode">Mit Code anmelden</button></div>`;
}
function ago(iso){const m=Math.round((Date.now()-new Date(iso).getTime())/60000);if(m<60)return`vor ${m} Min.`;const h=Math.round(m/60);if(h<24)return`vor ${h} Std.`;const d=Math.round(h/24);return d===1?"gestern":`vor ${d} Tagen`}
function watchStudent(id){
  const s=DB.students.find(x=>x.id===id);if(!s)return;
  STU={id:s.id,first:s.first,klasse:s.klasse,group:s.group,goals:s.goals||[],code:s.code};P=normP(JSON.parse(JSON.stringify(DB.progress[s.id]||{})));
  SH={sheets:DB.sheets.filter(x=>sheetFits(x,s)),attempts:DB.attempts.filter(a=>a.sid===s.id).map(a=>({sheetId:a.sheetId,score:a.score,total:a.total,date:a.date}))};
  ui.watch=true;ui.mode="student";ui.stab="home";ui.subj=null;ui.run=null;render(true);scrollTo(0,0);
}
const WATCHBAR=()=>`<div class="watchbar"><button class="crumb" data-act="stopWatch">‹ Liste</button><span class="livechip${liveNow(P)?"":" off"}"><i></i>${liveNow(P)?"übt gerade":"Ansicht"}</span></div>`;
/* Live: alle 8 Sekunden den Lernstand neu holen, solange Liste oder Ansicht offen ist */
async function pollLive(){
  if(!CLOUD||document.visibilityState!=="visible"||!(ui.mode==="pick"||ui.watch)||ui.run)return;
  try{const r=await sb.from("students").select("id,progress");if(r.error)return;
    r.data.forEach(x=>DB.progress[x.id]=x.progress||{});
    if(ui.watch&&STU){P=normP(JSON.parse(JSON.stringify(DB.progress[STU.id]||{})))}
    if(!editing())render();
  }catch(e){}
}
setInterval(pollLive,8000);

/* ---------- Schülerbereich: Ansichten ---------- */
const MARK=`<svg class="mark" viewBox="-220 -190 440 330" aria-hidden="true"><path d="M -195,-138 C -165,-102 -128,-92 -100,-100 C -72,-108 -40,-124 -14,-132 C -75,-95 -125,-20 -112,60 C -108,90 -100,112 -92,128 C -160,100 -212,30 -212,-40 C -212,-82 -205,-115 -195,-138 Z"/><path d="M 195,-138 C 165,-102 128,-92 100,-100 C 72,-108 40,-124 14,-132 C 75,-95 125,-20 112,60 C 108,90 100,112 92,128 C 160,100 212,30 212,-40 C 212,-82 205,-115 195,-138 Z"/><circle cx="-130" cy="-152" r="30"/><circle cx="130" cy="-152" r="30"/><path d="M -80,130 L -80,0 C -80,-58 -22,-72 0,-106 C 22,-72 80,-58 80,0 L 80,130 L 40,130 L 40,4 C 40,-32 14,-48 0,-64 C -14,-48 -40,-32 -40,4 L -40,130 Z"/></svg>`;
function viewStuHome(){
  const done=P.todayDone===today(),steps=done?[]:planToday(),n=steps.reduce((a,s)=>a+s.items.length,0);ui.plan=steps;
  const subj=stuSubj().map(s=>({s,L:myTopics().filter(t=>TOPICS[t].s===s),Sh:SH.sheets.filter(x=>x.subject===s)})).filter(x=>x.L.length||x.Sh.length);
  const sk=streak(P);
  return`<div class="hello"><h1>Hallo ${esc(STU.first)}!</h1>${sk?`<span class="streak" title="Tage am Stück">${FLAME}${sk}</span>`:""}</div>
  <section class="today">${MARK}
    <div class="eyebrow">Heute</div>
    <h2>${done?"Geschafft!":"Deine Runde"}</h2>
    ${done?`<button class="btn" data-act="stab" data-v="practice">Weiter üben</button>`
    :`<ol>${steps.map(s=>`<li>${esc(s.label.split(" · ").pop())}</li>`).join("")}</ol><button class="btn" data-act="startToday">Starten</button>`}
  </section>
  <div class="tiles">${subj.map(x=>`<button class="tile" style="--sc:var(${scol(x.s)})" data-act="subj" data-v="${esc(x.s)}"><span class="big">${sicon(x.s)}</span><b>${esc(x.s)}</b></button>`).join("")}</div>`;
}
function viewStuPractice(){
  if(ui.subj){
    const s=ui.subj,L=myTopics().filter(t=>TOPICS[t].s===s),Sh=SH.sheets.filter(x=>x.subject===s);
    return`<button class="crumb" data-act="subj" data-v="">‹ Üben</button><h1>${s}</h1>
    ${Sh.length?`<div class="sect"><span>Von deinen Lehrern</span></div><div class="list">${Sh.map(x=>{const a=SH.attempts.find(y=>y.sheetId===x.id);return`<button class="item" data-act="sheetRun" data-v="${x.id}">${badge(x.subject)}<span class="t">${esc(x.title)}</span><span class="r">${a?`<span class="chip${a.score===a.total?" good":""}">${a.score}/${a.total}</span>`:'<span class="chip goal">neu</span>'}›</span></button>`}).join("")}</div>`:""}
    ${L.length?`<div class="sect"><span>Themen</span></div><div class="list">${L.map(t=>{const m=mastery(P,t);return`<button class="item" data-act="topic" data-v="${t}">${badge(TOPICS[t].s)}<span class="t">${TOPICS[t].n}</span><span class="r">${STU.goals.includes(t)?'<span class="chip goal">Förderziel</span>':m!=null&&m>=.85?'<span class="chip good">sitzt</span>':""}›</span><span class="bar"><i style="width:${Math.round((m||0)*100)}%"></i></span></button>`}).join("")}</div>
    `:""}`;
  }
  return`<h1>Üben</h1>
  <div class="list">
    <button class="item" data-act="mix">${ibadge("bolt","--c2")}<span class="t">Schnelle Runde</span><span class="r">›</span></button>
    <button class="item" data-act="wrongs" ${P.wrongs.length?"":"disabled"}>${ibadge("redo","--de")}<span class="t">Fehler wiederholen</span><span class="r">${P.wrongs.length?`<span class="chip">${P.wrongs.length}</span>`:""}›</span></button>
  </div>
  <div class="sect"><span>Nach Fach</span></div>
  <div class="list">${stuSubj().filter(s=>myTopics().some(t=>TOPICS[t].s===s)||SH.sheets.some(x=>x.subject===s)).map(s=>`<button class="item" data-act="subj" data-v="${esc(s)}">${badge(s)}<span class="t">${esc(s)}</span><span class="r">›</span></button>`).join("")}</div>`;
}
function weekBlock(p,title){
  const w=week(p),max=Math.max(10,...w.map(x=>x.v)),sum=w.reduce((a,b)=>a+b.v,0);
  return`<div class="sect" style="margin-top:0"><span>${title}</span><span>${plural(sum,"Aufgabe","Aufgaben")}</span></div>
  <div class="week">${w.map((x,i)=>`<div class="d${i===6?" now":""}"><div class="bw"><i style="height:${Math.max(5,x.v/max*64)}px"></i></div><div class="n">${x.v}</div><div class="dt">${x.d.toLocaleDateString("de-DE",{weekday:"short"}).slice(0,2)}</div></div>`).join("")}</div>`;
}
function viewStuStats(){
  const tot=Object.values(P.topics).reduce((a,o)=>a+o.n,0),all=Object.values(P.topics).flatMap(o=>o.h);
  const acc=all.length?Math.round(all.reduce((a,b)=>a+b,0)/all.length*100):null,sk=streak(P),wk=week(P).reduce((a,b)=>a+b.v,0);
  const motiv=!wk?"Eine kleine Runde am Tag reicht, damit es hängen bleibt.":sk>=3?`${sk} Tage am Stück, stark! Bleib dran.`:wk>=40?"Diese Woche hast du richtig viel geschafft.":"Jede Aufgabe zählt. Morgen geht's weiter.";
  return`<h1>Fortschritt</h1>
  <div class="block">${weekBlock(P,"Diese Woche")}</div>
  <div class="stats"><div><b>${sk}</b><span>Tage am Stück</span></div><div><b>${tot}</b><span>Aufgaben gesamt</span></div><div><b>${acc==null?"–":acc+" %"}</b><span>richtig</span></div></div>
  <div class="sect"><span>Deine Themen</span></div>
  <div class="list">${myTopics().map(t=>{const m=mastery(P,t);return`<div class="item">${badge(TOPICS[t].s)}<span class="t">${TOPICS[t].n}</span><span class="r small">${m==null?"neu":Math.round(m*100)+" %"}</span><span class="bar"><i style="width:${Math.round((m||0)*100)}%"></i></span></div>`}).join("")}</div>
  ${ui.watch?"":`<div class="row" style="justify-content:center;margin-top:18px"><button class="btn ghost small" data-act="home">Abmelden</button></div>`}`;
}

/* ---------- Lernrunde: viele kurze Aufgaben, Fehler kommen in derselben Runde wieder ---------- */
function start(items,label,o={}){ui.run={q:items.map(x=>({...x,tries:0})),i:0,first:0,total:items.length,label,isToday:!!o.today,sheet:o.sheet||null,inp:"",state:null,chosen:null};render(true);scrollTo(0,0)}
function focusBar(){const r=ui.run,p=Math.min(r.i,r.q.length)/r.q.length;return`<div class="in"><button class="x" data-act="quit" aria-label="Runde beenden">${ICON.x}</button><div class="p"><i style="width:${p*100}%"></i></div><div class="n">${Math.min(r.i+1,r.q.length)}/${r.q.length}</div></div>`}
function viewRun(){
  const r=ui.run;
  if(r.i>=r.q.length){const p=r.first/r.total;
    return`<div class="end">${p>=.7?CONFETTI:""}<div class="big">${r.first}/${r.total}</div><h2>${p===1?"Alles richtig!":p>=.7?"Stark!":"Gut gemacht!"}</h2>
      <button class="btn wide" data-act="finish">Fertig</button></div>`}
  const x=r.q[r.i],it=x.it,st=r.state,T=x.t?TOPICS[x.t]:{};
  let body="";
  if(x.kind==="choice")body=`<div class="opts${it.opts.length===2?" two":""}">${it.opts.map((o,k)=>`<button data-act="opt" data-v="${k}" ${st?"disabled":""} class="${st&&k===it.c?"r":st==="w"&&k===r.chosen?"w":""}">${esc(o)}</button>`).join("")}</div>`;
  else if(x.kind==="text")body=`<form id="tform"><input id="tin" class="ans${st?" "+st:""}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Antwort" value="${esc(r.inp)}" ${st?"disabled":""} aria-label="Antwort"></form>${st?"":`<button class="btn wide" data-act="check">Prüfen</button>`}`;
  else{const keys=["7","8","9","4","5","6","1","2","3",T.frac?"/":T.neg?"−":"","0","⌫"];
    body=`<div class="ans${r.inp?"":" empty"}${st?" "+st:""}" aria-live="polite">${r.inp?esc(r.inp):"Tippe deine Antwort"}</div>${st?"":`<div class="pad">${keys.map(k=>k?`<button data-act="key" data-v="${k}" aria-label="${k==="⌫"?"Löschen":k}">${k}</button>`:"<span></span>").join("")}<button class="ok" data-act="check">Prüfen</button></div>`}`}
  const right=x.kind==="choice"?it.opts[it.c]:it.a[0];
  const fb=st==="w"?`<div class="fb"><b>Richtig wäre: ${esc(right)}</b>${it.ex?`<span>${esc(it.ex)}</span>`:""}</div><button class="btn wide" data-act="next">Weiter</button>`:st==="r"?`<div class="fb ok"><b>Richtig!</b></div>`:"";
  return`<div class="task"><div class="qcard pop"><div class="ctx">${esc(x.ctx)}${x.rev?" · Wiederholung":""}</div><div class="q${it.q.length>28?" long":""}">${esc(it.q)}</div></div></div>${body}${fb}`;
}
const norm=s=>String(s).toLowerCase().replace(/−/g,"-").replace(/,/g,".").replace(/\s+/g," ").trim();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function answer(given){
  const r=ui.run,x=r.q[r.i],it=x.it;
  const ok=x.kind==="choice"?given===it.c:it.a.some(a=>norm(a)===norm(given));
  r.state=ok?"r":"w";
  if(x.tries===0){if(ok)r.first++;if(x.t)record(x.t,ok);else countDay()}
  if(ok&&x.rev)P.wrongs=P.wrongs.filter(w=>!same(w.it,it));
  if(!ok){if(x.t&&!P.wrongs.some(w=>same(w.it,it))){P.wrongs.unshift({t:x.t,kind:x.kind,ctx:x.ctx,it});P.wrongs=P.wrongs.slice(0,30)}
    if(x.tries<2)r.q.splice(Math.min(r.i+3,r.q.length),0,{...x,tries:x.tries+1})}
  saveP();render();
  if(ok)setTimeout(()=>{if(ui.run===r&&r.state==="r")next()},650);
}
function next(){const r=ui.run;r.i++;r.inp="";r.state=null;r.chosen=null;render();$("#tin")?.focus()}

/* ---------- Lehrkräfte: Schüler ---------- */
function stuStats(s){const p=normP(DB.progress[s.id]);const w=week(p).reduce((a,b)=>a+b.v,0);return{p,w,sk:streak(p)}}
function viewStudents(){
  let L=visible();if(lead()&&ui.filter!=="alle")L=L.filter(s=>s.group===ui.filter);
  if(ui.q){const q=ui.q.toLowerCase();L=L.filter(s=>(s.first+" "+s.last).toLowerCase().includes(q))}
  L.sort((a,b)=>a.first.localeCompare(b.first,"de"));
  return`${hintsBlock()}<div class="headwrap"><div class="head"><h1>Schüler</h1><button class="btn small" data-act="newStudent">Hinzufügen</button></div></div>
  ${lead()||visible().length>8?`<div class="row" style="margin:0 0 12px">${lead()?`<div class="seg" role="group" aria-label="Gruppe">${["alle","jungs","maedchen"].map(f=>`<button data-act="filter" data-v="${f}" aria-pressed="${ui.filter===f}">${f==="alle"?"Alle":GROUPS[f].label}</button>`).join("")}</div>`:""}${visible().length>8?`<input id="q" type="search" placeholder="Suchen" value="${esc(ui.q)}" aria-label="Suchen" style="flex:1;min-width:8rem;min-height:36px;border:0;border-radius:12px;background:var(--fill);padding:6px 12px">`:""}</div>`:""}
  ${L.length?`<div class="list">${L.map(s=>{const {w}=stuStats(s);return`<button class="item" data-act="open" data-v="${s.id}" data-hold="student:${s.id}">${av(s.first+" "+s.last,s.group)}<span class="t">${esc(s.first)} ${esc(s.last)}</span><span class="r">${!DB.docs.some(d=>d.sid===s.id&&d.kind==="Vertrag")?'<span class="dot warnd" title="Vertrag fehlt"></span>':""}›</span><span class="d">Klasse ${s.klasse}</span></button>`}).join("")}</div>`
  :`<div class="block empty">${visible().length?"Niemand passt zur Suche.":"Noch keine Schüler. Tippe auf „Hinzufügen“."}</div>`}`;
}
function subjRow(s,sub){
  const ex=s.exams.filter(e=>e.subject===sub).sort((a,b)=>a.date.localeCompare(b.date)),vals=ex.map(e=>gval(e.grade)),a=avg(vals);
  const rep=[...s.reports].sort((x,y)=>(y.date||"").localeCompare(x.date||"")).find(r=>r.grades[sub]);
  const tr=vals.length>1?vals[vals.length-1]-vals[vals.length-2]:null;
  return`<span>${esc(sub)}${tr!=null&&Math.abs(tr)>=.3?` <span class="small" style="color:var(--${tr<0?"good":"bad"})">${tr<0?"▲":"▼"}</span>`:""}</span><span class="num">${a==null?"–":`<span class="gr ${gcls(a)}">${fmt(a)}</span>`}</span><span class="num">${rep?`<span class="gr ${gcls(gval(rep.grades[sub]))}">${esc(rep.grades[sub])}</span>`:"–"}</span>`;
}
function viewStudent(){
  const s=cur(),{p,w,sk}=stuStats(s),goals=s.goals||[];
  const practiced=Object.keys(p.topics).filter(t=>TOPICS[t]);
  const logs=[...s.log].sort((a,b)=>b.date.localeCompare(a.date));
  const exs=[...s.exams].sort((a,b)=>b.date.localeCompare(a.date));
  const stc={erledigt:"ok",teilweise:"part","nicht geschafft":"no"};
  const shs=DB.sheets.filter(x=>sheetFits(x,s));
  let cells="";for(let r=0;r<8;r++){cells+=`<div class="n">${r+1}</div>`;for(let d=0;d<5;d++){const v=s.plan[d+"-"+r]||"";cells+=`<button class="${v?"f":""}" data-act="cell" data-v="${d}-${r}" aria-label="${DAYS[d]}, ${r+1}. Stunde: ${esc(v||"frei")}">${esc(v)}</button>`}}
  const palette=[...new Set([...s.subjects,"Mathe","Deutsch","Englisch","GL","NW","Sport","Religion","Kunst","Musik","Biologie","Physik","Chemie","Erdkunde","Geschichte","Politik","Technik"])];
  return`<div class="topbar"><button class="crumb" data-act="back">‹ Schüler</button><button class="iconbtn" data-act="menu" data-v="student:${s.id}" aria-label="Mehr">${SVG.more}</button></div>
  <div class="eyebrow">Klasse ${s.klasse} · ${esc(s.schulform)}</div>
  <h1>${esc(s.first)} ${esc(s.last)}</h1>

  <section class="block"><div class="bh"><h2>In der App</h2><button class="btn ghost small" data-act="watchFromPage" data-v="${s.id}">Ansehen</button></div>
    <div class="mini"><div><b>${w}</b><span>Aufgaben, 7 Tage</span></div><div><b>${sk}</b><span>Tage am Stück</span></div><div><b>${Object.values(p.topics).reduce((a,o)=>a+o.n,0)}</b><span>Aufgaben gesamt</span></div></div>
    <div class="f" style="margin-bottom:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">Förderziele ${info("goal","Kommen jeden Tag in die Übungsrunde des Kindes.")}</div>
    <div class="tags">${goals.map((t,i)=>`<span class="tag goal">${esc(TOPICS[t]?.n||t)}<button data-act="delGoal" data-v="${i}" aria-label="Förderziel entfernen">×</button></span>`).join("")}<button class="tag add" data-act="addGoal">+ Förderziel</button></div>
    ${practiced.length?`<div class="kv" style="margin-top:14px"><span class="h">Thema</span><span class="h num">richtig</span><span class="h num">Aufgaben</span>${practiced.map(t=>{const m=mastery(p,t);return`<span>${esc(TOPICS[t].n)}</span><span class="num">${Math.round(m*100)} %</span><span class="num">${p.topics[t].n}</span>`}).join("")}</div>`:""}
    ${shs.length?`<div class="kv" style="margin-top:14px"><span class="h">Blätter</span><span class="h num">zuletzt</span><span class="h num">Versuche</span>${shs.map(x=>{const A=DB.attempts.filter(a=>a.sid===s.id&&a.sheetId===x.id).sort((a,b)=>b.date.localeCompare(a.date));return`<span>${esc(x.title)}</span><span class="num">${A[0]?A[0].score+"/"+A[0].total:"–"}</span><span class="num">${A.length}</span>`}).join("")}</div>`:""}
  </section>

  <section class="block"><div class="bh"><h2>Noten</h2><div class="row"><button class="btn ghost small" data-act="addExam">+ Note</button><button class="btn ghost small" data-act="addReport">+ Zeugnis</button></div></div>
    <div class="kv"><span class="h">Fach</span><span class="h num">Ø Arbeiten</span><span class="h num">Zeugnis</span>${s.subjects.map(sub=>subjRow(s,sub)).join("")}</div>
    ${exs.length||s.reports.length?`<details style="margin-top:12px"><summary class="small muted" style="cursor:pointer;min-height:32px;display:flex;align-items:center">Alle Einträge (${exs.length+s.reports.length})</summary>
      <div class="log" style="margin-top:8px">${exs.map(e=>`<div><span class="dt">${fdate(e.date)}</span><span class="tx">${esc(e.subject)} · ${esc(e.kind)}${e.topic?`<small>${esc(e.topic)}</small>`:""}</span><span class="row" style="gap:6px"><span class="gr ${gcls(gval(e.grade))}">${esc(e.grade)}</span>${delBtn("exam",e.id)}</span></div>`).join("")}
      ${s.reports.map(r=>`<div><span class="dt">${fdate(r.date)}</span><span class="tx">Zeugnis ${esc(r.label)}<small>${Object.entries(r.grades).map(([k,v])=>`${esc(k)} ${esc(v)}`).join(" · ")}</small></span>${delBtn("report",r.id)}</div>`).join("")}</div></details>`:""}
  </section>

  <section class="block"><div class="bh"><h2>${lern(s)?"Lernzeit":"Hausaufgaben"}</h2><button class="btn ghost small" data-act="addLog">+ Eintrag</button></div>
    ${logs.length?`<div class="log">${logs.slice(0,ui.allLogs?99:5).map(l=>`<div><span class="dt">${fdate(l.date)}</span><span class="tx">${esc(l.subject)} · ${esc(l.kind)}${l.note?`<small>${esc(l.note)}</small>`:""}</span><span class="row" style="gap:6px"><span class="st ${stc[l.status]||""}">${esc(l.status)}</span>${delBtn("log",l.id)}</span></div>`).join("")}</div>${logs.length>5&&!ui.allLogs?`<button class="btn ghost small" data-act="allLogs" style="margin-top:10px">Alle ${logs.length} zeigen</button>`:""}`:`<p class="note2">Noch nichts eingetragen.</p>`}
  </section>

  <section class="block"><div class="bh"><h2>Einschätzung</h2></div>
    <div class="f" style="margin-bottom:8px">Stärken</div>
    <div class="tags">${s.strengths.map((t,i)=>`<span class="tag">${esc(t)}<button data-act="delTag" data-k="strengths" data-v="${i}" aria-label="Entfernen">×</button></span>`).join("")}<button class="tag add" data-act="addTag" data-k="strengths">+ Stärke</button></div>
    <div class="f" style="margin:14px 0 8px">Schwächen</div>
    <div class="tags">${s.focus.map((t,i)=>`<span class="tag">${esc(t)}<button data-act="delTag" data-k="focus" data-v="${i}" aria-label="Entfernen">×</button></span>`).join("")}<button class="tag add" data-act="addTag" data-k="focus">+ Schwäche</button></div>
    <div class="f" style="margin:14px 0 8px">Notizen fürs Team</div>
    <textarea id="note" class="note" placeholder="Was hilft, worauf achten, Absprachen mit den Eltern …">${esc(s.note)}</textarea>
  </section>

  <details class="block"><summary>Stundenplan der Schule</summary>
    <div class="brush"><button data-act="brush" data-v="" aria-pressed="${ui.brush===""}">Leeren</button>${palette.map(x=>`<button data-act="brush" data-v="${esc(x)}" aria-pressed="${ui.brush===x}">${esc(x)}</button>`).join("")}</div>
    <div class="tt"><div></div>${DAYS.map(d=>`<div class="h">${d}</div>`).join("")}${cells}</div>
  </details>

  ${memberBlock(s)}
  ${docsBlock(s)}

  <section class="block"><div class="bh"><h2>Zugang</h2><button class="btn ghost small" data-act="editStudent">Bearbeiten</button></div>
    <div class="row" style="justify-content:space-between"><span class="note2">Schüler-Code</span><span class="codebig">${esc(s.code)}</span></div>
  </section>`;
}
function delBtn(k,id){return ui.confirm===k+id?`<button class="btn warn small" data-act="del" data-k="${k}" data-v="${id}">Löschen</button>`:`<button class="btn ghost small" data-act="ask" data-k="${k}" data-v="${id}" aria-label="Löschen" style="padding:6px 10px;background:none;color:var(--muted)">×</button>`}

function memberBlock(s){
  const M=s.member||{},Gd=s.guardian||{},f=fee(M),end=termEnd(M);
  if(!M.term&&!Gd.name&&!Gd.phone)return`<section class="block"><div class="bh"><h2>Mitgliedschaft</h2><button class="btn ghost small" data-act="editStudent">Eintragen</button></div></section>`;
  return`<section class="block"><div class="bh"><h2>Mitgliedschaft</h2><button class="btn ghost small" data-act="editStudent">Ändern</button></div>
    <div class="kv kv2"><span>Beitrag</span><span class="num"><b>${f!=null?f+" €":"–"}</b> / Monat</span>
    <span>Laufzeit</span><span class="num">${M.term==="schuljahr"?"Schuljahr":M.term==="halbjahr"?"Schulhalbjahr":"–"}${M.start?" ab "+ymLabel(M.start):""}</span>
    ${end?`<span>Bis</span><span class="num">${ymLabel(end)}${M.term==="schuljahr"?" · Juli frei":""}</span>`:""}
    ${Gd.name||Gd.phone?`<span>Eltern</span><span class="num">${esc(Gd.name||"")}${Gd.phone?`<br><a href="tel:${esc(Gd.phone.replace(/\s+/g,""))}">${esc(Gd.phone)}</a>`:""}</span>`:""}</div>
  </section>`;
}
function docsBlock(s){
  const L=DB.docs.filter(d=>d.sid===s.id).sort((a,b)=>b.date.localeCompare(a.date));
  const miss=!L.some(d=>d.kind==="Vertrag");
  return`<section class="block"><div class="bh"><h2>Unterlagen</h2><button class="btn ghost small" data-act="addDoc">+ Hochladen</button></div>
    ${CLOUD&&!DB.docsReady?`<p class="note2">Skript 04 fehlt noch.</p>`:""}
    ${L.length?`<div class="list" style="padding:0;background:none">${L.map(d=>`<button class="item" data-act="openDoc" data-v="${d.id}" data-hold="doc:${d.id}">${/pdf/.test(d.mime)?ibadge("pdf","--de"):ibadge("img","--c3")}<span class="t">${esc(d.kind)}</span><span class="r small">${fdate(d.date)} ›</span><span class="d">${esc(d.name)}</span></button>`).join("")}</div>`:""}
    ${miss?`<span class="chip warnc"${L.length?' style="margin-top:8px"':""}>Vertrag fehlt</span>`:""}
  </section>`;
}
async function uploadDoc(){
  const sh=ui.sheet,s=cur(),f=$("#up-file").files[0]||sh.file,name=($("#up-name").value.trim()||f?.name||"").slice(0,120);
  if(!f){sh.err="Bitte eine Datei auswählen.";render();return}
  if(f.size>10*1024*1024){sh.err="Die Datei ist größer als 10 MB.";render();return}
  if(!/pdf|png|jpe?g|heic/i.test(f.type||f.name)){sh.err="Bitte PDF, JPG oder PNG wählen.";render();return}
  const doc={id:uid(),sid:s.id,kind:sh.d.kind,name,mime:f.type||"application/octet-stream",size:f.size,date:today()};
  if(!CLOUD){if(f.size>1.5*1024*1024){toast("In der Vorschau wird nur der Eintrag gespeichert");doc.data=null}else doc.data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(f)});
    DB.docs.push(doc);save();ui.sheet=null;toast(doc.kind+" gespeichert");render();return}
  ui.busy=true;render();
  const path=`${s.id}/${doc.id}-${f.name.replace(/[^A-Za-z0-9._-]/g,"_").slice(-60)}`;
  const up=await sb.storage.from("docs").upload(path,f,{contentType:doc.mime,upsert:false});
  if(up.error){ui.busy=false;sh.err="Hochladen hat nicht geklappt. "+(DB.docsReady?"Prüfe dein Internet.":"Skript 04 fehlt noch.");render();return}
  const ins=await sb.from("documents").insert({student_id:s.id,kind:doc.kind,name,path,mime:doc.mime,size:f.size}).select("id,created_at").single();
  ui.busy=false;
  if(ins.error){sb.storage.from("docs").remove([path]);sh.err="Speichern hat nicht geklappt.";render();return}
  DB.docs.push({...doc,id:ins.data.id,path,date:ins.data.created_at.slice(0,10)});ui.sheet=null;toast(doc.kind+" gespeichert");render();
}
/* Hinweise oben im Lehrerbereich: eigener Einsatz, offene Termine, fehlende Verträge */
function times(e){const m=(e.time||"").match(/(\d{1,2})[:.](\d{2})\D+(\d{1,2})[:.](\d{2})/);if(!m)return null;const d=new Date(e.date+"T00:00");const a=new Date(d),b=new Date(d);a.setHours(+m[1],+m[2]);b.setHours(+m[3],+m[4]);return{a,b}}
function hints(){
  const H=[],now=new Date(),in7=addDays(today(),7),meId=DB.me;
  const mine=DB.duty.entries.filter(e=>e.who.includes(meId)&&e.date>=today()&&e.date<=in7).sort((a,b)=>a.date.localeCompare(b.date));
  mine.forEach(e=>{const t=times(e);let txt;
    if(e.date===today()&&t){const min=Math.round((t.a-now)/60000),end=Math.round((t.b-now)/60000);
      txt=min>60?`Heute bist du dran, ab ${e.time.split(/[–-]/)[0]}`:min>0?`Heute: beginnt in ${min} Minuten`:end>0?`Läuft gerade, endet in ${end} Minuten`:null}
    else txt=`Diese Woche bist du dran: ${wday(e.date)} ${fdate(e.date)}, ${e.time}`;
    if(txt)H.push({k:"term",v:e.id,t:txt,c:"me"})});
  DB.duty.entries.filter(e=>!e.who.length&&e.date>=today()&&e.date<=in7&&(lead()||e.grp===me().group)).forEach(e=>H.push({k:"term",v:e.id,t:`${wday(e.date)} ${fdate(e.date)} (${GROUPS[e.grp].label}): noch niemand eingetragen`,c:"open"}));
  const noV=visible().filter(s=>!DB.docs.some(d=>d.sid===s.id&&d.kind==="Vertrag"));
  if(noV.length)H.push({k:noV.length===1?"stu":"none",v:noV[0].id,t:noV.length===1?`Vertrag von ${noV[0].first} fehlt noch`:`${noV.length} Schüler ohne Vertrag`,c:"doc"});
  return H;
}
function hintsBlock(){const H=hints();if(!H.length)return"";
  return`<div class="hints">${H.map(h=>`<button class="hint ${h.c}" data-act="hint" data-k="${h.k}" data-v="${h.v}"><i></i><span>${esc(h.t)}</span><span class="r">›</span></button>`).join("")}</div>`}
/* Kalenderdatei: iPhone und Android erinnern dann von selbst (1 Stunde vorher und 30 Minuten vor Ende) */
function downloadIcs(list,title){
  if(!list.length){toast("Keine Termine");return}
  const pad=n=>String(n).padStart(2,"0"),f=d=>`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const ev=list.map(e=>{const t=times(e)||{a:new Date(e.date+"T16:30"),b:new Date(e.date+"T19:30")};const who=e.who.map(id=>DB.teachers.find(x=>x.id===id)?.name).filter(Boolean).join(", ");
    return["BEGIN:VEVENT","UID:"+e.id+"@kt-schule","DTSTAMP:"+f(new Date()),"DTSTART:"+f(t.a),"DTEND:"+f(t.b),"SUMMARY:KT Schule – "+GROUPS[e.grp].label+(who?" ("+who+")":""),"LOCATION:Homberger Straße 3\\, 47119 Duisburg",
      "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Beginnt in 1 Stunde","TRIGGER:-PT60M","END:VALARM","BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Endet in 30 Minuten","TRIGGER;RELATED=END:-PT30M","END:VALARM","END:VEVENT"].join("\r\n")});
  const txt=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//KT Schule//DE","CALSCALE:GREGORIAN",...ev,"END:VCALENDAR"].join("\r\n");
  try{const url=URL.createObjectURL(new Blob([txt],{type:"text/calendar"}));const a=document.createElement("a");a.href=url;a.download=title.replace(/\s+/g,"-")+".ics";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
  catch(e){toast("Kalender konnte nicht erstellt werden")}
  if(!CLOUD)toast("In der Vorschau gesperrt, in der echten App klappt es");
}

function removeStudent(s){
  const i=DB.students.indexOf(s);DB.students.splice(i,1);HOLD.add(s.id);ui.sheet=null;ui.sid=null;save();
  undoToast(s.first+" entfernt",()=>{DB.students.splice(i,0,s);HOLD.delete(s.id);save()},()=>{HOLD.delete(s.id);save()});
}
function removeSheet(id){
  const i=DB.sheets.findIndex(x=>x.id===id),x=DB.sheets[i],att=DB.attempts.filter(a=>a.sheetId===id);
  DB.sheets.splice(i,1);DB.attempts=DB.attempts.filter(a=>a.sheetId!==id);HOLD.add(id);save();
  undoToast("Blatt gelöscht",()=>{DB.sheets.splice(i,0,x);DB.attempts.push(...att);HOLD.delete(id);save()},()=>{HOLD.delete(id);save()});
}
function removeTerm(id){
  const i=DB.duty.entries.findIndex(x=>x.id===id),x=DB.duty.entries[i];DB.duty.entries.splice(i,1);save();
  undoToast("Termin gelöscht",()=>{DB.duty.entries.splice(i,0,x);save()});
}
function removeDoc(id){
  const i=DB.docs.findIndex(y=>y.id===id),x=DB.docs[i];DB.docs.splice(i,1);if(!CLOUD)save();
  undoToast("Unterlage gelöscht",()=>{DB.docs.splice(i,0,x);if(!CLOUD)save()},()=>{if(CLOUD){sb.storage.from("docs").remove([x.path]);sb.from("documents").delete().eq("id",x.id).then(r=>{if(r.error)toast("Löschen hat nicht geklappt")})}});
}
/* Schnellaktionen: Gedrückthalten oder „⋯“ */
function menuItems(k,id){
  if(k==="student"){const s=DB.students.find(x=>x.id===id);return s?{title:s.first+" "+s.last,items:[["Öffnen","open",id],["Bearbeiten","mEdit",id],["Entfernen","mDelStudent",id,1]]}:null}
  if(k==="term"){const e=DB.duty.entries.find(x=>x.id===id);return e?{title:wday(e.date)+" "+fdate(e.date),items:[["Bearbeiten","editTerm",id],["In den Kalender","ics",id],["Löschen","mDelTerm",id,1]]}:null}
  if(k==="task"){const x=DB.sheets.find(y=>y.id===id);return x?{title:x.title,items:[["Bearbeiten","editTask",id],["Löschen","mDelTask",id,1]]}:null}
  if(k==="doc"){const x=DB.docs.find(y=>y.id===id);return x?{title:x.kind,items:[["Öffnen","openDoc",id],["Löschen","mDelDoc",id,1]]}:null}
  return null;
}
let holdT=null,holdEl=null,holdFired=false,holdXY=null;
document.addEventListener("pointerdown",e=>{holdFired=false;const el=e.target.closest("[data-hold]");if(!el||e.button>0)return;holdEl=el;holdFired=false;holdXY=[e.clientX,e.clientY];el.classList.add("pressing");
  holdT=setTimeout(()=>{holdFired=true;el.classList.remove("pressing");navigator.vibrate?.(12);const [k,id]=el.dataset.hold.split(":");const m=menuItems(k,id);if(m){ui.sheet={type:"menu",m};render()}},480)});
const holdEnd=()=>{clearTimeout(holdT);holdEl?.classList.remove("pressing");holdEl=null};
document.addEventListener("pointerup",holdEnd);document.addEventListener("pointercancel",holdEnd);
document.addEventListener("pointermove",e=>{if(holdEl&&holdXY&&Math.hypot(e.clientX-holdXY[0],e.clientY-holdXY[1])>10)holdEnd()});
document.addEventListener("contextmenu",e=>{if(e.target.closest("[data-hold]"))e.preventDefault()});
document.addEventListener("click",e=>{if(holdFired){holdFired=false;e.stopPropagation();e.preventDefault()}},true);
/* Schutz: Fehler zeigen statt weißer Seite, nichts Ungespeichertes verlieren */
window.addEventListener("error",()=>toast("Da hat etwas nicht geklappt. Deine Daten sind sicher."));
window.addEventListener("unhandledrejection",()=>toast("Keine Verbindung. Wird gleich erneut versucht."));
window.addEventListener("beforeunload",e=>{if(CLOUD&&dirty){e.preventDefault();e.returnValue=""}});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&CLOUD&&dirty){clearTimeout(pushTimer);push()}});

/* ---------- Lehrkräfte: Aufgaben ---------- */
function viewTasks(){
  const S=DB.sheets.filter(x=>lead()||x.groups.includes(me().group));
  const studs=visible();
  return`${!TASKS_OPEN?`<div class="hint" style="margin-bottom:14px;cursor:default"><i style="background:var(--c2)"></i><span>Nur für dich sichtbar. Alle anderen sehen „Bald da“.</span></div>`:""}<div class="headwrap"><div class="head"><h1>Aufgaben</h1><button class="btn small" data-act="newTask">Neues Blatt</button></div></div>
  <div class="sect"><span>Eigene Blätter</span></div>
  ${S.length?`<div class="list">${S.map(x=>{const who=studs.filter(s=>sheetFits(x,s)),did=who.filter(s=>DB.attempts.some(a=>a.sid===s.id&&a.sheetId===x.id)).length;
    return`<button class="item" data-act="editTask" data-v="${x.id}" data-hold="task:${x.id}">${badge(x.subject)}<span class="t">${esc(x.title)}</span><span class="r"><span class="chip">${did}/${who.length}</span>›</span><span class="d">${esc(x.subject)} · Klasse ${x.minK}–${x.maxK}</span></button>`}).join("")}</div>`:`<div class="block empty">Noch keine eigenen Blätter.</div>`}
  <div class="sect"><span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">Themen ${info("top","Erzeugen immer neue Aufgaben. Ihr wählt sie beim Schüler als Förderziel.")}</span></div>
  <div class="list">${Object.entries(TOPICS).map(([k,t])=>`<div class="item">${badge(t.s)}<span class="t">${esc(t.n)}</span><span class="r small">Kl. ${t.k[0]}–${t.k[1]}</span><span class="d">${t.s}</span></div>`).join("")}</div>`;
}

/* ---------- Lehrkräfte: Plan und Team ---------- */
const comesTo=(e)=>{const wd=["So","Mo","Di","Mi","Do","Fr","Sa"][new Date(e.date+"T12:00").getDay()];return DB.students.filter(s=>s.group===e.grp&&(s.come||[]).includes(wd))};
function termRow(e,past){
  const ppl=e.who.map(id=>DB.teachers.find(t=>t.id===id)).filter(Boolean),kids=comesTo(e);
  return`<button class="term${past?" past":""}" data-act="editTerm" data-v="${e.id}" data-hold="term:${e.id}"><span class="day"><small>${wday(e.date)}</small><b>${new Date(e.date+"T12:00").getDate()}.</b></span>
    <span class="who">${ppl.length?ppl.map(t=>`<span class="pp g-${t.group}"><i>${esc(t.name[0])}</i>${esc(t.name)}</span>`).join(""):'<span class="open">Noch offen</span>'}</span><span class="r">›</span>
    <span class="sub">${lead()?GROUPS[e.grp].label+" · ":""}${esc(e.time.split(/[–-]/)[0])} · ${kids.length?kids.map(k=>esc(k.first)).join(", "):"–"}</span></button>`;
}
function viewPlan(){
  const all=[...DB.duty.entries].filter(e=>lead()||e.grp===me().group).sort((a,b)=>a.date.localeCompare(b.date));
  const icsBtn=all.some(e=>e.date>=today()&&e.who.includes(DB.me))?`<button class="btn ghost small" data-act="icsMine">Alle meine Termine in den Kalender</button>`:"";
  const up=all.filter(e=>e.date>=today()),past=all.filter(e=>e.date<today()).reverse().slice(0,6);
  const mine=up.find(e=>e.who.includes(DB.me));
  let html="",lastM="";
  up.forEach(e=>{const m=new Date(e.date+"T12:00").toLocaleDateString("de-DE",{month:"long"});if(m!==lastM){if(lastM)html+=`</div>`;html+=`<div class="wk">${m}</div><div class="list">`;lastM=m}html+=termRow(e)});
  if(lastM)html+=`</div>`;
  return`<div class="headwrap"><div class="head"><h1>Plan</h1><button class="btn small" data-act="newTerm">Termin</button></div></div>
  ${up.length?html:`<div class="block empty">Keine Termine geplant. Tippe auf „Termin“.</div>`}
  ${icsBtn?`<div class="row" style="margin-top:12px">${icsBtn}</div>`:""}
  ${past.length?`<details class="block" style="margin-top:12px"><summary>Vergangene Termine</summary><div>${past.map(e=>termRow(e,1)).join("")}</div></details>`:""}
  <div class="sect"><span>Team</span></div>
  ${CLOUD&&lead()&&DB.teamCode?`<div class="block row" style="justify-content:space-between"><span class="infoline">Teamcode ${info("tc3","Neue Lehrkräfte geben ihn bei der Registrierung ein. Ändern sperrt den alten Code.")}</span><span class="row" style="gap:8px"><span class="codebig">${esc(DB.teamCode)}</span><button class="btn ghost small" data-act="newCode">Ändern</button></span></div>`:""}
  <div class="list">${DB.teachers.map(t=>`<button class="item" data-act="teacher" data-v="${t.id}" ${lead()?"":"disabled"}>${av(t.name,t.group)}<span class="t">${esc(t.name)}${t.id===DB.me?' <span class="small muted">(du)</span>':""}</span><span class="r">${lead()?"›":""}</span><span class="d">${GROUPS[t.group].label}</span></button>`).join("")}
  ${DB.invites.map(i=>`<div class="item">${ibadge("mail","--c3")}<span class="t">${esc(i.name)}</span><span class="r">${delBtn("invite",i.email)}</span><span class="d">eingeladen · ${esc(i.email)} · ${GROUPS[i.grp].label}</span></div>`).join("")}</div>
  <div class="row" style="justify-content:center;margin-top:18px"><button class="btn ghost small" data-act="logout">${CLOUD?"Abmelden":"Beenden"}</button></div>`;
}

/* ---------- Blätter von unten (alle Formulare) ---------- */
function opt(list,sel){return list.map(x=>{const [v,l]=Array.isArray(x)?x:[x,x];return`<option value="${esc(v)}" ${v==sel?"selected":""}>${esc(l)}</option>`}).join("")}
function choice(act,list,sel,attrs=""){return`<div class="choice" role="group">${list.map(x=>{const [v,l]=Array.isArray(x)?x:[x,x];return`<button type="button" data-act="${act}" data-v="${esc(v)}" aria-pressed="${Array.isArray(sel)?sel.includes(v):sel===v}" ${attrs}>${esc(l)}</button>`}).join("")}</div>`}
function renderSheet(){
  const L=$("#layer"),sh=ui.sheet;if(!sh){L.innerHTML="";return}
  const s=cur(),d=sh.d||{};let body="";
  const head=(t)=>`<div class="bh"><h2>${t}</h2><button class="btn ghost small" data-act="close">Schließen</button></div>`;
  const err=sh.err?`<div class="err">${esc(sh.err)}</div>`:"";
  if(sh.type==="student"){const lock=!lead(),m=k=>(sh.miss||[]).includes(k)?" miss":"",M=d.member||{},Gd=d.guardian||{},f=fee(M),end=termEnd(M);
    body=head(sh.isNew?"Schüler hinzufügen":"Schüler bearbeiten")+`
      <section class="fset"><h3>Kind</h3><div class="fg">
        <label class="f req${m("first")}">Vorname<input id="s-first" value="${esc(d.first)}" autocomplete="off"></label>
        <label class="f req${m("last")}">Nachname<input id="s-last" value="${esc(d.last)}" autocomplete="off"></label>
        <label class="f">Geburtsdatum<input id="s-birth" type="date" value="${esc(d.birth||"")}"></label>
        <label class="f">Gruppe<select id="s-grp" ${lock?"disabled":""}>${opt([["jungs","Jungs"],["maedchen","Mädchen"]],d.group)}</select></label></div></section>
      <section class="fset"><h3>Schule</h3><div class="fg">
        <label class="f">Klasse<select id="s-kl">${opt(Array.from({length:13},(_,i)=>i+1),d.klasse)}</select></label>
        <label class="f">Name der Schule<input id="s-schule" value="${esc(d.schule)}" autocomplete="off"></label></div>
        <div class="f req${m("schulform")}">Schulform${choice("sForm",SCHULFORMEN,d.schulform)}</div>
        <div class="f req${m("subjects")}">Fächer${choice("sSub",SUBJECTS,d.subjects)}</div></section>
      <section class="fset"><h3>Mitgliedschaft</h3>
        <div class="f req${m("come")}">Kommt am${choice("sCome",COME,d.come)}</div>
        <div class="f req${m("days")}">Pro Woche${choice("mDays",[[1,"1× pro Woche"],[2,"2× pro Woche"]],M.days)}</div>
        <div class="f">Geschwister${choice("mSib",[[1,"1. Kind"],[2,"2. Kind"],[3,"3. Kind +"]],M.sib||1)}</div>
        <div class="f req${m("term")}">Laufzeit${choice("mTerm",[["halbjahr","Schulhalbjahr"],["schuljahr","Schuljahr"]],M.term)}</div>
        <label class="f">Beginn ab<input id="m-start" type="month" value="${esc(M.start||curYm())}"></label>
        <div class="sum"><span>Beitrag</span><b>${f!=null?f+" € / Monat":"–"}</b>${end?`<small>bis ${ymLabel(end)}${M.term==="schuljahr"?" · Juli beitragsfrei":""} · danach monatlich kündbar</small>`:""}</div></section>
      <section class="fset"><h3>Erziehungsberechtigte</h3><div class="fg">
        <label class="f">Name<input id="g-name" value="${esc(Gd.name||"")}" autocomplete="off"></label>
        <label class="f">Telefon<input id="g-phone" type="tel" value="${esc(Gd.phone||"")}" autocomplete="off"></label></div>
        <label class="f">E-Mail<input id="g-mail" type="email" value="${esc(Gd.email||"")}" autocomplete="off"></label></section>
      ${err}
      <div class="row" style="justify-content:space-between"><button class="btn" data-act="saveStudent">${sh.isNew?"Hinzufügen":"Speichern"}</button>${sh.isNew?"":ui.confirm==="student"?`<button class="btn warn" data-act="delStudent">Wirklich entfernen</button>`:`<button class="btn warn" data-act="ask" data-k="student" data-v="">Entfernen</button>`}</div>`}
  if(sh.type==="exam")body=head("Note eintragen")+`<div class="fg"><label class="f">Fach<select id="e-sub">${opt(s.subjects)}</select></label><label class="f">Art<select id="e-kind">${opt(["Klassenarbeit","Test","Mündlich","Referat"])}</select></label>
    <label class="f">Datum<input id="e-date" type="date" value="${today()}"></label><label class="f">Note<select id="e-grade">${opt(GRADES,"3")}</select></label></div>
    <label class="f">Thema<input id="e-topic" autocomplete="off"></label><button class="btn wide" data-act="saveExam">Speichern</button>`;
  if(sh.type==="report")body=head("Zeugnis eintragen")+`<div class="fg"><label class="f">Bezeichnung<input id="r-label" value="Halbjahr ${s.klasse}.1"></label><label class="f">Datum<input id="r-date" type="date" value="${today()}"></label></div>
    <div class="fg">${s.subjects.map((sub,i)=>`<label class="f">${esc(sub)}<select id="r-g${i}"><option value="">–</option>${opt(["1","2","3","4","5","6"])}</select></label>`).join("")}</div><button class="btn wide" data-act="saveReport">Speichern</button>`;
  if(sh.type==="log")body=head(lern(s)?"Lernzeit eintragen":"Hausaufgaben eintragen")+`<div class="fg"><label class="f">Datum<input id="l-date" type="date" value="${today()}"></label><label class="f">Fach<select id="l-sub">${opt([...new Set([...s.subjects,...SUBJECTS])])}</select></label></div>
    <div class="f">Art${choice("lKind",[lern(s)?"Lernzeit-Aufgaben":"Hausaufgaben","Nacharbeit","Vorbereitung Klassenarbeit"],d.kind)}</div>
    <label class="f">Was?<input id="l-note" autocomplete="off"></label>
    <div class="f">Stand${choice("lStat",["erledigt","teilweise","nicht geschafft"],d.status)}</div><button class="btn wide" data-act="saveLog">Speichern</button>`;
  if(sh.type==="tag")body=head(sh.k==="strengths"?"Stärke ergänzen":"Schwäche ergänzen")+`<form id="ftag"><label class="f">Stichwort<input id="t-val" placeholder="${sh.k==="strengths"?"z. B. Kopfrechnen":"z. B. Textaufgaben"}" autocomplete="off"></label></form><button class="btn wide" data-act="saveTag">Hinzufügen</button>`;
  if(sh.type==="goal"){const g=s.goals||[];const L2=Object.keys(TOPICS).filter(t=>!g.includes(t)).sort((a,b)=>fits(b,s.klasse)-fits(a,s.klasse));
    body=head("Förderziel")+`<div class="list" style="background:var(--fill)">${L2.map(t=>`<button class="item" data-act="pickGoal" data-v="${t}">${badge(TOPICS[t].s)}<span class="t">${esc(TOPICS[t].n)}</span><span class="r">${fits(t,s.klasse)?"":'<span class="chip">andere Klasse</span>'}</span><span class="d">${TOPICS[t].s}</span></button>`).join("")}</div>`}
  if(sh.type==="term"){const ppl=DB.teachers.filter(t=>side(t)===d.grp);
    body=head(sh.isNew?"Termin anlegen":"Termin")+`<div class="fg"><label class="f">Datum<input id="tm-date" type="date" value="${esc(d.date)}"></label><label class="f">Uhrzeit<input id="tm-time" value="${esc(d.time)}"></label></div>
      <div class="f">Gruppe${choice("tmGrp",[["jungs","Jungs"],["maedchen","Mädchen"]],d.grp,lead()?"":"disabled")}</div>
      <div class="f">Wer ist da?${ppl.length?choice("tmWho",ppl.map(t=>[t.id,t.name]),d.who):'<span class="note2">Für diese Gruppe ist noch niemand im Team.</span>'}</div>
      <label class="f">Notiz<input id="tm-note" value="${esc(d.note)}" autocomplete="off"></label>
      ${sh.isNew?`<div class="qedit"><label class="check"><input type="checkbox" id="tm-rep" ${d.rep?"checked":""} data-act="tmRep">Jede Woche wiederholen</label>
        ${d.rep?`<label class="f">Wie viele Wochen?<select id="tm-n">${opt([2,3,4,6,8,10,12],d.n||6)}</select></label>${d.who.length>1?`<label class="check"><input type="checkbox" id="tm-alt" ${d.alt?"checked":""}>Abwechseln</label>`:""}`:""}</div>`:""}
      ${sh.isNew?"":`<button class="btn ghost" data-act="ics" data-v="${sh.id}">In den Kalender</button>`}
      ${err}<div class="row" style="justify-content:space-between"><button class="btn" data-act="saveTerm">Speichern</button>${sh.isNew?"":ui.confirm==="term"?`<button class="btn warn" data-act="delTerm">Wirklich löschen</button>`:`<button class="btn warn" data-act="ask" data-k="term" data-v="">Löschen</button>`}</div>`}
  if(sh.type==="task"){const lock=!lead();
    body=head(sh.isNew?"Neues Blatt":"Blatt bearbeiten")+`<div class="f">Fach${subjPick("tkSub",d.subject,true)}${sh.addSubj?`<div class="adder"><input id="ns-name" placeholder="Name des Fachs" autocomplete="off"><button class="btn small" data-act="saveSubj">Hinzufügen</button></div>`:""}</div>
      <div class="fg"><label class="f">Titel<input id="tk-title" value="${esc(d.title)}" placeholder="z. B. Vokabeln Unit 3" autocomplete="off"></label><label class="f">Ab Klasse<select id="tk-min">${opt(Array.from({length:10},(_,i)=>i+1),d.minK)}</select></label><label class="f">Bis Klasse<select id="tk-max">${opt(Array.from({length:10},(_,i)=>i+1),d.maxK)}</select></label></div>
      <div class="f">Für${choice("tkGroup",[["jungs","Jungs"],["maedchen","Mädchen"]],d.groups,lock?"disabled":"")}</div>
      ${d.items.map((it,i)=>`<div class="qedit"><div class="bh"><b>Aufgabe ${i+1}</b><div class="row"><div class="seg">${[["input","Eintippen"],["choice","Auswählen"]].map(([k,l])=>`<button type="button" data-act="tkType" data-i="${i}" data-v="${k}" aria-pressed="${it.type===k}">${l}</button>`).join("")}</div>${d.items.length>1?`<button class="btn ghost small" data-act="tkDel" data-i="${i}" aria-label="Aufgabe löschen" style="background:none;color:var(--muted)">×</button>`:""}</div></div>
        <label class="f">Frage<input id="ti-q${i}" value="${esc(it.q)}" autocomplete="off"></label>
        ${it.type==="choice"?`<label class="f"><span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">Antworten ${info("ans"+i,"Eine pro Zeile, die richtige mit * vorne.")}</span><textarea id="ti-o${i}" rows="3">${esc(it.optText)}</textarea></label>`:`<label class="f"><span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">Lösung ${info("sol"+i,"Weitere Schreibweisen mit | trennen.")}</span><input id="ti-a${i}" value="${esc(it.ansText)}" autocomplete="off"></label>`}</div>`).join("")}
      <button class="btn ghost" data-act="tkAdd">+ Aufgabe</button>${err}
      <div class="row" style="justify-content:space-between"><button class="btn" data-act="tkSave">${sh.isNew?"Veröffentlichen":"Speichern"}</button>${sh.isNew?"":ui.confirm==="task"?`<button class="btn warn" data-act="tkRemove">Wirklich löschen</button>`:`<button class="btn warn" data-act="ask" data-k="task" data-v="">Löschen</button>`}</div>`}
  if(sh.type==="teacher"){const t=DB.teachers.find(x=>x.id===sh.id);
    const self=t.id===DB.me;
    body=head(esc(t.name))+`<div class="f">Gruppe${self?`<span style="font-weight:500;color:var(--ink)">${GROUPS[t.group].label}</span>`:choice("tGrp",[["jungs","Jungs"],["maedchen","Mädchen"],["leitung","Leitung"]],t.group)}</div>
      ${t.group==="leitung"?`<div class="f">Bei Terminen einsetzbar für${choice("tSide",[["jungs","Jungs (Lehrer)"],["maedchen","Mädchen (Lehrerin)"]],side(t))}</div>`:""}
      ${self?"":ui.confirm==="tdel"?`<button class="btn warn" data-act="delTeacher">Wirklich aus dem Team entfernen</button>`:`<button class="btn warn" data-act="ask" data-k="tdel" data-v="">Aus dem Team entfernen</button>`}`}
  if(sh.type==="upload")body=head("Hochladen")+`<div class="f">Art${choice("upKind",DOCKINDS,d.kind)}</div>
    <label class="f">PDF oder Foto<input id="up-file" type="file" accept="application/pdf,image/png,image/jpeg,image/heic"></label>
    <label class="f">Name (optional)<input id="up-name" autocomplete="off"></label>${err}
    <button class="btn wide" data-act="saveUpload" ${ui.busy?"disabled":""}>${ui.busy?"Lädt hoch …":"Hochladen"}</button>`;
  if(sh.type==="docview"){const x=DB.docs.find(y=>y.id===sh.id);
    body=head(esc(x.kind))+`<p class="note2" style="margin:0">${esc(x.name)} · ${fdate(x.date)}</p>
      ${sh.url&&/^image/.test(x.mime)?`<img src="${esc(sh.url)}" alt="${esc(x.name)}" style="border-radius:14px;width:100%">`:sh.url?`<a class="btn" href="${esc(sh.url)}" target="_blank" rel="noopener">PDF öffnen</a>`:`<p class="note2">${CLOUD?"Wird geladen …":"In der Vorschau lässt sich die Datei nicht öffnen. In der echten App öffnet sie sich hier."}</p>`}
      ${ui.confirm==="doc"?`<button class="btn warn" data-act="delDoc">Wirklich löschen</button>`:`<button class="btn warn" data-act="ask" data-k="doc" data-v="">Löschen</button>`}`}
  if(sh.type==="menu")body=`<div class="bh"><h2>${esc(sh.m.title)}</h2><button class="btn ghost small" data-act="close">Schließen</button></div><div class="menu">${sh.m.items.map(([l,act,id,danger])=>`<button class="${danger?"danger":""}" data-act="${act}" data-v="${id}">${l}</button>`).join("")}</div>`;
  if(sh.type==="invite")body=head("Einladen")+`<div class="infoline">${info("inv2","Danach legt die Person mit genau dieser E-Mail ein Konto an.")}</div>
    <div class="fg"><label class="f">Vorname<input id="iv-name" autocomplete="off"></label><label class="f">E-Mail<input id="iv-mail" type="email" autocomplete="off"></label></div>
    <div class="f">Gruppe${choice("ivGrp",[["jungs","Jungs"],["maedchen","Mädchen"],["leitung","Leitung"]],d.grp)}</div><button class="btn wide" data-act="saveInvite">Einladen</button>`;
  const keep=L.querySelector(".sheet")?.scrollTop||0;
  L.innerHTML=`<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true">${body}</div></div>`;
  if(keep)L.querySelector(".sheet").scrollTop=keep;
}
function readTask(){const d=ui.sheet.d;d.title=$("#tk-title").value.trim();d.minK=+$("#tk-min").value;d.maxK=+$("#tk-max").value;d.items.forEach((it,i)=>{it.q=$("#ti-q"+i).value;if(it.type==="choice")it.optText=$("#ti-o"+i).value;else it.ansText=$("#ti-a"+i).value})}
function unmiss(k,ok){const sh=ui.sheet;if(!sh?.miss)return;if(ok)sh.miss=sh.miss.filter(x=>x!==k);else if(!sh.miss.includes(k))sh.miss.push(k);if(!sh.miss.length)sh.err=""}
function readStudent(){const d=ui.sheet.d;d.first=$("#s-first").value.trim();d.last=$("#s-last").value.trim();d.birth=$("#s-birth").value;d.klasse=+$("#s-kl").value;if(!$("#s-grp").disabled)d.group=$("#s-grp").value;d.schule=$("#s-schule").value.trim();
  d.member=d.member||{};d.member.start=$("#m-start").value;d.guardian={name:$("#g-name").value.trim(),phone:$("#g-phone").value.trim(),email:$("#g-mail").value.trim()}}
/* Mitgliedschaft laut Vertrag: 1× pro Woche 40 €, 2× 70 €; Geschwisterbonus 5 € (2. Kind), 10 € (ab 3. Kind) */
const FEE={1:[40,35,30],2:[70,65,60]};
const fee=m=>m&&m.days&&m.sib?FEE[m.days][Math.min(m.sib,3)-1]:null;
const MONTHS=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const ymLabel=ym=>{if(!ym)return"";const [y,m]=ym.split("-").map(Number);return MONTHS[m-1]+" "+y};
/* Ende der Laufzeit: Schulhalbjahr bis Januar bzw. Juli, Schuljahr bis Juli (letzter Monat beitragsfrei) */
function termEnd(m){if(!m?.start||!m.term)return null;const [y,mo]=m.start.split("-").map(Number);
  if(m.term==="schuljahr")return(mo>=8?y+1:y)+"-07";
  return mo>=8?(y+1)+"-01":mo===1?y+"-01":y+"-07"}
const curYm=()=>today().slice(0,7);
function readTerm(){const d=ui.sheet.d;d.date=$("#tm-date").value;d.time=$("#tm-time").value.trim();d.note=$("#tm-note").value.trim();if($("#tm-n"))d.n=+$("#tm-n").value;if($("#tm-alt"))d.alt=$("#tm-alt").checked}
const toggle=(arr,v)=>{const i=arr.indexOf(v);i>=0?arr.splice(i,1):arr.push(v)};
const blankItem=type=>type==="choice"?{id:uid(),type,q:"",optText:"*\n"}:{id:uid(),type,q:"",ansText:""};
function saveTask(){
  readTask();const d=ui.sheet.d;
  if(!d.title)return"Bitte einen Titel eintragen.";if(d.minK>d.maxK)return"„Ab Klasse“ ist größer als „Bis Klasse“.";if(!d.groups.length)return"Bitte mindestens eine Gruppe wählen.";
  const items=[];
  for(const [i,it] of d.items.entries()){
    if(!it.q.trim())return`Aufgabe ${i+1}: Bitte eine Frage eintragen.`;
    if(it.type==="choice"){const lines=it.optText.split("\n").map(l=>l.trim()).filter(Boolean),stars=lines.filter(l=>l.startsWith("*")&&l.length>1);
      if(lines.length<2)return`Aufgabe ${i+1}: Bitte mindestens zwei Antworten eintragen.`;if(stars.length!==1)return`Aufgabe ${i+1}: Bitte genau eine Antwort mit * als richtig markieren.`;
      items.push({id:it.id,type:"choice",q:it.q.trim(),options:lines.map(l=>l.replace(/^\*\s*/,"")),correct:lines.findIndex(l=>l.startsWith("*"))})}
    else{const ans=it.ansText.split("|").map(a=>a.trim()).filter(Boolean);if(!ans.length)return`Aufgabe ${i+1}: Bitte die richtige Antwort eintragen.`;items.push({id:it.id,type:"input",q:it.q.trim(),answers:ans})}
  }
  const clean={id:d.id,subject:d.subject,title:d.title,minK:d.minK,maxK:d.maxK,groups:d.groups,items,created:d.created};
  const k=DB.sheets.findIndex(x=>x.id===d.id);if(k>=0)DB.sheets[k]=clean;else DB.sheets.push(clean);save();return null;
}

/* ---------- Bedienung ---------- */
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-act]");if(!a||a.disabled)return;
  const act=a.dataset.act,v=a.dataset.v,s=cur(),sh=ui.sheet,r=ui.run;
  if(act==="scrim"){if(e.target===a){ui.sheet=null;ui.confirm=null;render()}return}
  if(act!=="info")ui.info=null;
  if(!["ask","del","delStudent","delTerm","tkRemove","delTeacher","delDoc"].includes(act))ui.confirm=null;
  if(act==="open"||act==="editTerm"||act==="editTask"||act==="openDoc"||act==="ics")if(ui.sheet?.type==="menu")ui.sheet=null;
  switch(act){
    case"home":if(ui.mode==="student"){lsDel("kt-schule-code");STU=null;P=null}ui.mode="start";ui.run=null;ui.sheet=null;ui.sid=null;render(true);scrollTo(0,0);return;
    case"asStudent":{if(isTeacherDevice()){openPick();return}const c=lsGet("kt-schule-code");if(c){ui.mode="loading";render();stuLogin(c).then(ok=>{ui.mode=ok?"student":"code";ui.stab="home";render(true)}).catch(()=>{ui.mode="code";ui.codeErr="Keine Verbindung. Prüfe dein Internet.";render()});return}
      ui.mode="code";ui.codeErr="";render(true);$("#code")?.focus();return}
    case"asTeacher":ui.authErr="";ui.authMsg="";
      if(CLOUD&&loaded&&session&&DB.teachers.some(t=>t.id===DB.me)){ui.mode="teacher";render(true);refresh();return}
      enterTeacher();return;
    case"pickStu":watchStudent(v);return;
    case"stopWatch":ui.watch=false;STU=null;P=null;ui.run=null;ui.subj=null;ui.mode="pick";render(true);scrollTo(0,0);return;
    case"pfilter":ui.pfilter=v;break;
    case"asCode":ui.mode="code";ui.codeErr="";render(true);$("#code")?.focus();return;
    case"watchFromPage":watchStudent(v);return;
    case"toStart":if(ui.watch){ui.watch=false;STU=null;P=null}ui.mode="start";ui.sheet=null;ui.run=null;ui.subj=null;render(true);scrollTo(0,0);return;
    case"authGrp":if($("#au-name")){ui.authName=$("#au-name").value;ui.authCode=$("#au-code").value;ui.authMail=$("#au-mail").value}ui.authGrp=v;break;
    case"authToggle":ui.authUp=!ui.authUp;ui.authErr="";ui.authMsg="";break;
    case"authReset":{const m=$("#au-mail").value.trim();if(!m){ui.authErr="Trag oben deine E-Mail ein und tippe dann noch einmal auf „Passwort vergessen“.";break}
      sb.auth.resetPasswordForEmail(m,{redirectTo:location.origin+location.pathname}).then(x=>{ui.authMail=m;ui.authErr=x.error?authDe(x.error.message):"";ui.authMsg=x.error?"":"Wir haben dir einen Link zum Zurücksetzen geschickt.";render()});return}
    case"logout":lsDel("kt-schule-teacher");lsDel("kt-schule-lead");if(!CLOUD){ui.mode="start";render(true);return}sb.auth.signOut().then(()=>{session=null;loaded=false;DB.students=[];ui.mode="start";render(true)});return;
    case"retryWait":enterTeacher();return;
    /* Schüler */
    case"stab":ui.stab=v;ui.subj=null;render(true);scrollTo(0,0);return;
    case"subj":ui.stab="practice";ui.subj=v||null;render(true);scrollTo(0,0);return;
    case"startToday":start(ui.plan.flatMap(x=>x.items),"Übungsrunde von heute",{today:1});return;
    case"topic":start(Array.from({length:10},()=>({t:v,kind:TOPICS[v].kind,ctx:TOPICS[v].s+" · "+TOPICS[v].n,it:TOPICS[v].gen()})),TOPICS[v].n);return;
    case"sheetRun":{const x=SH.sheets.find(y=>y.id===v);start(sheetItems(x).map(y=>({...y,sheet:x.id})),x.title,{sheet:x.id});return}
    case"mix":{const L=myTopics();start(Array.from({length:20},()=>{const t=pick(L);return{t,kind:TOPICS[t].kind,ctx:TOPICS[t].s+" · "+TOPICS[t].n,it:TOPICS[t].gen()}}),"Schnelle Runde");return}
    case"wrongs":start(P.wrongs.slice(0,15).map(w=>({...w,rev:1})),"Fehler wiederholen");return;
    case"key":if(r.state)return;r.inp=v==="⌫"?r.inp.slice(0,-1):(r.inp+v).slice(0,8);render();return;
    case"check":{if(r.state)return;const x=r.q[r.i],g=x.kind==="text"?$("#tin").value.trim():r.inp;if(!g)return;r.inp=g;answer(g);return}
    case"opt":if(r.state)return;r.chosen=+v;answer(+v);return;
    case"next":next();return;
    case"quit":ui.run=null;render(true);return;
    case"finish":{const sheetIds=[...new Set(r.q.filter(x=>x.sheet).map(x=>x.sheet))];
      sheetIds.forEach(id=>{const firsts=r.q.filter(x=>x.sheet===id&&x.tries===0);const total=firsts.length;const score=r.sheetScores?.[id]??0;submitSheet(id,Math.min(score,total),total)});
      if(r.isToday){P.todayDone=today();saveP()}ui.run=null;ui.stab="home";render(true);scrollTo(0,0);return}
    /* Lehrkräfte */
    case"tab":ui.tab=v;ui.sid=null;render(true);scrollTo(0,0);return;
    case"filter":ui.filter=v;break;
    case"open":ui.sid=v;ui.allLogs=false;render(true);scrollTo(0,0);return;
    case"back":ui.sid=null;render(true);return;
    case"newStudent":ui.sheet={type:"student",isNew:1,d:{first:"",last:"",klasse:5,group:lead()?(ui.filter==="maedchen"?"maedchen":"jungs"):me().group,schulform:"",schule:"",come:[],subjects:["Deutsch","Englisch","Mathe"],member:{sib:1,start:curYm()},guardian:{}}};break;
    case"editStudent":ui.sheet={type:"student",d:JSON.parse(JSON.stringify(s))};break;
    case"sForm":readStudent();sh.d.schulform=v;unmiss("schulform",1);break;
    case"sCome":readStudent();toggle(sh.d.come,v);unmiss("come",sh.d.come.length);if(sh.d.come.length&&!sh.d.member.days){sh.d.member.days=Math.min(2,sh.d.come.length);unmiss("days",1)}break;
    case"mDays":readStudent();sh.d.member.days=+v;unmiss("days",1);break;
    case"mSib":readStudent();sh.d.member.sib=+v;break;
    case"mTerm":readStudent();sh.d.member.term=v;unmiss("term",1);break;
    case"sSub":readStudent();toggle(sh.d.subjects,v);unmiss("subjects",sh.d.subjects.length);break;
    case"saveStudent":{readStudent();const d=sh.d;
      sh.miss=[!d.first&&"first",!d.last&&"last",!d.schulform&&"schulform",!d.subjects.length&&"subjects",!(d.come||[]).length&&"come",!d.member?.days&&"days",!d.member?.term&&"term"].filter(Boolean);
      if(sh.miss.length){sh.err="Bitte die rot markierten Felder ausfüllen.";render();navigator.vibrate?.([10,40,10]);document.querySelector("#layer .miss")?.scrollIntoView({block:"center",behavior:"smooth"});return}
      sh.err="";
      if(sh.isNew){const n={id:uid(),code:newCode(),created:today(),note:"",strengths:[],focus:[],exams:[],reports:[],plan:{},log:[],goals:[],...d};DB.students.push(n);ui.sid=n.id;toast(d.first+" hinzugefügt")}
      else{Object.assign(s,{first:d.first,last:d.last,birth:d.birth,klasse:d.klasse,group:d.group,schule:d.schule,schulform:d.schulform,subjects:d.subjects,come:d.come,member:d.member,guardian:d.guardian});toast("Gespeichert")}
      ui.sheet=null;save();break}
    case"delStudent":removeStudent(s);break;
    case"ask":ui.confirm=a.dataset.k+(v||"");break;
    case"del":{const k=a.dataset.k;
      if(k==="invite"){sb.from("teacher_invites").delete().eq("email",v).then(x=>{if(x.error)toast("Löschen hat nicht geklappt")});DB.invites=DB.invites.filter(i=>i.email!==v);render();return}
      const arr={exam:"exams",report:"reports",log:"log"}[k];if(!arr)break;
      const i=s[arr].findIndex(x=>x.id===v),item=s[arr][i];s[arr].splice(i,1);save();
      undoToast("Gelöscht",()=>{s[arr].splice(i,0,item);save()});break}
    case"allLogs":ui.allLogs=true;break;
    case"addExam":ui.sheet={type:"exam"};break;
    case"saveExam":s.exams.push({id:uid(),subject:$("#e-sub").value,kind:$("#e-kind").value,date:$("#e-date").value||today(),grade:$("#e-grade").value,topic:$("#e-topic").value.trim()});ui.sheet=null;save();toast("Note gespeichert");break;
    case"addReport":ui.sheet={type:"report"};break;
    case"saveReport":{const grades={};s.subjects.forEach((sub,i)=>{const g=$("#r-g"+i).value;if(g)grades[sub]=g});if(!Object.keys(grades).length){toast("Bitte mindestens eine Note wählen");return}
      s.reports.push({id:uid(),label:$("#r-label").value.trim()||"Zeugnis",date:$("#r-date").value,grades});ui.sheet=null;save();toast("Zeugnis gespeichert");break}
    case"addLog":ui.sheet={type:"log",d:{kind:lern(s)?"Lernzeit-Aufgaben":"Hausaufgaben",status:"erledigt"}};break;
    case"lKind":sh.d.kind=v;sh.d.keep={date:$("#l-date").value,sub:$("#l-sub").value,note:$("#l-note").value};break;
    case"lStat":sh.d.status=v;sh.d.keep={date:$("#l-date").value,sub:$("#l-sub").value,note:$("#l-note").value};break;
    case"saveLog":s.log.push({id:uid(),date:$("#l-date").value||today(),kind:sh.d.kind,subject:$("#l-sub").value,status:sh.d.status,note:$("#l-note").value.trim()});ui.sheet=null;save();toast("Eintrag gespeichert");break;
    case"addTag":ui.sheet={type:"tag",k:a.dataset.k};render();$("#t-val")?.focus();return;
    case"saveTag":{const t=$("#t-val").value.trim();if(!t)return;s[sh.k].push(t);ui.sheet=null;save();break}
    case"delTag":{const k=a.dataset.k,it=s[k][+v];s[k].splice(+v,1);save();undoToast("Entfernt",()=>{s[k].splice(+v,0,it);save()});break}
    case"addGoal":ui.sheet={type:"goal"};break;
    case"pickGoal":s.goals=[...(s.goals||[]),v];ui.sheet=null;save();toast("Förderziel gesetzt");break;
    case"delGoal":{const it=s.goals[+v];s.goals.splice(+v,1);save();undoToast("Förderziel entfernt",()=>{s.goals.splice(+v,0,it);save()});break}
    case"brush":ui.brush=v;break;
    case"cell":if(ui.brush)s.plan[v]=ui.brush;else delete s.plan[v];save();break;
    case"newTask":ui.sheet={type:"task",isNew:1,d:{id:uid(),subject:"Mathe",title:"",minK:5,maxK:7,groups:lead()?["jungs","maedchen"]:[me().group],items:[blankItem("input")],created:today()}};break;
    case"editTask":{const x=JSON.parse(JSON.stringify(DB.sheets.find(y=>y.id===v)));x.items.forEach(it=>{if(it.type==="choice")it.optText=it.options.map((o,k)=>(k===it.correct?"*":"")+o).join("\n");else it.ansText=it.answers.join(" | ")});ui.sheet={type:"task",d:x};break}
    case"tkSub":readTask();sh.d.subject=v;break;
    case"addSubj":readTask();sh.addSubj=!sh.addSubj;render();$("#ns-name")?.focus();return;
    case"saveSubj":{readTask();const n=$("#ns-name").value.trim().replace(/\s+/g," ").slice(0,24);if(!n)return;
      const ex=allSubj().find(x=>x.toLowerCase()===n.toLowerCase());if(!ex){DB.state.subjects=[...(DB.state.subjects||[]),n];save()}sh.d.subject=ex||n;sh.addSubj=false;break}
    case"tkGroup":readTask();toggle(sh.d.groups,v);break;
    case"tkType":{readTask();const i=+a.dataset.i,it=sh.d.items[i];if(it.type!==v){const n=blankItem(v);n.q=it.q;n.id=it.id;sh.d.items[i]=n}break}
    case"tkAdd":readTask();sh.d.items.push(blankItem(sh.d.items.at(-1).type));break;
    case"tkDel":readTask();sh.d.items.splice(+a.dataset.i,1);break;
    case"tkSave":{const er=saveTask();if(er){sh.err=er;break}toast(sh.isNew?"Blatt veröffentlicht":"Gespeichert");ui.sheet=null;break}
    case"tkRemove":removeSheet(sh.d.id);ui.sheet=null;break;
    case"newTerm":{const g=side(me());ui.sheet={type:"term",isNew:1,d:{date:nextWd(g==="maedchen"?4:3),time:"16:30–19:30",grp:g,who:[DB.me].filter(Boolean),note:"",rep:false,n:6,alt:true}};break}
    case"editTerm":ui.sheet={type:"term",id:v,d:JSON.parse(JSON.stringify(DB.duty.entries.find(x=>x.id===v)))};break;
    case"tmGrp":readTerm();sh.d.grp=v;sh.d.who=sh.d.who.filter(id=>{const t=DB.teachers.find(x=>x.id===id);return t&&side(t)===v});break;
    case"tmWho":readTerm();toggle(sh.d.who,v);break;
    case"tmRep":readTerm();sh.d.rep=a.checked;break;
    case"saveTerm":{readTerm();const d=sh.d;if(!d.date){sh.err="Bitte ein Datum wählen.";break}
      if(sh.isNew){const n=d.rep?d.n:1;for(let i=0;i<n;i++){const who=d.rep&&d.alt&&d.who.length>1?[d.who[i%d.who.length]]:[...d.who];DB.duty.entries.push({id:uid(),date:addDays(d.date,7*i),grp:d.grp,time:d.time,who,note:d.note})}toast(n>1?n+" Termine angelegt":"Termin angelegt")}
      else{Object.assign(DB.duty.entries.find(x=>x.id===sh.id),{date:d.date,grp:d.grp,time:d.time,who:d.who,note:d.note});toast("Gespeichert")}
      ui.sheet=null;save();break}
    case"delTerm":removeTerm(sh.id);ui.sheet=null;break;
    case"teacher":ui.sheet={type:"teacher",id:v};break;
    case"tSide":DB.state.sides={...(DB.state.sides||{}),[sh.id]:v};save();toast("Gespeichert");break;
    case"tGrp":{const t=DB.teachers.find(x=>x.id===sh.id);if(CLOUD)sb.from("teachers").update({grp:v}).eq("id",t.id).then(x=>{if(x.error)toast("Ändern hat nicht geklappt")});t.group=v;if(!CLOUD)save();toast("Gruppe geändert");break}
    case"delTeacher":{const id=sh.id;if(CLOUD)sb.from("teachers").delete().eq("id",id).then(x=>{if(x.error)toast("Entfernen hat nicht geklappt")});DB.teachers=DB.teachers.filter(x=>x.id!==id);DB.duty.entries.forEach(e=>e.who=e.who.filter(x=>x!==id));ui.sheet=null;save();break}
    case"invite":ui.sheet={type:"invite",d:{grp:"jungs"}};break;
    case"ivGrp":sh.d.keep={n:$("#iv-name").value,m:$("#iv-mail").value};sh.d.grp=v;break;
    case"saveInvite":{const n=$("#iv-name").value.trim(),m=$("#iv-mail").value.trim().toLowerCase(),g=sh.d.grp;if(!n||!m){toast("Bitte Vorname und E-Mail eintragen");return}
      sb.from("teacher_invites").upsert({email:m,name:n,grp:g}).then(x=>{if(x.error){toast("Einladen hat nicht geklappt");return}DB.invites=[...DB.invites.filter(i=>i.email!==m),{email:m,name:n,grp:g}];ui.sheet=null;toast(n+" eingeladen");render()});return}
    case"addDoc":ui.sheet={type:"upload",d:{kind:DB.docs.some(d=>d.sid===s.id&&d.kind==="Vertrag")?"Zeugnis":"Vertrag"}};break;
    case"upKind":sh.keepName=$("#up-name").value;sh.file=$("#up-file").files[0]||sh.file;sh.d.kind=v;break;
    case"saveUpload":uploadDoc();return;
    case"openDoc":{ui.sheet={type:"docview",id:v};render();const x=DB.docs.find(y=>y.id===v);
      if(CLOUD)sb.storage.from("docs").createSignedUrl(x.path,600).then(r=>{if(ui.sheet?.id===v){ui.sheet.url=r.data?.signedUrl||"";render()}});
      else if(x.data){ui.sheet.url=x.data;render()}return}
    case"delDoc":removeDoc(sh.id);ui.sheet=null;break;
    case"ics":downloadIcs(DB.duty.entries.filter(e=>e.id===v),"Termin");return;
    case"icsMine":downloadIcs(DB.duty.entries.filter(e=>e.date>=today()&&e.who.includes(DB.me)),"Meine Termine");return;
    case"hint":if(a.dataset.k==="term"){ui.tab="plan";ui.sheet={type:"term",id:v,d:JSON.parse(JSON.stringify(DB.duty.entries.find(x=>x.id===v)))}}else if(a.dataset.k==="stu"){ui.tab="students";ui.sid=v}else{ui.tab="students";ui.sid=null}break;
    case"menu":{const [k,id]=v.split(":");const m=menuItems(k,id);if(m){m.items=m.items.filter(x=>x[1]!=="open");ui.sheet={type:"menu",m}}break}
    case"mEdit":ui.sid=v;ui.sheet={type:"student",d:JSON.parse(JSON.stringify(DB.students.find(x=>x.id===v)))};break;
    case"mDelStudent":removeStudent(DB.students.find(x=>x.id===v));break;
    case"mDelTerm":removeTerm(v);ui.sheet=null;break;
    case"mDelTask":removeSheet(v);ui.sheet=null;break;
    case"mDelDoc":removeDoc(v);ui.sheet=null;break;
    case"newCode":{const c=Array.from({length:6},()=>pick([...CODECH])).join("");sb.rpc("set_team_code",{p_code:c}).then(x=>{if(x.data===true){DB.teamCode=c;toast("Neuer Teamcode")}else toast("Ändern hat nicht geklappt");render()});return}
    case"info":if(sh?.type==="task")readTask();if(sh?.type==="invite")sh.d.keep={n:$("#iv-name").value,m:$("#iv-mail").value};ui.info=ui.info===v?null:v;break;
    case"close":ui.sheet=null;break;
    default:return;
  }
  render();
  if(ui.sheet?.type==="upload"&&ui.sheet.keepName!=null&&$("#up-name"))$("#up-name").value=ui.sheet.keepName;
  if(ui.sheet?.d?.keep){const k=ui.sheet.d.keep;if($("#l-date")){$("#l-date").value=k.date;$("#l-sub").value=k.sub;$("#l-note").value=k.note}if($("#iv-name")){$("#iv-name").value=k.n;$("#iv-mail").value=k.m}}
});
/* Ergebnis eines Blattes: zählt richtige Antworten beim ersten Versuch */
const _answer=answer;answer=function(g){const r=ui.run,x=r.q[r.i];const before=r.first;_answer(g);if(x.sheet&&x.tries===0&&r.first>before){r.sheetScores=r.sheetScores||{};r.sheetScores[x.sheet]=(r.sheetScores[x.sheet]||0)+1}};
document.addEventListener("submit",e=>{
  e.preventDefault();const id=e.target.id;
  if(id==="fcode"){const c=$("#code").value.trim().toUpperCase();if(!c){ui.codeErr="Bitte gib deinen Code ein.";render();return}
    stuLogin(c).then(ok=>{if(!ok){ui.codeErr="Diesen Code gibt es nicht. Prüfe ihn noch einmal.";render();$("#code").focus();return}ui.mode="student";ui.stab="home";ui.codeErr="";render(true)}).catch(()=>{ui.codeErr="Keine Verbindung. Prüfe dein Internet.";render()});return}
  if(id==="tform"&&ui.run&&!ui.run.state){const g=$("#tin").value.trim();if(g){ui.run.inp=g;answer(g)}return}
  if(id==="ftag"){$("[data-act=saveTag]").click();return}
  if(id==="fjoin"){const c=$("#jn-code").value.trim();if(!ui.authGrp||!c){ui.authErr="Bitte Gruppe und Teamcode angeben.";render();return}
    sb.rpc("join_team",{p_code:c,p_grp:ui.authGrp}).then(x=>{if(x.data===true){ui.authErr="";enterTeacher()}else{ui.authErr="Der Teamcode stimmt nicht.";render()}});return}
  if(id==="fauth"){const mail=$("#au-mail").value.trim(),pw=$("#au-pw").value,up=ui.authUp,name=up?$("#au-name").value.trim():"",code=up?$("#au-code").value.trim().toUpperCase():"";
    if(up){ui.authName=name;ui.authCode=code;if(!ui.authGrp){ui.authErr="Bitte wählen, ob du Jungs oder Mädchen betreust.";render();return}if(!code){ui.authErr="Bitte den Teamcode eintragen.";render();return}}
    ui.authMail=mail;ui.authErr="";ui.authMsg="";
    if(!mail||!pw){ui.authErr="Bitte E-Mail und Passwort eintragen.";render();return}if(up&&!name){ui.authErr="Bitte deinen Vornamen eintragen.";render();return}if(up&&pw.length<8){ui.authErr="Das Passwort braucht mindestens 8 Zeichen.";render();return}
    ui.busy=true;render();
    (up?sb.auth.signUp({email:mail,password:pw,options:{data:{name,grp:ui.authGrp,team_code:code},emailRedirectTo:location.origin+location.pathname}}):sb.auth.signInWithPassword({email:mail,password:pw})).then(x=>{
      ui.busy=false;if(x.error){ui.authErr=authDe(x.error.message);render();return}session=x.data.session;
      if(!session){ui.authUp=false;ui.authMsg="Fast geschafft: Wir haben dir eine E-Mail geschickt. Tippe auf den Link darin und melde dich danach hier an.";render();return}enterTeacher()});return}
  if(id==="fnewpw"){const pw=$("#np").value;if(pw.length<8){ui.authErr="Das Passwort braucht mindestens 8 Zeichen.";render();return}
    sb.auth.updateUser({password:pw}).then(x=>{if(x.error){ui.authErr=authDe(x.error.message);render();return}toast("Passwort gespeichert");ui.authErr="";enterTeacher()});return}
});
let noteT;
document.addEventListener("change",e=>{if(e.target.id==="m-start"&&ui.sheet?.type==="student"){const y=ui.sheet.el=document.querySelector("#layer .sheet")?.scrollTop;readStudent();render();const sh2=document.querySelector("#layer .sheet");if(sh2)sh2.scrollTop=y}});
document.addEventListener("input",e=>{
  if(e.target.id==="pq"){ui.pq=e.target.value;const p=e.target.selectionStart;render();const q=$("#pq");q.focus();q.setSelectionRange(p,p);return}
  if((e.target.id==="s-first"||e.target.id==="s-last")&&ui.sheet?.miss){const k=e.target.id==="s-first"?"first":"last";if(e.target.value.trim()){ui.sheet.miss=ui.sheet.miss.filter(x=>x!==k);e.target.closest(".f").classList.remove("miss");if(!ui.sheet.miss.length){ui.sheet.err="";document.querySelector("#layer .err")?.remove()}}}
  if(e.target.id==="tin"&&ui.run)ui.run.inp=e.target.value;
  if(e.target.id==="note"){cur().note=e.target.value;clearTimeout(noteT);noteT=setTimeout(save,500)}
  if(e.target.id==="q"){ui.q=e.target.value;const p=e.target.selectionStart;render();const q=$("#q");q.focus();q.setSelectionRange(p,p)}
});
/* Zurück: vom linken Rand nach rechts wischen (wie in iOS) */
function goBack(){
  if(ui.sheet){ui.sheet=null;ui.confirm=null;render();return true}
  if(ui.run){ui.run=null;render(true);return true}
  if(ui.watch&&!ui.subj&&ui.stab==="home"){$("[data-act=stopWatch]")?.click();return true}
  if(ui.mode==="pick"){ui.mode="start";render(true);return true}
  if(ui.mode==="student"&&ui.subj){ui.subj=null;render(true);return true}
  if(ui.mode==="student"&&ui.stab!=="home"){ui.stab="home";render(true);return true}
  if(ui.mode==="teacher"&&ui.sid){ui.sid=null;render(true);return true}
  if(ui.mode==="teacher"&&ui.tab!=="students"){ui.tab="students";render(true);return true}
  if(ui.mode==="teacher"||(ui.mode==="student"&&!tasksLocked())){ui.mode="start";render(true);return true}
  if(["code","auth"].includes(ui.mode)){ui.mode="start";render(true);return true}
  if(ui.mode==="student"&&tasksLocked()){ui.mode="start";render(true);return true}
  return false;
}
let sw=null;
document.addEventListener("touchstart",e=>{const t=e.touches[0];if(e.touches.length===1&&t.clientX<28)sw={x:t.clientX,y:t.clientY,dx:0}},{passive:true});
document.addEventListener("touchmove",e=>{if(!sw)return;const t=e.touches[0];sw.dx=t.clientX-sw.x;const dy=Math.abs(t.clientY-sw.y);
  if(dy>40&&dy>sw.dx){sw=null;$("#app").style.transform="";return}
  if(sw.dx>0){const el=ui.sheet?$("#layer .sheet"):$("#app");if(el){el.style.transition="none";el.style.transform=`translateX(${Math.min(sw.dx,140)*.5}px)`}}},{passive:true});
document.addEventListener("touchend",()=>{if(!sw)return;const dx=sw.dx;sw=null;
  const el=ui.sheet?$("#layer .sheet"):$("#app");if(!el)return;
  if(dx<=80){el.style.transition="transform .2s ease-out";el.style.transform="";return}
  /* Erst die alte Seite ganz nach rechts gleiten lassen und ausblenden, dann die neue ruhig einblenden */
  navigator.vibrate?.(8);
  el.style.transition="transform .16s ease-in,opacity .16s ease-in";el.style.transform="translateX(42%)";el.style.opacity="0";
  setTimeout(()=>{const app=$("#app");app.style.transition="none";app.style.transform="";app.style.opacity="";goBack();
    requestAnimationFrame(()=>{app.style.transition=""})},150)});
document.addEventListener("touchcancel",()=>{sw=null;const app=$("#app");app.style.transition="transform .2s ease-out";app.style.transform=""});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){if(ui.sheet){ui.sheet=null;render();return}if(ui.run){ui.run=null;render(true);return}}
  const r=ui.run;if(!r||r.i>=r.q.length)return;const x=r.q[r.i];
  if(r.state==="w"&&e.key==="Enter"){e.preventDefault();next();return}
  if(x.kind!=="pad"||r.state)return;const T=TOPICS[x.t]||{};
  if(/^[0-9]$/.test(e.key)||(e.key==="/"&&T.frac)||(e.key==="-"&&T.neg)){r.inp=(r.inp+(e.key==="-"?"−":e.key)).slice(0,8);render()}
  else if(e.key==="Backspace"){r.inp=r.inp.slice(0,-1);render()}
  else if(e.key==="Enter"&&r.inp)answer(r.inp);
});
/* Updates: Die App prüft beim Start und beim Zurückkehren, ob es eine neue Version gibt, und lädt sie von selbst.
   Mitten in einer Übung oder einem Formular erscheint stattdessen ein Hinweis zum Antippen. */
const VERSION="__VERSION__";
async function checkUpdate(){
  if(!CLOUD)return;
  try{const r=await fetch("version.txt?t="+Date.now(),{cache:"no-store"});if(!r.ok)return;const v=(await r.text()).trim();
    if(!v||v===VERSION)return;
    const go=()=>location.replace(location.pathname+"?v="+v);
    if(!ui.run&&!ui.sheet&&!editing()&&!dirty){go();return}
    if(!$("#upd")){const b=document.createElement("button");b.id="upd";b.className="toast";b.textContent="Neue Version da · Tippen zum Laden";b.onclick=()=>{if(dirty){clearTimeout(pushTimer);push().then(go)}else go()};document.body.append(b)}
  }catch(e){}
}
checkUpdate();document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")checkUpdate()});
if(CLOUD){sb.auth.onAuthStateChange((ev,s2)=>{session=s2;if(ev==="PASSWORD_RECOVERY"){ui.mode="newpw";ui.authErr="";render()}});sb.auth.getSession().then(x=>{session=x.data.session})}
render();
