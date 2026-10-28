const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
  bootstrap:()=>ipcRenderer.invoke('bootstrap'),
  settings:patch=>ipcRenderer.invoke('settings',patch),
  appStatus:()=>ipcRenderer.invoke('app-status'),
  appOverlay:visible=>ipcRenderer.invoke('app-overlay',visible),
  appReload:()=>ipcRenderer.invoke('app-reload'),
  portfolio:(symbol,value)=>ipcRenderer.invoke('portfolio',symbol,value),
  market:symbol=>ipcRenderer.invoke('market',symbol),
  webApp:symbol=>ipcRenderer.invoke('web-app',symbol),
  homepage:()=>ipcRenderer.invoke('homepage'),
  window:action=>ipcRenderer.invoke('window',action),
  onSettings:callback=>ipcRenderer.on('settings-changed',(_event,value)=>callback(value)),
  onAppStatus:callback=>ipcRenderer.on('app-status',(_event,value)=>callback(value))
});
