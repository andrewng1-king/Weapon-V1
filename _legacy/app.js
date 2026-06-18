'use strict';
/* ================= storage (dual-mode) ================= */
const KEY='gymtracker_v3';
let storageOK=true; const memStore={};
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ storageOK=false; return (k in memStore)?memStore[k]:null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){ storageOK=false; memStore[k]=v; } }
function emptyBucket(){ return {logs:[], custom:[], removed:[]}; }
function fixBucket(b){ b=b||{}; b.logs=b.logs||[]; b.custom=b.custom||[]; b.removed=b.removed||[]; return b; }
let db=load();
db.profile=db.profile||{}; db.display=db.display||{};
function load(){
  try{ const d=JSON.parse(lsGet(KEY));
    if(d && (d.strength||d.endurance||Array.isArray(d.logs))){
      return {mode:d.mode==='endurance'?'endurance':'strength', bw:Number(d.bw)||75,
        strength: fixBucket(d.strength||{logs:d.logs,custom:d.custom,removed:d.removed}),
        endurance: fixBucket(d.endurance), profile:d.profile||{}, display:d.display||{}};
    }
  }catch(e){}
  try{ const o=JSON.parse(lsGet('gymtracker_v2'));
    if(o&&Array.isArray(o.logs)) return {mode:'strength', bw:75, strength:fixBucket({logs:o.logs}), endurance:emptyBucket()};
  }catch(e){}
  try{ const old=JSON.parse(lsGet('gymtracker_v1'));
    if(old&&old.entries){
      const logs=old.entries.filter(e=>e.type==='strength'&&e.sets&&e.sets.length).map(e=>{
        const top=e.sets.reduce((a,s)=>s.kg>a.kg?s:a,e.sets[0]);
        return {id:e.id, date:e.date, ex:e.name, kg:top.kg, reps:top.reps, sets:e.sets.length};
      });
      return {mode:'strength', bw:75, strength:fixBucket({logs}), endurance:emptyBucket()};
    }
  }catch(e){}
  return {mode:'strength', bw:75, strength:emptyBucket(), endurance:emptyBucket()};
}
function save(){ lsSet(KEY, JSON.stringify(db)); }
function S(){ return db[db.mode]; }
function accent(){ return db.mode==='endurance' ? '#3fb6ae' : '#cc3551'; }
function accentRGB(){ return db.mode==='endurance' ? '63,182,174' : '204,53,81'; }

/* ================= helpers ================= */
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function fmtDate(s){ return new Date(s+'T00:00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'}); }
function toast(m){ const t=document.getElementById('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1500); }
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function attr(s){ return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function slug(s){ return s.replace(/[^a-z0-9]/gi,'_'); }
function round1(x){ return Math.round(x*10)/10; }

/* ================= catalogue ================= */
const PRESETS={
  'Chest':[
    {n:'Bench Press', t:'Mid chest · front delts · triceps', start:40},
    {n:'Incline Press', t:'Upper chest · front delts', start:30},
    {n:'Dip', t:'Lower chest · triceps', start:0},
    {n:'Cable Fly', t:'Inner & mid chest', start:12.5},
  ],
  'Back':[
    {n:'Pull-up', t:'Lats · upper back', start:0},
    {n:'Lat Pulldown', t:'Lats — back width', start:40},
    {n:'Barbell Row', t:'Mid back · lats — thickness', start:40},
    {n:'Seated Cable Row', t:'Mid back · rhomboids', start:40},
    {n:'Deadlift', t:'Lower back · glutes · hamstrings', start:60},
  ],
  'Shoulders':[
    {n:'Overhead Press', t:'Front & side delts · triceps', start:30},
    {n:'Lateral Raise', t:'Side delts — width', start:8},
    {n:'Rear Delt Fly', t:'Rear delts · upper back', start:8},
    {n:'Face Pull', t:'Rear delts · traps — posture', start:15},
    {n:'Shrug', t:'Upper traps', start:40},
  ],
  'Arms':[
    {n:'Barbell Curl', t:'Biceps — overall mass', start:20},
    {n:'Hammer Curl', t:'Biceps · brachialis', start:10},
    {n:'Preacher Curl', t:'Biceps — strict isolation', start:15},
    {n:'Tricep Pushdown', t:'Triceps — lateral head', start:20},
    {n:'Skull Crusher', t:'Triceps — long head', start:20},
  ],
  'Legs':[
    {n:'Squat', t:'Quads · glutes', start:50},
    {n:'Leg Press', t:'Quads · glutes', start:80},
    {n:'Leg Extension', t:'Quads — isolation', start:30},
    {n:'Romanian Deadlift', t:'Hamstrings · glutes', start:50},
    {n:'Leg Curl', t:'Hamstrings — isolation', start:30},
    {n:'Hip Thrust', t:'Glutes', start:60},
    {n:'Calf Raise', t:'Calves', start:40},
  ],
  'Core':[
    {n:'Cable Crunch', t:'Abs — weighted', start:25},
    {n:'Hanging Leg Raise', t:'Lower abs · hip flexors', start:0},
    {n:'Russian Twist', t:'Obliques — rotation', start:5},
    {n:'Plank', t:'Whole core — reps = seconds', start:0},
  ],
};
const GROUPS=Object.keys(PRESETS);
const GROUP_COLORS={'Chest':'#cc3551','Back':'#d9b25f','Shoulders':'#5b9bff','Arms':'#3ddc97','Legs':'#b06ae0','Core':'#f3efec'};
function exercisesFor(g){
  return PRESETS[g].filter(e=>!S().removed.includes(e.n))
    .concat(S().custom.filter(c=>c.g===g).map(c=>({n:c.n,t:c.t,start:c.start,custom:true})));
}
function findEx(name){ for(const g of GROUPS){ const e=exercisesFor(g).find(x=>x.n===name); if(e) return {...e,g}; } return null; }
function groupOf(name){
  for(const g of GROUPS){ if(exercisesFor(g).some(x=>x.n===name)) return g; if(PRESETS[g].some(x=>x.n===name)) return g; }
  const c=S().custom.find(x=>x.n===name); if(c) return c.g; return null;
}

/* ================= state ================= */
let curGroup=GROUPS[0];
const vals={};
function logsFor(ex){ return S().logs.filter(l=>l.ex===ex).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0); }
function lastLog(ex){ const l=logsFor(ex); return l.length?l[l.length-1]:null; }
function prevLog(ex){ const l=logsFor(ex); return l.length>1?l[l.length-2]:null; }
function getVals(ex){ if(!vals[ex.n]){ const last=lastLog(ex.n); vals[ex.n]={kg:last?last.kg:ex.start, reps:last?last.reps:8}; } return vals[ex.n]; }

/* ================= nav + mode ================= */
document.querySelectorAll('.bottomnav button[data-t]').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.bottomnav button[data-t]').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('tab-'+b.dataset.t).classList.add('active');
    renderActive();
    window.scrollTo(0,0);
  };
});
function activeTab(){ const a=document.querySelector('.bottomnav button[data-t].active'); return a?a.dataset.t:'workout'; }
function renderActive(){ const t=activeTab();
  if(t==='workout') renderGroup();
  else if(t==='history') renderHistory();
  else if(t==='report'){ fillProgSelect(); renderReport(); }
  else if(t==='avatar') renderAvatar();
}
function applyMode(){
  document.body.dataset.mode=db.mode;
  const end=db.mode==='endurance';
  document.getElementById('navWorkout').textContent= end?'Run':'Workout';
  document.getElementById('groupDd').style.display= end?'none':'';
  renderHead(); renderActive(); updateNavBadge(); checkLevelUp();
}
function toggleMode(){ db.mode = db.mode==='endurance'?'strength':'endurance'; closeGroupMenu(); curGroup=GROUPS[0]; for(const k in vals) delete vals[k]; save(); applyMode(); toast(db.mode==='endurance'?'Endurance mode':'Strength mode'); }
function renderHead(){ document.getElementById('headStats').textContent = db.mode==='endurance' ? 'Roadrunner' : 'Worldbreaker'; }

/* ================= group dropdown ================= */
function buildDropdown(){
  document.getElementById('ddLabel').textContent=curGroup;
  document.getElementById('groupMenu').innerHTML=
    GROUPS.map(g=>`<button class="${g===curGroup?'on':''}" onclick="setGroup('${g}')">${g}</button>`).join('')
    +`<button class="dd-add" onclick="openModal()">+ New exercise</button>`;
}
function toggleGroupMenu(){ const m=document.getElementById('groupMenu'), b=document.getElementById('groupDd'); const open=m.classList.toggle('open'); b.classList.toggle('open',open); }
function closeGroupMenu(){ const m=document.getElementById('groupMenu'); if(m) m.classList.remove('open'); const b=document.getElementById('groupDd'); if(b) b.classList.remove('open'); }
function setGroup(g){ curGroup=g; closeGroupMenu(); buildDropdown(); renderGroup(); }
document.addEventListener('click',(e)=>{ const wt=document.querySelector('.wk-top'); if(wt && !wt.contains(e.target)) closeGroupMenu(); });

/* ================= workout view ================= */
function trendHTML(ex){
  const last=lastLog(ex), prev=prevLog(ex);
  if(!last) return `<span class="flat">Not logged yet</span>`;
  let arrow='';
  if(prev){
    if(last.kg>prev.kg) arrow=` <span class="up">▲ +${round1(last.kg-prev.kg)}</span>`;
    else if(last.kg<prev.kg) arrow=` <span class="down">▼ ${round1(last.kg-prev.kg)}</span>`;
    else arrow=` <span class="flat">—</span>`;
  }
  const best=Math.max(...logsFor(ex).map(l=>l.kg));
  const pr=(last.kg>=best&&prev)?` <span class="pr-star">★</span>`:'';
  return `<b>${last.kg} kg × ${last.reps}</b> <span class="flat">· ${fmtDate(last.date)}</span>${arrow}${pr}`;
}
function renderGroup(){
  renderHead();
  const gv=document.getElementById('groupView');
  if(db.mode==='endurance'){
    gv.innerHTML='<div class="empty">RUN MODE<br><br>Run tracking is coming soon. Switch to Strength to train and log lifts.</div>';
    return;
  }
  buildDropdown();
  const exs=exercisesFor(curGroup); const today=todayStr();
  gv.innerHTML =
    `<div class="hint" style="margin:2px 4px 12px;letter-spacing:1px">${exs.length} exercises</div>`+
    exs.map(ex=>{
      const v=getVals(ex); const sid=slug(ex.n);
      const todayN=S().logs.filter(l=>l.ex===ex.n&&l.date===today).length;
      return `<div class="ex">
        <div class="ex-head" onclick="toggleDetail('${sid}','${attr(ex.n)}')">
          <div style="flex:1;min-width:0">
            <div class="ex-name">${esc(ex.n)}</div>
            <div class="ex-target">${esc(ex.t||'')}</div>
            <div class="lastlog" id="trend_${sid}">${trendHTML(ex.n)}</div>
            ${todayN?`<div class="logged-today">✓ Logged today${todayN>1?' ×'+todayN:''}</div>`:''}
          </div>
          <div class="chev" id="chev_${sid}">▾</div>
        </div>
        <div class="controls">
          <div class="stepper">
            <button onclick="bump('${attr(ex.n)}','kg',-2.5)">−</button>
            <div class="val"><input type="number" step="0.5" inputmode="decimal" value="${v.kg}" onchange="setVal('${attr(ex.n)}','kg',this.value)"><span class="unit">kg</span></div>
            <button onclick="bump('${attr(ex.n)}','kg',2.5)">+</button>
          </div>
          <div class="stepper">
            <button onclick="bump('${attr(ex.n)}','reps',-1)">−</button>
            <div class="val"><input type="number" step="1" inputmode="numeric" value="${v.reps}" onchange="setVal('${attr(ex.n)}','reps',this.value)"><span class="unit">reps · 3 sets</span></div>
            <button onclick="bump('${attr(ex.n)}','reps',1)">+</button>
          </div>
          <button class="logbtn" id="log_${sid}" onclick="logEx('${attr(ex.n)}')"><svg class="log-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l6 6-6 6M12 6l6 6-6 6"></path></svg></button>
        </div>
        <div class="detail" id="detail_${sid}"></div>
      </div>`;
    }).join('')+
    `<button class="addbtn" onclick="openModal()">＋ Add exercise to ${curGroup}</button>`;
}
function bump(name,field,d){
  const ex=findEx(name); if(!ex) return; const v=getVals(ex);
  v[field]=Math.max(0, round1(v[field]+d));
  const sid=slug(name);
  const inputs=document.getElementById('detail_'+sid).parentElement.querySelectorAll('.stepper input');
  inputs[field==='kg'?0:1].value=v[field];
}
function setVal(name,field,val){ const ex=findEx(name); if(!ex) return; const v=getVals(ex); const x=parseFloat(val); if(!isNaN(x)&&x>=0) v[field]=x; }
function logEx(name){
  const ex=findEx(name); if(!ex) return; const v=getVals(ex);
  const log={id:uid(), date:todayStr(), ex:name, kg:v.kg, reps:v.reps, sets:3};
  const btn=document.getElementById('log_'+slug(name));
  if(btn){ btn.classList.remove('firing'); void btn.offsetWidth; btn.classList.add('firing'); }
  if(navigator.vibrate) navigator.vibrate([12,28,12]);
  S().logs.push(log);
  if(rec.on){ rec.items.push({ex:name, xp:logXP(log), cal:calForLog(log)}); updateRecBar(); }
  save(); toast(`${name} · ${v.kg} kg × ${v.reps}`);
  checkLevelUp(); setTimeout(renderGroup, 420);
}
function toggleDetail(sid,name){
  const d=document.getElementById('detail_'+sid);
  const open=d.classList.toggle('open');
  document.getElementById('chev_'+sid).textContent=open?'▴':'▾';
  if(open){
    const logs=logsFor(name);
    const removeBtn=`<button class="removex" onclick="removeEx('${attr(name)}')">Remove this exercise from the list</button>`;
    if(!logs.length){ d.innerHTML='<div class="empty" style="padding:14px 0">No history yet</div>'+removeBtn; return; }
    d.innerHTML=`<canvas id="spark_${sid}"></canvas><div class="mini-hist">`+
      [...logs].reverse().slice(0,5).map(l=>`${fmtDate(l.date)} — <b>${l.kg} kg × ${l.reps}</b>`).join('<br>')+`</div>`+removeBtn;
    lineChart('spark_'+sid, logs.map(l=>({d:l.date,v:l.kg})), 110);
  }
}
function removeEx(name){
  if(!confirm(`Remove "${name}" from your exercise list? Logged history is kept.`)) return;
  const c=S().custom.find(x=>x.n===name);
  if(c) S().custom=S().custom.filter(x=>x.n!==name); else S().removed.push(name);
  save(); renderGroup(); toast('Removed');
}

/* ================= add exercise ================= */
function openModal(){
  closeGroupMenu();
  document.getElementById('mGroup').innerHTML=GROUPS.map(g=>`<option ${g===curGroup?'selected':''}>${g}</option>`).join('');
  document.getElementById('mName').value=''; document.getElementById('mTarget').value=''; document.getElementById('mStart').value='20';
  document.getElementById('modalBg').classList.add('open');
  setTimeout(()=>document.getElementById('mName').focus(),100);
}
function closeModal(){ document.getElementById('modalBg').classList.remove('open'); }
function saveCustom(){
  const n=document.getElementById('mName').value.trim();
  if(!n){ toast('Enter a name'); return; }
  if(findEx(n)){ toast('That exercise already exists'); return; }
  const g=document.getElementById('mGroup').value;
  const t=document.getElementById('mTarget').value.trim();
  const start=parseFloat(document.getElementById('mStart').value)||0;
  S().custom.push({n,g,t,start});
  S().removed=S().removed.filter(r=>r!==n);
  save(); closeModal(); curGroup=g; renderGroup(); toast(n+' added');
}

/* ================= history ================= */
function delLog(id){ S().logs=S().logs.filter(l=>l.id!==id); save(); renderHistory(); }
function renderHistory(){
  renderHead();
  const el=document.getElementById('historyList');
  if(db.mode==='endurance'){ el.innerHTML='<div class="empty">No runs yet — Run history will appear here.</div>'; return; }
  if(!S().logs.length){ el.innerHTML='<div class="empty">No workouts logged yet</div>'; return; }
  const dates=[...new Set(S().logs.map(l=>l.date))].sort().reverse();
  el.innerHTML='<div class="sectionTitle">History</div>'+dates.map(d=>{
    const list=S().logs.filter(l=>l.date===d);
    const vol=list.reduce((a,l)=>a+l.kg*l.reps*l.sets,0);
    const groups=[...new Set(list.map(l=>groupOf(l.ex)).filter(Boolean))].join(' · ');
    return `<div class="session-date">${fmtDate(d)}<small>${groups}${vol?` · ${Math.round(vol).toLocaleString()} kg`:''}</small></div>`+
      list.map(l=>`<div class="hentry"><div><div><b>${esc(l.ex)}</b></div><div class="small">${l.sets} × ${l.reps} @ <b>${l.kg} kg</b></div></div>
        <button class="del" onclick="delLog('${l.id}')">✕</button></div>`).join('');
  }).join('');
}

/* ================= report ================= */
function weekDates(){
  const now=new Date(); const mon=new Date(now); mon.setHours(0,0,0,0);
  mon.setDate(now.getDate()-((now.getDay()+6)%7));
  return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); });
}
function fillProgSelect(){
  const sel=document.getElementById('progEx');
  const logged=[...new Set(S().logs.map(l=>l.ex))];
  const ordered=GROUPS.flatMap(g=>exercisesFor(g).map(e=>e.n)).filter(n=>logged.includes(n));
  logged.forEach(n=>{ if(!ordered.includes(n)) ordered.push(n); });
  const cur=sel.value;
  sel.innerHTML=ordered.length? ordered.map(n=>`<option ${n===cur?'selected':''}>${esc(n)}</option>`).join('') : '<option>Nothing logged yet</option>';
}
function renderReport(){
  renderHead();
  renderDayProgress();
  if(db.mode==='endurance'){ document.getElementById('weekLabel').textContent=''; }
  const wd=weekDates(); const today=todayStr();
  const trained=wd.map(d=>S().logs.some(l=>l.date===d));
  document.getElementById('weekLabel').textContent=trained.filter(Boolean).length+' / 7 days';
  drawWeek('chWeek', wd, trained, today);
  const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-30);
  const cut=cutoff.getFullYear()+'-'+String(cutoff.getMonth()+1).padStart(2,'0')+'-'+String(cutoff.getDate()).padStart(2,'0');
  const counts={};
  S().logs.filter(l=>l.date>=cut).forEach(l=>{ const g=groupOf(l.ex)||'Other'; counts[g]=(counts[g]||0)+l.sets; });
  drawSplit('chSplit', counts);
  document.getElementById('splitLegend').innerHTML=Object.keys(counts).length?
    Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([g,c])=>`<span><i style="background:${GROUP_COLORS[g]||'#888'}"></i>${g} — ${c} sets</span>`).join(''):'';
  const ex=document.getElementById('progEx').value;
  const logs=logsFor(ex);
  lineChart('chProg', logs.map(l=>({d:l.date,v:l.kg})), 200);
  const st=document.getElementById('progStats');
  if(!logs.length){ st.innerHTML=''; return; }
  const first=logs[0].kg, last=logs[logs.length-1].kg, best=Math.max(...logs.map(l=>l.kg));
  const ch=first?Math.round((last-first)/first*100):0;
  st.innerHTML=`<div class="stat"><div class="v">${first}</div><div class="l">First</div></div>
    <div class="stat"><div class="v">${last}</div><div class="l">Now</div></div>
    <div class="stat"><div class="v" style="color:var(--gold)">${best}</div><div class="l">Best</div></div>
    <div class="stat"><div class="v" style="color:${ch>=0?'var(--green)':'var(--accent)'}">${ch>=0?'+':''}${ch}%</div><div class="l">Growth</div></div>`;
}

/* ================= charts ================= */
function setupCanvas(id,h){
  const cv=document.getElementById(id); if(!cv) return null;
  const dpr=window.devicePixelRatio||1; const W=cv.clientWidth||340;
  cv.width=W*dpr; cv.height=h*dpr; cv.style.height=h+'px';
  const ctx=cv.getContext('2d'); if(!ctx) return null; ctx.scale(dpr,dpr); ctx.clearRect(0,0,W,h);
  return {ctx,W,H:h};
}
function emptyMsg(ctx,W,H){ ctx.fillStyle='#8f8782'; ctx.font='13px "Kanit",sans-serif'; ctx.textAlign='center'; ctx.fillText('No data yet',W/2,H/2); }
function drawWeek(id, dates, trained, today){
  const c=setupCanvas(id,90); if(!c) return; const {ctx,W,H}=c;
  const names=['M','T','W','T','F','S','S']; const cell=W/7;
  dates.forEach((d,i)=>{
    const x=cell*i+cell/2, y=38, r=Math.min(17,cell/2-6);
    ctx.beginPath(); ctx.arc(x,y,r,0,7);
    if(trained[i]){ ctx.fillStyle=accent(); ctx.fill(); } else { ctx.strokeStyle='#2c2424'; ctx.lineWidth=2; ctx.stroke(); }
    if(d===today){ ctx.beginPath(); ctx.arc(x,y,r+4,0,7); ctx.strokeStyle='#d9b25f'; ctx.lineWidth=1.5; ctx.stroke(); }
    if(trained[i]){ ctx.fillStyle='#fff'; ctx.font='bold 13px "Kanit",sans-serif'; ctx.textAlign='center'; ctx.fillText('✓',x,y+4.5); }
    ctx.fillStyle = d===today ? '#d9b25f' : '#8f8782';
    ctx.font='11px "Kanit",sans-serif'; ctx.textAlign='center'; ctx.fillText(names[i],x,H-14);
  });
}
function drawSplit(id, counts){
  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const h=Math.max(60, entries.length*34+10);
  document.getElementById(id).style.height=h+'px';
  const c=setupCanvas(id,h); if(!c) return; const {ctx,W,H}=c;
  if(!entries.length){ emptyMsg(ctx,W,H); return; }
  const total=entries.reduce((a,e)=>a+e[1],0); const max=entries[0][1];
  const labelW=82, valW=46, barMax=W-labelW-valW;
  entries.forEach(([g,n],i)=>{
    const y=i*34+8, bh=18;
    ctx.fillStyle='#f3efec'; ctx.font='12px "Kanit",sans-serif'; ctx.textAlign='left'; ctx.fillText(g, 0, y+bh-4);
    ctx.fillStyle='#1d1a1a'; roundRect(ctx, labelW, y, barMax, bh, 6); ctx.fill();
    const w=Math.max(6, barMax*n/max); ctx.fillStyle=GROUP_COLORS[g]||'#888'; roundRect(ctx, labelW, y, w, bh, 6); ctx.fill();
    ctx.fillStyle='#8f8782'; ctx.textAlign='right'; ctx.font='11px "Kanit",sans-serif'; ctx.fillText(Math.round(n/total*100)+'%', W, y+bh-4);
  });
}
function roundRect(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function lineChart(id, points, height){
  const c=setupCanvas(id,height); if(!c) return; const {ctx,W,H}=c;
  if(!points.length){ emptyMsg(ctx,W,H); return; }
  const pad={l:36,r:12,t:14,b:20}; const ys=points.map(p=>p.v);
  let minY=Math.min(...ys), maxY=Math.max(...ys);
  if(minY===maxY){ minY-=2; maxY+=2; } else { const s=maxY-minY; minY-=s*.12; maxY+=s*.12; }
  const X=i=> pad.l+(points.length===1?(W-pad.l-pad.r)/2:i*(W-pad.l-pad.r)/(points.length-1));
  const Y=v=> pad.t+(1-(v-minY)/(maxY-minY))*(H-pad.t-pad.b);
  ctx.strokeStyle='#2c2424'; ctx.fillStyle='#8f8782'; ctx.font='10px "Kanit",sans-serif'; ctx.textAlign='right';
  for(let g=0;g<4;g++){ const v=minY+(maxY-minY)*g/3, y=Y(v); ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke(); ctx.fillText(round1(v), pad.l-5, y+3); }
  ctx.textAlign='center'; ctx.fillText(points[0].d.slice(5), X(0), H-5);
  if(points.length>1) ctx.fillText(points[points.length-1].d.slice(5), X(points.length-1), H-5);
  ctx.beginPath(); points.forEach((p,i)=>{ i?ctx.lineTo(X(i),Y(p.v)):ctx.moveTo(X(i),Y(p.v)); });
  ctx.lineTo(X(points.length-1),H-pad.b); ctx.lineTo(X(0),H-pad.b); ctx.closePath();
  const gr=ctx.createLinearGradient(0,pad.t,0,H); gr.addColorStop(0,`rgba(${accentRGB()},.30)`); gr.addColorStop(1,`rgba(${accentRGB()},0)`);
  ctx.fillStyle=gr; ctx.fill();
  ctx.strokeStyle=accent(); ctx.lineWidth=2.2; ctx.beginPath(); points.forEach((p,i)=>{ i?ctx.lineTo(X(i),Y(p.v)):ctx.moveTo(X(i),Y(p.v)); }); ctx.stroke();
  ctx.fillStyle=accent(); points.forEach((p,i)=>{ ctx.beginPath(); ctx.arc(X(i),Y(p.v),3,0,7); ctx.fill(); });
  const last=points[points.length-1]; ctx.fillStyle='#f3efec'; ctx.font='bold 12px "Kanit",sans-serif'; ctx.textAlign='left'; ctx.fillText(last.v+' kg', Math.min(X(points.length-1)+8,W-48), Y(last.v)-8);
}

/* ================= avatar ================= */
const MAXLVL=21;
const STR_RANKS=['Recruit','Lifter','Trainee','Grinder','Builder','Strongman','Ironbound','Powerhouse','Dante','Veteran','Elite','Titan','Juggernaut','Colossus','Behemoth','Leviathan','Mythic','Ascendant','Legend','Mundus','Immortal'];
const END_AXES=['Speed','Endurance','Explosiveness','Power','Pace','Distance'];
function logXP(l){ return Math.round((l.kg||0)*(l.reps||0)*(l.sets||1)/30) + (l.sets||1); }
function totalXP(){ return S().logs.reduce((a,l)=>a+logXP(l),0); }
function levelInfo(){
  const xp=totalXP(); let lvl=1, need=120, acc=0;
  while(lvl<MAXLVL && xp>=acc+need){ acc+=need; lvl++; need=Math.round(need*1.32); }
  const into=xp-acc; return {xp, lvl, into, need: lvl<MAXLVL?need:0, pct: lvl<MAXLVL?Math.max(0,Math.min(1,into/need)):1};
}
function rankFor(lvl){ const i=Math.min(lvl,MAXLVL)-1; return {name:STR_RANKS[i], next: lvl<MAXLVL?STR_RANKS[lvl]:null, nextLvl: lvl+1}; }
function emblemForLevel(lvl){
  const t = lvl>=21?7 : lvl>=19?6 : lvl>=16?5 : lvl>=13?4 : lvl>=10?3 : lvl>=7?2 : lvl>=4?1 : 0;
  let s='<svg viewBox="-10 -10 120 138" fill="none" preserveAspectRatio="xMidYMid meet">';
  s+='<path class="hexo" d="M50 6 L90 29 V83 L50 106 L10 83 V29 Z"/>';
  s+='<path class="hexi" d="M50 16 L82 34 V78 L50 96 L18 78 V34 Z"/>';
  if(t>=1) s+='<path class="hexi" d="M50 24 L74 38.5 V73.5 L50 88 L26 73.5 V38.5 Z"/>';
  if(t>=2) s+='<g class="accf">'+[[50,6],[90,29],[90,83],[50,106],[10,83],[10,29]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="2.6"/>`).join('')+'</g>';
  if(t>=3) s+='<path class="acc" stroke-width="1.4" d="M50 1 L95 26 V86 L50 111 L5 86 V26 Z"/>';
  if(t>=4) s+='<g class="acc" stroke-width="2"><path d="M50 1 L50 -6"/><path d="M95 26 L102 21"/><path d="M5 26 L-2 21"/><path d="M95 86 L102 91"/><path d="M5 86 L-2 91"/><path d="M50 111 L50 118"/></g>';
  if(t>=5) s+='<circle class="acc" cx="50" cy="56" r="54" stroke-width="1" opacity=".45"/>';
  if(t>=6) s+='<g class="accf">'+[[50,1],[95,26],[95,86],[50,111],[5,86],[5,26]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.2"/>`).join('')+'</g>';
  if(t>=7){ s+='<g class="acc" stroke-width="1.5" opacity=".85">'; for(let k=0;k<12;k++){ const a=k*Math.PI/6; const x1=(50+Math.cos(a)*58).toFixed(1), y1=(56+Math.sin(a)*58).toFixed(1), x2=(50+Math.cos(a)*66).toFixed(1), y2=(56+Math.sin(a)*66).toFixed(1); s+=`<path d="M${x1} ${y1} L${x2} ${y2}"/>`; } s+='</g>'; }
  s+='</svg>';
  return s;
}
function drawRadar(id, axes, vals, color){
  const c=setupCanvas(id,260); if(!c) return; const {ctx,W,H}=c;
  const cx=W/2, cy=H/2+4, R=Math.min(W/2,H/2)-36; const N=axes.length, ang=i=>-Math.PI/2+i*2*Math.PI/N;
  const max=Math.max(1, ...axes.map(a=>vals[a]||0));
  ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1;
  for(let ring=1;ring<=4;ring++){ ctx.beginPath(); for(let i=0;i<=N;i++){ const a=ang(i%N), rr=R*ring/4, x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); ctx.stroke(); }
  ctx.fillStyle='#9a938e'; ctx.font='10px "Kanit",sans-serif';
  axes.forEach((g,i)=>{ const a=ang(i), x=cx+Math.cos(a)*R, y=cy+Math.sin(a)*R; ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke(); const lx=cx+Math.cos(a)*(R+15), ly=cy+Math.sin(a)*(R+13); ctx.textAlign=Math.abs(Math.cos(a))<.35?'center':(Math.cos(a)>0?'left':'right'); ctx.fillText(g, lx, ly+3); });
  if(!axes.some(a=>(vals[a]||0)>0)){ emptyMsg(ctx,W,H); return; }
  ctx.beginPath(); axes.forEach((g,i)=>{ const a=ang(i), rr=R*((vals[g]||0)/max), x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y);}); ctx.closePath();
  ctx.fillStyle=`rgba(${accentRGB()},.22)`; ctx.fill(); ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle=color; axes.forEach((g,i)=>{ const a=ang(i), rr=R*((vals[g]||0)/max), x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr; ctx.beginPath(); ctx.arc(x,y,2.6,0,7); ctx.fill(); });
}
function renderAvatar(){
  renderHead();
  const li=levelInfo();
  S().seenLevel=li.lvl; save();
  const _ab=document.querySelector('.bottomnav button[data-t="avatar"]'); if(_ab) _ab.classList.remove('leveled');
  const _bw=document.getElementById('bwInput'); if(_bw) _bw.value=db.bw||75;
  updateNavBadge(); renderIDCard();
  document.getElementById('avLevelNum').textContent=li.lvl;
  document.getElementById('emblemSvg').innerHTML=emblemForLevel(li.lvl);
  document.getElementById('xpText').textContent = li.lvl<MAXLVL ? `${li.into} / ${li.need} XP  ·  ${li.xp} total` : `MAX LEVEL · ${li.xp} XP`;
  const fill=document.getElementById('xpFill'); fill.style.width='0%'; requestAnimationFrame(()=>requestAnimationFrame(()=>{ fill.style.width=(li.pct*100).toFixed(1)+'%'; }));
  const rankCard=document.getElementById('rankCard');
  if(db.mode==='endurance'){
    document.getElementById('avRankSmall').textContent='LV '+li.lvl;
    rankCard.style.display='none';
    document.getElementById('radarHint').textContent='Endurance profile — log runs to build it';
    const vals={}; END_AXES.forEach(a=>vals[a]=0);
    drawRadar('chRadar', END_AXES, vals, accent());
  } else {
    rankCard.style.display='';
    const rk=rankFor(li.lvl);
    document.getElementById('avRank').textContent=rk.name;
    document.getElementById('avRankSmall').textContent='LV '+li.lvl+' · '+rk.name;
    document.getElementById('avRankNext').textContent = rk.next ? `Next: ${rk.next} at level ${rk.nextLvl}` : 'IMMORTAL — max rank reached';
    document.getElementById('radarHint').textContent='Sets trained per muscle group — all time';
    const counts={}; GROUPS.forEach(g=>counts[g]=0); S().logs.forEach(l=>{ const g=groupOf(l.ex); if(g&&counts[g]!=null) counts[g]+=(l.sets||1); });
    drawRadar('chRadar', GROUPS, counts, accent());
  }
}

/* ================= record session ================= */
let rec={on:false, start:0, items:[], timer:null};
function fmtClock(s){ const m=Math.floor(s/60); return m+':'+String(s%60).padStart(2,'0'); }
function calForLog(l){ const vol=(l.kg||0)*(l.reps||0)*(l.sets||1); return Math.round((vol*0.025 + (l.sets||1)*4) * ((db.bw||75)/75)); }
function toggleRecord(){ rec.on?stopRecord():startRecord(); }
function startRecord(){ rec={on:true, start:Date.now(), items:[], timer:null}; document.getElementById('recBtn').classList.add('recording'); document.getElementById('recBar').classList.add('show'); updateRecBar(); rec.timer=setInterval(updateRecBar,1000); toast('Recording started'); }
function updateRecBar(){ if(!rec.on) return; const secs=Math.floor((Date.now()-rec.start)/1000); const mins=secs/60; const cal=rec.items.reduce((a,i)=>a+i.cal,0); const xp=rec.items.reduce((a,i)=>a+i.xp,0); document.getElementById('rbTime').textContent=fmtClock(secs); document.getElementById('rbCal').textContent=Math.round(cal); document.getElementById('rbRate').textContent= mins>0.05?(cal/mins).toFixed(1):'0'; document.getElementById('rbXp').textContent='+'+xp; }
function stopRecord(){ clearInterval(rec.timer); rec.on=false; document.getElementById('recBtn').classList.remove('recording'); document.getElementById('recBar').classList.remove('show'); showRecSummary(); }
function showRecSummary(){
  const secs=Math.floor((Date.now()-rec.start)/1000); const mins=secs/60;
  const cal=rec.items.reduce((a,i)=>a+i.cal,0); const xp=rec.items.reduce((a,i)=>a+i.xp,0);
  const rate= mins>0.05?(cal/mins).toFixed(1):'0';
  const list = rec.items.length ? rec.items.map(i=>`<div class="rec-row"><span class="rx-ex">${esc(i.ex)}</span><span class="rx-meta">+${i.xp} XP · ${i.cal} kcal</span></div>`).join('') : '<div class="empty" style="padding:18px 0">No exercises logged this session</div>';
  document.getElementById('recSumBody').innerHTML =
    `<div class="rec-totals"><div class="stat"><div class="v">${fmtClock(secs)}</div><div class="l">Time</div></div><div class="stat"><div class="v">${Math.round(cal)}</div><div class="l">kcal</div></div><div class="stat"><div class="v">${rate}</div><div class="l">kcal / min</div></div></div>`+
    `<div style="font-size:.66rem;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;margin:8px 2px 2px">Exercises · +${xp} XP total</div>`+list;
  document.getElementById('recSummary').classList.add('open');
}
function closeRecSummary(){ document.getElementById('recSummary').classList.remove('open'); }

/* ================= bodyweight ================= */
function saveBW(v){ const x=parseFloat(v); if(!isNaN(x)&&x>0&&x<400){ db.bw=Math.round(x); save(); if(rec.on) updateRecBar(); toast('Bodyweight saved'); } }

/* ================= nav badge / level-up ================= */
function currentLevel(){ return levelInfo().lvl; }
function updateNavBadge(){ const t=document.getElementById('navLevelTxt'); if(t) t.textContent=currentLevel(); }
function checkLevelUp(){ const cur=currentLevel(); const seen=S().seenLevel||1; const btn=document.querySelector('.bottomnav button[data-t="avatar"]'); if(btn) btn.classList.toggle('leveled', cur>seen); updateNavBadge(); }

/* ================= all ranks ================= */
function openRanks(){ const cur=currentLevel(); document.getElementById('ranksList').innerHTML=STR_RANKS.map((r,i)=>{ const lv=i+1; return `<div class="rank-line ${lv===cur?'cur':''}" onclick="showRankInfo(${lv})"><span class="rl-lv">${lv}</span><span class="rl-name">${r}</span>${lv===cur?'<span class="rl-tag">YOU</span>':''}</div>`; }).join(''); document.getElementById('ranksModal').classList.add('open'); }
function closeRanks(){ document.getElementById('ranksModal').classList.remove('open'); }
function xpToReach(L){ let need=120, acc=0; for(let i=1;i<L;i++){ acc+=need; need=Math.round(need*1.32); } return acc; }
function showRankInfo(L){
  const name=STR_RANKS[L-1];
  document.getElementById('ranksList').innerHTML =
    `<div class="rankinfo"><div class="ri-emblem">${emblemForLevel(L)}<div class="ri-lvl">${L}</div></div>`+
    `<div class="ri-name">${name}</div>`+
    `<div class="ri-meta">LEVEL ${L} &middot; ${xpToReach(L).toLocaleString()} XP to reach</div>`+
    `<button class="ri-back blurlift" onclick="openRanks()">&larr; All ranks</button></div>`;
}

/* ================= report day picker ================= */
let dayState={date:null};
function loggedDates(){ return [...new Set(S().logs.map(l=>l.date))].sort().reverse(); }
function toggleDayMenu(){ const m=document.getElementById('dayMenu'), b=document.getElementById('dayBtn'); const open=m.classList.toggle('open'); if(b) b.classList.toggle('open',open); }
function closeDayMenu(){ const m=document.getElementById('dayMenu'); if(m) m.classList.remove('open'); const b=document.getElementById('dayBtn'); if(b) b.classList.remove('open'); }
function buildDayMenu(){ const dates=loggedDates(); const m=document.getElementById('dayMenu'); if(!m) return; m.innerHTML = dates.length? dates.map(d=>`<button class="${d===dayState.date?'on':''}" onclick="selectDay('${d}')">${fmtDate(d)}</button>`).join('') : '<button disabled>No days logged</button>'; }
function selectDay(d){ dayState.date=d; closeDayMenu(); renderDayProgress(); }
function renderDayProgress(){
  const det=document.getElementById('dayDetail'); if(!det) return;
  const dates=loggedDates();
  if(!dayState.date || !dates.includes(dayState.date)) dayState.date=dates[0]||null;
  document.getElementById('dayLabel').textContent = dayState.date? fmtDate(dayState.date) : 'No days';
  buildDayMenu();
  if(!dayState.date){ det.innerHTML='<div class="empty" style="padding:18px 0">No training days yet</div>'; return; }
  const list=S().logs.filter(l=>l.date===dayState.date);
  const vol=list.reduce((a,l)=>a+l.kg*l.reps*l.sets,0);
  const groups=[...new Set(list.map(l=>groupOf(l.ex)).filter(Boolean))].join(' · ');
  det.innerHTML=`<div class="day-sum">${groups||'—'} · ${Math.round(vol).toLocaleString()} kg · ${list.length} lifts</div>`+
    list.map(l=>`<div class="rec-row"><span class="rx-ex">${esc(l.ex)}</span><span class="rx-meta">${l.sets} × ${l.reps} @ ${l.kg} kg</span></div>`).join('');
}
document.addEventListener('click',(e)=>{ const dp=document.querySelector('.daypick'); if(dp && !dp.contains(e.target)) closeDayMenu(); });

/* ================= settings / profile / display ================= */
function applyDisplay(){
  const b=(db.display&&db.display.bright)||1;
  const a=(db.display&&typeof db.display.surfaceA==='number')?db.display.surfaceA:0.16;
  document.documentElement.style.setProperty('--bright', b);
  document.documentElement.style.setProperty('--surface-a', a);
}
function openSettings(){
  const p=db.profile||{};
  document.getElementById('pfName').value=p.name||'';
  document.getElementById('pfJob').value=p.job||'';
  document.getElementById('pfWeight').value=db.bw||75;
  document.getElementById('pfHeight').value=p.height||'';
  document.getElementById('pfBio').value=p.bio||'';
  document.getElementById('pfSpotify').value=p.spotify||'';
  const b=Math.round(((db.display.bright)||1)*100);
  const a=Math.round(((typeof db.display.surfaceA==='number')?db.display.surfaceA:0.16)*100);
  document.getElementById('brightSlider').value=b; document.getElementById('brightVal').textContent=b+'%';
  document.getElementById('transSlider').value=a; document.getElementById('transVal').textContent=a+'%';
  document.getElementById('setModal').classList.add('open');
}
function closeSettings(){ document.getElementById('setModal').classList.remove('open'); }
function setBright(v){ db.display.bright=(+v)/100; document.getElementById('brightVal').textContent=v+'%'; applyDisplay(); save(); }
function setTrans(v){ db.display.surfaceA=(+v)/100; document.getElementById('transVal').textContent=v+'%'; applyDisplay(); save(); }
function saveSettings(){
  db.profile.name=document.getElementById('pfName').value.trim();
  db.profile.job=document.getElementById('pfJob').value.trim();
  db.profile.height=document.getElementById('pfHeight').value.trim();
  db.profile.bio=document.getElementById('pfBio').value.trim();
  db.profile.spotify=document.getElementById('pfSpotify').value.trim();
  const w=parseFloat(document.getElementById('pfWeight').value); if(!isNaN(w)&&w>0&&w<400) db.bw=Math.round(w);
  save(); renderIDCard(); const bw=document.getElementById('bwInput'); if(bw) bw.value=db.bw; closeSettings(); toast('Profile saved');
}
function spotifyEmbed(link){
  if(!link) return '<div class="idc-empty">Add a Spotify track in Settings</div>';
  const m=String(link).match(/track[\/:]([A-Za-z0-9]+)/);
  if(!m) return '<div class="idc-empty">Not a valid Spotify track link</div>';
  return '<iframe src="https://open.spotify.com/embed/track/'+m[1]+'" loading="lazy" allow="encrypted-media"></iframe>';
}
function renderIDCard(){
  const el=document.getElementById('idCard'); if(!el) return;
  const p=db.profile||{}; const li=levelInfo();
  if(!p.name && !p.job && !p.bio && !p.spotify && !p.height){ el.innerHTML='<div class="idc-setup">+ Set up your WEAPON ID</div>'; return; }
  const name=p.name||'Unnamed Athlete';
  const initials=((p.name||'WX').trim().split(/\s+/).map(s=>s[0]||'').join('').slice(0,2).toUpperCase())||'WX';
  const job=p.job||(db.mode==='endurance'?'Runner':'Lifter');
  const ht=p.height?(p.height+' cm'):'—';
  el.innerHTML=
    '<div class="idc-tag">WEAPON ID</div>'+
    '<div class="idc-top"><div class="idc-photo">'+esc(initials)+'</div>'+
    '<div class="idc-id"><div class="idc-name">'+esc(name)+'</div><div class="idc-job">'+esc(job)+' · LV '+li.lvl+'</div></div></div>'+
    '<div class="idc-stats"><div><span>WT</span> <b>'+(db.bw||75)+' kg</b></div><div><span>HT</span> <b>'+esc(ht)+'</b></div></div>'+
    (p.bio?('<div class="idc-bio">'+esc(p.bio)+'</div>'):'')+
    '<div class="idc-spotify">'+spotifyEmbed(p.spotify)+'</div>';
}

/* ================= init ================= */
save();
applyDisplay();
applyMode();
window.addEventListener('resize', ()=>{ const t=activeTab(); if(t==='report') renderReport(); if(t==='avatar') renderAvatar(); });
if(!storageOK){ setTimeout(()=>toast("Heads up: data won't save in this mode — host it to keep history"),700); }
