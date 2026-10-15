import {Engine} from '../dist/engine.js';
import {FX_PROFILES} from '../dist/fx-model.js';
const pairs=Object.keys(FX_PROFILES),values=Object.fromEntries(pairs.map(k=>[k,[]])),spreads=Object.fromEntries(pairs.map(k=>[k,[]])),profits=Object.fromEntries(pairs.map(k=>[k,[]]));
const corr=(a,b)=>{const n=a.length,ma=a.reduce((s,v)=>s+v,0)/n,mb=b.reduce((s,v)=>s+v,0)/n;let ab=0,aa=0,bb=0;for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;ab+=x*y;aa+=x*x;bb+=y*y;}return ab/Math.sqrt(aa*bb);};
const calm={a:[],b:[]},stress={a:[],b:[]};let depleted=0;
for(let seed=1;seed<=120;seed++){
 const e=new Engine(seed*7919,seed%3+1);e.setGameMode('sprint20');const traded=pairs[seed%4];e.setInstrument(traded);e.allIn(Math.floor((seed-1)/4)%2?'buy':'sell');
 for(let t=0;t<1200&&!e.settlement;t++){const old=pairs.map(k=>e.instrument(k).mid);e.step();const returns=pairs.map((k,i)=>Math.log(e.instrument(k).mid/old[i]));
  for(let i=0;i<4;i++){const k=pairs[i],q=e.instrument(k);if(!Number.isFinite(q.mid)||q.mid<=0||q.bid>=q.ask)throw Error('Invalid quote');values[k].push(returns[i]);spreads[k].push(q.spread/.01);}
  const bucket=e.fxFactors.last.stress>.8?stress:e.fxFactors.last.stress<.15?calm:null;if(bucket){bucket.a.push(returns[1]);bucket.b.push(returns[3]);}
 }
 if(!e.settlement)e.updateRealtime(e.game.deadline);profits[traded].push(e.settlement.returnPct);depleted+=e.settlement.final<=0?1:0;
}
const quantile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];
let text='# V0.14 合成行情诊断\n\n2026-10-15，node scripts/audit-fx-v14.mjs。120个种子×1200模拟分钟，轮换第1/2/3局及四币种、多空方向，每局仅一笔约10倍参考仓位。对应前台现实20分钟行情长度；通过截止接口结算，不实际等待。参数未用真实历史行情估计，以下仅用于内部一致性和游戏风险检查。\n\n|货币对|分钟收益RMS（基点）|点差中位数（pips）|10×持仓收益P05%|中位数%|P95%|\n|---|---:|---:|---:|---:|---:|\n';
for(const k of pairs){const a=values[k],rms=Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length)*10000;text+=`|${k}|${rms.toFixed(2)}|${quantile(spreads[k],.5).toFixed(2)}|${quantile(profits[k],.05).toFixed(2)}|${quantile(profits[k],.5).toFixed(2)}|${quantile(profits[k],.95).toFixed(2)}|\n`;}
text+='\n分钟收益相关系数（合成样本，包含新闻冲击）：\n\n| |USDJPY|EURJPY|GBPJPY|AUDJPY|\n|---|---:|---:|---:|---:|\n';for(const k of pairs)text+=`|${k}|${pairs.map(x=>corr(values[k],values[x]).toFixed(2)).join('|')}|\n`;
text+=`\nEURJPY–AUDJPY：平静子样本相关${corr(calm.a,calm.b).toFixed(2)}（${calm.a.length}点），风险厌恶子样本相关${corr(stress.a,stress.b).toFixed(2)}（${stress.a.length}点）。\n\n净值耗尽${depleted}/120局。样本不是盈亏上限；手动增仓会显著改变风险。不同币种的收益RMS、点差和相关性只是设计结果，不是历史市场统计。\n`;
console.log(text);
