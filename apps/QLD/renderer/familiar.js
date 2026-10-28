const $=id=>document.getElementById(id),api=window.desktop;
let apps={},prefs={},legacy={};
function drawSettings(next){
  const switched=prefs.symbol!==next.symbol;prefs=next;
  document.documentElement.style.setProperty('--brightness',next.brightness);
  document.body.classList.toggle('dark-toolbar',next.theme==='dark');
  $('asset-tabs').innerHTML=Object.keys(apps).map(s=>`<button class="asset-tab ${next.symbol===s?'active':''}" data-symbol="${s}" aria-pressed="${next.symbol===s}">${s}</button>`).join('');
  for(const id of ['brightness','opacity']){$(id).value=Math.round(next[id]*100);$(id+'-value').value=Math.round(next[id]*100)+'%';}
  $('always-on-top').checked=next.alwaysOnTop;$('compact-toggle').checked=next.compact;$('dark-toolbar').checked=next.theme==='dark';$('close-to-tray').checked=next.closeToTray;
  for(const [id,key]of [['pin','alwaysOnTop'],['compact','compact']]){$(id).classList.toggle('active',next[key]);$(id).setAttribute('aria-pressed',next[key]);}
  if(switched)api.appStatus().then(drawStatus);
}
async function change(patch){try{drawSettings(await api.settings(patch));}catch{$('app-state').textContent='설정을 저장하지 못했습니다.';}}
function drawStatus(value){
  if(value.symbol!==prefs.symbol)return;
  const name=value.symbol||prefs.symbol;
  $('progress').hidden=value.status!=='loading';
  $('connection-panel').hidden=value.status!=='error';
  $('connection-message').textContent=value.message||'인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
  $('app-state').textContent=value.status==='error'?`${name} 연결 지연`:value.status==='ready'?`${name} · 기존 앱 화면`:`${name} 앱을 여는 중입니다…`;
}
async function showDialog(id){await api.appOverlay(true);$(id).showModal();}
async function closeDialog(dialog){dialog.close();if(!document.querySelector('dialog[open]'))await api.appOverlay(false);}
$('asset-tabs').onclick=event=>{const b=event.target.closest('[data-symbol]');if(b)change({symbol:b.dataset.symbol});};
$('settings-open').onclick=()=>showDialog('settings-dialog');
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>closeDialog(b.closest('dialog')));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))api.appOverlay(false);}));
$('pin').onclick=()=>change({alwaysOnTop:!prefs.alwaysOnTop});$('compact').onclick=()=>change({compact:!prefs.compact});
$('brightness').oninput=e=>change({brightness:Number(e.target.value)/100});$('opacity').oninput=e=>change({opacity:Number(e.target.value)/100});
$('always-on-top').onchange=e=>change({alwaysOnTop:e.target.checked});$('compact-toggle').onchange=e=>change({compact:e.target.checked});$('dark-toolbar').onchange=e=>change({theme:e.target.checked?'dark':'light'});$('close-to-tray').onchange=e=>change({closeToTray:e.target.checked});
$('reset').onclick=()=>change({opacity:1,brightness:1});$('quit').onclick=()=>api.window('quit');$('homepage').onclick=()=>api.homepage();
$('refresh').onclick=$('retry').onclick=()=>api.appReload();
$('legacy-records').onclick=()=>{$('records-dialog').showModal();$('settings-dialog').close();};
$('records-back').onclick=()=>{$('settings-dialog').showModal();$('records-dialog').close();};
(async()=>{try{
  const value=await api.bootstrap();apps=value.apps;legacy=value.portfolios;$('version').textContent=value.version;
  drawSettings(value.settings);api.onSettings(drawSettings);api.onAppStatus(drawStatus);drawStatus(await api.appStatus());
  $('legacy-records').hidden=!Object.values(legacy).some(p=>p.shares||p.cash||p.cost);
  const n=v=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:4}):'0';
  $('legacy-table').innerHTML=Object.keys(apps).map(s=>`<tr><td>${s}</td><td>${n(legacy[s]?.shares)}</td><td>$${n(legacy[s]?.cost)}</td><td>$${n(legacy[s]?.cash)}</td></tr>`).join('');
}catch{$('app-state').textContent='앱을 초기화하지 못했습니다. 완전히 종료한 뒤 다시 실행해 주세요.';}})();
