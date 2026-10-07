/* WSafe AI + Genetec Security Center — clickable concept prototype (planned design, not yet deployed).
   All data below is ILLUSTRATIVE SAMPLE DATA. No network calls; nothing connects to Security Center or Procore.
   The operator-console screens are a generic dark VMS look inspired by an operator client; they are not
   Genetec's actual UI and use no Genetec logos or marks.
   Hazard taxonomy: seeded from WorkSafeAgent's provisional patent 63/992,261 (§6.3.3 classifier ensemble:
   fall protection, PPE, electrical, scaffolding & ladders, housekeeping & egress; §6.5 data-center hazards)
   and the Procore prototype's hazard types, extended with OSHA Focus Four and other OSHA construction topics.
   MVP = PPE (hard hat, hi-vis) + exclusion-zone entry, per the Genetec SDK integration brief; everything else is planned. */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const LOGO = "assets/wsafeai-logo.png";

/* ---------- walkthrough script (also used for the PDF + video captions) ---------- */
const STEPS = [
 {t:"WSafe AI + Genetec Security Center — concept prototype walkthrough", c:"", one:"", api:[]},
 {t:"Security Desk — WSafe alarms across hazard classes",
  one:"WSafe alarms from several hazard classes (falls, struck-by, electrical, PPE, housekeeping) sit in the operator's normal alarm list; a new PPE alarm arrives.",
  c:"Each hazard class is its own custom event with a default priority, so falls, struck-by, electrical, PPE, and housekeeping alarms land in the normal alarm list. A new PPE alarm arrives.",
  api:[["sc","RTSP in"],["sc","Raise custom event (per class)"],["sc","Trigger alarm"]]},
 {t:"Alarm detail — snapshot, boxes, class, confidence, camera, time",
  one:"The alarm shows the snapshot with bounding boxes, hazard class and sub-hazard, confidence, priority, camera/area, and the true detection time.",
  c:"The alarm carries the hazard class and sub-hazard, confidence, priority, camera and area, and a review link. A bookmark pins the true detection time so anyone can replay the moment.",
  api:[["sc","Add bookmark"],["sc","Alarm · camera + review URL"]]},
 {t:"WSafe AI review — every hazard class, approve or dismiss",
  one:"Human in the loop: a safety reviewer approves or dismisses candidates from every hazard class, each with sub-hazard, OSHA reference, confidence, and severity.",
  c:"Candidates from every class, each with sub-hazard, suggested OSHA reference, confidence, and severity. A safety reviewer confirms, edits, or dismisses; operators never decide compliance.",
  api:[["ws","WSafe review queue"],["none","No write until a human decides"]]},
 {t:"Decision posted back — alarm acknowledged + incident entry",
  one:"WSafe posts the decision to the alarm; the operator acknowledges and an incident entry records the evidence.",
  c:"WSafe posts the reviewer's decision back to the alarm. The operator acknowledges it, and an incident entry (planned) records the snapshot link, bookmark, and reviewer note.",
  api:[["sc","Raise event “finding approved”"],["sc","Event stream · ack"],["ph2","Incident entry · planned"]]},
 {t:"Procore hand-off — hazard classes mapped to Observations",
  one:"Each hazard class maps to the Procore Observation type, hazard, and priority; approved findings can become Safety Observations.",
  c:"Each WSafe hazard class maps to the Procore Observation type, the customer's Hazard list, and a priority. Only approved findings are sent, and the hand-off is set per site.",
  api:[["pc","Create Photo"],["pc","Create Observation"]]},
 {t:"Hazard classes & analytics — 10 classes, MVP vs planned",
  one:"The taxonomy: 10 hazard classes and 35 sub-hazards with detection signals, default severity, OSHA reference, and MVP vs planned status, plus per-class analytics.",
  c:"Ten OSHA-grounded classes, including the Focus Four, with 35 sub-hazards. The MVP covers PPE (hard hat, hi-vis) and exclusion-zone entry; the rest are roadmap. Analytics compare approval rates by class.",
  api:[["ws","Taxonomy + review outcomes"],["sc","One custom event per class"]]},
 {t:"Site risk heat map — by zone and hazard class (Phase 2)",
  one:"Approved findings roll up by zone and hazard class into a relative risk map for targeting walk-downs and toolbox talks.",
  c:"Filter by hazard class to see where approved findings concentrate; each zone breaks down by class. Planned as a Security Desk map layer showing where hazards were seen, not a prediction.",
  api:[["ws","Approved findings only"],["ph2","Map layer · Phase 2"]]}
];
const LAST = STEPS.length-1;
window.STEPS = STEPS;

/* ---------- hazard taxonomy ---------- */
const STL = {mvp:"MVP", p2:"Phase 2", later:"Planned", res:"Research"};
const PW = {1:2, 2:1.5, 3:1, 4:.6};               // severity weight for heat map
const PRC = {1:"Urgent", 2:"High", 3:"Medium", 4:"Low"}; // Procore priority mapping (illustrative)
const HC = [
 {id:"fall", s:"Falls", code:"FALL", l:"Falls & fall protection", ff:true, pri:1, st:"p2", col:"#e5533d", pc:"Fall protection", trade:"Concrete / Steel",
  sig:"Person + edge/opening segmentation; guardrail, harness and ladder-geometry detection",
  subs:[["Unprotected side / leading edge","1926.501(b)(1)","p2"],["Missing or incomplete guardrail","1926.502(b)","p2"],["Uncovered floor hole / opening","1926.501(b)(4)","p2"],["No tie-off at height","1926.502(d)","later"],["Ladder misuse (rails < 3 ft above landing, top step)","1926.1053(b)","p2"],["Scaffold missing guardrail / toe board","1926.451(g)","later"]]},
 {id:"struck", s:"Struck-by", code:"STRUCK", l:"Struck-by", ff:true, pri:1, st:"p2", col:"#ef7d22", pc:"Struck-by", trade:"Crane / Earthwork",
  sig:"Equipment detection + tracking; swing-radius polygons; hook/load detection; person-to-vehicle distance",
  subs:[["Worker in equipment swing radius / travel path","1926.1424(a) · Subpart O","p2"],["Worker under suspended load","1926.1425","p2"],["Vehicle–pedestrian proximity / backing","1926.601(b)(4)","p2"],["Falling objects / unsecured materials at height","1926.502(j)","later"]]},
 {id:"caught", s:"Caught-in / between", code:"CAUGHT", l:"Caught-in / between", ff:true, pri:1, st:"later", col:"#a8673a", pc:"Caught-in/between", trade:"Earthwork",
  sig:"Excavation segmentation; shoring / trench-box detection; edge setback; moving-part proximity",
  subs:[["Trench ≥ 5 ft without protective system","1926.652(a)(1)","later"],["Spoil / materials within 2 ft of edge","1926.651(j)(2)","later"],["Pinch points near moving equipment","Subpart O","later"]]},
 {id:"elec", s:"Electrical", code:"ELEC", l:"Electrical", ff:true, pri:1, st:"later", col:"#e3b51e", dark:true, pc:"Electrical", trade:"Electrical",
  sig:"Panel-door state; arc-flash suit detection; person-to-panel proximity; LOTO boundary polygon",
  subs:[["Open panel / energized work without arc-flash PPE","1910.333 · 1926.416(a)","later"],["Exposed live conductors","Subpart K","later"],["Damaged cords / cables","1926.416(e)(1)","later"],["Entry into LOTO / energized-work boundary","1910.147 · 1926.417","later"]]},
 {id:"ppe", s:"PPE", code:"PPE", l:"Personal protective equipment", pri:3, st:"mvp", col:"#24a39a", pc:"PPE", trade:"Camera default",
  sig:"Person detection + PPE attribute classifiers (head, torso, hands, eyes); P2 when ≥ 2 items missing or near equipment",
  subs:[["Hard hat missing","1926.100(a)","mvp"],["Hi-vis vest missing","Site rule · 1926.651(d)","mvp"],["Eye / face protection missing","1926.102(a)(1)","later"],["Gloves / hand protection missing","1926.95 · 1910.138","later"],["Harness not worn where required","1926.502(d)","later"]]},
 {id:"zone", s:"Exclusion-zone intrusion", code:"ZONE", l:"Restricted / exclusion-zone intrusion", pri:2, st:"mvp", col:"#8e6ad8", pc:"Struck-by / restricted area", trade:"Camera default",
  sig:"Person detection inside customer-drawn polygons per camera, with optional schedules",
  subs:[["Person inside configured exclusion zone","Site rule · 1926.1424(a)(2)","mvp"],["Unauthorized / after-hours area entry","Site rule","p2"]]},
 {id:"house", s:"Housekeeping & slip/trip", code:"HOUSE", l:"Housekeeping & slip / trip", pri:3, st:"p2", col:"#5b97d6", pc:"Housekeeping", trade:"General Contractor",
  sig:"Walkway polygons + clutter / object segmentation; liquid-sheen detection",
  subs:[["Debris / materials in walkway","1926.25(a)","p2"],["Cords / hoses across walkway","1926.25(a)","p2"],["Standing water / spill","Subpart C (1926.25)","later"]]},
 {id:"fire", s:"Fire & hot work", code:"FIRE", l:"Fire & hot work", pri:1, st:"later", col:"#d6336c", pc:"Fire prevention", trade:"Mechanical / Steel",
  sig:"Smoke / flame classifier with VLM confirmation; spark detection + fire-watch presence; extinguisher occlusion",
  subs:[["Smoke or open flame","Subpart F","later"],["Hot work without fire watch","1926.352","later"],["Blocked / missing fire extinguisher","1926.150(c)","later"]]},
 {id:"egress", s:"Confined space & egress", code:"EGRESS", l:"Confined space & egress", pri:2, st:"later", col:"#3fb36b", pc:"Egress / confined space", trade:"Mechanical",
  sig:"Exit / door-area occlusion; confined-space portal + attendant presence",
  subs:[["Blocked exit / egress route","1926.34(c)","later"],["Confined-space entry without attendant","Subpart AA (1926.1209) · 1910.146","later"]]},
 {id:"health", s:"Ergonomics & heat stress", code:"HEALTH", l:"Ergonomics & heat stress", pri:4, st:"res", col:"#8d9aa3", pc:"Ergonomics", trade:"Camera default",
  sig:"Pose estimation (lift posture, arms-overhead duration); heat indicators need ambient data (research)",
  subs:[["Improper lift / manual-handling posture","No specific standard · General Duty Clause","res"],["Sustained overhead work posture","General Duty Clause","res"],["Heat-stress indicators","General Duty Clause · OSHA heat NEP","res"]]}
];
const HCM = Object.fromEntries(HC.map(h=>[h.id,h]));
const NSUB = HC.reduce((s,h)=>s+h.subs.length,0);
window.HC = HC;
const hchip = (id,extra)=>{const h=HCM[id];return `<span class="hc" style="background:${h.col};color:${h.dark?"#1d1a0a":"#fff"}">${h.code}${extra?` ${extra}`:""}</span>`;};
const stp = st=>`<span class="stp ${st}">${STL[st]}</span>`;

/* ---------- illustrative sample data ---------- */
const ST = {step:0, arrived:false, sel:"WS-1042", dismissed:{}, ok:{}, approved:false, acked:false, sent:false, procoreOn:true, vest:true,
  hm:{win:30,cls:"all",zone:null}, mtab:"snap", hcSel:"fall", hcView:"tax"};
const CAMS = [
 {id:"CAM-101", n:"Hall 3 · North laydown", scene:"house"},
 {id:"CAM-102", n:"Hall 3 · Generator yard", scene:"genyard"},
 {id:"CAM-103", n:"Hall 3 · Level 2 deck east", scene:"edge"},
 {id:"CAM-104", n:"Gate 2 · Haul road", scene:"gate"},
 {id:"CAM-105", n:"Hall 3 · Electrical room B", scene:"elec"},
 {id:"CAM-106", n:"Hall 3 · Crane pick zone", scene:"load"}
];
const camN = id => ({"CAM-107":"Hall 3 · East utility trench"})[id] || (CAMS.find(c=>c.id===id)||{}).n || id;
/* review candidates (WSafe queue) */
const DET = [
 {id:"WS-1042", alarm:"A-20417", cls:"ppe", sub:0, ev:"WSafe: PPE – hard hat missing", hz:"Hard hat + hi-vis vest missing", cam:"CAM-102", zone:"Generator yard", scene:"genyard", conf:0.87, conf2:0.79, t:"10:41:07 AM", pri:2, note:"Confirmed: worker in generator yard without hard hat or vest. Foreman notified by radio."},
 {id:"WS-1043", alarm:"A-20418", cls:"zone", sub:0, ev:"WSafe: Exclusion zone – person inside EZ-3", hz:"Person inside exclusion zone EZ-3", cam:"CAM-106", zone:"Crane pick zone (EZ-3)", scene:"excl", conf:0.81, t:"10:42:30 AM", pri:2, note:"Worker inside EZ-3 during the pick."},
 {id:"WS-1041", alarm:"A-20416", cls:"fall", sub:0, ev:"WSafe: Falls – unprotected edge", hz:"Worker at unprotected deck edge", cam:"CAM-103", zone:"Level 2 deck east", scene:"edge", conf:0.90, t:"10:38:44 AM", pri:1, note:"Guardrail section removed at L2 east edge; worker within 6 ft."},
 {id:"WS-1040", alarm:"A-20414", cls:"struck", sub:1, ev:"WSafe: Struck-by – under suspended load", hz:"Worker under suspended load", cam:"CAM-106", zone:"Crane pick zone", scene:"load", conf:0.84, t:"10:36:10 AM", pri:1, note:"Worker passed under the load during the pick."},
 {id:"WS-1044", alarm:"A-20412", cls:"elec", sub:0, ev:"WSafe: Electrical – open panel, no arc-flash PPE", hz:"Open panel, no arc-flash PPE", cam:"CAM-105", zone:"Electrical room B", scene:"elec", conf:0.79, t:"10:31:02 AM", pri:1, note:"Panel PP-3B open with worker in front, no arc-flash suit visible."},
 {id:"WS-1046", alarm:"A-20409", cls:"caught", sub:0, ev:"WSafe: Caught-in – trench without protection", hz:"Trench without protective system", cam:"CAM-107", zone:"East utility trench", scene:"trench", conf:0.74, t:"10:22:31 AM", pri:1, note:"No trench box or shoring visible; worker inside."},
 {id:"WS-1045", alarm:"A-20411", cls:"fire", sub:1, ev:"WSafe: Fire – hot work without fire watch", hz:"Hot work without fire watch", cam:"CAM-103", zone:"Level 2 deck east", scene:"hot", conf:0.72, t:"10:28:40 AM", pri:2, note:"Cutting with sparks falling to L1; no fire watch visible."},
 {id:"WS-1038", alarm:"A-20408", cls:"house", sub:1, ev:"WSafe: Housekeeping – cords across walkway", hz:"Cords / hoses across walkway", cam:"CAM-101", zone:"North laydown", scene:"house", conf:0.76, t:"10:19:40 AM", pri:3, note:"Extension cords across the main walkway near the container."}
];
const det = id => DET.find(d=>d.id===(id||ST.sel))||DET[0];
/* Security Desk alarm list (sorted by priority, then time) */
const ALARMS = [
 {det:"WS-1041", pri:1, src:"CAM-103 · L2 deck east", st:"act"},
 {det:"WS-1040", pri:1, src:"CAM-106 · Crane pick zone", st:"act"},
 {det:"WS-1044", pri:1, src:"CAM-105 · Electrical room B", st:"ack"},
 {det:"WS-1043", pri:2, src:"CAM-106 · Crane pick zone", st:"act", late:true},
 {det:"WS-1042", pri:2, src:"CAM-102 · Generator yard", st:"act", isNew:true},
 {id:"A-20405", cls:"struck", ev:"WSafe: Struck-by – vehicle–pedestrian proximity", pri:2, src:"CAM-104 · Gate 2", t:"10:27:15 AM", st:"ack", ws:"ok"},
 {det:"WS-1038", pri:3, src:"CAM-101 · North laydown", st:"ack"},
 {id:"A-20415", ev:"Door held open — Hall 2 · Door 2-14", pri:3, src:"Access control (sample)", t:"10:33:51 AM", st:"ack"}
];
/* per-class review outcomes, last 30 days (sample; planned classes are simulated) */
const AN = {fall:{rate:.71,tr:18,sp:[4,5,6,5,7,8,9,10]}, struck:{rate:.74,tr:9,sp:[5,6,5,7,6,7,8,8]}, caught:{rate:.71,tr:-6,sp:[4,3,4,3,3,3,2,3]},
 elec:{rate:.73,tr:4,sp:[3,4,4,5,4,5,5,5]}, ppe:{rate:.79,tr:-12,sp:[16,15,14,13,13,12,11,11]}, zone:{rate:.80,tr:3,sp:[7,8,8,9,8,9,9,9]},
 house:{rate:.64,tr:-4,sp:[11,10,10,9,10,9,9,9]}, fire:{rate:.64,tr:0,sp:[2,2,3,2,2,2,3,2]}, egress:{rate:.67,tr:10,sp:[1,2,1,2,2,2,2,3]}, health:{rate:.43,tr:0,sp:[2,2,3,2,2,3,2,2]}};

/* ---------- placeholder imagery (generic, faceless SVG figures; no real people or sites) ---------- */
function worker(x,y,o={}){
  const s=o.s||1, hat=o.hat!==false, vest=o.vest!==false;
  return `<g transform="translate(${x},${y}) scale(${s})">
   <rect x="-9" y="-40" width="7" height="40" rx="3" fill="#3b4750"/><rect x="2" y="-40" width="7" height="40" rx="3" fill="#3b4750"/>
   <rect x="-13" y="-82" width="26" height="45" rx="7" fill="${o.suit||(vest?"#c6d63a":"#6a5f57")}"/>${vest&&!o.suit?`<rect x="-13" y="-62" width="26" height="4" fill="#e9eef0" opacity=".85"/>`:""}
   <rect x="-20" y="-80" width="7" height="34" rx="3" fill="#56636c" transform="rotate(${o.arm||8} -16 -80)"/><rect x="13" y="-80" width="7" height="34" rx="3" fill="#56636c" transform="rotate(${-(o.arm2??o.arm??8)} 16 -80)"/>
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
  const bb = !!o.boxes, K=kind+(o.k||"");
  const sky=(a,b)=>`<defs><linearGradient id="sk${K}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="360" fill="url(#sk${K})"/>`;
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
  } else if(kind==="excl"||kind==="load"){
    g+=sky("#a7bfcc","#e6ecef")+`<rect x="0" y="210" width="640" height="150" fill="#b7a98e"/>
     <rect x="30" y="40" width="10" height="170" fill="#e1a21a"/><line x1="35" y1="44" x2="330" y2="24" stroke="#e1a21a" stroke-width="7"/><line x1="35" y1="44" x2="0" y2="52" stroke="#e1a21a" stroke-width="7"/>`;
    if(kind==="excl"){
      g+=`<line x1="250" y1="28" x2="250" y2="120" stroke="#3a3a3a" stroke-width="2"/><rect x="222" y="120" width="56" height="26" fill="#8a6a45" stroke="#5c4429"/>
       <polygon points="150,236 510,236 610,348 50,348" fill="rgba(255,90,54,.16)" stroke="#ff5a36" stroke-width="2.5" stroke-dasharray="12 7"/>
       <text x="330" y="226" font-family="Arial" font-size="11" font-weight="700" fill="#b23a1c" text-anchor="middle">EZ-3 · configured exclusion zone (load path)</text>
       <g fill="#e8632b">${[[150,236],[510,236],[50,346],[600,346]].map(([x,y])=>`<polygon points="${x-8},${y} ${x},${y-22} ${x+8},${y}"/>`).join("")}</g>
       <g><rect x="420" y="250" width="150" height="34" rx="6" fill="#e1a21a"/><rect x="500" y="214" width="46" height="38" rx="4" fill="#d18f10"/><rect x="508" y="220" width="30" height="20" fill="#9cc3d4"/>
        <circle cx="446" cy="290" r="14" fill="#2d2d2d"/><circle cx="548" cy="290" r="14" fill="#2d2d2d"/><line x1="440" y1="256" x2="360" y2="200" stroke="#d18f10" stroke-width="10"/></g>
       ${worker(270,330,{s:1.05,arm:18})}${worker(90,226,{s:.6})}`;
      if(bb) g+=box(244,206,54,130,"Inside EZ-3 · 0.81","#ff5a36","right");
    } else {
      g+=`<line x1="300" y1="26" x2="300" y2="150" stroke="#3a3a3a" stroke-width="2"/><path d="M294 150 q6 10 12 0" stroke="#3a3a3a" stroke-width="3" fill="none"/>
       <line x1="300" y1="156" x2="250" y2="176" stroke="#3a3a3a" stroke-width="1.5"/><line x1="300" y1="156" x2="350" y2="176" stroke="#3a3a3a" stroke-width="1.5"/>
       <rect x="230" y="176" width="140" height="22" fill="#7f8b93" stroke="#55606a"/><rect x="230" y="198" width="140" height="10" fill="#6c7780"/>
       <ellipse cx="300" cy="330" rx="90" ry="14" fill="rgba(0,0,0,.18)"/>
       ${worker(300,334,{s:1.05,arm:20})}${worker(520,300,{s:.85,arm:40,arm2:40})}`;
      if(bb) g+=box(222,168,156,48,"Suspended load · 0.84","#ef7d22")+box(276,222,50,116,"Worker below","#e5533d","right");
    }
  } else if(kind==="edge"||kind==="hot"){
    g+=sky("#9db7c6","#e3eaee")+`<rect x="0" y="250" width="640" height="110" fill="#b9a98f"/>
     <g fill="#c9cdd0"><rect x="40" y="90" width="18" height="160"/><rect x="200" y="90" width="18" height="160"/><rect x="360" y="90" width="18" height="160"/></g>
     <polygon points="0,205 470,205 470,222 0,222" fill="#9aa2a7"/><polygon points="0,180 470,180 470,205 0,205" fill="#d4d7d9"/><rect x="0" y="70" width="470" height="20" fill="#a7afb4"/>
     <rect x="470" y="180" width="170" height="70" fill="url(#sk${K})" opacity=".6"/><rect x="520" y="230" width="90" height="20" fill="#8d969b"/>`;
    if(kind==="edge"){
      g+=`<g stroke="#e8c20f" stroke-width="4"><line x1="0" y1="150" x2="300" y2="150"/><line x1="0" y1="166" x2="300" y2="166"/></g><g stroke="#e8c20f" stroke-width="5"><line x1="300" y1="140" x2="300" y2="182"/></g>
       ${worker(150,182,{s:.9})}${worker(440,182,{s:.95,arm:20})}`;
      if(bb) g+=box(300,96,180,94,"Unprotected edge · 0.90","#e5533d");
    } else {
      g+=`<g stroke="#e8c20f" stroke-width="4"><line x1="0" y1="150" x2="470" y2="150"/><line x1="0" y1="166" x2="470" y2="166"/></g>
       ${worker(330,182,{s:.95,arm:60,suit:"#4b5a63",hc:"#2f3b44"})}<rect x="354" y="120" width="10" height="10" fill="#ffd25a"/>
       ${Array.from({length:22},(_,i)=>{const a=(i*37)%100/100, x=360+((i*53)%60)-20, y=130+((i*29)%100);return `<circle cx="${x}" cy="${y+a*40}" r="${1.5+a*1.5}" fill="#ffb02e"/>`;}).join("")}
       <rect x="330" y="215" width="60" height="30" fill="#c08a3e" opacity=".8"/>`;
      if(bb) g+=box(300,104,110,140,"Hot work · 0.72","#d6336c")+box(60,120,180,60,"No fire watch seen","#d6336c");
    }
  } else if(kind==="house"){
    g+=sky("#9fb6c3","#e5ebee")+`<rect x="0" y="230" width="640" height="130" fill="#c2b08f"/>
     <polygon points="200,230 440,230 560,360 80,360" fill="#d9ccb0"/><text x="320" y="246" font-family="Arial" font-size="10" font-weight="700" fill="#8a7a55" text-anchor="middle">MAIN WALKWAY</text>
     <g fill="#6e7c86"><rect x="20" y="140" width="170" height="92"/><rect x="28" y="150" width="154" height="10" fill="#8a98a1"/></g>
     <g fill="#b1784a"><rect x="460" y="206" width="160" height="12"/><rect x="460" y="220" width="160" height="12"/></g>
     <path d="M60 300 C 200 280, 260 330, 400 300 S 560 320, 620 290" stroke="#f28a1e" stroke-width="5" fill="none"/><path d="M40 320 C 180 340, 300 300, 600 335" stroke="#2f6db5" stroke-width="5" fill="none"/>
     <rect x="280" y="262" width="40" height="14" fill="#8f9aa1" transform="rotate(12 300 270)"/><rect x="350" y="282" width="30" height="10" fill="#9c7a52"/>
     ${worker(470,300,{s:.9})}`;
    if(bb) g+=box(60,272,560,74,"Cords / hoses across walkway · 0.76","#5b97d6");
  } else if(kind==="gate"){
    g+=sky("#a3bac7","#e7edf0")+`<rect x="0" y="200" width="640" height="160" fill="#b3ab9b"/><polygon points="250,200 390,200 640,360 0,360" fill="#7f868b"/>
     <line x1="320" y1="210" x2="320" y2="360" stroke="#e8e8e8" stroke-width="4" stroke-dasharray="18 14"/>
     <rect x="96" y="150" width="70" height="60" fill="#d6dde1" stroke="#8a97a0"/><rect x="106" y="162" width="24" height="18" fill="#9cc3d4"/>
     <g><rect x="330" y="180" width="160" height="60" fill="#e8e9ea" stroke="#8a97a0"/><rect x="490" y="196" width="50" height="44" fill="#2f6db5"/><rect x="502" y="204" width="28" height="16" fill="#9cc3d4"/><circle cx="360" cy="246" r="12" fill="#2d2d2d"/><circle cx="460" cy="246" r="12" fill="#2d2d2d"/><circle cx="520" cy="246" r="12" fill="#2d2d2d"/></g>
     ${worker(300,262,{s:.8})}`;
  } else if(kind==="elec"){
    g+=`<rect width="640" height="360" fill="#d0d5d8"/><rect x="0" y="0" width="640" height="150" fill="#c3c9cc"/><rect x="0" y="300" width="640" height="60" fill="#a5adb1"/>
     <g fill="#59656c"><rect x="60" y="120" width="90" height="180"/><rect x="160" y="120" width="90" height="180"/></g>
     <rect x="300" y="110" width="120" height="190" fill="#7d8a92" stroke="#4b565d" stroke-width="2"/><rect x="312" y="124" width="96" height="160" fill="#2a3238"/>
     ${Array.from({length:6},(_,i)=>`<rect x="322" y="${134+i*24}" width="76" height="12" fill="#c9a227"/>`).join("")}
     <polygon points="420,110 470,124 470,290 420,300" fill="#97a3aa" stroke="#4b565d" stroke-width="2"/>
     <polygon points="300,96 340,70 380,96 340,104" fill="#f2c230" stroke="#9b7a10"/><text x="340" y="94" font-family="Arial" font-size="16" font-weight="900" fill="#222" text-anchor="middle">⚡</text>
     ${worker(520,300,{s:1,arm:-30,arm2:50})}`;
    if(bb) g+=box(296,106,180,198,"Panel open · 0.79","#e3b51e")+box(490,176,60,128,"No arc-flash PPE","#e5533d","left");
  } else if(kind==="trench"){
    g+=sky("#a9bfcb","#e5ebee")+`<rect x="0" y="170" width="640" height="190" fill="#b49a76"/>
      <polygon points="140,200 500,200 470,330 170,330" fill="#7a6248"/><polygon points="170,330 470,330 470,345 170,345" fill="#5f4b36"/>
      <path d="M520 205 q50 -70 110 0 z" fill="#9c8262"/>
      <rect x="40" y="140" width="80" height="40" rx="4" fill="#e1a21a"/><rect x="90" y="120" width="10" height="30" fill="#e1a21a" transform="rotate(30 95 120)"/>
      ${worker(320,325,{s:.9})}`;
    if(bb) g+=box(160,198,320,140,"No protective system · 0.74","#a8673a");
  }
  return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${g}</svg>`;
}
window.scene = scene;

/* ---------- helpers ---------- */
const KN = {sc:"SC", ws:"WSAFE", pc:"PROCORE", none:"—", ph2:"PHASE 2"};
const chip = (k,txt)=>`<span class="chip c-${k}"><i>${KN[k]}</i>${txt?` ${txt}`:""}</span>`;
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.toggle("top",ST.step===3||ST.step===6);t.classList.toggle("right",ST.step===4);t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),3000);}
const sub = d => HCM[d.cls].subs[d.sub];
const cls = d => (ST.ov[d.id]&&ST.ov[d.id].cls)||d.cls;
const subI = d => ST.ov[d.id]? ST.ov[d.id].sub : d.sub;
ST.ov = {};

/* ---------- operator console chrome (generic) ---------- */
function alarmList(){
  return ALARMS.filter(a=>!(a.isNew&&!ST.arrived)&&!(a.late&&ST.step<2)).map(a=>{
    const d=a.det?det(a.det):null;
    const r={pri:a.pri, cls:d?d.cls:a.cls, ev:d?d.ev:a.ev, src:a.src, t:d?d.t:a.t, id:d?d.alarm:a.id, det:a.det, isNew:a.isNew, wsafe:!!(d||a.cls)};
    const ok = d && (ST.ok[d.id] || (d.id==="WS-1042"&&ST.approved));
    const no = d && ST.dismissed[d.id];
    r.ws = !r.wsafe ? "" : no ? "no" : ok ? "ok" : (a.ws||"rev");
    r.st = no ? "inv" : (d&&d.id==="WS-1042"&&ST.acked) ? "ack" : a.st;
    return r;});
}
function sd(task, inner, extra){
  const nAct = alarmList().filter(a=>a.st==="act").length;
  const tabs=[["mon","Monitoring",1],["alm","Alarm monitoring",ST.approved?4:2],["map","Maps",7],["inc","Incidents",4]];
  return `<div class="sd fade-in">
   <div class="sd-top"><div class="sd-app"><span class="ico"><i></i><i></i><i></i><i></i></span>Security Desk <small>generic mock</small></div>
    ${tabs.map(([k,l,g])=>`<div class="sd-tab ${task===k?"on":""}" data-go="${g}">${l}${k==="alm"&&nAct>0?` <span class="cnt">${nAct}</span>`:""}${k==="map"?` <span class="ph">WSafe layer · Phase 2</span>`:""}</div>`).join("")}
    <div class="sd-sp"></div>
    <div class="sd-meta"><span><b>Sample DC Campus</b></span><span class="clk">${extra&&extra.clock||"10:41:12 AM CT"}</span><span class="av" title="SOC Operator (sample)">SO</span></div></div>
   <div class="sd-rib">⚠ Generic mock inspired by a VMS console. Not Genetec's UI; no Genetec logos; no endorsement. Sample data; classes beyond PPE + exclusion zone are planned.<span class="sp"></span><span class="wslink"><i></i>WSafe connector · mock</span></div>
   <div class="sd-body">${inner}</div></div>`;
}
function tree(selCam){
  const act = new Set(alarmList().filter(a=>a.st==="act").map(a=>a.src.split(" · ")[0]));
  return `<div class="pane" style="width:200px;flex:0 0 200px"><div class="pane-h">Area view<span class="sp"></span><span class="tg">sample</span></div><div class="tree">
   <div class="l1">▾ Sample DC Campus</div><div class="l2">▸ Hall 1 · Hall 2 (operating)</div>
   <div class="l2">▾ Hall 3 expansion</div>
   ${["CAM-101","CAM-102","CAM-103","CAM-105","CAM-106","CAM-107"].map(id=>`<div class="l3 cam ${act.has(id)?"al":""} ${selCam===id?"sel":""}">${id} ${camN(id).split(" · ")[1]}</div>`).join("")}
   <div class="l2">▾ Gates</div><div class="l3 cam ${act.has("CAM-104")?"al":""}">CAM-104 Gate 2</div>
   <div class="l2" style="margin-top:3px">▾ Custom events <span class="dim" style="margin-left:auto">1 per class</span></div>
   ${HC.map(h=>`<div class="l3 ce"><i style="background:${h.col}"></i>WSafe: ${h.s}</div>`).join("")}
  </div></div>`;
}
function tile(c, o={}){
  const al = o.alarm;
  const list = alarmList().filter(a=>a.src.startsWith(c.id)&&a.det!=="WS-1042").sort((a,b)=>a.pri-b.pri)[0];
  return `<div class="tile ${al?"alarm":""} ${o.sel?"sel":""}" ${al?`data-go="2"`:""}>${scene(c.scene,{k:"t"})}
   <div class="tl"><span class="rec"></span>${c.id} · ${c.n.replace("Hall 3 · ","")}<span class="sp"></span><span class="smp">SAMPLE</span></div>
   ${al?`<div class="aband"><span class="pri p2">P2</span>${hchip("ppe")}<div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>Hard hat missing</b> · 0.87</div><span style="color:#ffb469;font-weight:800">View ›</span></div>`:""}
   <div class="bl">${list?`<span class="tbadge">${hchip(list.cls)} <span class="pri p${list.pri}">P${list.pri}</span> ${list.st==="act"?"Active":"Ack’d"}</span>`:"Live"}<span class="sp"></span>${o.time||"10:41:12 AM"}</div></div>`;
}
function alarmRows(mode,compact){
  let rows=alarmList(); if(compact) rows=rows.slice(0,6);
  const stH={act:`<span class="st act"><i></i>Active</span>`, ack:`<span class="st ack"><i></i>Acknowledged</span>`, inv:`<span class="st inv"><i></i>Closed by WSafe</span>`};
  const wsH={rev:`<span class="wsb">Awaiting review</span>`, ok:`<span class="wsb ok">✓ Approved</span>`, no:`<span class="wsb no">Dismissed</span>`, "":`<span style="color:#6b7880">—</span>`};
  const body=rows.map(r=>{const main=r.det==="WS-1042";
    return `<tr class="${r.wsafe?"wsr":""} ${main?"click main":""} ${main&&mode==="new"?"new":""} ${main&&mode==="sel"?"sel":""}" ${main?`data-go="2"`:""}>
     <td><span class="pri p${r.pri}">${r.pri}</span></td><td>${r.cls?hchip(r.cls):'<span style="color:#6b7880">—</span>'}</td><td class="ev">${main?`<b>${r.ev}</b>`:r.ev}</td>
     ${compact?"":`<td>${r.src}</td>`}<td>${r.t}</td><td>${stH[r.st]}</td><td>${wsH[r.ws]}</td>${compact?"":`<td style="color:#9aa8b1">${r.id}</td>`}</tr>`;}).join("");
  return `<table class="dt"><thead><tr><th style="width:34px">Pri</th><th style="width:70px">Class</th><th>Alarm / event</th>${compact?"":"<th>Source</th>"}<th>${compact?"Time":"Trigger time (CT)"}</th><th>State</th><th>WSafe review</th>${compact?"":"<th>ID</th>"}</tr></thead><tbody>${body}</tbody></table>`;
}

/* ---------- WSafe web console chrome (light, brand) ---------- */
function wsc(active, inner){
  const pend = DET.filter(d=>!ST.dismissed[d.id] && !ST.ok[d.id] && !(ST.approved && d.id==="WS-1042")).length;
  return `<div class="wsc fade-in"><div class="ws-head"><img src="${LOGO}" alt="WSafe AI">
   <div class="tabs"><a class="${active==="rev"?"on":""}" data-go="3">Review queue ${pend?`<span class="b">${pend}</span>`:""}</a><a class="${active==="int"?"on":""}" data-go="5">Procore hand-off</a><a class="${active==="hc"?"on":""}" data-go="6">Hazard classes</a><a data-go="7">Site risk map</a></div>
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
   <p>Clickable concept prototype of how WSafe AI would work inside Security Center. Site cameras feed hazard detection across <b>${HC.length} hazard classes and ${NSUB} sub-hazards</b>, including the OSHA Focus Four (falls, struck-by, caught-in/between, electrical). Findings arrive as custom events and alarms in Security Desk, a Competent Person approves or dismisses each one, and approved findings can flow on to Procore as Safety Observations.</p>
   <div class="note orange" style="margin:10px 0"><span class="ic">!</span><div><b>Concept prototype. Illustrative sample data.</b> WSafe AI is not yet deployed and this integration has not been built or tested. The MVP covers PPE (hard hat, hi-vis) and exclusion-zone entry; the other classes are planned and shown with sample data. Every site, camera, person, image, and ID is placeholder data, and the prototype makes no network calls. SDK access under Genetec's Development Acceleration Program (DAP) is developer access only; it is <b>not</b> a partnership, certification, or endorsement.</div></div>
   <div style="display:flex;gap:12px;align-items:center;margin-top:12px"><button class="btn orange" data-go="1" style="font-size:14.5px;padding:10px 20px">Start walkthrough →</button><span class="muted" style="font-size:12px">Next / Back, ← → keys, or click the highlighted items.</span></div>
   <div class="legal">WorkSafeAgent LLC (WSafe AI) · Abilene, TX · Patent pending (US 63/992,261) · Draft, Oct 2026. Also available: <a href="wsafeai-genetec-prototype-walkthrough.pdf" target="_blank" rel="noopener">walkthrough PDF</a> · <a href="wsafeai-genetec-prototype-walkthrough.mp4" target="_blank" rel="noopener">video (MP4)</a>.<br>"Genetec", "Security Center", "Security Desk", and "Procore" are referenced by name only to describe the planned integration. Console screens are generic mocks, not the vendors' actual UIs, and imply no endorsement.</div>
  </div>
  <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-weight:800;margin:4px 0 8px">Walkthrough</div>
   <ol>${STEPS.slice(1).map((s,i)=>{const w=[["w-sd","Security Desk"],["w-sd","Security Desk"],["w-ws","WSafe AI"],["w-sd","Security Desk"],["w-pc","WSafe → Procore"],["w-ws","WSafe AI"],["w-sd","Security Desk · Phase 2"]][i];return `<li data-go="${i+1}"><b>${i+1}</b>${s.t.split(" — ")[0]}<em class="${w[0]}">${w[1]}</em></li>`;}).join("")}</ol>
   <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-weight:800;margin:12px 0 6px">Hazard classes</div>
   <div class="hcwrap">${HC.map(h=>`<span class="hcl" data-hcgo="${h.id}">${hchip(h.id)}<span>${h.l}</span>${h.st==="mvp"?'<em class="stp mvp">MVP</em>':""}</span>`).join("")}</div>
   <div class="flow"><span class="d">Cameras → Media Gateway (RTSP)</span>→<span>WSafe connector</span>→<span class="d">Custom event + alarm + bookmark</span>→<span>Human review</span>→<span class="p">Procore (optional)</span></div>
  </div></div></div>`;

S[1]=()=>{const al=ST.arrived;
 return sd("mon",`${tree(al?"CAM-102":null)}
  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div class="pane" style="flex:1;min-height:0"><div class="pane-h">Monitoring · Hall 3 expansion (6 tiles)<span class="sp"></span><span class="tg">${al?"new WSafe alarm on CAM-102":"live"}</span></div>
    <div class="tiles">${CAMS.map(c=>tile(c,{alarm:al&&c.id==="CAM-102"})).join("")}</div></div>
   <div class="pane" style="flex:0 0 auto"><div class="pane-h">Alarm list<span class="sp"></span><span class="tg">+2 more below (trench, hot work) · P1–P4 = class default</span></div>${alarmRows(al?"new":"")}</div>
  </div>
  ${al?`<div class="newal" data-go="2"><div class="h"><span class="pri p2">P2</span>New alarm · WSafe hazard ${hchip("ppe")}</div><div class="t">WSafe: PPE – hard hat missing</div><div class="s">CAM-102 · Hall 3 › Generator yard · conf 0.87 · detected 10:41:07 AM CT</div><div style="display:flex;gap:8px;margin-top:8px"><button class="dbtn or" data-go="2">View alarm ›</button><span style="font-size:10.5px;color:#9aa8b1;align-self:center">Raised by the WSafe connector via the Web SDK (mock)</span></div></div>`:""}`);};

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
   <div style="padding:8px 12px;display:flex;flex-direction:column;gap:7px;min-height:0;overflow:auto">
    <dl class="kv2">
     <dt>Hazard class</dt><dd>${hchip("ppe")} Personal protective equipment ${stp("mvp")}</dd>
     <dt>Sub-hazard</dt><dd>Hard hat missing <span style="color:#9aa8b1">+ hi-vis vest missing</span></dd>
     <dt>Confidence</dt><dd><div class="conf"><div class="bar"><i style="width:87%"></i></div>0.87 hard hat · 0.79 vest</div></dd>
     <dt>Priority</dt><dd><span class="pri p2">P2</span> <span style="color:#9aa8b1">PPE default P3, raised: 2 items missing</span></dd>
     <dt>Camera · area</dt><dd>${d.cam} · Hall 3 expansion › Generator yard</dd>
     <dt>Detected</dt><dd>${d.t} CT <span style="color:#9aa8b1">(bookmark keeps true time)</span></dd>
     <dt>OSHA ref.</dt><dd>29 CFR 1926.100(a) <span style="color:#9aa8b1">(suggested)</span></dd>
     <dt>Review link</dt><dd><span class="mono" style="color:#9fd0f3">app.wsafeai.example/review/${d.id}</span> <span style="color:#9aa8b1">(sample)</span></dd>
    </dl>
    <div><div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--d-mu);font-weight:700;margin-bottom:3px">WSafe connector → Security Center (planned calls)</div>
     <div class="sdk"><div><span class="tm">10:41:09</span><span class="op">Raise custom event</span><span style="color:#c6d0d6">“WSafe: Personal protective equipment” · msg “Hard hat missing”</span></div>
      <div><span class="tm">10:41:09</span><span class="op">Add bookmark</span><span style="color:#c6d0d6">at 10:41:07 · “WSafe ${d.id}”</span></div>
      <div><span class="tm">10:41:09</span><span class="op">Trigger alarm</span><span style="color:#c6d0d6">WSafe hazard · P2 · CAM-102 · review URL</span></div></div></div>
    <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:2px"><button class="dbtn or" id="btnOpenReview">Open WSafe review ↗</button><button class="dbtn" id="btnAckEarly">Acknowledge</button><button class="dbtn">Forward</button><button class="dbtn">Snooze</button></div>
    <div class="dnote">The operator can act on site (radio the foreman). The safety decision (approve or dismiss) stays with the WSafe reviewer.</div>
   </div></div>`,{clock:"10:41:40 AM CT"});};

S[3]=()=>{const d=det(), C=cls(d), h=HCM[C], si=subI(d), sb=h.subs[si]||h.subs[0], done=x=>ST.dismissed[x.id]||ST.ok[x.id]||(ST.approved&&x.id==="WS-1042");
 const pend=DET.filter(x=>!done(x)).length;
 return wsc("rev",`
  <div class="qcol">
   <div class="qh"><span>Review queue · ${pend} open</span><span class="muted" style="font-weight:600;text-transform:none;letter-spacing:0">${new Set(DET.map(x=>x.cls)).size} classes</span></div>
   ${DET.map(x=>{const dn=done(x), hx=HCM[cls(x)], sx=hx.subs[subI(x)]||hx.subs[0];return `<div class="qi ${x.id===d.id?"on":""} ${dn?"done":""}" data-sel="${x.id}" title="${x.hz} · ${x.cam}"><div class="th">${scene(x.scene,{boxes:true,k:"q"+x.id})}</div>
     <div class="m"><b>${hchip(cls(x))}<span class="qt">${sx[0]}</span></b><span>${x.id} · ${x.conf.toFixed(2)} · <span class="pri p${x.pri} lt">P${x.pri}</span> ${dn?`<span class="tag ${ST.dismissed[x.id]?"gray":"green"}" style="font-size:9.5px;padding:0 6px">${ST.dismissed[x.id]?"Dismissed":"Approved"}</span>`:hx.st==="mvp"?'<em class="stp mvp">MVP</em>':'<em class="stp later">Planned</em>'}</span></div></div>`;}).join("")}
  </div>
  <div style="flex:1.1;min-width:0;display:flex;flex-direction:column;gap:7px">
   <div style="display:flex;align-items:center;gap:8px;min-width:0"><div style="font-size:16px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.id} · ${d.hz}</div><span class="tag ${done(d)?(ST.dismissed[d.id]?"gray":"green"):"orange"}">${done(d)?(ST.dismissed[d.id]?"Dismissed":"Approved"):"Needs review"}</span></div>
   <div class="shot">${scene(d.scene,{boxes:true,k:"r"})}<div class="cap">${d.cam} · ${camN(d.cam)} · ${d.t} CT<span class="sp"></span>sample frame · not real footage</div></div>
   <div class="strip">${["−2 s","detection","+2 s"].map((l,i)=>`<div>${scene(d.scene,{boxes:i===1,k:"s"+i})}<span>${l}</span></div>`).join("")}</div>
   ${h.st!=="mvp"?`<div class="note orange" style="font-size:11.5px;padding:6px 10px"><span class="ic">!</span><div><b>${h.l}</b> is a planned class (${STL[h.st]}), shown with sample data to illustrate the roadmap. It is not in the MVP model.</div></div>`:`<div class="note" style="font-size:11.5px;padding:6px 10px"><span class="ic">i</span><div><b>${h.l}</b> is in the MVP (with exclusion-zone entry).</div></div>`}
  </div>
  <div class="card" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;padding:10px 12px">
   <h3 style="margin:0">Reviewer decision <span class="tag gray">AI suggests · a person decides</span></h3>
   <div style="font-size:12px;display:flex;gap:14px"><span><span class="muted">Confidence</span> <b>${d.conf.toFixed(2)}</b>${d.conf2?` · vest ${d.conf2.toFixed(2)}`:""}</span><span><span class="muted">SC alarm</span> <b>${d.alarm}</b></span></div>
   <div class="grid2">
    <div><label class="fl">Hazard class</label><select class="f" id="selCls">${HC.map(x=>`<option value="${x.id}" ${x.id===C?"selected":""}>${x.code} · ${x.l}</option>`).join("")}</select></div>
    <div><label class="fl">Sub-hazard</label><select class="f" id="selSub">${h.subs.map((s,i)=>`<option value="${i}" ${i===si?"selected":""}>${s[0]}</option>`).join("")}</select></div>
    <div><label class="fl">Suggested OSHA ref.</label><input class="f" value="${/^\d/.test(sb[1])?"29 CFR "+sb[1]:sb[1]}" readonly></div>
    <div><label class="fl">Severity</label><select class="f">${[1,2,3,4].map(p=>`<option ${p===d.pri?"selected":""}>P${p}${p===h.pri?" (class default)":""}</option>`).join("")}</select></div>
   </div>
   ${d.id==="WS-1042"?`<label class="chk ${ST.vest?"on":""}"><input type="checkbox" id="vest" ${ST.vest?"checked":""}><div><b>Also confirm: hi-vis vest missing</b> <span class="muted">(0.79)</span></div></label>`:""}
   <div><label class="fl">Reviewer note (posted to the alarm)</label><textarea class="f" rows="2">${d.note}</textarea></div>
   <div class="note orange" style="font-size:11.3px;padding:6px 10px"><span class="ic">!</span><div>Approve posts “WSafe: Finding approved” to the Security Center alarm. Dismiss closes it as a false positive. Nothing goes to Procore without approval.</div></div>
   <div style="display:flex;gap:8px;margin-top:auto">${done(d)?`<span class="muted" style="font-size:12px;align-self:center">Decision recorded.</span><button class="btn primary" data-go="4" style="margin-left:auto">Back to Security Desk →</button>`:`<button class="btn danger" id="btnDismiss">✕ Dismiss (false positive)</button><button class="btn orange" id="btnApprove" style="margin-left:auto">✓ Approve finding</button>`}</div>
  </div>`);};

S[4]=()=>{const d=det("WS-1042"), ack=ST.acked;
 return sd("alm",`
  <div style="flex:1.25;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div class="pane" style="flex:0 0 auto"><div class="pane-h">Alarm monitoring<span class="sp"></span><span class="tg">WSafe decisions received via Web SDK (mock)</span></div>${alarmRows("sel",true)}</div>
   <div class="pane" style="flex:1;min-height:0"><div class="pane-h">Alarm ${d.alarm} · event timeline<span class="sp"></span><span class="tg">sample times, CT</span></div>
    <div style="padding:7px 12px;display:flex;gap:12px;min-height:0">
     <div class="dshot" style="width:220px;flex:0 0 220px;align-self:flex-start">${scene("genyard",{boxes:true,k:"a"})}<div class="bl">WSafe ${d.id} · sample frame</div></div>
     <div class="evl" style="flex:1;min-width:0">
      <div class="e"><span class="tm">10:41:07 AM</span><span class="d o"></span><span class="x">Detection · bookmark on CAM-102<small>True detection time preserved by the bookmark</small></span></div>
      <div class="e"><span class="tm">10:41:09 AM</span><span class="d o"></span><span class="x">Custom event + alarm raised (P2)<small>WSafe: Personal protective equipment · hard hat missing</small></span></div>
      <div class="e"><span class="tm">10:44:31 AM</span><span class="d g"></span><span class="x">WSafe: Finding approved<small>Competent Person (sample): PPE — hard hat + hi-vis confirmed</small></span></div>
      ${ack?`<div class="e fade-in"><span class="tm">10:45:02 AM</span><span class="d b"></span><span class="x">Alarm acknowledged · SOC Operator (sample)<small>Read back by WSafe from the event stream</small></span></div>
       <div class="e fade-in"><span class="tm">10:45:03 AM</span><span class="d g"></span><span class="x">Incident entry INC-0317 created (planned)<small>Snapshot link, bookmark, reviewer note attached</small></span></div>`:`<div class="e"><span class="tm">—</span><span class="d"></span><span class="x" style="color:#9aa8b1">Waiting for operator acknowledgement</span></div>`}
     </div></div></div>
  </div>
  <div class="pane" style="flex:1;min-width:0"><div class="pane-h">${ack?"Incident entry (planned)":"Acknowledge alarm"}<span class="sp"></span><span class="tg">sample</span></div>
   <div style="padding:10px 12px;display:flex;flex-direction:column;gap:9px;min-height:0">
   ${ack?`<div class="inc fade-in"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="font-size:14px">INC-0317 · PPE non-compliance — Generator yard</b></div>
     <dl class="kv2"><dt>Hazard class</dt><dd>${hchip("ppe")} PPE › hard hat + hi-vis</dd><dt>Status</dt><dd><span class="st ack"><i></i>Open · corrective action</span></dd><dt>Linked</dt><dd>Alarm ${d.alarm} · CAM-102 · bookmark 10:41:07</dd><dt>WSafe finding</dt><dd>${d.id} · approved 10:44 by Competent Person (sample)</dd><dt>Evidence</dt><dd>Snapshot (review link) + recorded video at bookmark</dd><dt>Note</dt><dd style="font-weight:500">${d.note}</dd></dl></div>
     <div class="dnote b">Incident entries are planned (Phase 2 in the brief). In the MVP, the approved finding, bookmark, and alarm history already give the site a record.</div>
     <div style="display:flex;gap:8px;margin-top:auto"><button class="dbtn">Export report (planned)</button><button class="dbtn or" data-go="5" style="margin-left:auto">Next: Procore hand-off (optional) →</button></div>`
   :`<div style="display:flex;gap:8px;align-items:center"><span class="wsb ok" style="font-size:11px;padding:2px 7px">✓ WSafe: approved</span><span style="font-size:12px;color:#c6d0d6">Reviewer confirmed the hazard at 10:44:31 AM</span></div>
     <dl class="kv2"><dt>Alarm</dt><dd>${d.alarm} · WSafe hazard · P2</dd><dt>Hazard class</dt><dd>${hchip("ppe")} PPE › hard hat missing</dd><dt>Source</dt><dd>CAM-102 · Generator yard</dd><dt>Reviewer note</dt><dd style="font-weight:500">${d.note}</dd></dl>
     <label style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--d-mu);font-weight:700">Acknowledgement</label>
     <div style="display:flex;gap:8px"><span class="dbtn" style="cursor:default">Ack type: Normal</span><span class="dbtn" style="cursor:default">☑ Create incident entry</span></div>
     <div class="inc pending">Incident entry will be created when the alarm is acknowledged.</div>
     <div style="display:flex;gap:8px;margin-top:auto"><button class="dbtn gn" id="btnAck">✓ Acknowledge alarm</button></div>`}
   </div></div>`,{clock:ack?"10:45:04 AM CT":"10:44:40 AM CT"});};

S[5]=()=>{const sent=ST.sent, on=ST.procoreOn;
 return wsc("int",`
  <div style="flex:1.3;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div style="display:flex;align-items:center;gap:10px"><div><div style="font-size:18px;font-weight:800">Procore hand-off <span class="tag gray" style="vertical-align:3px">optional · per site</span></div><div class="muted" style="font-size:12.3px">Approved findings only. Each WSafe hazard class maps to Procore Observation fields.</div></div>
    <div class="toggle ${on?"on":""}" id="tglProcore" style="margin-left:auto"><span class="sw"></span>Send approved findings</div></div>
   <div class="card" style="padding:0;overflow:hidden">
    <table class="t cmap"><thead><tr><th>WSafe hazard class</th><th>Obs. type</th><th>Procore Hazard <span class="muted" style="text-transform:none;letter-spacing:0">(customer list)</span></th><th>Priority</th><th>Status</th></tr></thead><tbody>
     ${HC.map(h=>`<tr class="${h.id==="ppe"?"hl":""}"><td>${hchip(h.id)} <span style="font-weight:600">${h.s}</span></td><td>Safety</td><td>${h.pc}</td><td><span class="pri p${h.pri} lt">P${h.pri}</span> → ${PRC[h.pri]}</td><td>${stp(h.st)}</td></tr>`).join("")}
    </tbody></table>
    <div class="muted" style="font-size:11px;padding:5px 10px;border-top:1px solid var(--line)">Sub-hazard + suggested OSHA ref. go in the description; trade and assignee come from the camera mapping. The reviewer's severity overrides the default priority. Hazard values are mapped once per customer.</div></div>
   <div style="display:flex;gap:8px;align-items:center">${sent?`<span class="tag green" style="font-size:12px;padding:5px 11px">✓ Sent · Observation #212 (mock)</span><button class="btn primary" data-go="6" style="margin-left:auto">Next: hazard classes & analytics →</button>`
     :`<button class="btn" id="btnSkip">Skip · keep in Security Center only</button><button class="btn orange" id="btnSend" style="margin-left:auto" ${on?"":"disabled"}>Send WS-1042 to Procore →</button>`}</div>
  </div>
  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div class="pmock"><div class="ph"><b>Procore</b><span>Sample Data Center · Hall 3 › Observations › ${sent?"#212":"new"}</span></div>
    <div class="pr">⚠ Generic mock of a Procore Observation, for illustration only. Not Procore's actual UI.</div>
    <div class="pb"><div style="display:flex;align-items:center;gap:8px;margin-bottom:7px"><b style="font-size:13.5px">${sent?"#212 · ":""}PPE missing — hard hat + hi-vis · Generator yard</b><span class="status-pill ${sent?"init":"draft"}" style="margin-left:auto">${sent?"Initiated":"Draft preview"}</span></div>
     <div style="display:flex;gap:10px"><div class="shot" style="width:150px;flex:0 0 150px;align-self:flex-start">${scene("genyard",{boxes:true,k:"p"})}</div>
      <dl class="kv" style="flex:1"><dt>Type</dt><dd>Safety</dd><dt>Hazard</dt><dd>PPE <span class="muted">← WSafe class PPE</span></dd><dt>Priority</dt><dd>High <span class="muted">← reviewer P2</span></dd><dt>Location</dt><dd>Hall 3 › Generator yard</dd><dt>Assignee</dt><dd>Electrical Foreman (sample)</dd><dt>Description</dt><dd style="font-weight:500">Hard hat + hi-vis missing · 29 CFR 1926.100(a) · WS-1042 · SC alarm A-20417</dd></dl></div></div></div>
   ${sent?`<div class="steps fade-in">
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Snapshot uploaded to Photos</div><div class="s-d">Album “WSafe AI Detections”</div></div>${chip("pc","create")}</div>
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Safety Observation #212 created</div><div class="s-d">Procore notifies the assignee; status syncs back</div></div>${chip("pc","create")}</div></div>`
    :`<div class="note"><span class="ic">i</span><div>Uses the same planned Procore connector as the WSafe AI + Procore prototype. Dismissed findings and all video stay out of Procore.</div></div>`}
  </div>`);};

/* ---------- zones (shared by analytics + heat map; approved findings, last 30 days, sample) ---------- */
const ZONES=[
 {id:"Z1",n:"Generator yard",cam:"CAM-102",poly:"720,150 905,150 905,345 720,345",c:[812,248],e:[150,120],hrs:300,tr:1.35,k:{ppe:30,zone:9,elec:4,house:6,fire:2}},
 {id:"Z2",n:"Crane pick zone",cam:"CAM-106",poly:"440,24 700,24 700,128 440,128",c:[570,76],e:[150,75],hrs:260,tr:1.2,k:{struck:17,zone:16,ppe:9,fall:3}},
 {id:"Z3",n:"Hall 3 · Level 2 deck",cam:"CAM-103",poly:"420,152 700,152 700,345 540,345 540,262 420,262",c:[620,230],e:[150,110],hrs:280,tr:1.3,k:{fall:30,ppe:14,house:8,struck:6,health:5,fire:3}},
 {id:"Z4",n:"North laydown",cam:"CAM-101",poly:"215,24 420,24 420,128 215,128",c:[318,76],e:[140,75],hrs:300,tr:.85,k:{house:15,ppe:16,struck:4,health:4,zone:3}},
 {id:"Z5",n:"Gate 2 · Haul road",cam:"CAM-104",poly:"215,392 985,392 985,462 215,462",c:[600,427],e:[300,52],hrs:310,tr:1.1,k:{struck:9,zone:5,ppe:9,house:3}},
 {id:"Z6",n:"Electrical room B",cam:"CAM-105",poly:"420,262 540,262 540,345 420,345",c:[480,304],e:[90,70],hrs:260,tr:1.05,k:{elec:15,egress:6,fire:4,ppe:6,house:4}},
 {id:"Z7",n:"East utility trench",cam:"CAM-107",poly:"925,40 985,40 985,380 925,380",c:[955,210],e:[70,150],hrs:240,tr:.95,k:{caught:12,house:3,fall:4,ppe:4,zone:2}},
 {id:"Z8",n:"Hall 2 perimeter (operating)",cam:"CAM-105",poly:"25,60 195,60 195,380 25,380",c:[110,220],e:[90,140],hrs:330,tr:1,k:{ppe:2,egress:2,zone:1}}
];
const ACT={fall:["Fall-protection walk-down","Walk the edge and openings with the trade foreman; check guardrail continuity before the next shift."],
 struck:["Lift / traffic plan review","Confirm exclusion barricades and a spotter during picks; separate pedestrian and equipment routes."],
 caught:["Competent Person trench inspection","Check the protective system, spoil setback, and access/egress before entry."],
 elec:["Electrical safety stand-down","Review energized-work permits, arc-flash PPE, and LOTO boundaries with the electrical foreman."],
 ppe:["PPE spot-check + toolbox talk","PPE check at the zone entry at shift start; post a hard hat / hi-vis sign."],
 zone:["Barricade + briefing","Re-mark the exclusion zone and brief crews on the load path."],
 house:["Housekeeping blitz","15-minute clean-up; route cords overhead and clear walkways."],
 fire:["Hot-work permit audit","Check permits, fire watch, and extinguisher placement for hot work in this area."],
 egress:["Egress walk","Clear exit routes; verify confined-space attendant coverage."],
 health:["Ergonomics review (research)","Consider lift aids and task rotation; data is research-grade."]};
function clsAgg(id){ // 30-day review outcomes per class (sample; planned classes simulated)
  const ok=ZONES.reduce((s,z)=>s+(z.k[id]||0),0), a=AN[id], cand=Math.round(ok/a.rate), top=ZONES.slice().sort((x,y)=>(y.k[id]||0)-(x.k[id]||0))[0];
  return {ok,cand,dis:cand-ok,rate:ok/cand,fp:(cand-ok)/cand,tr:a.tr,sp:a.sp,top};
}
function spark(v,col,w=90,h=22){const mx=Math.max(...v),mn=Math.min(...v),r=(mx-mn)||1;const pts=v.map((y,i)=>`${(i/(v.length-1)*w).toFixed(1)},${(h-2-(y-mn)/r*(h-4)).toFixed(1)}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/></svg>`;}
const trH = t=>`<span class="trd ${t>5?"up":t<-5?"dn":""}">${t>5?"▲":t<-5?"▼":"■"} ${Math.abs(t)}%</span>`;

S[6]=()=>{const sel=HCM[ST.hcSel], v=ST.hcView, ag=Object.fromEntries(HC.map(h=>[h.id,clsAgg(h.id)]));
 const totOk=HC.reduce((s,h)=>s+ag[h.id].ok,0), totC=HC.reduce((s,h)=>s+ag[h.id].cand,0), a=ag[sel.id];
 const refs=h=>[...new Set(h.subs.map(s=>s[1]))].join(" · ");
 return wsc("hc",`
  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div class="hkp">
    <div><div class="v">${HC.length} <small>classes</small></div><div class="l">${NSUB} sub-hazards</div></div>
    <div><div class="v" style="color:var(--green)">2 <small>MVP</small></div><div class="l">PPE · exclusion zone</div></div>
    <div><div class="v">3 · 4 · 1</div><div class="l">Phase 2 · planned · research</div></div>
    <div><div class="v">${totOk}</div><div class="l">Approved · 30 d (sample)</div></div>
    <div><div class="v">${Math.round(totOk/totC*100)}%</div><div class="l">Approval rate</div></div>
   </div>
   <div style="display:flex;align-items:center;gap:10px"><div class="seg lt"><button data-hcview="tax" class="${v==="tax"?"on":""}">Taxonomy</button><button data-hcview="an" class="${v==="an"?"on":""}">Analytics · 30 days</button></div>
    <span class="muted" style="font-size:11.5px">${v==="tax"?"OSHA references are suggestions for the reviewer, not compliance determinations.":"Sample data. Values for planned classes are simulated to show the view; no model exists yet."}</span><span class="illus" style="margin-left:auto">Sample data</span></div>
   <div class="card" style="padding:0;overflow:hidden;flex:1;min-height:0">
   ${v==="tax"?`<table class="t tax"><thead><tr><th style="width:180px">Hazard class</th><th>Sub-hazards</th><th style="width:200px">Detection signals (planned)</th><th style="width:44px">Sev.</th><th style="width:150px">OSHA ref. (29 CFR)</th><th style="width:74px">Status</th></tr></thead><tbody>
     ${HC.map(h=>`<tr class="click ${h.id===sel.id?"sel":""}" data-hc="${h.id}"><td><div class="cn">${hchip(h.id)} ${h.s}</div>${h.ff?'<span class="ff">OSHA Focus Four</span>':""}</td>
      <td><div class="cl2">${h.subs.map(s=>s[2]==="mvp"?`<b>${s[0]}</b>`:s[0]).join(" · ")}</div></td><td><div class="cl2 muted">${h.sig}</div></td>
      <td><span class="pri p${h.pri} lt">P${h.pri}</span></td><td><div class="cl2" style="font-size:11px">${refs(h)}</div></td><td>${stp(h.st)}</td></tr>`).join("")}
    </tbody></table>`
   :`<table class="t tax an"><thead><tr><th style="width:180px">Hazard class</th><th>Cand.</th><th>Appr.</th><th>Dism.</th><th style="width:118px">Approval rate</th><th>FP</th><th style="width:118px">Trend · 8 wk</th><th>Top zone · camera</th></tr></thead><tbody>
     ${HC.map(h=>{const x=ag[h.id];return `<tr class="click ${h.id===sel.id?"sel":""} ${h.st==="mvp"?"":"sim"}" data-hc="${h.id}"><td><span class="cn">${hchip(h.id)} ${h.s}</span></td>
      <td>${x.cand}</td><td><b>${x.ok}</b></td><td>${x.dis}</td><td><div class="rb"><div class="bar"><i style="width:${Math.round(x.rate*100)}%;background:${h.col}"></i></div>${Math.round(x.rate*100)}%</div></td><td>${Math.round(x.fp*100)}%</td>
      <td><div style="display:flex;align-items:center;gap:6px">${spark(x.sp,h.col,58,16)}${trH(x.tr)}</div></td><td class="tz" title="${x.top.n} · ${x.top.cam}">${x.top.n} <span class="muted">· ${x.top.cam}</span></td></tr>`;}).join("")}
    </tbody><tfoot>${(()=>{const T=HC.reduce((s,h)=>{const x=ag[h.id];s.c+=x.cand;s.o+=x.ok;s.d+=x.dis;return s},{c:0,o:0,d:0});return `<tr><td><b>All classes</b></td><td><b>${T.c}</b></td><td><b>${T.o}</b></td><td><b>${T.d}</b></td><td><b>${Math.round(T.o/T.c*100)}%</b> approved</td><td><b>${Math.round(T.d/T.c*100)}%</b></td><td colspan="2" class="muted">Only PPE + exclusion zone (MVP) would produce real counts at launch.</td></tr>`})()}</tfoot></table>
    <div class="anote">How to read it: <b>approval rate</b> = reviewer-approved ÷ candidates; <b>FP</b> = dismissed as false positive. A high FP rate flags a class or camera for threshold tuning before it is promoted from Planned to live. Click a row for its sub-hazards and OSHA references.</div>`}
   </div>
  </div>
  <div class="card hcd">
   <div style="display:flex;align-items:center;gap:7px">${hchip(sel.id)}${sel.ff?'<span class="ff">OSHA Focus Four</span>':""}${stp(sel.st)}</div>
   <div style="font-size:16px;font-weight:800;margin:4px 0 2px">${sel.l}</div>
   <div class="muted" style="font-size:11.3px">Default <span class="pri p${sel.pri} lt">P${sel.pri}</span> · SC event <b>“WSafe: ${sel.s}”</b> · Procore <b>${sel.pc}</b></div>
   <label class="fl" style="margin-top:8px">Sub-hazards · suggested OSHA ref. · status</label>
   <div class="subl">${sel.subs.map(s=>`<div title="${s[0]} · ${s[1]}"><span class="sn">${s[0]}</span><span class="so">${s[1]}</span>${stp(s[2])}</div>`).join("")}</div>
   <label class="fl" style="margin-top:7px">Detection signals (planned)</label><div style="font-size:11.8px;color:var(--ink)">${sel.sig}</div>
   <label class="fl" style="margin-top:7px">Last 30 days ${sel.st==="mvp"?"(sample)":"(simulated, class planned)"}</label>
   <div class="hk2"><div><b>${a.cand}</b><span>candidates</span></div><div><b>${a.ok}</b><span>approved</span></div><div><b>${Math.round(a.rate*100)}%</b><span>approval</span></div><div><b>${Math.round(a.fp*100)}%</b><span>false-pos.</span></div></div>
   <div style="display:flex;align-items:center;gap:8px;margin-top:5px;font-size:11.5px">${spark(a.sp,sel.col,110,24)}${trH(a.tr)}<span class="muted">vs prior 4 wk · top: <b style="color:var(--ink)">${a.top.n}</b></span></div>
   <div style="display:flex;gap:6px;margin-top:auto;padding-top:6px"><button class="btn" id="btnHcMap" style="padding:6px 10px;font-size:12px">Show on heat map →</button></div>
  </div>`);};

/* ---------- Site risk heat map (Phase 2, illustrative) ---------- */
const HCAMS=[{id:"CAM-101",x:228,y:136,d:-35},{id:"CAM-102",x:712,y:356,d:-40},{id:"CAM-103",x:705,y:160,d:150},{id:"CAM-104",x:205,y:470,d:-8},{id:"CAM-105",x:430,y:356,d:-50},{id:"CAM-106",x:430,y:138,d:-30},{id:"CAM-107",x:915,y:390,d:-80}];
function zCount(z,c,win){const n=z.k[c]||0; return win===7?Math.round(n*.26*z.tr):win===90?Math.round(n*2.8/Math.pow(z.tr,.35)):n;}
function zRaw(z,f){const {win}=ST.hm, cs=f==="all"?HC.map(h=>h.id):[f]; return cs.reduce((s,c)=>s+zCount(z,c,win)*PW[HCM[c].pri],0)*300/z.hrs;}
function zStats(z){const {win,cls}=ST.hm, cs=cls==="all"?HC.map(h=>h.id):[cls];
  const by=cs.map(c=>[c,zCount(z,c,win)]).filter(b=>b[1]>0).sort((a,b)=>b[1]-a[1]);
  const ref=Math.max(...ZONES.map(q=>zRaw(q,cls)))||1, n=by.reduce((s,b)=>s+b[1],0);
  return {score:zRaw(z,cls)/ref,n,by,dis:Math.round(n*.25),trend:Math.round((z.tr-1)*55)};}
const lvl=s=>s>=.75?"High":s>=.5?"Elevated":s>=.22?"Moderate":"Low";
function heatCol(s){const st=[[0,[63,179,107]],[.4,[241,196,15]],[.7,[243,140,24]],[1,[229,83,61]]];let k=1;while(k<st.length-1&&s>st[k][0])k++;const [a0,c0]=st[k-1],[a1,c1]=st[k],f=Math.max(0,Math.min(1,(s-a0)/(a1-a0)));return `rgb(${c0.map((v,i)=>Math.round(v+(c1[i]-v)*f)).join(",")})`;}
function siteMap(){
  const sel=ST.hm.zone, zs=ZONES.map(z=>[z,zStats(z)]);
  return `<svg class="hm-plan" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <defs>${zs.map(([z,s],i)=>`<radialGradient id="hg${i}"><stop offset="0" stop-color="${heatCol(s.score)}" stop-opacity="${s.n?(.22+.6*s.score).toFixed(2):0}"/><stop offset=".55" stop-color="${heatCol(s.score)}" stop-opacity="${s.n?(.1+.3*s.score).toFixed(2):0}"/><stop offset="1" stop-color="${heatCol(s.score)}" stop-opacity="0"/></radialGradient>`).join("")}
   <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#2c3842" stroke-width="3"/></pattern></defs>
  <rect width="1000" height="480" fill="#182026"/>
  <rect x="6" y="6" width="988" height="468" fill="none" stroke="#3a4852" stroke-width="2" stroke-dasharray="10 6"/>
  <rect x="0" y="392" width="1000" height="70" fill="#1f2930"/><line x1="0" y1="427" x2="1000" y2="427" stroke="#4b5a64" stroke-width="2" stroke-dasharray="16 12"/>
  <rect x="25" y="60" width="170" height="320" fill="#25313a" stroke="#4b5a64" stroke-width="2"/><text x="110" y="90" class="pl" text-anchor="middle">HALL 2</text><text x="110" y="105" class="pl sm" text-anchor="middle">OPERATING · LIVE</text>
  <rect x="420" y="152" width="280" height="193" fill="url(#hatch)" stroke="#5a6b76" stroke-width="2"/><text x="560" y="372" class="pl lg" text-anchor="middle">HALL 3 · UNDER CONSTRUCTION</text>
  <circle cx="570" cy="140" r="130" fill="none" stroke="#4b5a64" stroke-width="1.4" stroke-dasharray="4 6"/>
  <rect x="925" y="40" width="60" height="340" fill="url(#hatch)" stroke="#6b5640"/>
  <rect x="740" y="170" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/><rect x="820" y="170" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/><rect x="740" y="232" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/><rect x="820" y="232" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/>
  <text x="900" y="420" class="pl sm" text-anchor="end">HAUL ROAD</text><text x="226" y="455" class="pl sm">GATE 2</text>
  ${zs.map(([z,s],i)=>`<ellipse cx="${z.c[0]}" cy="${z.c[1]}" rx="${z.e[0]}" ry="${z.e[1]}" fill="url(#hg${i})" pointer-events="none"/>`).join("")}
  ${HCAMS.map(c=>{const a0=(c.d-28)*Math.PI/180,a1=(c.d+28)*Math.PI/180,r=100;return `<path d="M${c.x} ${c.y} L${(c.x+r*Math.cos(a0)).toFixed(1)} ${(c.y+r*Math.sin(a0)).toFixed(1)} A${r} ${r} 0 0 1 ${(c.x+r*Math.cos(a1)).toFixed(1)} ${(c.y+r*Math.sin(a1)).toFixed(1)} Z" fill="rgba(74,163,223,.07)" stroke="rgba(74,163,223,.3)" stroke-width="1" stroke-dasharray="4 4" pointer-events="none"/>
    <g transform="translate(${c.x},${c.y})"><rect x="-9" y="-7" width="15" height="14" rx="2" fill="#4aa3df" stroke="#0f1418" stroke-width="1.5"/><text x="0" y="-11" class="zl" style="font-size:9.5px" text-anchor="middle">${c.id}</text></g>`;}).join("")}
  ${zs.map(([z,s],i)=>`<g class="zone ${sel===z.id?"on":""}" data-zone="${z.id}"><polygon class="zp" points="${z.poly}" fill="rgba(255,255,255,.015)"/>
    <circle cx="${z.c[0]}" cy="${z.c[1]}" r="11" class="zb"/><text x="${z.c[0]}" y="${z.c[1]+4}" class="zn" text-anchor="middle">${i+1}</text>
    ${z.id==="Z7"?"":`<text x="${z.c[0]}" y="${z.c[1]+27}" class="zl" text-anchor="middle">${z.n}</text>`}</g>`).join("")}
  <text x="955" y="30" class="zl" text-anchor="middle">TRENCH</text>
  </svg>`;}
function heatPanel(){
  const z=ZONES.find(q=>q.id===ST.hm.zone), f=ST.hm.cls;
  if(!z){const r=ZONES.map(q=>[q,zStats(q)]).sort((a,b)=>b[1].score-a[1].score);
    return `<div class="pane-h">Zones · ${f==="all"?"all classes":HCM[f].code}<span class="sp"></span><span class="tg">${ST.hm.win} days</span></div><div style="padding:7px;overflow:auto">
     ${r.map(([q,s])=>`<div class="hz-row" data-zone="${q.id}"><span class="zb2">${ZONES.indexOf(q)+1}</span><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:12px">${q.n}</div><div style="font-size:10.5px;color:var(--d-mu);display:flex;gap:3px;align-items:center">${s.n} approved · ${s.by.slice(0,3).map(b=>hchip(b[0])).join("")}</div></div><span class="lv ${lvl(s.score)}">${s.n?lvl(s.score):"None"}</span></div>`).join("")}</div>`;}
  const s=zStats(z), all=ZONES.map(q=>q), byAll=HC.map(h=>[h.id,zCount(z,h.id,ST.hm.win)]).filter(b=>b[1]>0).sort((a,b)=>b[1]-a[1]), mx=Math.max(1,...byAll.map(b=>b[1])), top=(f==="all"?byAll[0]:[f])[0]||"ppe";
  return `<div class="pane-h">Zone ${ZONES.indexOf(z)+1} · ${z.cam}<span class="sp"></span><button class="dbtn" id="btnHmClose" style="padding:1px 7px;font-size:11px">✕</button></div>
   <div style="padding:8px 11px;overflow:auto">
    <div style="font-size:15px;font-weight:800;color:#fff">${z.n}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:5px"><span style="font-size:11px;color:var(--d-mu);font-weight:700;width:92px">Risk${f==="all"?"":" · "+HCM[f].code}</span><div class="dbar" style="flex:1"><i style="width:${Math.round(s.score*100)}%"></i></div><b>${s.score.toFixed(2)}</b><span class="lv ${lvl(s.score)}">${lvl(s.score)}</span></div>
    <div class="dk"><div><div class="v">${byAll.reduce((t,b)=>t+b[1],0)}</div><div class="l">Approved (all classes)</div></div><div><div class="v" style="color:${s.trend>5?"#ff8a6e":s.trend<-5?"#7dd3a0":"#fff"}">${s.trend>5?"▲":s.trend<-5?"▼":"■"} ${Math.abs(s.trend)}%</div><div class="l">vs prior period</div></div><div><div class="v">${byAll.length}</div><div class="l">Classes seen</div></div></div>
    <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--d-mu);font-weight:700;margin:3px 0 3px">Breakdown by hazard class</div>
    ${byAll.map(([c,n])=>`<div class="hb ${f!=="all"&&f!==c?"dim":""}"><span>${hchip(c)} <span class="hbl">${HCM[c].l.split(" (")[0].split(" & ")[0]}</span></span><div class="dbar"><i style="width:${n/mx*100}%;background:${HCM[c].col}"></i></div><b>${n}</b></div>`).join("")}
    <div class="dnote" style="margin-top:7px"><b style="color:#ffd08a">Suggested: ${ACT[top][0]}</b><div>${ACT[top][1]}</div></div>
    <div style="display:flex;gap:6px;margin-top:7px"><button class="dbtn or" id="btnWalk">Schedule walk-down</button><button class="dbtn" id="btnZoneAl">Show alarms</button></div>
   </div>`;}
S[7]=()=>{const h=ST.hm, n=ZONES.reduce((s,z)=>s+zStats(z).n,0);
 return sd("map",`
  <div class="pane" style="flex:1;min-width:0">
   <div class="hm-ctl"><span style="font-size:12.5px;font-weight:800;color:#fff">Hall 3 expansion · site map</span><span class="lv" style="background:#4b3f86;color:#e6e0ff">WSafe hazard layer · Phase 2 (planned)</span><span style="flex:1"></span>
    <div class="seg">${[7,30,90].map(w=>`<button data-hmwin="${w}" class="${h.win===w?"on":""}">${w} days</button>`).join("")}</div></div>
   <div class="hm-cls"><span class="lbl">Hazard class</span><button data-hmcls="all" class="${h.cls==="all"?"on":""}">All</button>${HC.map(x=>`<button data-hmcls="${x.id}" class="${h.cls===x.id?"on":""}" title="${x.l}"><i style="background:${x.col}"></i>${x.code}</button>`).join("")}</div>
   <div class="kpirow"><div><div class="v">${n}</div><div class="l">Approved · ${h.cls==="all"?"all classes":HCM[h.cls].s} · ${h.win} d</div></div><div><div class="v">${Math.round(n*.33)}</div><div class="l">Dismissed as false positive</div></div><div><div class="v">3.4 min</div><div class="l">Median alarm → review (sample)</div></div><div><div class="v">${Math.round(n*.62)}</div><div class="l">Sent to Procore (approved)</div></div></div>
   <div class="hm-wrap">${siteMap()}</div>
   <div class="hm-foot"><div class="lgbar"></div><span>Low → High, relative within the filter (illustrative)</span><span style="flex:1"></span><span>Score = approved findings × class severity ÷ camera hours. Planned classes simulated. Not a prediction.</span></div>
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
  const tt=$("#toast"); tt.classList.toggle("top",n===3||n===6); tt.classList.toggle("right",n===4);
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
  const hg=e.target.closest("[data-hcgo]"); if(hg){ST.hcSel=hg.dataset.hcgo;go(6);return;}
  const g=e.target.closest("[data-go]"); if(g){go(g.dataset.go);return;}
  const mt=e.target.closest("[data-mtab]"); if(mt){ if(mt.dataset.mtab==="live"){toast("Live view of CAM-102 opens in a tile (native Security Desk behavior, mock)");return;} ST.mtab=mt.dataset.mtab;render();return;}
  const sl=e.target.closest("[data-sel]"); if(sl){ST.sel=sl.dataset.sel;render();return;}
  const hcr=e.target.closest("[data-hc]"); if(hcr){ST.hcSel=hcr.dataset.hc;render();return;}
  const hv=e.target.closest("[data-hcview]"); if(hv){ST.hcView=hv.dataset.hcview;render();return;}
  const hw=e.target.closest("[data-hmwin]"); if(hw){ST.hm.win=+hw.dataset.hmwin;render();return;}
  const hcl=e.target.closest("[data-hmcls]"); if(hcl){ST.hm.cls=hcl.dataset.hmcls;render();return;}
  const hz=e.target.closest("[data-zone]"); if(hz){ST.hm.zone=hz.dataset.zone;render();return;}
  const tg=e.target.closest("#tglProcore"); if(tg&&!ST.sent){ST.procoreOn=!ST.procoreOn;render();toast(ST.procoreOn?"Procore hand-off on for this site (mock)":"Procore hand-off off: approved findings stay in WSafe and Security Center");return;}
  const id=e.target.closest("button")&&e.target.closest("button").id;
  if(id==="btnOpenReview"){toast("Opening the WSafe review page from the alarm link (mock)");ST.sel="WS-1042";setTimeout(()=>go(3),500);}
  if(id==="btnAckEarly"){toast("Ack marks the alarm as seen. The approve/dismiss decision stays with the WSafe reviewer — open the review to continue.");}
  const nextOpen=()=>{const n=DET.find(x=>!ST.dismissed[x.id]&&!ST.ok[x.id]&&x.id!=="WS-1042"); return n?n.id:"WS-1042";};
  if(id==="btnDismiss"){const d=det(); if(d.id==="WS-1042"){toast("In this walkthrough, approve WS-1042. Try dismissing another candidate instead.");} else {ST.dismissed[d.id]=true;ST.sel=nextOpen();render();toast(`${d.id} dismissed: alarm ${d.alarm} closed as a false positive in Security Center. Nothing sent to Procore.`);}}
  if(id==="btnApprove"){const d=det(); if(d.id!=="WS-1042"){ST.ok[d.id]=true;ST.sel=nextOpen();render();toast(`${d.id} approved (${HCM[cls(d)].code}): “WSafe: Finding approved” posted to alarm ${d.alarm} (mock)`);return;}
    const b=$("#btnApprove"); b.textContent="Posting decision to Security Center…"; b.disabled=true; setTimeout(()=>{ST.approved=true;go(4);},900);}
  if(id==="btnAck"){ST.acked=true;render();toast("Alarm acknowledged · incident entry INC-0317 created (planned, mock)");}
  if(id==="btnSend"){const b=$("#btnSend"); b.textContent="Sending…"; b.disabled=true; setTimeout(()=>{ST.sent=true;render();toast("Photo + Safety Observation #212 created in Procore (mock)");},800);}
  if(id==="btnSkip"){toast("Kept in Security Center + WSafe only. Nothing sent to Procore.");}
  if(id==="btnHcMap"){ST.hm.cls=ST.hcSel;ST.hm.zone=null;go(7);}
  if(id==="btnHmClose"){ST.hm.zone=null;render();}
  if(id==="btnWalk"){toast("Walk-down task drafted for the safety lead (planned, mock)");}
  if(id==="btnZoneAl"){toast("Would open Alarm monitoring filtered to this zone's WSafe alarms (planned)");}
});
document.addEventListener("change",e=>{
  if(e.target.id==="vest"){ST.vest=e.target.checked;render();}
  if(e.target.id==="selCls"){ST.ov[ST.sel]={cls:e.target.value,sub:0};render();toast("Class changed by the reviewer; the sub-hazard and OSHA suggestion update (mock)");}
  if(e.target.id==="selSub"){const d=det();ST.ov[d.id]={cls:cls(d),sub:+e.target.value};render();}
});
document.addEventListener("keydown",e=>{if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName))return;
  if(e.key==="ArrowRight")go(ST.step>=LAST?0:ST.step+1); if(e.key==="ArrowLeft"&&ST.step>1)go(ST.step-1);});
$("#prev").onclick=()=>go(ST.step-1); $("#next").onclick=()=>go(ST.step>=LAST?0:ST.step+1);
if(/[?&]capture=1/.test(location.search)) document.body.classList.add("capture");
if(/[?&]shots=1/.test(location.search)) document.body.classList.add("shots");
const m=location.hash.match(/#s(\d)/); go(m?+m[1]:0);
window.addEventListener("hashchange",()=>{const m=location.hash.match(/#s(\d)/);if(m&&+m[1]!==ST.step)go(+m[1]);});
})();
