import {FX_PROFILES} from './fx-model.js?v=1000';
import {INSTRUMENTS} from './instruments.js?v=1000';
// Summaries use only already observed quotes and published news.
export function otherBriefs(engine){return Object.entries(INSTRUMENTS).filter(([pair])=>pair!==engine.pair).map(([pair,c])=>{
 const q=engine.instrument(pair),history=q.history.filter(p=>p.time<=engine.time),recent=history.filter(p=>p.time>=engine.time-30*60000),base=history.findLast(p=>p.time<=engine.time-5*60000);
 const positions=engine.positions.filter(p=>(p.pair??'USDJPY')===pair),orders=engine.orders.filter(p=>(p.pair??'USDJPY')===pair);
 const news=q.market.news.find(n=>n.publishedAt<=engine.time),change5=base?(q.mid/base.mid-1)*100:null;
 return {pair,label:c.label,base:c.base,mid:q.mid,change5,spread:q.spread/.01,low:recent.length?Math.min(...recent.map(p=>p.mid)):q.mid,high:recent.length?Math.max(...recent.map(p=>p.mid)):q.mid,
 state:q.market.state==='stress'?'波动活跃':q.market.state==='trend'?'趋势阶段':'区间阶段',points:recent.map(p=>p.mid),positions:positions.length,orders:orders.length,pnl:Math.round(positions.reduce((s,p)=>s+engine.pnl(p),0)*100)/100,
 news:news?{title:news.title,time:news.publishedAt,tag:news.tag}:null};
 });}
export function sparkPath(points,width=180,height=28){if(!points.length)return '';let lo=Math.min(...points),hi=Math.max(...points);const span=hi-lo||1;return points.map((v,i)=>`${(3+i*(width-6)/Math.max(1,points.length-1)).toFixed(1)},${(3+(hi===lo?.5:(hi-v)/span)*(height-6)).toFixed(1)}`).join(' ');}
export function createBriefing(host,{switchPair,clock,yen}){
 const cards=new Map();
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 function create(pair){const card=node('article','brief-card'),head=node('div','brief-head'),name=node('button','brief-switch',INSTRUMENTS[pair].label+' ↗'),state=node('span','brief-state');name.type='button';name.setAttribute('aria-label','切换到 '+INSTRUMENTS[pair].label);name.onclick=()=>switchPair(pair);head.append(name,state);
 const quote=node('div','brief-quote'),price=node('strong'),change=node('span');quote.append(price,change);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),line=document.createElementNS('http://www.w3.org/2000/svg','polyline');svg.setAttribute('viewBox','0 0 180 28');svg.setAttribute('role','img');svg.setAttribute('aria-label',INSTRUMENTS[pair].label+' 最近30分钟已发生报价折线');line.setAttribute('fill','none');line.setAttribute('stroke-width','1.6');svg.append(line);
 const character=node('small','brief-character',FX_PROFILES[pair].name),range=node('small','brief-range'),holding=node('small','brief-holding'),news=node('div','brief-news');card.append(head,quote,character,svg,range,holding,news);cards.set(pair,{card,state,price,change,line,range,holding,news});host.append(card);}
 return engine=>{const briefs=otherBriefs(engine),pairs=new Set(briefs.map(b=>b.pair));for(const [pair,refs]of cards)if(!pairs.has(pair)){refs.card.remove();cards.delete(pair);}for(const b of briefs){if(!cards.has(b.pair))create(b.pair);const r=cards.get(b.pair),sign=b.change5==null?0:Math.sign(b.change5);r.state.textContent=b.state;r.price.textContent=b.mid.toFixed(3);r.change.textContent=b.change5==null?'5分 —':`5分 ${sign>=0?'+':''}${b.change5.toFixed(2)}%`;r.change.className=sign>0?'positive':sign<0?'negative':'';r.line.setAttribute('points',sparkPath(b.points));r.line.setAttribute('stroke',sign<0?'#ff7989':'#64e7b0');r.range.textContent=`30分 ${b.low.toFixed(3)}–${b.high.toFixed(3)} · 点差 ${b.spread.toFixed(2)}p`;r.holding.textContent=`持仓 ${b.positions} · 浮盈 ${b.pnl>=0?'+':''}${yen(b.pnl)} · 挂单 ${b.orders}`;r.holding.classList.toggle('negative',b.pnl<0);r.news.textContent=b.news?`${clock(b.news.time)} · ${b.news.tag} / ${b.news.title}`:'暂无已发布新闻';r.news.title=r.news.textContent;}};
}
