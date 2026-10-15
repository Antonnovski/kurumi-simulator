import {chooseEvent,EVENT_PROFILES} from './events.js?v=1000';
import {PACE} from './pace.js?v=1000';
import {FX_PROFILES,FxFactors,fxSession,factorReturn} from './fx-model.js?v=1000';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// The market and common factors never read account balances, fills or positions.
export class Market{
 constructor(seed=3093,round=1){this.seed=seed;this.rng=(seed^0x9e3779b9)>>>0||1;this.openTicks=0;this.state='range';this.stateLife=0;this.trend=0;this.fair=150;this.variance=.00025;this.lastReturn=0;this.lastJump=0;this.events=[];this.queue=[];this.news=[];this.newsSeq=1;this.cooldown=0;this.modelVersion=14;this.base=150;this.scale=1;this.spreadScale=1;this.flow=0;this.depth=180000;this.targetTrend=0;this.fundamental=150;this.variance14=1;this.lastZ=0;this.localFactors=null;this.lastMid=null;this.sessionLabel='亚洲盘';for(let i=0;i<8;i++)this.random();this.extreme=round%3===0?{kind:this.random()<.5?'crash':'bull',at:20+Math.floor(this.random()*70),age:0,fired:false}:null;}
 random(){let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return(this.rng+.5)/4294967296;}
 normal(){return Math.sqrt(-2*Math.log(this.random()))*Math.cos(2*Math.PI*this.random());}
 createEvent(time,spec=null){const pair=this.pair??'USDJPY',p=FX_PROFILES[pair],template=spec?.template??chooseEvent(()=>this.random(),pair),profile=EVENT_PROFILES[template.profile],draws=spec?.draws??Array.from({length:6},()=>this.random()),canonical=spec?.sign??(this.random()<.5?-1:1),response=template.response[pair]??0;if(!response)return null;
  const lerp=(range,x)=>range[0]+x*(range[1]-range[0]),sign=canonical*Math.sign(response),magnitude=(this.lastMid??this.base)*lerp(profile.amplitude,draws[0])*Math.abs(response)*(p.news[template.profile]??1),duration=Math.floor(lerp(profile.duration,draws[1])*p.eventLife),reversal=draws[2]<profile.reversal;
  const event={id:this.newsSeq++,catalogId:template.id,sharedId:spec?.sharedId??null,profile:template.profile,title:canonical>0?template.up:template.down,age:0,duration,sign,magnitude,reversal,secondAt:Math.min(duration-1,5+Math.floor(draws[3]*24)),secondSign:reversal?-sign:sign,secondSize:lerp(profile.second,draws[4]),decay:lerp(profile.decay,draws[5])*p.eventLife,liquidity:template.profile==='liquidity'?.5:template.profile==='risk'?.2:0};this.events.push(event);this.queue.push({id:event.id,publishTick:this.openTicks,time,tag:template.tag,title:event.title,body:template.body+' 本条为游戏生成的虚构新闻，不代表真实事件。'});this.cooldown=18+Math.floor(this.random()*18);return event;
 }
 advance(time,mid,reopen=false,localEvents=true,frame=null){
  this.lastMid=mid;const pair=this.pair??'USDJPY',p=FX_PROFILES[pair],session=fxSession(pair,time);this.sessionLabel=session.label;this.openTicks++;this.stateLife++;this.cooldown=Math.max(0,this.cooldown-1);
  if(!frame){this.localFactors??=new FxFactors(this.seed);frame=this.localFactors.advance(time);}const f=factorReturn(pair,frame);
  const switchChance=this.state==='stress'?.018:this.state==='trend'?.007:.006;
  if(this.stateLife>35&&this.random()<switchChance){const r=this.random(),current=this.state;this.state=current==='stress'?(r<.65?'range':'trend'):current==='trend'?(r<.72?'range':'stress'):(r<.78?'trend':'stress');this.stateLife=0;this.targetTrend=this.state==='trend'?(this.random()<.5?-1:1)*p.trend*(.5+this.random()):0;}
  this.trend=p.persistence*this.trend+(1-p.persistence)*this.targetTrend;this.flow=.82*this.flow+this.normal()*.22;
  if(localEvents&&this.cooldown===0&&this.random()<(this.state==='stress'?PACE.stressEventChance:PACE.ordinaryEventChance)*session.vol)this.createEvent(time);
  this.fundamental+=(this.base-this.fundamental)*.000015+mid*f.drift*.12;this.fair+=.003*(this.fundamental-this.fair);
  let jump=reopen?this.normal()*mid*.00065:0,eventDrift=0,eventVol=0,eventLiquidity=0;
  for(const e of this.events){if(e.age===0){jump+=e.sign*e.magnitude;this.fundamental+=e.sign*e.magnitude*.4;}if(e.age===e.secondAt){jump+=e.secondSign*e.magnitude*e.secondSize;if(e.catalogId)this.queue.push({id:this.newsSeq++,publishTick:this.openTicks,time,tag:'事件追踪',title:e.title+'：'+(e.reversal?'首轮反应部分回吐':'后续资金继续跟进'),body:'早先虚构事件的二次反应已发生；后续方向仍不确定。'});}const fade=Math.exp(-e.age/e.decay);eventLiquidity=Math.max(eventLiquidity,(e.liquidity??0)*fade);eventDrift+=e.sign*e.magnitude*.004*fade;if(e.reversal&&e.age>e.secondAt)eventDrift-=e.sign*e.magnitude*.007*fade;eventVol+=e.magnitude/Math.max(1,mid)*15*fade;e.age++;}
  this.events=this.events.filter(e=>e.age<e.duration);
  // GJR-style conditional variance; event jumps are excluded from residual feedback.
  this.variance14=clamp(.035+.065*Math.min(25,this.lastZ**2)+.895*this.variance14+.01*p.asymmetry*Math.min(25,Math.min(0,this.lastZ)**2),.25,4.5);
  const volMultiplier=Math.sqrt(this.variance14)*session.vol*(this.state==='stress'?1.3:1)*(1+Math.min(.35,eventVol));
  const sigmaLog=p.vol*volMultiplier,sigma=mid*Math.hypot(sigmaLog,f.vol*session.vol);this.variance=sigma*sigma;
  let chi=0;for(let i=0;i<p.df;i++)chi+=this.normal()**2;const fat=this.normal()/Math.sqrt(Math.max(.00001,chi)/p.df)*Math.sqrt((p.df-2)/p.df);
  const noise=8*sigmaLog*Math.tanh(fat/8),systematic=f.systematic*session.vol;
  this.lastZ=clamp((noise+systematic)/Math.max(.00001,sigmaLog),-8,8);
  const reversion=this.state==='range'?p.reversion*Math.tanh(Math.log(Math.max(.01,this.fair)/mid))*.02:0;
  let extremeMove=0;const x=this.extreme;if(x&&this.openTicks>=x.at){if(!x.fired){x.fired=true;x.reverse=this.random()<.3;const crash=x.kind==='crash';extremeMove=crash?-mid*(.003+this.random()*.0035):mid*(.002+this.random()*.002);this.queue.push({id:this.newsSeq++,publishTick:this.openTicks,time,tag:'极端行情',title:crash?'流动性突然枯竭，USD/JPY发生闪崩':'美元买盘持续涌入，USD/JPY进入单边牛市',body:'三局轮换的游戏挑战事件；此安排并非现实市场发生概率。报价跳跃会影响当前多空头寸。虚构游戏新闻。'});}else if(x.age<60)extremeMove=(x.kind==='bull'?1:-1)*(x.reverse&&x.age>20?-1:1)*(.002+this.random()*.004)*Math.exp(-x.age/45);x.age++;}
  const jumpReturn=Math.log1p(Math.max(-.95,(jump+extremeMove)/mid));
  const logReturn=this.trend+reversion+f.drift+eventDrift/mid+noise+systematic+this.flow*.000007+jumpReturn;
  const next=mid*Math.exp(logReturn);this.lastMid=next;this.lastReturn=next-mid;this.lastJump=jump+extremeMove;
  this.depth=clamp(p.depth*session.liquidity*(1-eventLiquidity)/(1+Math.abs(jump+extremeMove)*3+.22*Math.max(0,volMultiplier-1)+f.stress*.25*p.squeeze)*(this.state==='stress'?.7:1),p.minDepth,p.depth*1.7);
  const spread=clamp(p.spread/Math.sqrt(Math.max(.05,session.liquidity))+sigma*.07+Math.abs(this.flow)*.0008+Math.abs(jump+extremeMove)*.009+eventLiquidity*.012*p.squeeze+f.stress*.001*p.squeeze,p.spread,p.maxSpread);
  const published=this.queue.filter(n=>n.publishTick<=this.openTicks);this.queue=this.queue.filter(n=>n.publishTick>this.openTicks);for(const n of published)this.news.unshift({...n,publishedAt:time});this.news=this.news.slice(0,60);
  return{mid:Number(next.toFixed(5)),spread:Number(spread.toFixed(5)),vol:sigma,depth:this.depth,published};
 }
 static restore(data,seed){const m=new Market(seed);if(data)Object.assign(m,data);if((data?.modelVersion??0)<14){const oldTrend=m.trend,oldTarget=m.targetTrend??oldTrend;m.trend=oldTrend/(m.base??150);m.targetTrend=oldTarget/(m.base??150);m.variance14=1;m.lastZ=0;}m.modelVersion=14;m.seed??=seed;m.base??=150;m.scale??=1;m.spreadScale??=1;m.flow??=0;m.depth??=180000;m.targetTrend??=m.trend;m.fundamental??=m.fair;m.localFactors=data?.localFactors?FxFactors.restore(data.localFactors,seed):null;return m;}
}
