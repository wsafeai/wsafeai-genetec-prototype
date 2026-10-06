/* WSafe AI + Genetec Security Center — clickable concept prototype (planned design, not yet deployed).
   All data below is ILLUSTRATIVE SAMPLE DATA. No network calls; nothing connects to Security Center or Procore.
   The operator-console screens are a generic dark VMS look inspired by an operator client; they are not
   Genetec's actual UI and use no Genetec logos or marks. */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const LOGO = "assets/wsafeai-logo.png";

/* ---------- walkthrough script (also used for the PDF + video captions) ---------- */
const STEPS = [
 {t:"WSafe AI + Genetec Security Center — concept prototype walkthrough", c:"", one:"", api:[]},
 {t:"Security Desk monitoring — a WSafe AI hazard alarm arrives",
  one:"A WSafe AI PPE alarm lands in the operator's normal alarm list and the camera tile highlights.",
  c:"The WSafe connector samples cameras already recorded in Security Center (Media Gateway RTSP). When the model flags a candidate hazard, it raises a custom event and an alarm, so it appears where operators already look.",
  api:[["sc","Media Gateway · RTSP in"],["sc","Web SDK · raise custom event"],["sc","Web SDK · trigger alarm"]]},
 {t:"Alarm detail — snapshot, boxes, hazard type, confidence, camera, time",
  one:"The alarm shows the snapshot with bounding boxes, hazard type, confidence, camera/area, and the true detection time.",
  c:"The alarm carries the hazard type, model confidence, camera and area, and a link to the WSafe evidence page. A bookmark pins the true detection time on the camera timeline so anyone can replay the moment.",
  api:[["sc","Web SDK · add bookmark"],["sc","Alarm · attached camera + review URL"]]},
 {t:"WSafe AI review — a Competent Person approves or dismisses",
  one:"Human in the loop: a safety reviewer approves or dismisses each candidate before anything goes further.",
  c:"The safety reviewer confirms the hazard, edits details, or dismisses it as a false positive. Security operators never make safety-compliance calls, and dismissed candidates go no further.",
  api:[["ws","WSafe review queue"],["none","No further write until a human decides"]]},
 {t:"Decision posted back — alarm acknowledged + incident entry",
  one:"WSafe posts the decision to the alarm; the operator acknowledges and an incident entry records the evidence.",
  c:"WSafe posts the reviewer's decision back to Security Center. The operator acknowledges the alarm, and an incident entry (planned) records the snapshot link, bookmark, and reviewer note for the site's records.",
  api:[["sc","Web SDK · raise event “finding approved”"],["sc","Event stream · alarm ack"],["ph2","Incident entry · planned"]]},
 {t:"Optional hand-off — approved finding → Procore Safety Observation",
  one:"Optionally, the approved finding becomes a Procore Safety Observation with the photo and fields prefilled.",
  c:"For contractors on Procore, an approved finding can become a Safety Observation with the photo, location, hazard, and assignee prefilled. It's set per site, and only approved findings are ever sent.",
  api:[["pc","Procore · create Photo"],["pc","Procore · create Observation"]]},
 {t:"Site risk heat map — approved findings by zone (Phase 2)",
  one:"Approved findings roll up by zone into a relative risk map for targeting walk-downs and toolbox talks.",
  c:"Approved findings roll up by zone into a relative risk view on the site map. It's planned as a map layer in Security Desk. It shows where hazards were observed and does not predict incidents.",
  api:[["ws","Approved findings only"],["ph2","Map objects / map layer · Phase 2"]]}
];
const LAST = STEPS.length-1;
window.STEPS = STEPS;

/* ---------- illustrative sample data ---------- */
const SITE = "Sample Data Center Campus · Hall 3 expansion";
const ST = {step:0, arrived:false, sel:"WS-1042", dismissed:{}, approved:false, acked:false, sent:false, procoreOn:true, vest:true, hm:{win:30,type:"all",zone:null}, mtab:"snap"};
const CAMS = [
 {id:"CAM-101", n:"Hall 3 · North laydown", scene:"laydown"},
 {id:"CAM-102", n:"Hall 3 · Generator yard", scene:"genyard"},
 {id:"CAM-103", n:"Hall 3 · Level 2 deck", scene:"deck"},
 {id:"CAM-104", n:"Gate 2 · Haul road", scene:"gate"},
 {id:"CAM-105", n:"Hall 2 (operating) · Perimeter", scene:"hall2"},
 {id:"CAM-106", n:"Hall 3 · Crane pick zone", scene:"excl"}
];
const DET = [
 {id:"WS-1042", alarm:"A-20417", ev:"WSafe: PPE – hard hat missing", hz:"Hard hat + hi-vis vest missing", cat:"PPE — head protection", osha:"29 CFR 1926.100(a)", cam:"CAM-102", area:"Hall 3 expansion › Generator yard", zone:"Generator yard", scene:"genyard", conf:0.87, conf2:0.79, t:"10:41:07 AM", sev:"High", pri:2},
 {id:"WS-1043", alarm:"A-20418", ev:"WSafe: Exclusion zone entry", hz:"Person inside equipment exclusion zone", cat:"Struck-by — exclusion zone", osha:"29 CFR 1926.1424(a)(2)", cam:"CAM-106", area:"Hall 3 expansion › Crane pick zone", zone:"Crane pick zone (EZ-3)", scene:"excl", conf:0.81, t:"10:42:30 AM", sev:"High", pri:2}
];
const det = id => DET.find(d=>d.id===(id||ST.sel))||DET[0];

/* ---------- placeholder imagery (generic, faceless SVG figures; no real people or sites) ---------- */
function worker(x,y,o={}){
  const s=o.s||1, hat=o.hat!==false, vest=o.vest!==false;
  return `<g transform="translate(${x},${y}) scale(${s})">
   <rect x="-9" y="-40" width="7" height="40" rx="3" fill="#3b4750"/><rect x="2" y="-40" width="7" height="40" rx="3" fill="#3b4750"/>
   <rect x="-13" y="-82" width="26" height="45" rx="7" fill="${vest?"#c6d63a":"#6a5f57"}"/>${vest?`<rect x="-13" y="-62" width="26" height="4" fill="#e9eef0" opacity=".85"/>`:""}
   <rect x="-20" y="-80" width="7" height="34" rx="3" fill="#56636c" transform="rotate(${o.arm||8} -16 -80)"/><rect x="13" y="-80" width="7" height="34" rx="3" fill="#56636c" transform="rotate(${-(o.arm||8)} 16 -80)"/>
   <circle cx="0" cy="-94" r="11" fill="#a9b3b9"/>
   ${hat?`<path d="M-13 -96 a13 12 0 0 1 26 0 z" fill="${o.hc||"#F28A1E"}"/><rect x="-15" y="-97" width="30" height="3.5" rx="1.5" fill="#d9750f"/>`:""}
  </g>`;
}
function box(x,y,w,h,txt,col,pos){
  col=col||"#ff5a36"; const lw=txt.length*7+14;
  const lx = pos==="right"? x+w+4 : pos==="left" ? x-lw-4 : x, ly = pos==="right"||pos==="left" ? y : y-22;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${col}" stroke-width="3" rx="4"/>
   <rect x="${lx}" y="${ly}" width="${lw}" height="20" fill="${col}" rx="3"/>
   <text x="${lx+7}" y="${ly+14}" font-family="Arial" font-weight="700" font-size="12" fill="#fff">${txt}</text>`;
}
function scene(kind, o={}){
  const bb = !!o.boxes;
  const sky=(a,b)=>`<defs><linearGradient id="sk${kind}${o.k||""}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="360" fill="url(#sk${kind}${o.k||""})"/>`;
  let g="";
  if(kind==="genyard"){
    g+=sky("#9db7c6","#e3eaee")+`<rect x="0" y="232" width="640" height="128" fill="#b9ad96"/><rect x="0" y="232" width="640" height="10" fill="#a39880"/>
     ${[30,190].map(x=>`<g><rect x="${x}" y="118" width="140" height="116" fill="#d7dcdf" stroke="#8d989e" stroke-width="2"/>
       ${[0,1,2,3,4,5].map(i=>`<line x1="${x+14}" y1="${136+i*12}" x2="${x+126}" y2="${136+i*12}" stroke="#9aa5ab" stroke-width="2"/>`).join("")}
       <rect x="${x+104}" y="82" width="14" height="38" fill="#7d878d"/><rect x="${x+8}" y="210" width="40" height="18" fill="#f2c94c" stroke="#a5821f"/></g>`).join("")}
     <rect x="470" y="176" width="150" height="60" rx="28" fill="#cfd5d8" stroke="#8d989e" stroke-width="2"/><rect x="480" y="230" width="10" height="10" fill="#7d878d"/><rect x="598" y="230" width="10" height="10" fill="#7d878d"/>
     <g fill="#e8632b">${[360,520,600].map(x=>`<polygon points="${x},300 ${x+8},276 ${x+16},300"/>`).join("")}</g>
     ${worker(300,318,{s:1.1})}${worker(420,318,{s:1.15,hat:false,vest:false,arm:14})}`;
    if(bb) g+=box(398,192,44,36,"No hard hat · 0.87")+box(398,228,44,52,"No hi-vis vest · 0.79","#ff8a1e","right");
  } else if(kind==="excl"){
    g+=sky("#a7bfcc","#e6ecef")+`<rect x="0" y="210" width="640" height="150" fill="#b7a98e"/>
     <rect x="30" y="40" width="10" height="170" fill="#e1a21a"/><line x1="35" y1="44" x2="300" y2="24" stroke="#e1a21a" stroke-width="7"/><line x1="35" y1="44" x2="0" y2="52" stroke="#e1a21a" stroke-width="7"/>
     <line x1="250" y1="28" x2="250" y2="120" stroke="#3a3a3a" stroke-width="2"/><rect x="222" y="120" width="56" height="26" fill="#8a6a45" stroke="#5c4429"/>
     <polygon points="150,236 510,236 610,348 50,348" fill="rgba(255,90,54,.16)" stroke="#ff5a36" stroke-width="2.5" stroke-dasharray="12 7"/>
     <text x="330" y="226" font-family="Arial" font-size="11" font-weight="700" fill="#b23a1c" text-anchor="middle">EZ-3 · configured exclusion zone (load path)</text>
     <g fill="#e8632b">${[[150,236],[510,236],[50,346],[600,346]].map(([x,y])=>`<polygon points="${x-8},${y} ${x},${y-22} ${x+8},${y}"/>`).join("")}</g>
     <g><rect x="420" y="250" width="150" height="34" rx="6" fill="#e1a21a"/><rect x="500" y="214" width="46" height="38" rx="4" fill="#d18f10"/><rect x="508" y="220" width="30" height="20" fill="#9cc3d4"/>
      <circle cx="446" cy="290" r="14" fill="#2d2d2d"/><circle cx="548" cy="290" r="14" fill="#2d2d2d"/><line x1="440" y1="256" x2="360" y2="200" stroke="#d18f10" stroke-width="10"/></g>
     ${worker(270,330,{s:1.05,arm:18})}${worker(90,226,{s:.6})}`;
    if(bb) g+=box(244,206,54,130,"Inside EZ-3 · 0.81","#ff5a36","right");
  } else if(kind==="deck"){
    g+=sky("#9db7c6","#e3eaee")+`<rect x="0" y="250" width="640" height="110" fill="#b9a98f"/>
     <g fill="#c9cdd0"><rect x="40" y="90" width="18" height="160"/><rect x="200" y="90" width="18" height="160"/><rect x="360" y="90" width="18" height="160"/><rect x="520" y="90" width="18" height="160"/></g>
     <polygon points="0,205 640,205 640,222 0,222" fill="#9aa2a7"/><polygon points="0,180 640,180 640,205 0,205" fill="#d4d7d9"/><rect x="0" y="70" width="640" height="20" fill="#a7afb4"/>
     <g stroke="#e8c20f" stroke-width="4"><line x1="0" y1="150" x2="640" y2="150"/><line x1="0" y1="166" x2="640" y2="166"/></g>
     ${worker(260,182,{s:.9})}${worker(430,182,{s:.9,hc:"#f4f4f4"})}`;
  } else if(kind==="laydown"){
    g+=sky("#9fb6c3","#e5ebee")+`<rect x="0" y="230" width="640" height="130" fill="#c2b08f"/>
     <g fill="#6e7c86"><rect x="30" y="140" width="190" height="92"/><rect x="38" y="150" width="174" height="10" fill="#8a98a1"/></g>
     <g fill="#b1784a"><rect x="380" y="206" width="200" height="12"/><rect x="380" y="220" width="200" height="12"/><rect x="380" y="192" width="200" height="12"/></g>
     <g fill="#8f9aa1"><rect x="260" y="250" width="90" height="8"/><rect x="262" y="240" width="86" height="8"/></g>
     ${worker(300,320,{s:1})}${worker(470,300,{s:.9})}`;
  } else if(kind==="gate"){
    g+=sky("#a3bac7","#e7edf0")+`<rect x="0" y="200" width="640" height="160" fill="#b3ab9b"/><polygon points="250,200 390,200 640,360 0,360" fill="#7f868b"/>
     <line x1="320" y1="210" x2="320" y2="360" stroke="#e8e8e8" stroke-width="4" stroke-dasharray="18 14"/>
     <rect x="96" y="150" width="70" height="60" fill="#d6dde1" stroke="#8a97a0"/><rect x="106" y="162" width="24" height="18" fill="#9cc3d4"/>
     <rect x="170" y="196" width="160" height="7" fill="#e53935"/><rect x="170" y="196" width="20" height="7" fill="#fff"/><rect x="210" y="196" width="20" height="7" fill="#fff"/><rect x="250" y="196" width="20" height="7" fill="#fff"/>
     <g><rect x="380" y="180" width="160" height="60" fill="#e8e9ea" stroke="#8a97a0"/><rect x="540" y="196" width="50" height="44" fill="#2f6db5"/><rect x="552" y="204" width="28" height="16" fill="#9cc3d4"/><circle cx="410" cy="246" r="12" fill="#2d2d2d"/><circle cx="510" cy="246" r="12" fill="#2d2d2d"/><circle cx="570" cy="246" r="12" fill="#2d2d2d"/></g>
     ${worker(130,262,{s:.75})}`;
  } else if(kind==="hall2"){
    g+=sky("#94aebd","#dfe7eb")+`<rect x="0" y="250" width="640" height="110" fill="#9fa79f"/>
     <rect x="60" y="70" width="520" height="182" fill="#c9cfd3" stroke="#8a97a0" stroke-width="2"/>
     ${Array.from({length:12},(_,i)=>`<rect x="${80+i*41}" y="96" width="30" height="120" fill="#aeb6bb"/>`).join("")}
     <rect x="290" y="200" width="60" height="52" fill="#6f7b82"/>
     <g stroke="#59656c" stroke-width="2">${Array.from({length:33},(_,i)=>`<line x1="${i*20}" y1="262" x2="${i*20}" y2="318"/>`).join("")}<line x1="0" y1="264" x2="640" y2="264"/><line x1="0" y1="300" x2="640" y2="300"/></g>`;
  }
  return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${g}</svg>`;
}
window.scene = scene;

/* ---------- helpers ---------- */
const KN = {sc:"SC", ws:"WSAFE", pc:"PROCORE", none:"—", ph2:"PHASE 2"};
const chip = (k,txt)=>`<span class="chip c-${k}"><i>${KN[k]}</i>${txt?` ${txt}`:""}</span>`;
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.toggle("top",ST.step===3);t.classList.toggle("right",ST.step===4);t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),3000);}

/* ---------- operator console chrome (generic) ---------- */
function sd(task, inner, extra){
  const nAct = ST.arrived ? (ST.acked?1:2) - (ST.dismissed["WS-1043"]?1:0) : 0;
  const tabs=[["mon","Monitoring",1],["alm","Alarm monitoring",ST.approved?4:2],["map","Maps",6],["inc","Incidents",4]];
  return `<div class="sd fade-in">
   <div class="sd-top"><div class="sd-app"><span class="ico"><i></i><i></i><i></i><i></i></span>Security Desk <small>generic mock</small></div>
    ${tabs.map(([k,l,g])=>`<div class="sd-tab ${task===k?"on":""}" data-go="${g}">${l}${k==="alm"&&nAct>0?` <span class="cnt">${nAct}</span>`:""}${k==="map"?` <span class="ph">WSafe layer · Phase 2</span>`:""}</div>`).join("")}
    <div class="sd-sp"></div>
    <div class="sd-meta"><span><b>Sample DC Campus</b></span><span class="clk">${extra&&extra.clock||"10:41:12 AM CT"}</span><span class="av" title="SOC Operator (sample)">SO</span></div></div>
   <div class="sd-rib">⚠ Generic mock inspired by a VMS operator console, for illustration only. Not Genetec's actual UI; no Genetec logos; no endorsement implied. Sample data.<span class="sp"></span><span class="wslink"><i></i>WSafe connector (planned) · Web SDK + Media Gateway · mock</span></div>
   <div class="sd-body">${inner}</div></div>`;
}
function tree(selCam){
  const al = ST.arrived && !ST.acked;
  return `<div class="pane" style="width:196px;flex:0 0 196px"><div class="pane-h">Area view<span class="sp"></span><span class="tg">sample</span></div><div class="tree">
   <div class="l1">▾ Sample DC Campus</div><div class="l2">▸ Hall 1 (operating)</div><div class="l2">▾ Hall 2 (operating)</div><div class="l3 cam">CAM-105 Perimeter</div>
   <div class="l2">▾ Hall 3 expansion</div>
   ${["CAM-101","CAM-102","CAM-103","CAM-106"].map(id=>{const c=CAMS.find(x=>x.id===id);return `<div class="l3 cam ${id==="CAM-102"&&al?"al":""} ${selCam===id?"sel":""}">${id} ${c.n.split(" · ")[1]}</div>`;}).join("")}
   <div class="l2">▾ Gates</div><div class="l3 cam">CAM-104 Gate 2</div>
   <div class="gap"></div><div class="l2">▸ Alarms</div><div class="l3 ${al?"al":""}" style="padding-left:30px">⚑ WSafe hazard</div>
   <div class="l2">▸ Custom events</div><div class="l3 dim">WSafe: PPE – hard hat missing</div><div class="l3 dim">WSafe: PPE – hi-vis missing</div><div class="l3 dim">WSafe: Exclusion zone entry</div><div class="l3 dim">WSafe: Finding approved</div>
  </div></div>`;
}
function tile(c, o={}){
  const al = o.alarm;
  return `<div class="tile ${al?"alarm":""} ${o.sel?"sel":""}" ${al?`data-go="2"`:""}>${scene(c.scene,{k:"t"})}
   <div class="tl"><span class="rec"></span>${c.id} · ${c.n.replace("Hall 3 · ","").replace(" (operating)","")}<span class="sp"></span><span class="smp">SAMPLE</span></div>
   ${al?`<div class="aband"><span class="pri">P2</span><div style="flex:1;min-width:0"><b>WSafe: PPE – hard hat missing</b> · conf 0.87</div><span style="color:#ffb469;font-weight:800">View ›</span></div>`:""}
   <div class="bl">Live<span class="sp"></span>${o.time||"10:41:12 AM"}</div></div>`;
}
function alarmRows(mode,compact){
  const d1=DET[0], d2=DET[1], rows=[];
  if(ST.arrived){
    const st1 = ST.acked?`<span class="st ack"><i></i>Acknowledged</span>`:`<span class="st act"><i></i>Active</span>`;
    const ws1 = ST.approved?`<span class="wsb ok">✓ Approved</span>`:`<span class="wsb">Awaiting review</span>`;
    rows.push(`<tr class="click ws ${mode==="new"?"new":""} ${mode==="sel"?"sel":""}" data-go="2"><td><span class="pri p2">2</span></td><td><b>${d1.ev}</b></td><td>${d1.cam} · Generator yard</td><td>${d1.t}</td><td>${st1}</td><td>${ws1}</td><td style="color:#9aa8b1">${d1.alarm}</td></tr>`);
  }
  if(ST.arrived && ST.step>=2){
    rows.push(ST.dismissed["WS-1043"]
      ? `<tr><td><span class="pri p2">2</span></td><td>${d2.ev}</td><td>${d2.cam} · Crane pick zone</td><td>${d2.t}</td><td><span class="st inv"><i></i>Closed by WSafe</span></td><td><span class="wsb no">Dismissed</span></td><td style="color:#9aa8b1">${d2.alarm}</td></tr>`
      : `<tr class="ws"><td><span class="pri p2">2</span></td><td><b>${d2.ev}</b></td><td>${d2.cam} · Crane pick zone</td><td>${d2.t}</td><td><span class="st act"><i></i>Active</span></td><td><span class="wsb">Awaiting review</span></td><td style="color:#9aa8b1">${d2.alarm}</td></tr>`);
  }
  rows.push(`<tr><td><span class="pri p3">3</span></td><td>Door held open — Hall 2 · Door 2-14</td><td>Access control (sample)</td><td>10:33:51 AM</td><td><span class="st ack"><i></i>Acknowledged</span></td><td style="color:#6b7880">—</td><td style="color:#9aa8b1">A-20415</td></tr>`);
  rows.push(`<tr><td><span class="pri p5">5</span></td><td>Video signal lost — CAM-108 Hall 1 dock</td><td>Archiver (sample)</td><td>10:12:04 AM</td><td><span class="st ack"><i></i>Acknowledged</span></td><td style="color:#6b7880">—</td><td style="color:#9aa8b1">A-20411</td></tr>`);
  let html=rows.join("");
  if(compact) html=html.replace(/<tr([^>]*)>(<td>.*?<\/td>)(<td>.*?<\/td>)<td>.*?<\/td>(<td>.*?<\/td><td>.*?<\/td><td.*?<\/td>)<td.*?<\/td><\/tr>/g,"<tr$1>$2$3$4</tr>");
  return compact? `<table class="dt"><thead><tr><th style="width:40px">Pri</th><th>Alarm / event</th><th>Time (CT)</th><th>State</th><th>WSafe review</th></tr></thead><tbody>${html}</tbody></table>`
   : `<table class="dt"><thead><tr><th style="width:40px">Pri</th><th>Alarm / event</th><th>Source</th><th>Trigger time (CT)</th><th>State</th><th>WSafe review</th><th>ID</th></tr></thead><tbody>${html}</tbody></table>`;
}

/* ---------- WSafe web console chrome (light, brand) ---------- */
function wsc(active, inner){
  const pend = DET.filter(d=>!ST.dismissed[d.id] && !(ST.approved && d.id==="WS-1042")).length;
  return `<div class="wsc fade-in"><div class="ws-head"><img src="${LOGO}" alt="WSafe AI">
   <div class="tabs"><a class="${active==="rev"?"on":""}" data-go="3">Review queue ${pend?`<span class="b">${pend}</span>`:""}</a><a class="${active==="int"?"on":""}" data-go="5">Procore hand-off</a><a data-go="6">Site risk map</a><a>Audit log</a></div>
   <div class="sp"></div>
   <span class="illus">Sample data</span>
   <div class="conn"><i></i>Security Center · Web SDK <span class="tag gray">mock</span></div>
   <div class="user"><div class="avatar">CP</div><div><b>Competent Person</b><div class="muted" style="font-size:11px">sample reviewer · Safety</div></div></div></div>
   <div class="ws-body">${inner}</div></div>`;
}

/* ---------- screens ---------- */
const S = {};
S[0]=()=>`<div class="cover fade-in"><div class="box">
  <div><img class="logo" src="${LOGO}" alt="WSafe AI">
   <h1>WSafe AI + Genetec Security Center<br><span>Camera hazard detection → Security Desk alarms</span></h1>
   <p>Clickable concept prototype of how WSafe AI would work inside Security Center: site cameras feed hazard detection (missing PPE, exclusion-zone entry), findings arrive as custom events and alarms in Security Desk, a Competent Person approves or dismisses each one, and approved findings can flow on to Procore as Safety Observations.</p>
   <div class="note orange" style="margin:10px 0"><span class="ic">!</span><div><b>Concept prototype. Illustrative sample data.</b> WSafe AI is not yet deployed and this integration has not been built or tested. Every site, camera, person, image, and ID is placeholder data. The prototype makes no network calls. SDK access under Genetec's Development Acceleration Program (DAP) is developer access only; it is <b>not</b> a partnership, certification, or endorsement.</div></div>
   <div style="display:flex;gap:12px;align-items:center;margin-top:14px"><button class="btn orange" data-go="1" style="font-size:14.5px;padding:10px 20px">Start walkthrough →</button><span class="muted" style="font-size:12px">Next / Back, ← → keys, or click the highlighted items.</span></div>
   <div class="legal">WorkSafeAgent LLC (WSafe AI) · Abilene, TX · Patent pending (US 63/992,261) · Draft, Oct 2026. Also available: <a href="wsafeai-genetec-prototype-walkthrough.pdf" target="_blank" rel="noopener">walkthrough PDF</a> · <a href="wsafeai-genetec-prototype-walkthrough.mp4" target="_blank" rel="noopener">video (MP4)</a>.<br>"Genetec", "Security Center", "Security Desk", and "Procore" are referenced by name only to describe the planned integration. Console screens are generic mocks, not the vendors' actual UIs, and imply no endorsement.</div>
  </div>
  <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-weight:800;margin:4px 0 10px">Walkthrough</div>
   <ol>${STEPS.slice(1).map((s,i)=>{const w=[["w-sd","Security Desk"],["w-sd","Security Desk"],["w-ws","WSafe AI"],["w-sd","Security Desk"],["w-pc","WSafe → Procore"],["w-sd","Security Desk · Phase 2"]][i];return `<li data-go="${i+1}"><b>${i+1}</b>${s.t.split(" — ")[0]}<em class="${w[0]}">${w[1]}</em></li>`;}).join("")}</ol>
   <div class="note" style="margin-top:12px"><span class="ic">i</span><div><b>MVP route (planned):</b> Media Gateway RTSP in → WSafe connector (edge GPU) → Web SDK out (custom event, bookmark, alarm with review link). Review stays in WSafe for the MVP; a Security Desk review task, live overlays, and the map layer are Phase 2.</div></div>
   <div class="flow"><span class="d">Cameras → Media Gateway (RTSP)</span>→<span>WSafe connector</span>→<span class="d">Custom event + alarm + bookmark</span>→<span>Human review</span>→<span class="p">Procore (optional)</span></div>
   <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-weight:800;margin:12px 0 0">Personas</div>
   <div class="persona"><span class="tag gray">SOC Operator (Security Desk)</span><span class="tag gray">Competent Person / safety reviewer (WSafe)</span><span class="tag gray">Superintendent (Procore, optional)</span></div>
  </div></div></div>`;

S[1]=()=>{const al=ST.arrived;
 return sd("mon",`${tree(al?"CAM-102":null)}
  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div class="pane" style="flex:1;min-height:0"><div class="pane-h">Monitoring · Hall 3 expansion (6 tiles)<span class="sp"></span><span class="tg">${al?"1 tile in alarm":"live · all normal"}</span></div>
    <div class="tiles">${CAMS.map(c=>tile(c,{alarm:al&&c.id==="CAM-102"})).join("")}</div></div>
   <div class="pane" style="flex:0 0 auto"><div class="pane-h">Alarm list<span class="sp"></span><span class="tg">sorted by priority, then time</span></div>${alarmRows(al?"new":"")}</div>
  </div>
  ${al?`<div class="newal" data-go="2"><div class="h"><span class="pri p2">P2</span>New alarm · WSafe hazard</div><div class="t">WSafe: PPE – hard hat missing</div><div class="s">CAM-102 · Hall 3 › Generator yard · conf 0.87 · detected 10:41:07 AM CT</div><div style="display:flex;gap:8px;margin-top:8px"><button class="dbtn or" data-go="2">View alarm ›</button><span style="font-size:10.5px;color:#9aa8b1;align-self:center">Raised by the WSafe connector via the Web SDK (mock)</span></div></div>`:""}`);};

S[2]=()=>{const d=det("WS-1042"), c=CAMS[1];
 const snap = ST.mtab==="snap";
 return sd("alm",`
  <div class="pane" style="flex:1.25;min-width:0;padding:8px">
   <div class="mtabs"><span class="${snap?"on":""}" data-mtab="snap">Snapshot · WSafe evidence</span><span class="${!snap?"on":""}" data-mtab="play">Playback @ bookmark</span><span data-mtab="live">Live</span></div>
   <div class="dshot">${scene(c.scene,{boxes:snap,k:"d"})}
    <div class="tl">${c.id} · ${c.n}<span class="sp"></span><span class="smp">ILLUSTRATIVE PLACEHOLDER</span></div>
    <div class="bl">${snap?"WSafe snapshot · detected 10:41:07 AM CT · sample frame, not real footage":"Playback · 10:41:02 AM CT (bookmark −5 s) · sample"}<span class="sp"></span>${snap?"boxes drawn by WSafe":"▶ 1×"}</div></div>
   <div class="tline"><div class="rec" style="left:0;width:100%"></div>
    ${["10:39","10:40","10:41","10:42","10:43"].map((t,i)=>`<span class="tick" style="left:${10+i*20}%">${t}</span>`).join("")}
    <div class="bm" style="left:52.3%"><span>⚑ Bookmark · WSafe ${d.id} · 10:41:07</span></div><div class="now" style="left:97%"></div></div>
   <div class="dnote b" style="margin-top:6px">MVP: the boxed snapshot lives behind the alarm's review link; recorded video stays in Security Center at the bookmark. Drawing boxes on live video (Media SDK overlay) is Phase 2.</div>
  </div>
  <div class="pane" style="flex:1;min-width:0;overflow:hidden"><div class="pane-h">Alarm ${d.alarm} · WSafe hazard<span class="sp"></span><span class="st act" style="text-transform:none;letter-spacing:0"><i></i>Active</span></div>
   <div style="padding:9px 12px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto">
    <dl class="kv2">
     <dt>Event</dt><dd>${d.ev}</dd>
     <dt>Hazard type</dt><dd>PPE missing — hard hat <span style="color:#9aa8b1">+ hi-vis vest</span></dd>
     <dt>Confidence</dt><dd><div class="conf"><div class="bar"><i style="width:87%"></i></div>0.87 hard hat · 0.79 vest</div></dd>
     <dt>Camera · area</dt><dd>${d.cam} · ${d.area}</dd>
     <dt>Detected</dt><dd>${d.t} CT <span style="color:#9aa8b1">(bookmark keeps true time)</span></dd>
     <dt>Raised in SC</dt><dd>10:41:09 AM CT · priority 2 (high)</dd>
     <dt>Review link</dt><dd><span class="mono" style="color:#9fd0f3">app.wsafeai.example/review/${d.id}</span> <span style="color:#9aa8b1">(sample URL)</span></dd>
    </dl>
    <div><div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--d-mu);font-weight:700;margin-bottom:3px">WSafe connector → Security Center (planned calls)</div>
     <div class="sdk"><div><span class="tm">10:41:09</span><span class="op">Raise custom event</span><span style="color:#c6d0d6">“WSafe: PPE – hard hat missing” on CAM-102</span></div>
      <div><span class="tm">10:41:09</span><span class="op">Add bookmark</span><span style="color:#c6d0d6">at 10:41:07 · “WSafe ${d.id}”</span></div>
      <div><span class="tm">10:41:09</span><span class="op">Trigger alarm</span><span style="color:#c6d0d6">WSafe hazard · P2 · CAM-102 · review URL</span></div></div></div>
    <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:2px"><button class="dbtn or" id="btnOpenReview">Open WSafe review ↗</button><button class="dbtn" id="btnAckEarly">Acknowledge</button><button class="dbtn">Forward</button><button class="dbtn">Snooze</button></div>
    <div class="dnote">The operator sees it and can act on site (radio the foreman). The safety decision (approve or dismiss) stays with the WSafe reviewer.</div>
   </div></div>`,{clock:"10:41:40 AM CT"});};

S[3]=()=>{const d=det(), c=CAMS.find(x=>x.id===d.cam), isApp=ST.approved&&d.id==="WS-1042";
 return wsc("rev",`
  <div style="width:236px;flex:0 0 236px;display:flex;flex-direction:column;min-height:0">
   <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);font-weight:800;margin:0 0 6px">Needs review · from Security Center</div>
   ${DET.map(x=>{const done=ST.dismissed[x.id]||(ST.approved&&x.id==="WS-1042");return `<div class="qi ${x.id===d.id?"on":""} ${done?"done":""}" ${done?"":`data-sel="${x.id}"`}><div class="th">${scene(x.scene,{boxes:true,k:"q"+x.id})}</div><div class="m"><b>${x.ev.replace("WSafe: ","")}</b><span class="muted">${x.id} · ${x.cam} · ${x.conf.toFixed(2)}</span><div>${done?`<span class="tag ${ST.dismissed[x.id]?"gray":"green"}">${ST.dismissed[x.id]?"Dismissed":"Approved"}</span>`:`<span class="tag red" style="font-size:10px">${x.sev}</span> <span class="muted" style="font-size:11px">${x.t}</span>`}</div></div></div>`;}).join("")}
   <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);font-weight:800;margin:8px 0 6px">Earlier today</div>
   <div class="qi done"><div class="th">${scene("laydown",{k:"q0"})}</div><div class="m"><b>PPE – hard hat missing</b><span class="muted">WS-1039 · CAM-101 · 0.58</span><div><span class="tag gray">Dismissed · shadow</span></div></div></div>
   <div class="note" style="margin-top:auto;font-size:11.5px"><span class="ic">i</span><div>Phase 2: the same review as a task inside Security Desk (Workspace SDK).</div></div>
  </div>
  <div style="flex:1.12;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div style="display:flex;align-items:center;gap:8px"><div style="font-size:17px;font-weight:800">${d.id} · ${d.hz}</div><span class="tag ${isApp?"green":"orange"}">${isApp?"Approved":"Needs review"}</span></div>
   <div class="shot">${scene(d.scene,{boxes:true,k:"r"})}<div class="cap">${d.cam} · ${c.n} · ${d.t} CT<span class="sp"></span>sample frame · not real footage</div></div>
   <div class="strip">${["−2 s","detection","+2 s"].map((l,i)=>`<div>${scene(d.scene,{boxes:i===1,k:"s"+i})}<span>${l}</span></div>`).join("")}</div>
  </div>
  <div class="card" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;padding:11px 13px">
   <h3 style="margin:0">Reviewer decision <span class="tag gray">AI suggests · a person decides</span></h3>
   <div class="grid2" style="font-size:12.5px"><div><label class="fl">Model confidence</label><b>${d.conf.toFixed(2)}</b>${d.conf2?` · vest ${d.conf2.toFixed(2)}`:""}</div><div><label class="fl">Security Center alarm</label><b>${d.alarm}</b> · ${d.cam}</div></div>
   <div class="grid2">
    <div><label class="fl">Hazard type</label><select class="f"><option>${d.cat}</option><option>PPE — high-visibility</option><option>Struck-by — exclusion zone</option></select></div>
    <div><label class="fl">Suggested OSHA ref.</label><select class="f"><option>${d.osha}</option><option>Site PPE rule (hi-vis)</option></select></div>
    <div><label class="fl">Zone</label><select class="f"><option>${d.zone}</option></select></div>
    <div><label class="fl">Severity</label><select class="f"><option>${d.sev}</option><option>Medium</option><option>Low</option></select></div>
   </div>
   ${d.id==="WS-1042"?`<label class="chk ${ST.vest?"on":""}"><input type="checkbox" id="vest" ${ST.vest?"checked":""}><div><b>Also confirm: hi-vis vest missing</b> <span class="muted">(0.79)</span></div></label>`:""}
   <div><label class="fl">Reviewer note (posted to the alarm)</label><textarea class="f" rows="2">${d.id==="WS-1042"?"Confirmed: worker in generator yard without hard hat or vest. Foreman notified by radio.":"Worker inside EZ-3 during pick."}</textarea></div>
   <div class="note orange" style="font-size:11.8px"><span class="ic">!</span><div>Approve posts “WSafe: Finding approved” to the Security Center alarm. Dismiss closes it as a false positive. Nothing goes to Procore without approval.</div></div>
   <div style="display:flex;gap:8px;margin-top:auto">${isApp?`<button class="btn primary" data-go="4" style="margin-left:auto">Back to Security Desk →</button>`:`<button class="btn danger" id="btnDismiss">✕ Dismiss (false positive)</button><button class="btn orange" id="btnApprove" style="margin-left:auto">✓ Approve finding</button>`}</div>
  </div>`);};

S[4]=()=>{const d=det("WS-1042"), ack=ST.acked;
 return sd("alm",`
  <div style="flex:1.2;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div class="pane" style="flex:0 0 auto"><div class="pane-h">Alarm monitoring<span class="sp"></span><span class="tg">WSafe decision received via Web SDK (mock)</span></div>${alarmRows("sel",true)}</div>
   <div class="pane" style="flex:1;min-height:0"><div class="pane-h">Alarm ${d.alarm} · event timeline<span class="sp"></span><span class="tg">sample times, CT</span></div>
    <div style="padding:8px 12px;display:flex;gap:12px;min-height:0">
     <div class="dshot" style="width:250px;flex:0 0 250px;align-self:flex-start">${scene("genyard",{boxes:true,k:"a"})}<div class="bl">WSafe ${d.id} · sample frame</div></div>
     <div class="evl" style="flex:1;min-width:0">
      <div class="e"><span class="tm">10:41:07 AM</span><span class="d o"></span><span class="x">Detection · bookmark on CAM-102<small>True detection time preserved by the bookmark</small></span></div>
      <div class="e"><span class="tm">10:41:09 AM</span><span class="d o"></span><span class="x">Custom event + alarm raised (P2)<small>WSafe: PPE – hard hat missing · review link attached</small></span></div>
      <div class="e"><span class="tm">10:44:31 AM</span><span class="d g"></span><span class="x">WSafe: Finding approved<small>Competent Person (sample): PPE — hard hat + hi-vis confirmed</small></span></div>
      ${ack?`<div class="e fade-in"><span class="tm">10:45:02 AM</span><span class="d b"></span><span class="x">Alarm acknowledged · SOC Operator (sample)<small>Read back by WSafe from the event stream</small></span></div>
       <div class="e fade-in"><span class="tm">10:45:03 AM</span><span class="d g"></span><span class="x">Incident entry INC-0317 created (planned)<small>Snapshot link, bookmark, reviewer note attached</small></span></div>`:`<div class="e"><span class="tm">—</span><span class="d"></span><span class="x" style="color:#9aa8b1">Waiting for operator acknowledgement</span></div>`}
     </div></div></div>
  </div>
  <div class="pane" style="flex:1;min-width:0"><div class="pane-h">${ack?"Incident entry (planned)":"Acknowledge alarm"}<span class="sp"></span><span class="tg">sample</span></div>
   <div style="padding:10px 12px;display:flex;flex-direction:column;gap:9px;min-height:0">
   ${ack?`<div class="inc fade-in"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="font-size:14px">INC-0317 · PPE non-compliance — Generator yard</b></div>
     <dl class="kv2"><dt>Type</dt><dd>Safety · PPE (WSafe)</dd><dt>Status</dt><dd><span class="st ack"><i></i>Open · corrective action</span></dd><dt>Linked</dt><dd>Alarm ${d.alarm} · CAM-102 · bookmark 10:41:07</dd><dt>WSafe finding</dt><dd>${d.id} · approved 10:44 by Competent Person (sample)</dd><dt>Evidence</dt><dd>Snapshot (review link) + recorded video at bookmark</dd><dt>Note</dt><dd style="font-weight:500">Worker in generator yard without hard hat or vest. Foreman notified by radio.</dd></dl></div>
     <div class="dnote b">Incident entries are planned (Phase 2 in the brief). In the MVP, the approved finding, bookmark, and alarm history already give the site a record.</div>
     <div style="display:flex;gap:8px;margin-top:auto"><button class="dbtn">Export report (planned)</button><button class="dbtn or" data-go="5" style="margin-left:auto">Next: Procore hand-off (optional) →</button></div>`
   :`<div style="display:flex;gap:8px;align-items:center"><span class="wsb ok" style="font-size:11px;padding:2px 7px">✓ WSafe: approved</span><span style="font-size:12px;color:#c6d0d6">Reviewer confirmed the hazard at 10:44:31 AM</span></div>
     <dl class="kv2"><dt>Alarm</dt><dd>${d.alarm} · WSafe hazard · P2</dd><dt>Source</dt><dd>CAM-102 · Generator yard</dd><dt>Reviewer note</dt><dd style="font-weight:500">Confirmed: worker in generator yard without hard hat or vest. Foreman notified by radio.</dd></dl>
     <label style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--d-mu);font-weight:700">Acknowledgement</label>
     <div style="display:flex;gap:8px"><span class="dbtn" style="cursor:default">Ack type: Normal</span><span class="dbtn" style="cursor:default">☑ Create incident entry</span></div>
     <div class="inc pending">Incident entry will be created when the alarm is acknowledged.</div>
     <div style="display:flex;gap:8px;margin-top:auto"><button class="dbtn gn" id="btnAck">✓ Acknowledge alarm</button></div>`}
   </div></div>`,{clock:ack?"10:45:04 AM CT":"10:44:40 AM CT"});};

const MAP=[["Approved finding title","Title","PPE missing — hard hat + hi-vis · Generator yard"],["Hazard type (reviewer)","Hazard","PPE (customer list)"],["Security Center area → mapped","Location","Hall 3 › Generator yard"],["Camera default trade","Trade","Electrical (sample)"],["Camera default assignee","Assignee","Electrical Foreman (sample)"],["Reviewer severity","Priority","High"],["Note + OSHA ref + IDs","Description","…1926.100(a) · WS-1042 · SC alarm A-20417"],["Approved snapshot","Attachment","wsafe_WS-1042.jpg"]];
S[5]=()=>{const sent=ST.sent, on=ST.procoreOn;
 return wsc("int",`
  <div style="flex:1.15;min-width:0;display:flex;flex-direction:column;gap:9px">
   <div style="display:flex;align-items:center;gap:10px"><div><div style="font-size:18px;font-weight:800">Procore hand-off <span class="tag gray" style="vertical-align:3px">optional · per site</span></div><div class="muted" style="font-size:12.5px">Approved findings only. Off by default; the site's safety lead turns it on.</div></div>
    <div class="toggle ${on?"on":""}" id="tglProcore" style="margin-left:auto"><span class="sw"></span>Send approved findings to Procore</div></div>
   <div class="card" style="padding:0;overflow:hidden"><div style="padding:8px 12px 4px;font-weight:800;font-size:13px">WS-1042 → Procore Safety Observation · field mapping</div>
    <table class="t"><thead><tr><th>WSafe / Security Center source</th><th>Procore field</th><th>Value (illustrative)</th></tr></thead><tbody>
     ${MAP.map(([a,b,v])=>`<tr><td class="muted">${a}</td><td><b>${b}</b></td><td>${v}</td></tr>`).join("")}
    </tbody></table></div>
   <div style="display:flex;gap:8px;align-items:center">${sent?`<span class="tag green" style="font-size:12px;padding:5px 11px">✓ Sent · Observation #212 (mock)</span><button class="btn primary" data-go="6" style="margin-left:auto">Next: site risk map →</button>`
     :`<button class="btn" id="btnSkip">Skip · keep in Security Center only</button><button class="btn orange" id="btnSend" style="margin-left:auto" ${on?"":"disabled"}>Send to Procore →</button>`}</div>
  </div>
  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:9px">
   <div class="pmock"><div class="ph"><b>Procore</b><span>Sample Data Center · Hall 3 › Observations › ${sent?"#212":"new"}</span></div>
    <div class="pr">⚠ Generic mock of a Procore Observation, for illustration only. Not Procore's actual UI.</div>
    <div class="pb"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><b style="font-size:14px">${sent?"#212 · ":""}PPE missing — hard hat + hi-vis · Generator yard</b><span class="status-pill ${sent?"init":"draft"}" style="margin-left:auto">${sent?"Initiated":"Draft preview"}</span></div>
     <div style="display:flex;gap:10px"><div class="shot" style="width:170px;flex:0 0 170px;align-self:flex-start">${scene("genyard",{boxes:true,k:"p"})}</div>
      <dl class="kv" style="flex:1"><dt>Type</dt><dd>Safety</dd><dt>Hazard</dt><dd>PPE</dd><dt>Location</dt><dd>Hall 3 › Generator yard</dd><dt>Assignee</dt><dd>Electrical Foreman (sample)</dd><dt>Due</dt><dd>Next working day</dd><dt>Created by</dt><dd>WSafe AI (service account) on approval</dd></dl></div></div></div>
   ${sent?`<div class="steps fade-in">
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Snapshot uploaded to Photos</div><div class="s-d">Album “WSafe AI Detections”</div></div>${chip("pc","create")}</div>
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Safety Observation #212 created</div><div class="s-d">Procore notifies the assignee; status syncs back to WSafe</div></div>${chip("pc","create")}</div></div>`
    :`<div class="note"><span class="ic">i</span><div>Uses the same planned Procore connector shown in the WSafe AI + Procore prototype. Dismissed findings and all video stay out of Procore.</div></div>`}
  </div>`);};

/* ---------- Site risk heat map (Phase 2, illustrative) ---------- */
const HT={ppe:{l:"PPE missing",sev:1},excl:{l:"Exclusion-zone entry",sev:1.6}};
const ZONES=[
 {id:"Z1",n:"Generator yard",cam:"CAM-102",poly:"720,150 905,150 905,345 720,345",c:[812,248],hrs:300,k:{ppe:22,excl:9},tr:1.45,act:["Toolbox talk + PPE check at yard entry","PPE spot-check at the generator yard gate at shift start; add a hard-hat/vest sign at the gate."]},
 {id:"Z2",n:"Crane pick zone",cam:"CAM-106",poly:"440,24 700,24 700,128 440,128",c:[570,76],hrs:260,k:{excl:14,ppe:4},tr:1.2,act:["Lift-plan review + barricade check","Walk the EZ-3 barricade line with the lift director; confirm a spotter during picks."]},
 {id:"Z3",n:"Hall 3 · Level 2 deck",cam:"CAM-103",poly:"420,152 700,152 700,345 420,345",c:[560,250],hrs:280,k:{ppe:8,excl:2},tr:.9,act:["PPE refresher","5-minute PPE reminder for deck crews at the morning huddle."]},
 {id:"Z4",n:"North laydown",cam:"CAM-101",poly:"215,24 420,24 420,128 215,128",c:[318,76],hrs:300,k:{ppe:11,excl:3},tr:.8,act:["Toolbox talk","PPE toolbox talk for material handlers; check forklift travel lanes."]},
 {id:"Z5",n:"Gate 2 · Haul road",cam:"CAM-104",poly:"215,392 985,392 985,462 215,462",c:[600,427],hrs:310,k:{excl:6,ppe:4},tr:1.1,act:["Traffic plan review","Confirm pedestrian lane and flagger coverage at Gate 2."]},
 {id:"Z6",n:"Hall 2 perimeter (operating)",cam:"CAM-105",poly:"25,60 195,60 195,380 25,380",c:[110,220],hrs:330,k:{ppe:1,excl:1},tr:1,act:["No action suggested","Low activity; keep monitoring."]}
];
const HCAMS=[{id:"CAM-101",x:228,y:136,d:-35},{id:"CAM-102",x:712,y:356,d:-40},{id:"CAM-103",x:430,y:356,d:-45},{id:"CAM-104",x:205,y:470,d:-8},{id:"CAM-105",x:205,y:220,d:180},{id:"CAM-106",x:430,y:138,d:-30}];
function zCount(z,ty,win){const n=z.k[ty]||0; return win===7?Math.round(n*.26*z.tr):win===90?Math.round(n*2.8/Math.pow(z.tr,.35)):n;}
function zStats(z){const {win,type}=ST.hm, tys=type==="all"?Object.keys(HT):[type];
  const by=tys.map(t=>[t,zCount(z,t,win)]).filter(b=>b[1]>0).sort((a,b)=>b[1]-a[1]);
  const raw=tys.reduce((s,t)=>s+zCount(z,t,win)*HT[t].sev,0)*300/z.hrs;
  const ref=Math.max(...ZONES.map(q=>Object.keys(HT).reduce((s,t)=>s+zCount(q,t,win)*HT[t].sev,0)*300/q.hrs))||1;
  const n=by.reduce((s,b)=>s+b[1],0);
  return {score:raw/ref,n,by,dis:Math.round(n*.17),trend:Math.round((z.tr-1)*55),hrs:Math.round(z.hrs*win/30)};}
const lvl=s=>s>=.75?"High":s>=.5?"Elevated":s>=.22?"Moderate":"Low";
function heatCol(s){const st=[[0,[63,179,107]],[.4,[241,196,15]],[.7,[243,140,24]],[1,[229,83,61]]];let k=1;while(k<st.length-1&&s>st[k][0])k++;const [a0,c0]=st[k-1],[a1,c1]=st[k],f=Math.max(0,Math.min(1,(s-a0)/(a1-a0)));return `rgb(${c0.map((v,i)=>Math.round(v+(c1[i]-v)*f)).join(",")})`;}
function siteMap(){
  const sel=ST.hm.zone;
  const zs=ZONES.map(z=>[z,zStats(z)]);
  return `<svg class="hm-plan" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <defs>${zs.map(([z,s],i)=>`<radialGradient id="hg${i}"><stop offset="0" stop-color="${heatCol(s.score)}" stop-opacity="${(.25+.6*s.score).toFixed(2)}"/><stop offset=".55" stop-color="${heatCol(s.score)}" stop-opacity="${(.12+.3*s.score).toFixed(2)}"/><stop offset="1" stop-color="${heatCol(s.score)}" stop-opacity="0"/></radialGradient>`).join("")}
   <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#2c3842" stroke-width="3"/></pattern></defs>
  <rect width="1000" height="480" fill="#182026"/>
  <rect x="6" y="6" width="988" height="468" fill="none" stroke="#3a4852" stroke-width="2" stroke-dasharray="10 6"/>
  <rect x="0" y="392" width="1000" height="70" fill="#1f2930"/><line x1="0" y1="427" x2="1000" y2="427" stroke="#4b5a64" stroke-width="2" stroke-dasharray="16 12"/>
  <rect x="25" y="60" width="170" height="320" fill="#25313a" stroke="#4b5a64" stroke-width="2"/><text x="110" y="90" class="pl" text-anchor="middle">HALL 2</text><text x="110" y="105" class="pl sm" text-anchor="middle">OPERATING · LIVE</text>
  <rect x="420" y="152" width="280" height="193" fill="url(#hatch)" stroke="#5a6b76" stroke-width="2"/><text x="560" y="372" class="pl lg" text-anchor="middle">HALL 3 · UNDER CONSTRUCTION</text>
  <circle cx="570" cy="140" r="130" fill="none" stroke="#4b5a64" stroke-width="1.4" stroke-dasharray="4 6"/>
  <rect x="740" y="170" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/><rect x="820" y="170" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/><rect x="740" y="232" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/><rect x="820" y="232" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/>
  <text x="940" y="420" class="pl sm" text-anchor="end">HAUL ROAD</text><text x="226" y="455" class="pl sm">GATE 2</text>
  ${zs.map(([z,s],i)=>`<ellipse cx="${z.c[0]}" cy="${z.c[1]}" rx="${z.id==="Z5"?300:z.id==="Z6"?90:z.id==="Z2"||z.id==="Z4"?140:150}" ry="${z.id==="Z5"?52:z.id==="Z6"?140:z.id==="Z2"||z.id==="Z4"?75:120}" fill="url(#hg${i})" pointer-events="none"/>`).join("")}
  ${HCAMS.map(c=>{const a0=(c.d-28)*Math.PI/180,a1=(c.d+28)*Math.PI/180,r=110;return `<path d="M${c.x} ${c.y} L${(c.x+r*Math.cos(a0)).toFixed(1)} ${(c.y+r*Math.sin(a0)).toFixed(1)} A${r} ${r} 0 0 1 ${(c.x+r*Math.cos(a1)).toFixed(1)} ${(c.y+r*Math.sin(a1)).toFixed(1)} Z" fill="rgba(74,163,223,.08)" stroke="rgba(74,163,223,.35)" stroke-width="1" stroke-dasharray="4 4" pointer-events="none"/>
    <g transform="translate(${c.x},${c.y})"><rect x="-9" y="-7" width="15" height="14" rx="2" fill="#4aa3df" stroke="#0f1418" stroke-width="1.5"/><text x="0" y="-11" class="zl" style="font-size:9.5px" text-anchor="middle">${c.id}</text></g>`;}).join("")}
  ${zs.map(([z,s],i)=>`<g class="zone ${sel===z.id?"on":""}" data-zone="${z.id}"><polygon class="zp" points="${z.poly}" fill="rgba(255,255,255,.015)"/>
    <circle cx="${z.c[0]}" cy="${z.c[1]}" r="11" class="zb"/><text x="${z.c[0]}" y="${z.c[1]+4}" class="zn" text-anchor="middle">${i+1}</text>
    <text x="${z.c[0]}" y="${z.c[1]+27}" class="zl" text-anchor="middle">${z.n}</text></g>`).join("")}
  <g transform="translate(962,40)"><circle r="15" fill="#11171b" stroke="#4b5a64"/><path d="M0 -11 L5 5 L0 2 L-5 5 Z" fill="#cfe3ef"/></g>
  </svg>`;}
function heatPanel(){
  const z=ZONES.find(q=>q.id===ST.hm.zone);
  if(!z){const r=ZONES.map(q=>[q,zStats(q)]).sort((a,b)=>b[1].score-a[1].score);
    return `<div class="pane-h">Zones by relative risk<span class="sp"></span><span class="tg">${ST.hm.win} days</span></div><div style="padding:8px;overflow:auto">
     <div style="font-size:11.5px;color:var(--d-mu);margin:0 2px 7px">Click a zone on the map (or below) for details.</div>
     ${r.map(([q,s])=>`<div class="hz-row" data-zone="${q.id}"><span class="zb2">${ZONES.indexOf(q)+1}</span><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:12.5px">${q.n}</div><div style="font-size:11px;color:var(--d-mu)">${s.n} approved · ${q.cam}</div></div><span class="lv ${lvl(s.score)}">${lvl(s.score)}</span></div>`).join("")}</div>`;}
  const s=zStats(z), mx=Math.max(1,...s.by.map(b=>b[1]));
  return `<div class="pane-h">Zone ${ZONES.indexOf(z)+1} · ${z.cam}<span class="sp"></span><button class="dbtn" id="btnHmClose" style="padding:1px 7px;font-size:11px">✕</button></div>
   <div style="padding:9px 11px;overflow:auto">
    <div style="font-size:15px;font-weight:800;color:#fff">${z.n}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:6px"><span style="font-size:11px;color:var(--d-mu);font-weight:700;width:96px">Relative risk</span><div class="dbar" style="flex:1"><i style="width:${Math.round(s.score*100)}%"></i></div><b>${s.score.toFixed(2)}</b><span class="lv ${lvl(s.score)}">${lvl(s.score)}</span></div>
    <div class="dk"><div><div class="v">${s.n}</div><div class="l">Approved findings</div></div><div><div class="v" style="color:${s.trend>5?"#ff8a6e":s.trend<-5?"#7dd3a0":"#fff"}">${s.trend>5?"▲":s.trend<-5?"▼":"■"} ${Math.abs(s.trend)}%</div><div class="l">vs prior period</div></div><div><div class="v">${s.dis}</div><div class="l">Dismissed (false +)</div></div></div>
    <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--d-mu);font-weight:700;margin:4px 0 3px">By hazard type</div>
    ${s.by.map(([t,n])=>`<div class="hb"><span>${HT[t].l}</span><div class="dbar"><i style="width:${n/mx*100}%"></i></div><b>${n}</b></div>`).join("")||`<div style="font-size:11.5px;color:var(--d-mu)">No approved findings with this filter.</div>`}
    <div class="dnote" style="margin-top:8px"><b style="color:#ffd08a">Suggested: ${z.act[0]}</b><div>${z.act[1]}</div></div>
    <div style="display:flex;gap:6px;margin-top:8px"><button class="dbtn or" id="btnWalk">Schedule walk-down</button><button class="dbtn" id="btnZoneAl">Show alarms</button></div>
   </div>`;}
S[6]=()=>{const h=ST.hm, all=ZONES.map(zStats), n=all.reduce((s,x)=>s+x.n,0), dis=all.reduce((s,x)=>s+x.dis,0);
 return sd("map",`
  <div class="pane" style="flex:1;min-width:0">
   <div class="hm-ctl"><span style="font-size:12.5px;font-weight:800;color:#fff">Hall 3 expansion · site map</span><span class="lv Moderate" style="background:#4b3f86;color:#e6e0ff">WSafe hazard layer · Phase 2 (planned)</span><span class="sp" style="flex:1"></span>
    <div class="seg">${[7,30,90].map(w=>`<button data-hmwin="${w}" class="${h.win===w?"on":""}">${w} days</button>`).join("")}</div>
    <div class="seg">${[["all","All hazards"],["ppe","PPE"],["excl","Exclusion zone"]].map(([k,l])=>`<button data-hmtype="${k}" class="${h.type===k?"on":""}">${l}</button>`).join("")}</div></div>
   <div class="kpirow"><div><div class="v">${n}</div><div class="l">Approved findings · ${h.win} d</div></div><div><div class="v">${dis}</div><div class="l">Dismissed as false positive</div></div><div><div class="v">3.4 min</div><div class="l">Median alarm → review (sample)</div></div><div><div class="v">${Math.round(n*.62)}</div><div class="l">Sent to Procore (approved)</div></div></div>
   <div class="hm-wrap">${siteMap()}</div>
   <div class="hm-foot"><div class="lgbar"></div><span>Low → High relative risk (illustrative)</span><span style="flex:1"></span><span>Score = approved findings × severity ÷ camera coverage hours, relative within this site. Not a prediction.</span></div>
  </div>
  <div class="pane hm-panel">${heatPanel()}</div>`,{clock:"2:00:00 PM CT"});};

/* ---------- router ---------- */
let arriveT=null;
function render(){
  const n=ST.step, s=STEPS[n];
  $("#stage").innerHTML=S[n]();
  const wb=$("#wbar"); wb.classList.toggle("cover",n===0);
  $("#wNum").textContent=n; $("#wTtl").textContent=s.t; $("#wCap").textContent=s.c;
  $("#wApi").innerHTML=s.api.map(a=>chip(a[0],a[1])).join("");
  $("#bStep").textContent=n?`Walkthrough step ${n} of ${LAST}`:"Walkthrough";
  $("#prev").disabled=n<=1; $("#next").textContent=n>=LAST?"Restart ↺":"Next →";
  $("#dots").innerHTML=STEPS.slice(1).map((_,i)=>`<span class="${i+1===n?"on":""}" data-go="${i+1}"></span>`).join("");
  const tt=$("#toast"); tt.classList.toggle("top",n===3); tt.classList.toggle("right",n===4);
  document.title=`WSafe AI + Genetec Security Center prototype · ${n?n+". ":""}${s.t}`;
}
function go(n){
  n=Math.max(0,Math.min(LAST,+n));
  clearTimeout(arriveT);
  if(n>=2) ST.arrived=true;
  if(n>=4) ST.approved=true;
  if(n>=5) ST.acked=true;
  if(n<4){ST.approved=false; ST.acked=false;}
  if(n<5) ST.sent=false;
  if(n===1 && !ST.arrived){ arriveT=setTimeout(()=>{ if(ST.step===1){ST.arrived=true;render();toast("New alarm from the WSafe connector: PPE – hard hat missing on CAM-102 (sample)");}}, window.__arriveMs ?? 1800); }
  ST.step=n; if(location.hash!=="#s"+n) history.replaceState(null,"","#s"+n); render();
}
window.go=go; window.ST=ST; window.render=render;
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-go]"); if(g){go(g.dataset.go);return;}
  const mt=e.target.closest("[data-mtab]"); if(mt){ if(mt.dataset.mtab==="live"){toast("Live view of CAM-102 opens in a tile (native Security Desk behavior, mock)");return;} ST.mtab=mt.dataset.mtab;render();return;}
  const sl=e.target.closest("[data-sel]"); if(sl){ST.sel=sl.dataset.sel;render();return;}
  const hw=e.target.closest("[data-hmwin]"); if(hw){ST.hm.win=+hw.dataset.hmwin;render();return;}
  const ht=e.target.closest("[data-hmtype]"); if(ht){ST.hm.type=ht.dataset.hmtype;render();return;}
  const hz=e.target.closest("[data-zone]"); if(hz){ST.hm.zone=hz.dataset.zone;render();return;}
  const tg=e.target.closest("#tglProcore"); if(tg&&!ST.sent){ST.procoreOn=!ST.procoreOn;render();toast(ST.procoreOn?"Procore hand-off on for this site (mock)":"Procore hand-off off: approved findings stay in WSafe and Security Center");return;}
  const id=e.target.closest("button")&&e.target.closest("button").id;
  if(id==="btnOpenReview"){toast("Opening the WSafe review page from the alarm link (mock)");ST.sel="WS-1042";setTimeout(()=>go(3),500);}
  if(id==="btnAckEarly"){toast("Ack marks the alarm as seen. The approve/dismiss decision stays with the WSafe reviewer — open the review to continue.");}
  if(id==="btnDismiss"){const d=det(); if(d.id==="WS-1042"){toast("In this walkthrough, approve WS-1042. Try dismissing WS-1043 instead.");} else {ST.dismissed[d.id]=true;ST.sel="WS-1042";render();toast(`${d.id} dismissed: alarm ${d.alarm} closed as a false positive in Security Center. Nothing sent to Procore.`);}}
  if(id==="btnApprove"){const d=det(); if(d.id!=="WS-1042"){toast("The walkthrough continues with WS-1042, opening it");ST.sel="WS-1042";render();return;} const b=$("#btnApprove"); b.textContent="Posting decision to Security Center…"; b.disabled=true; setTimeout(()=>{ST.approved=true;go(4);},900);}
  if(id==="btnAck"){ST.acked=true;render();toast("Alarm acknowledged · incident entry INC-0317 created (planned, mock)");}
  if(id==="btnSend"){const b=$("#btnSend"); b.textContent="Sending…"; b.disabled=true; setTimeout(()=>{ST.sent=true;render();toast("Photo + Safety Observation #212 created in Procore (mock)");},800);}
  if(id==="btnSkip"){toast("Kept in Security Center + WSafe only. Nothing sent to Procore.");}
  if(id==="btnHmClose"){ST.hm.zone=null;render();}
  if(id==="btnWalk"){toast("Walk-down task drafted for the safety lead (planned, mock)");}
  if(id==="btnZoneAl"){toast("Would open Alarm monitoring filtered to this zone's WSafe alarms (planned)");}
});
document.addEventListener("change",e=>{ if(e.target.id==="vest"){ST.vest=e.target.checked;render();} });
document.addEventListener("keydown",e=>{if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName))return;
  if(e.key==="ArrowRight")go(ST.step>=LAST?0:ST.step+1); if(e.key==="ArrowLeft"&&ST.step>1)go(ST.step-1);});
$("#prev").onclick=()=>go(ST.step-1); $("#next").onclick=()=>go(ST.step>=LAST?0:ST.step+1);
if(/[?&]capture=1/.test(location.search)) document.body.classList.add("capture");
if(/[?&]shots=1/.test(location.search)) document.body.classList.add("shots");
const m=location.hash.match(/#s(\d)/); go(m?+m[1]:0);
window.addEventListener("hashchange",()=>{const m=location.hash.match(/#s(\d)/);if(m&&+m[1]!==ST.step)go(+m[1]);});
})();
