const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const MISSIONS=[
 {name:'稳健开局',target:2,drawdown:8,description:'净收益达到 2%，最大回撤不超过 8%'},
 {name:'顺势猎手',target:3,drawdown:12,description:'净收益达到 3%，最大回撤不超过 12%'},
 {name:'风险守门员',target:1,drawdown:5,description:'净收益达到 1%，最大回撤不超过 5%'}
];
export function newGame(seed){return {mode:'free',duration:120,mission:seed%MISSIONS.length,protectedEntries:0,peakLeverage:0};}
export function gameResult(e){
 const g=e.game??newGame(e.seed),m=MISSIONS[g.mission],net=e.settlement?.returnPct??((e.account().equity-e.debt())/1000000-1)*100;
 const active=e.stats.entries>0,protection=active?Math.min(1,g.protectedEntries/e.stats.entries):0;
 const profit=clamp(net/5,0,1)*40,risk=clamp(1-e.maxDrawdown/.2,0,1)*30,discipline=protection*20+(e.stats.forced===0?10:0);
 const score=active?Math.round(clamp(profit+risk+discipline-e.stats.forced*15-(e.loans.default?30:0),0,100)):0;
 return {score,grade:score>=85?'A':score>=65?'B':score>=40?'C':'D',mission:m.name,complete:active&&net>=m.target&&e.maxDrawdown*100<=m.drawdown&&e.stats.forced===0&&!e.loans.default,net,protection:Math.round(protection*100),peakLeverage:g.peakLeverage,remaining:Math.max(0,g.duration-e.tick)};
}

