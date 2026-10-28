const APPS=Object.freeze({"QLD":{"symbol":"QLD","name":"ProShares Ultra QQQ","tag":"NASDAQ 100 · 2×","color":"#aa94ff","api":"https://billowing-band-06cd.nn46099080.workers.dev","web":"https://qld-a-m.web.app","stock":70,"cash":30,"zones":[20,30,40,50,60,70]}});
const DEFAULTS = {symbol:'QLD',opacity:1,brightness:1,alwaysOnTop:false,compact:false,theme:'dark',closeToTray:true};
function settings(value={}) {
  const number=(v,d,min,max)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):d;
  return {symbol:APPS[value.symbol]?value.symbol:'QLD',opacity:number(value.opacity,1,.35,1),brightness:number(value.brightness,1,.45,1.2),alwaysOnTop:value.alwaysOnTop===true,compact:value.compact===true,theme:value.theme==='light'?'light':'dark',closeToTray:value.closeToTray!==false};
}
function chart(raw,symbol) {
  const r=raw?.chart?.result?.[0];
  if(!r || r.meta?.symbol!==symbol) throw new Error('종목 시세 응답이 올바르지 않습니다.');
  const q=r.indicators?.quote?.[0]||{};
  const points=(r.timestamp||[]).map((t,i)=>({t:t*1000,v:q.close?.[i],h:q.high?.[i]})).filter(p=>Number.isFinite(p.v)&&p.v>0);
  if(!points.length) throw new Error('표시할 가격 이력이 없습니다.');
  const price=r.meta.regularMarketPrice;
  if(!Number.isFinite(price)||price<=0) throw new Error('유효한 현재 가격이 없습니다.');
  const previous=points.length>1?points[points.length-2].v:null;
  const change=Number.isFinite(r.meta.regularMarketChangePercent)?r.meta.regularMarketChangePercent:previous?(price/previous-1)*100:null;
  return {symbol,price,change,points,asOf:r.meta.regularMarketTime*1000,name:r.meta.longName||symbol,high:r.meta.fiftyTwoWeekHigh,low:r.meta.fiftyTwoWeekLow};
}
function holding(v={}) {
  const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e12?n:0;
  return {shares:valid(v.shares),cost:valid(v.cost),cash:valid(v.cash)};
}
function pcAppUrl(symbol){
  if(!APPS[symbol])throw new Error('Unknown app');
  const url=new URL(APPS[symbol].web);url.searchParams.set('pc','1');return url.href;
}
module.exports={APPS,DEFAULTS,settings,chart,holding,pcAppUrl};
