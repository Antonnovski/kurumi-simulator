// Stylised coefficients, not fitted market estimates or trading forecasts.
export const FX_PROFILES={
 USDJPY:{name:'利差与双避险',description:'美日利率预期与日元共振；美元避险需求可能抵消部分日元升值。',vol:.000055,df:7,trend:.0000035,persistence:.93,reversion:.0011,depth:205000,minDepth:25000,spread:.003,maxSpread:.065,asymmetry:.25,squeeze:.65,eventLife:1,news:{policy:1.05,data:1.1,risk:.9,commodity:.8,rumor:.85,liquidity:1},session:[1,.95,1.25,.35],load:{rate:1.2,risk:.3,commodity:.05,energy:.12,europe:.05,dollar:1,funding:.8}},
 EURJPY:{name:'欧洲政策与增长',description:'欧日政策预期、欧洲增长与能源成本；欧洲时段的报价更活跃。',vol:.000067,df:6,trend:.000004,persistence:.95,reversion:.0012,depth:165000,minDepth:18000,spread:.0042,maxSpread:.09,asymmetry:.55,squeeze:.9,eventLife:1.15,news:{policy:1.1,data:1,risk:1,commodity:1.05,rumor:.95,liquidity:1.05},session:[.55,1.3,1,.25],load:{rate:1.05,risk:.8,commodity:-.08,energy:-.7,europe:1,dollar:.1,funding:-.15}},
 GBPJPY:{name:'英国因素与薄盘',description:'英国利率与增长预期；较厚尾部和较浅盘口，清淡时段更易放大冲击。',vol:.0001,df:4,trend:.0000055,persistence:.88,reversion:.0008,depth:120000,minDepth:12000,spread:.006,maxSpread:.13,asymmetry:.85,squeeze:1.15,eventLife:.85,news:{policy:1.15,data:1.1,risk:1.1,commodity:.95,rumor:1.2,liquidity:1.2},session:[.4,1.45,.95,.2],load:{rate:1.1,risk:1.05,commodity:0,energy:-.25,europe:.45,dollar:.08,funding:-.2}},
 AUDJPY:{name:'商品与风险偏好',description:'澳日利率预期、商品需求与风险偏好；亚洲时段参与度较高。',vol:.000078,df:5,trend:.0000045,persistence:.96,reversion:.0009,depth:140000,minDepth:15000,spread:.0045,maxSpread:.085,asymmetry:1.1,squeeze:1.25,eventLife:1.05,news:{policy:1,data:1.05,risk:1.15,commodity:1.25,rumor:1,liquidity:1.1},session:[1.15,.8,.7,1],load:{rate:1,risk:1.45,commodity:1.35,energy:.25,europe:.08,dollar:-.12,funding:-.3}}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const zones=['Asia/Tokyo','Europe/London','America/New_York','Australia/Sydney'];
const clocks=zones.map(timeZone=>new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
let cachedTime=null,cachedHours;
function localHours(time){if(time!==cachedTime){cachedTime=time;cachedHours=clocks.map(f=>{const p=f.formatToParts(time);return Number(p.find(x=>x.type==='hour').value)+Number(p.find(x=>x.type==='minute').value)/60;});}return cachedHours;}
export function fxSession(pair,time){
 const p=FX_PROFILES[pair]??FX_PROFILES.USDJPY,h=localHours(time),active=h.map((v,i)=>v>=(i===0?9:8)&&v<17);
 const turnover=p.session.reduce((s,w,i)=>s+(active[i]?w:0),0),rollover=h[2]>=16+55/60&&h[2]<17+10/60;
 const liquidity=clamp(.35+turnover*.55,.35,1.7)*(rollover?.28:1),vol=(.72+.3*Math.sqrt(.35+turnover*.55))*(rollover?1.22:1);
 return {liquidity,vol,rollover,label:rollover?'纽约换日薄盘':active[1]&&active[2]?'欧美重叠':active[1]?'欧洲盘':active[2]?'纽约盘':active[0]||active[3]?'亚洲盘':'清淡时段'};
}
const keys=['USD','EUR','GBP','AUD','JPY','risk','commodity','energy','europe','dollar','funding'];
export class FxFactors{
 constructor(seed=3093){this.rng=(seed^0xc2b2ae35)>>>0||1;this.tick=0;this.levels=Object.fromEntries(keys.map(k=>[k,0]));this.last=null;}
 random(){let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return(this.rng+.5)/4294967296;}
 normal(){return Math.sqrt(-2*Math.log(this.random()))*Math.cos(2*Math.PI*this.random());}
 advance(time){const shocks={};for(const k of keys){const z=5*Math.tanh(this.normal()/5);shocks[k]=z;const slow=['USD','EUR','GBP','AUD','JPY'].includes(k);this.levels[k]=(slow?.997:.985)*this.levels[k]+(slow?.04:.12)*z;}
  this.tick++;const stress=clamp(-this.levels.risk-.25,0,1.5);this.last={time,shocks,levels:{...this.levels},stress};return this.last;
 }
 static restore(data,seed){const f=new FxFactors(seed);if(data)Object.assign(f,data);f.levels={...new FxFactors(seed).levels,...f.levels};return f;}
}
export function factorReturn(pair,frame){
 const p=FX_PROFILES[pair]??FX_PROFILES.USDJPY,l=p.load,s=frame.shocks,v=frame.levels,base=pair.slice(0,3),stress=frame.stress??0;
 // A shared JPY innovation affects all crosses in log space; USD safe-haven flows can offset part of it.
 const systematic=(-.000045*s.JPY+.000018*l.rate*(s[base]-.65*s.JPY)+.000025*l.risk*s.risk*(1+stress)+.00002*l.commodity*s.commodity+.000014*l.energy*s.energy+.000018*l.europe*s.europe+.000015*l.dollar*s.dollar+.000018*l.funding*s.funding)*(1+.35*stress);
 const tilt=l.rate*(v[base]-v.JPY)+.65*l.risk*v.risk+.5*l.commodity*v.commodity+.3*l.europe*v.europe+.25*l.energy*v.energy;
 const coefficients=[-.000045-.000018*.65*l.rate,.000018*l.rate,.000025*l.risk*(1+stress),.00002*l.commodity,.000014*l.energy,.000018*l.europe,.000015*l.dollar,.000018*l.funding];
 const vol=Math.hypot(...coefficients)*(1+.35*stress);
 return {systematic,drift:.000002*Math.tanh(tilt),stress,vol};
}

export function realisedVol(history,time,minutes=30){
 const points=history.filter(x=>x.time>=time-minutes*60000&&x.time<=time);let sum=0,count=0;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(b.time-a.time!==60000||!(a.mid>0&&b.mid>0))continue;sum+=Math.log(b.mid/a.mid)**2;count++;}
 return {percent:Math.sqrt(sum)*100,samples:count};
}
