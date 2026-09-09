const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>[...p.querySelectorAll(s)];
const KEY="scholargrid-layer7";
const state=JSON.parse(localStorage.getItem(KEY)||"{}");
state.nodes ||= []; state.links ||= []; state.logs ||= []; state.activities ||= [];
state.settings ||= {demo:true,notifications:true,backend:"http://127.0.0.1:8000"};
state.auth ||= {accessToken:null,refreshToken:null,user:null};
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
let currentNodeSlug=null;

const pages={
 overview:["Developer Tools & Algorithmic Integration","Research meets executable code."],
 api:["API Endpoint Notebook","Create and test executable algorithm nodes."],
 github:["Git Code Linker","Connect manuscript sections to exact source code."],
 diff:["Manuscript Diff","Inspect changes between manuscript versions."],
 citation:["Citation Validator","Check references and missing bibliography entries."],
 compliance:["Compliance Check","Prepare your manuscript for submission."],
 logs:["API Logs","Inspect local developer-tool events."],
 settings:["Settings","Configure local workspace and FastAPI connection."]
};
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
function log(method,endpoint,status=200,latency=0){state.logs.unshift({time:new Date().toLocaleTimeString(),method,endpoint,status,latency:latency||Math.floor(20+Math.random()*80)});state.logs=state.logs.slice(0,100);save();renderLogs()}
function activity(title,detail,color="blue"){state.activities.unshift({title,detail,time:"just now",color});state.activities=state.activities.slice(0,7);save();renderActivities()}
function go(page){$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$$('.page').forEach(x=>x.classList.toggle('active',x.id==='page-'+page));$("#pageTitle").textContent=pages[page][0];$("#pageSubtitle").textContent=pages[page][1];window.scrollTo({top:0,behavior:"smooth"});if(innerWidth<760)$("#sidebar").classList.remove("open")}
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
$$('[data-page-link]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.pageLink)));
$("#mobileMenu").addEventListener('click',()=>$("#sidebar").classList.toggle('open'));
$("#helpBtn").addEventListener('click',()=>toast('Layer 7 help: configure FastAPI login in Settings, then turn Demo mode off.'));
$("#notifyBtn").addEventListener('click',()=>toast('No new critical notifications.'));

const defaultActivities=[
 {title:"API node created",detail:"quadratic-root — POST /api/v1/nodes/quadratic-root/execute",time:"6 min ago",color:"blue"},
 {title:"Git repository linked",detail:"ScholarGrid Research Engine · main branch synced",time:"22 min ago",color:"blue"},
 {title:"Manuscript version compared",detail:"v1.2 → v1.3 · 14 additions, 7 deletions, 5 modifications",time:"1 hr ago",color:"blue"},
 {title:"Citation validation completed",detail:"48 citations checked · 3 missing references, 2 missing DOIs",time:"2 hr ago",color:"orange"},
 {title:"Compliance check completed",detail:"IEEE format · 94% submission readiness · 1 warning",time:"3 hr ago",color:"green"}
];
if(!state.activities.length){state.activities=defaultActivities;save()}
function renderActivities(){$("#activityList").innerHTML=state.activities.map(a=>`<div class="activity"><span class="activity-dot ${a.color}"></span><div><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.detail)}</small></div><time>${escapeHtml(a.time)}</time></div>`).join("")}
function renderNodes(){const rows=state.nodes.map(n=>`<tr><td><b>${escapeHtml(n.name)}</b></td><td>${n.method||"POST"}</td><td>${escapeHtml(n.path||('/api/v1/nodes/'+(n.slug||'')))}</td><td><span class="pill green-pill">${escapeHtml(n.status||"active")}</span></td><td>${escapeHtml(n.updated||"")}</td></tr>`).join("");$("#nodesTable").innerHTML=rows||`<tr><td colspan="5">No saved nodes yet.</td></tr>`}
function renderLinks(){$("#linksTable").innerHTML=state.links.map(l=>`<tr><td>${escapeHtml(l.section)}</td><td>${escapeHtml(l.repo)}</td><td>${escapeHtml(l.file)}</td><td>${l.start||""}–${l.end||""}</td><td>${escapeHtml(l.type||"")}</td></tr>`).join("")||`<tr><td colspan="5">No code links yet.</td></tr>`}
function renderLogs(){$("#logsTable").innerHTML=state.logs.map(l=>`<tr><td>${l.time}</td><td><b>${l.method}</b></td><td>${escapeHtml(l.endpoint)}</td><td>${l.status}</td><td>${l.latency} ms</td></tr>`).join("")||`<tr><td colspan="5">No API events yet.</td></tr>`;$("#logCount").textContent=`${state.logs.length} events`}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function apiBase(){return (state.settings.backend||"http://127.0.0.1:8000").replace(/\/$/,"")}
async function apiFetch(path,options={}){
  const headers={...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),...(options.headers||{})};
  if(state.auth.accessToken) headers.Authorization=`Bearer ${state.auth.accessToken}`;
  const started=performance.now();
  let response;
  try{response=await fetch(apiBase()+path,{...options,headers})}catch(e){throw new Error(`Cannot reach FastAPI at ${apiBase()}. Start uvicorn and check Backend URL.`)}
  const latency=Math.round(performance.now()-started); log(options.method||"GET",path,response.status,latency);
  if(response.status===401 && state.auth.refreshToken){
    try{
      const rr=await fetch(apiBase()+"/api/v1/auth/refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh_token:state.auth.refreshToken})});
      if(rr.ok){const t=await rr.json();state.auth.accessToken=t.access_token;state.auth.refreshToken=t.refresh_token||state.auth.refreshToken;save();return apiFetch(path,options)}
    }catch(_){ }
  }
  const text=await response.text(); let data={}; try{data=text?JSON.parse(text):{}}catch(_){data={detail:text}};
  if(!response.ok) throw new Error(data.detail||`API ${response.status}`);
  return data;
}
function setBackendStatus(ok,message){const el=$("#backendStatus");el.innerHTML=`<span class="status-dot" style="background:${ok?'#36a96f':'#d47a4a'}"></span> ${escapeHtml(message)}`}
async function checkBackend(){try{const data=await apiFetch('/health');setBackendStatus(true,`FastAPI connected · ${data.status}`);return true}catch(e){setBackendStatus(false,e.message);return false}}
function updateAuthUI(){const logged=!!state.auth.accessToken;$("#authState").textContent=logged?"SIGNED IN":"SIGNED OUT";$("#authState").className=`pill ${logged?'green-pill':'blue-pill'}`;$("#authMessage").textContent=logged?`Signed in as ${state.auth.user?.email||"user"}.`:""}
function requireAuth(){if(state.settings.demo)return true;if(!state.auth.accessToken){go('settings');toast('Please login to your FastAPI backend first.');return false}return true}

$("#saveNode").addEventListener('click',async()=>{
  const name=$("#nodeName").value.trim()||"untitled-node", expression=$("#nodeFormula").value.trim();
  if(!state.settings.demo){
    if(!requireAuth())return;
    try{
      const formula=await apiFetch('/api/v1/formulas/',{method:'POST',body:JSON.stringify({manuscript_id:null,name,expression,description:"Layer 7 formula",variables:null})});
      const node=await apiFetch('/api/v1/nodes/',{method:'POST',body:JSON.stringify({name,formula_id:formula.id,is_public:false})});
      currentNodeSlug=node.slug; const n={...node,method:'POST',path:`/api/v1/nodes/${node.slug}/execute`,updated:new Date().toLocaleDateString()};state.nodes.unshift(n);save();renderNodes();activity('API node created',`${name} — ${n.path}`,'blue');$("#nodeMessage").textContent='Saved in FastAPI + PostgreSQL.';toast('API node saved to backend');return;
    }catch(e){$("#nodeMessage").textContent=e.message;toast('Backend save failed');return}
  }
  const n={name,formula:expression,path:$("#nodePath").value,method:$("#nodeMethod").value,status:$("#nodeStatus").value,updated:new Date().toLocaleDateString()};state.nodes.unshift(n);save();renderNodes();activity('API node created',`${n.name} — ${n.method} ${n.path}`,'blue');log(n.method,n.path,201);$("#nodeMessage").textContent='Saved locally in demo mode.';toast('API node saved')
});
$("#clearNodes").addEventListener('click',()=>{state.nodes=[];save();renderNodes();toast('Local node list cleared')});

$("#runNode").addEventListener('click',async()=>{
  const out=$("#apiOutput");let input;
  try{input=JSON.parse($("#apiInput").value)}catch(e){out.textContent=`Invalid JSON: ${e.message}`;toast('Invalid JSON input');return}
  if(!state.settings.demo){
    if(!requireAuth())return;
    const node=currentNodeSlug||state.nodes.find(n=>n.name===$("#nodeName").value)?.slug;
    if(!node){out.textContent='Create/save the API node first, then run it.';toast('No backend node selected');return}
    try{const result=await apiFetch(`/api/v1/nodes/${encodeURIComponent(node)}/execute`,{method:'POST',body:JSON.stringify({input})});out.textContent=JSON.stringify(result,null,2);activity('API node executed',`${node} returned a backend response`,'blue');toast('Backend endpoint executed')}catch(e){out.textContent=JSON.stringify({error:e.message},null,2);toast('Backend execution failed')}return;
  }
  let result={ok:true,node:$("#nodeName").value||'quadratic-root',input};if('a'in input&&'b'in input&&'c'in input){const d=input.b*input.b-4*input.a*input.c;result.discriminant=d;result.roots=d>=0?{x1:(-input.b+Math.sqrt(d))/(2*input.a),x2:(-input.b-Math.sqrt(d))/(2*input.a)}:'complex roots'}out.textContent=JSON.stringify(result,null,2);log('POST',$("#nodePath").value,200);activity('API node executed',`${$("#nodeName").value||'quadratic-root'} returned a demo response`,'blue');toast('Endpoint executed in demo mode')
});

function updateTrace(){$("#traceDoc").textContent=`${$("#docSection").value||'Section'} · p.${$("#docPage").value||'—'}`;$("#traceCode").textContent=`${($("#repoFile").value||'file.py').split('/').pop()} · ${$("#lineStart").value||0}–${$("#lineEnd").value||0}`}
['docSection','docPage','repoFile','lineStart','lineEnd'].forEach(id=>$("#"+id).addEventListener('input',updateTrace));
$("#saveRepoLink").addEventListener('click',async()=>{
  const repoUrl=$("#repoUrl").value.trim(), file=$("#repoFile").value.trim();
  if(!state.settings.demo){
    if(!requireAuth())return;
    try{
      const name=repoUrl.split('/').filter(Boolean).pop()?.replace(/\.git$/,'')||'repository';
      const repo=await apiFetch('/api/v1/repositories',{method:'POST',body:JSON.stringify({project_id:null,provider:'github',repository_url:repoUrl,repository_name:name,default_branch:$("#repoBranch").value||'main'})});
      const link=await apiFetch(`/api/v1/repositories/${repo.id}/links`,{method:'POST',body:JSON.stringify({manuscript_id:null,file_path:file,start_line:Number($("#lineStart").value)||null,end_line:Number($("#lineEnd").value)||null,commit_hash:$("#repoCommit").value||null,target_type:'section',target_reference:$("#docSection").value,description:$("#linkType").value})});
      const l={section:$("#docSection").value,repo:repo.repository_url,file:link.file_path,start:link.start_line,end:link.end_line,type:$("#linkType").value};state.links.unshift(l);save();renderLinks();activity('Git repository linked',`${l.file} · lines ${l.start}–${l.end}`,'blue');$("#repoMessage").textContent='Repository and code link saved in FastAPI + PostgreSQL.';toast('Git code link saved to backend');return;
    }catch(e){$("#repoMessage").textContent=e.message;toast('Git backend save failed');return}
  }
  const l={section:$("#docSection").value,repo:repoUrl,file,start:$("#lineStart").value,end:$("#lineEnd").value,type:$("#linkType").value};state.links.unshift(l);save();renderLinks();activity('Git repository linked',`${l.file} · lines ${l.start}–${l.end}`,'blue');log('POST','/api/v1/repositories',201);$("#repoMessage").textContent='Saved locally in demo mode.';toast('Code link saved')
});

$("#runDiff").addEventListener('click',async()=>{
  const oldText=$("#diffA").value,newText=$("#diffB").value,out=$("#diffOutput");
  if(!state.settings.demo){
    try{
      const data=await apiFetch('/api/v1/quality/diff',{method:'POST',body:JSON.stringify({old:oldText,new:newText})});
      const changes=data.changes||data.diff||data.unified_diff||data;
      out.innerHTML=`<pre class="response-box">${escapeHtml(typeof changes==='string'?changes:JSON.stringify(changes,null,2))}</pre>`;
      activity('Manuscript version compared','FastAPI quality/diff returned a backend comparison','blue');toast('Backend diff complete');return;
    }catch(e){toast('Backend diff failed: '+e.message);return}
  }
  const a=oldText.split(/\r?\n/),b=newText.split(/\r?\n/),aset=new Set(a),bset=new Set(b);let adds=0,removes=0,same=0,html='';a.forEach(line=>{if(bset.has(line)){same++;html+=`<div class="diff-line same">  ${escapeHtml(line)}</div>`}else{removes++;html+=`<div class="diff-line remove">− ${escapeHtml(line)}</div>`}});b.forEach(line=>{if(!aset.has(line)){adds++;html+=`<div class="diff-line add">+ ${escapeHtml(line)}</div>`}});$("#diffSummary").innerHTML=`<span class="diff-chip add">${adds} additions</span><span class="diff-chip remove">${removes} deletions</span><span class="diff-chip same">${same} unchanged</span>`;out.innerHTML=html;activity('Manuscript version compared',`${adds} additions, ${removes} deletions, ${same} unchanged`,'blue');log('POST','/api/v1/quality/diff',200);toast('Comparison complete')
});

async function validateCitations(){
  if(!state.settings.demo){try{const text=$("#citationKeys").value;const data=await apiFetch('/api/v1/quality/citations/validate',{method:'POST',body:JSON.stringify({text})});const missing=data.missing||data.unresolved||[];const total=data.total||text.split(/\s+/).filter(Boolean).length;const valid=data.valid||Math.max(0,total-missing.length);$("#citTotal").textContent=total;$("#citValid").textContent=valid;$("#citMissing").textContent=missing.length;$("#citationResult").innerHTML=`<div class="validation-item ok">Backend response</div><pre class="response-box">${escapeHtml(JSON.stringify(data,null,2))}</pre>`;activity('Citation validation completed',`FastAPI quality/citations/validate processed the request`,'orange');toast('Backend citation validation complete');return}catch(e){toast('Citation backend failed: '+e.message);return}}
  const keys=$("#citationKeys").value.split(/\s+/).filter(Boolean),bib=new Set($("#bibKeys").value.split(/\s+/).filter(Boolean));const missing=keys.filter(k=>!bib.has(k)),valid=keys.length-missing.length;$("#citTotal").textContent=keys.length;$("#citValid").textContent=valid;$("#citMissing").textContent=missing.length;$("#citationResult").innerHTML=keys.map(k=>missing.includes(k)?`<div class="validation-item bad">✕ ${escapeHtml(k)} — missing from bibliography</div>`:`<div class="validation-item ok">✓ ${escapeHtml(k)} — resolved</div>`).join('');activity('Citation validation completed',`${keys.length} citations checked · ${missing.length} missing references`,'orange');log('POST','/api/v1/quality/citations/validate',200);toast('Citation validation complete')
}
$("#validateCitations").addEventListener('click',validateCitations);

const checks=['Document format','Page geometry & margins','Required sections','Citation consistency','Image resolution','Bibliography completeness'];
function renderChecks(){$("#checks").innerHTML=checks.map((x,i)=>`<div class="check-row"><span class="checkmark">✓</span><strong>${x}</strong><small>${i===4?'Warning':'Ready'}</small></div>`).join('')}
$("#runCompliance").addEventListener('click',async()=>{
  if(!state.settings.demo){try{const data=await apiFetch('/api/v1/quality/publisher/check',{method:'POST',body:JSON.stringify({text:$("#diffB").value,images:[],rules:{}})});const score=Number(data.score||data.compliance_score||94);$("#complianceScore").textContent=score+'%';$("#complianceBar").style.width=Math.max(0,Math.min(100,score))+'%';$("#checks").innerHTML=`<div class="check-row"><span class="checkmark">✓</span><strong>FastAPI publisher compliance</strong><small>${escapeHtml(data.status||'Completed')}</small></div><pre class="response-box">${escapeHtml(JSON.stringify(data,null,2))}</pre>`;activity('Compliance check completed','FastAPI quality/publisher/check returned a backend result','green');toast('Backend compliance check complete');return}catch(e){toast('Compliance backend failed: '+e.message);return}}
  const score=94;$("#complianceScore").textContent=score+'%';$("#complianceBar").style.width=score+'%';renderChecks();activity('Compliance check completed','IEEE format · 94% submission readiness · 1 warning','green');log('POST','/api/v1/quality/publisher/check',200);toast('Compliance check complete')
});
renderChecks();

async function login(){const email=$("#loginEmail").value.trim(),password=$("#loginPassword").value;if(!email||!password){$("#authMessage").textContent='Enter email and password.';return}try{const data=await apiFetch('/api/v1/auth/login',{method:'POST',body:JSON.stringify({email,password})});state.auth={accessToken:data.access_token,refreshToken:data.refresh_token||null,user:null};save();try{state.auth.user=await apiFetch('/api/v1/auth/me')}catch(_){}save();updateAuthUI();toast('FastAPI login successful');await loadBackendData()}catch(e){$("#authMessage").textContent=e.message;toast('Login failed')}}
async function register(){const email=$("#loginEmail").value.trim(),password=$("#loginPassword").value;if(!email||!password){$("#authMessage").textContent='Enter email and password.';return}try{await apiFetch('/api/v1/auth/register',{method:'POST',body:JSON.stringify({email,password,name:email.split('@')[0]})});$("#authMessage").textContent='Account created. Now login.';toast('Account created')}catch(e){$("#authMessage").textContent=e.message;toast('Registration failed')}}
$("#loginBtn").addEventListener('click',login);$("#registerBtn").addEventListener('click',register);
$("#logoutBtn").addEventListener('click',async()=>{try{if(state.auth.accessToken)await apiFetch('/api/v1/auth/logout',{method:'POST',body:JSON.stringify({})})}catch(_){}state.auth={accessToken:null,refreshToken:null,user:null};save();updateAuthUI();toast('Logged out')});

async function loadBackendData(){if(state.settings.demo||!state.auth.accessToken)return;try{const nodes=await apiFetch('/api/v1/nodes/');state.nodes=nodes.map(n=>({slug:n.slug,name:n.name,method:'POST',path:`/api/v1/nodes/${n.slug}/execute`,status:n.status||'active',updated:''}));save();renderNodes()}catch(e){}try{const repos=await apiFetch('/api/v1/repositories');if(repos[0]){$('#repoUrl').value=repos[0].repository_url;$('#repoBranch').value=repos[0].default_branch||'main'}}catch(e){}}

$("#clearLogs").addEventListener('click',()=>{state.logs=[];save();renderLogs();toast('Logs cleared')});
$("#saveSettings").addEventListener('click',async()=>{state.settings.demo=$("#demoMode").checked;state.settings.notifications=$("#notifications").checked;state.settings.backend=$("#backendUrl").value.trim()||'http://127.0.0.1:8000';save();$("#settingsMessage").textContent='Settings saved locally.';await checkBackend();if(!state.settings.demo&&state.auth.accessToken)await loadBackendData();toast('Settings saved')});
$("#globalSearch").addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();if(!q)return;const match=Object.keys(pages).find(k=>pages[k].join(' ').toLowerCase().includes(q));if(match)go(match)});
$("#backendToggle").addEventListener('click',()=>{state.settings.demo=!state.settings.demo;$("#demoMode").checked=state.settings.demo;save();toast(state.settings.demo?'Demo mode enabled':'Backend mode selected')});

function drawChart(){const c=$("#executionChart"),ctx=c.getContext('2d'),dpr=devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);const pad={l:35,r:15,t:10,b:25},vals=[28,34,30,42,38,48,44,59,55,62,58,70,66,76],max=80;ctx.strokeStyle='#e9edf2';ctx.lineWidth=1;ctx.font='9px system-ui';ctx.fillStyle='#9aa2ae';for(let i=0;i<5;i++){const y=pad.t+(h-pad.t-pad.b)*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(String(max-i*20),7,y+3)}const xstep=(w-pad.l-pad.r)/(vals.length-1);ctx.strokeStyle='#2f68d3';ctx.lineWidth=2;ctx.beginPath();vals.forEach((v,i)=>{const x=pad.l+i*xstep,y=pad.t+(h-pad.t-pad.b)*(1-v/max);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();ctx.fillStyle='#2f68d3';vals.forEach((v,i)=>{const x=pad.l+i*xstep,y=pad.t+(h-pad.t-pad.b)*(1-v/max);ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()})}
window.addEventListener('resize',drawChart);$("#chartRange").addEventListener('change',()=>{toast($("#chartRange").value+' selected');drawChart()});

async function init(){renderActivities();renderNodes();renderLinks();renderLogs();updateTrace();$("#demoMode").checked=state.settings.demo;$("#notifications").checked=state.settings.notifications;$("#backendUrl").value=state.settings.backend;updateAuthUI();drawChart();await checkBackend();if(!state.settings.demo&&state.auth.accessToken){try{state.auth.user=await apiFetch('/api/v1/auth/me');save();updateAuthUI();await loadBackendData()}catch(_){state.auth={accessToken:null,refreshToken:null,user:null};save();updateAuthUI()}}}
init();
