const {WebContentsView,session}=require('electron');
const {APPS,pcAppUrl}=require('./core.cjs');

// Each existing app keeps its own origin, browser storage and session.
// Only the local toolbar has a preload; remote app pages have no desktop IPC.
class AppSurface {
  constructor(window,{onStatus,openExternal,restoreVisibility,offscreen=false}){
    this.window=window;this.onStatus=onStatus;this.openExternal=openExternal;
    this.restoreVisibility=restoreVisibility;this.offscreen=offscreen;this.records=new Map();
    this.symbol=null;this.overlay=false;this.brightness=1;
  }
  status(){const r=this.records.get(this.symbol);return {symbol:this.symbol,status:r?.status||'loading',message:r?.message||''};}
  notify(record){if(this.symbol===record.symbol){this.layout();this.onStatus(this.status());}}
  ensure(symbol){
    if(this.records.has(symbol))return this.records.get(symbol);
    const config=APPS[symbol];if(!config)throw new Error('Unknown app');
    const partition=`persist:market-alert-${symbol.toLowerCase()}`;
    const appSession=session.fromPartition(partition);
    appSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
    const view=new WebContentsView({webPreferences:{partition,offscreen:this.offscreen,sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
    view.setBackgroundColor('#f5f6fa');view.setVisible(false);
    this.window.contentView.addChildView(view);
    const record={symbol,view,status:'loading',message:'',cssKey:null,cssQueue:Promise.resolve(),origin:new URL(config.web).origin};
    this.records.set(symbol,record);
    const contents=view.webContents;
    contents.setWindowOpenHandler(({url})=>{this.openExternal(url);return {action:'deny'};});
    contents.on('will-navigate',(event,url)=>{
      try{if(new URL(url).origin!==record.origin){event.preventDefault();this.openExternal(url);}}catch{event.preventDefault();}
    });
    contents.on('will-redirect',(event,url)=>{
      try{if(new URL(url).origin!==record.origin){event.preventDefault();this.openExternal(url);}}catch{event.preventDefault();}
    });
    contents.on('did-start-loading',()=>{if(record.status==='ready'&&!contents.isLoadingMainFrame())return;record.status='loading';record.message='';this.notify(record);});
    contents.on('dom-ready',()=>{contents.setZoomFactor(0.85);record.cssKey=null;this.applyBrightness(record);});
    contents.on('did-finish-load',()=>{record.status='ready';record.message='';this.applyBrightness(record);this.notify(record);});
    contents.on('did-fail-load',(_event,code,_description,_url,isMainFrame)=>{
      if(!isMainFrame||code===-3)return;
      record.status='error';record.message='앱에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';this.notify(record);
    });
    contents.on('render-process-gone',()=>{record.status='error';record.message='앱 화면이 중단됐습니다. 다시 연결해 주세요.';this.notify(record);});
    contents.on('before-input-event',(event,input)=>{
      if(input.type==='keyDown'&&input.control&&input.shift&&input.key.toLowerCase()==='r'){event.preventDefault();this.restoreVisibility();}
    });
    contents.loadURL(pcAppUrl(symbol)).catch(()=>{});
    return record;
  }
  select(symbol){
    if(!APPS[symbol])throw new Error('Unknown app');
    this.symbol=symbol;const record=this.ensure(symbol);this.applyBrightness(record);this.layout();this.onStatus(this.status());
  }
  layout(){
    if(this.window.isDestroyed())return;
    const [width,height]=this.window.getContentSize();
    const appWidth=Math.min(900,width);
    for(const r of this.records.values()){
      r.view.setBounds({x:Math.floor((width-appWidth)/2),y:42,width:appWidth,height:Math.max(1,height-64)});
      r.view.setVisible(r.symbol===this.symbol&&!this.overlay&&r.status!=='error');
    }
  }
  setOverlay(value){this.overlay=value===true;this.layout();}
  setBrightness(value){
    this.brightness=value;
    for(const r of this.records.values())this.applyBrightness(r);
  }
  applyBrightness(record){
    record.cssQueue=record.cssQueue.then(async()=>{
      const contents=record.view.webContents;if(contents.isDestroyed())return;
      if(record.cssKey){await contents.removeInsertedCSS(record.cssKey).catch(()=>{});record.cssKey=null;}
      record.cssKey=await contents.insertCSS(`html { filter: brightness(${this.brightness}) !important; }`);
    }).catch(()=>{});
  }
  reload(){
    const r=this.records.get(this.symbol);if(!r)return;
    r.status='loading';this.notify(r);
    r.view.webContents.loadURL(pcAppUrl(this.symbol)).catch(()=>{});
  }
  dispose(){for(const r of this.records.values()){if(!r.view.webContents.isDestroyed())r.view.webContents.close();}this.records.clear();}
}
module.exports={AppSurface};
