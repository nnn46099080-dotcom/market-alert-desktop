const {app,BrowserWindow,Tray,Menu,ipcMain,shell,nativeImage,screen,session}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {APPS,settings,chart,holding}=require('./core.cjs');
const {AppSurface}=require('./app-surface.cjs');
app.setPath('userData',path.join(app.getPath('appData'),'QQQM Alert PC'));
let win,tray,surface,quitting=false,state={},saveTimer,normalBounds;
const cache=new Map();
if(!process.windowsStore)app.setAppUserModelId('com.hyunwoo.qqqm.desktop');
if(!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',()=>show());
  app.on('before-quit',()=>{quitting=true;persist();});
  app.whenReady().then(start);
}
function persist(){
  if(!app.isReady())return;
  try {const p=path.join(app.getPath('userData'),'workspace.json');fs.writeFileSync(p+'.tmp',JSON.stringify(state));fs.renameSync(p+'.tmp',p);}catch(e){console.error('설정 저장 실패',e.message);}
}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(persist,250);}
function show(){if(!win)return;if(win.isMinimized())win.restore();win.show();win.focus();}
function safeExternal(url){try {const u=new URL(url);if(u.protocol==='https:')shell.openExternal(u.href);}catch{}}
function guard(contents){
  contents.setWindowOpenHandler(({url})=>{safeExternal(url);return {action:'deny'};});
  contents.on('will-navigate',(e,url)=>{if(url!==contents.getURL()){e.preventDefault();safeExternal(url);}});
}
function applySettings(){
  const s=state.settings;win.setOpacity(s.opacity);win.setAlwaysOnTop(s.alwaysOnTop);
  if(s.compact){if(!normalBounds)normalBounds=win.getNormalBounds();if(win.isMaximized())win.unmaximize();win.setSize(400,Math.min(700,screen.getDisplayMatching(win.getBounds()).workArea.height));}
  else if(normalBounds){win.setBounds(normalBounds);normalBounds=null;}
  if(surface){if(surface.symbol!==s.symbol)surface.select(s.symbol);surface.setBrightness(s.brightness);surface.layout();}
  const menu=Menu.buildFromTemplate([
    {label:'QQQM Alert PC 열기',click:show},
    ...Object.keys(APPS).map(symbol=>({label:symbol,type:'radio',checked:s.symbol===symbol,click:()=>{updateSettings({symbol});show();}})),
    {type:'separator'},{label:'항상 위에 표시',type:'checkbox',checked:s.alwaysOnTop,click:()=>updateSettings({alwaysOnTop:!state.settings.alwaysOnTop})},
    {label:'불투명하게 복원',click:()=>updateSettings({opacity:1,brightness:1})},
    {type:'separator'},{label:'완전히 종료',click:()=>app.quit()}
  ]);tray?.setContextMenu(menu);
}
function updateSettings(patch){state.settings=settings({...state.settings,...patch});applySettings();save();win.webContents.send('settings-changed',state.settings);return state.settings;}
function trusted(event){return win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame;}
function handle(name,fn){ipcMain.handle(name,(event,...args)=>{if(!trusted(event))throw new Error('허용되지 않은 요청');return fn(...args);});}
async function getJson(url,ttl){
  const old=cache.get(url);if(old&&Date.now()-old.time<ttl)return old.value;
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error(`데이터 서버 응답 ${response.status}`);
  const value=await response.json();cache.set(url,{time:Date.now(),value});return value;
}
async function start(){
  try{state=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'workspace.json'),'utf8'));}catch{state={};}
  state.settings=settings(state.settings);state.portfolios=state.portfolios||{};
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  let bounds=state.bounds||{width:440,height:760};
  const area=screen.getPrimaryDisplay().workArea;
  if(!screen.getAllDisplays().some(d=>bounds.x>=d.workArea.x&&bounds.x<d.workArea.x+d.workArea.width&&bounds.y>=d.workArea.y&&bounds.y<d.workArea.y+d.workArea.height))bounds={width:Math.min(bounds.width||440,area.width),height:Math.min(bounds.height||760,area.height)};
  win=new BrowserWindow({...bounds,minWidth:360,minHeight:560,show:false,title:'QQQM Alert PC',backgroundColor:'#10131a',icon:path.join(__dirname,'assets/app.ico'),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  Menu.setApplicationMenu(null);guard(win.webContents);
  surface=new AppSurface(win,{onStatus:value=>{if(!win.isDestroyed())win.webContents.send('app-status',value);},openExternal:safeExternal,restoreVisibility:()=>updateSettings({opacity:1,brightness:1})});
  win.on('close',e=>{if(!quitting&&state.settings.closeToTray&&tray){e.preventDefault();win.hide();}});
  win.on('resize',()=>{surface.layout();if(!state.settings.compact&&!win.isMaximized()){state.bounds=win.getNormalBounds();save();}});
  win.on('closed',()=>surface.dispose());
  win.on('move',()=>{if(!state.settings.compact){state.bounds=win.getNormalBounds();save();}});
  try{tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'assets/app.ico')));tray.setToolTip('QQQM Alert PC');tray.on('double-click',show);tray.on('click',show);}catch(e){console.error('트레이 사용 불가',e.message);}
  handle('bootstrap',()=>({settings:state.settings,apps:APPS,version:require('./package.json').version,portfolios:state.portfolios}));
  handle('settings',patch=>updateSettings(patch));
  handle('app-status',()=>surface.status());
  handle('app-overlay',visible=>surface.setOverlay(visible));
  handle('app-reload',()=>surface.reload());
  handle('portfolio',(symbol,value)=>{if(!APPS[symbol])throw new Error('종목 확인');state.portfolios[symbol]=holding(value);persist();return state.portfolios[symbol];});
  handle('market',async symbol=>{
    const a=APPS[symbol];if(!a)throw new Error('종목 확인');
    const parts=await Promise.allSettled([
      getJson(`${a.api}/?symbol=${symbol}&dailyOnly=1`,300000).then(v=>chart(v,symbol)),
      getJson(`${a.api}/strategy-state`,60000),
      getJson(`${APPS.QQQM.api}/market-drawdown`,300000),
      getJson(`${APPS.QQQM.api}/market-indicators`,300000)
    ]);
    const names=['chart','strategy','drawdowns','indicators'];const result={symbol,fetchedAt:Date.now(),errors:{}};
    parts.forEach((p,i)=>{if(p.status==='fulfilled')result[names[i]]=p.value;else result.errors[names[i]]=p.reason.message;});return result;
  });
  handle('web-app',symbol=>{
    const a=APPS[symbol];if(!a)return;
    const child=new BrowserWindow({parent:win,width:1100,height:900,title:a.symbol+' · 전체 웹앱',autoHideMenuBar:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
    child.webContents.setWindowOpenHandler(({url})=>{safeExternal(url);return {action:'deny'};});
    child.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==new URL(a.web).origin){event.preventDefault();safeExternal(url);}});
    child.loadURL(a.web);
  });
  handle('homepage',()=>safeExternal('https://nnn46099080-dotcom.github.io/market-alert-desktop/#download'));
  handle('window',action=>{if(action==='minimize')win.minimize();if(action==='quit')app.quit();});
  win.webContents.on('before-input-event',(e,input)=>{if(input.type==='keyDown'&&input.control&&input.shift&&input.key.toLowerCase()==='r'){updateSettings({opacity:1,brightness:1});e.preventDefault();}});
  await win.loadFile(path.join(__dirname,'renderer/familiar.html'));applySettings();show();
}
