import {Engine} from '../dist/engine.js';
const pairs=['USDJPY','EURJPY','GBPJPY','AUDJPY'];
const strategies=[['10K单币',e=>e.place({side:e.seed%2?'buy':'sell',units:10000})],['10×参考仓位',e=>e.allIn(e.seed%2?'buy':'sell')],['四币各20K',e=>{for(const pair of pairs){e.setInstrument(pair);e.place({side:e.seed%2?'buy':'sell',units:20000});}}]];
const results=[];let minEvents=Infinity,maxEvents=0,totalEvents=0;
for(const [name,open] of strategies){const returns=[];let depleted=0;for(let i=1;i<=200;i++){
 const e=new Engine(i*7919,3);e.setGameMode('sprint20');e.setInstrument(pairs[i%4]);open(e);
 for(let t=0;t<1200&&!e.settlement;t++)e.step();if(!e.settlement)e.updateRealtime(e.game.deadline);
 returns.push(e.settlement.returnPct);depleted+=e.settlement.final<=0?1:0;const n=e.eventDirector.serial;totalEvents+=n;minEvents=Math.min(minEvents,n);maxEvents=Math.max(maxEvents,n);
 }returns.sort((a,b)=>a-b);const at=p=>returns[Math.floor((returns.length-1)*p)].toFixed(2);results.push(`|${name}|${at(0)}|${at(.05)}|${at(.5)}|${at(.95)}|${at(1)}|${depleted}|`);
}
console.log(`# V0.13 时间与风险平衡样本\n\n2026-10-15，运行 node scripts/balance-v13.mjs。600局、每局1200次模拟分钟采样，等价于前台固定节奏下现实20分钟的行情长度；用截止时间接口完成结算，不实际等待20分钟。全部使用第三局特殊行情，每种策略200局，包含四币种与多空方向，不加仓、不借款。\n\n|策略|最小收益%|P05%|中位数%|P95%|最大收益%|净值耗尽局数|\n|---|---:|---:|---:|---:|---:|---:|\n${results.join('\n')}\n\n每局普通共同事件：${minEvents}–${maxEvents}次，平均${(totalEvents/600).toFixed(1)}次；不含每第三局一次的特殊行情及二次追踪新闻。\n\n一键参考仓位控制初始敞口约10倍，市场算法不读取账户收益，不截断盈利。免保证金允许手动建立更大仓位，上述样本不构成盈亏上限；过大敞口仍可能迅速耗尽净值。浏览器后台节流时实际报价采样可能少于1200次，但现实截止时间不延长。`);
