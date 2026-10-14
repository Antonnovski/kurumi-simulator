import {chooseEvent,EVENT_PROFILES} from './events.js?v=122';
import {PACE} from './pace.js?v=122';
// Synthetic market state is independent of fills, so trading cannot reroll prices.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Market {
 constructor(seed=3093,round=1){this.rng=(seed^0x9e3779b9)>>>0||1;this.openTicks=0;this.state='range';this.stateLife=0;this.trend=0;this.fair=150;this.variance=.00025;this.lastReturn=0;this.lastJump=0;this.events=[];this.queue=[];this.news=[];this.newsSeq=1;this.cooldown=0;this.modelVersion=12;this.base=150;this.scale=1;this.spreadScale=1;this.flow=0;this.depth=180000;this.targetTrend=0;this.fundamental=150;for(let i=0;i<8;i++)this.random();this.extreme=round%3===0?{kind:this.random()<.5?'crash':'bull',at:20+Math.floor(this.random()*70),age:0,fired:false}:null;}
 random(){let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return(this.rng+.5)/4294967296;}
 normal(){return Math.sqrt(-2*Math.log(this.random()))*Math.cos(2*Math.PI*this.random());}
 createEvent(time,spec=null){const template=spec?.template??chooseEvent(()=>this.random(),this.pair??'USDJPY'),profile=EVENT_PROFILES[template.profile],draws=spec?.draws??Array.from({length:6},()=>this.random()),canonical=spec?.sign??(this.random()<.5?-1:1),response=template.response[this.pair??'USDJPY']??0;if(!response)return null;const lerp=(range,x)=>range[0]+x*(range[1]-range[0]),sign=canonical*Math.sign(response),magnitude=this.base*lerp(profile.amplitude,draws[0])*Math.abs(response),duration=Math.floor(lerp(profile.duration,draws[1])),reversal=draws[2]<profile.reversal;
 const event={id:this.newsSeq++,catalogId:template.id,sharedId:spec?.sharedId??null,profile:template.profile,title:canonical>0?template.up:template.down,age:0,duration,sign,magnitude,reversal,secondAt:Math.min(duration-1,5+Math.floor(draws[3]*24)),secondSign:reversal?-sign:sign,secondSize:lerp(profile.second,draws[4]),decay:lerp(profile.decay,draws[5]),liquidity:template.profile==='liquidity'?.5:template.profile==='risk'?.2:0};this.events.push(event);this.queue.push({id:event.id,publishTick:this.openTicks,time,tag:template.tag,title:event.title,body:template.body+' 本条为游戏生成的虚构新闻，不代表真实事件。'});this.cooldown=18+Math.floor(this.random()*18);return event;}
 advance(time,mid,reopen=false,localEvents=true){this.openTicks++;this.stateLife++;this.cooldown=Math.max(0,this.cooldown-1);const switchChance=this.state==='stress'?.018:this.state==='trend'?.007:.006;
 if(this.stateLife>35&&this.random()<switchChance){const r=this.random(),current=this.state;this.state=current==='stress'?(r<.65?'range':'trend'):current==='trend'?(r<.72?'range':'stress'):(r<.78?'trend':'stress');this.stateLife=0;this.targetTrend=this.state==='trend'?(this.random()<.5?-1:1)*(.001+this.random()*.0025):0;}
 this.trend=.92*this.trend+.08*this.targetTrend;this.flow=.82*this.flow+this.normal()*.22;
 const hour=new Date(time).getUTCHours();const session=hour>=12&&hour<16?1.35:hour>=21||hour<1?.65:hour>=7&&hour<12?1.1:.9;
 const hazard=(this.state==='stress'?PACE.stressEventChance:PACE.ordinaryEventChance)*session;
 if(localEvents&&this.cooldown===0&&this.random()<hazard)this.createEvent(time);
 this.fundamental+=(this.base-this.fundamental)*.00003+this.normal()*.0012*this.scale;this.fair+=.005*(this.fundamental-this.fair);
 let jump=reopen?this.normal()*.16:0,eventDrift=0,eventVol=0,eventLiquidity=0;
 for(const e of this.events){if(e.age===0){jump+=e.sign*e.magnitude;this.fundamental+=e.sign*e.magnitude*.4;}if(e.age===e.secondAt){jump+=e.secondSign*e.magnitude*e.secondSize;if(e.catalogId)this.queue.push({id:this.newsSeq++,publishTick:this.openTicks,time,tag:'事件追踪',title:e.title+'：'+(e.reversal?'首轮反应部分回吐':'后续资金继续跟进'),body:'早先虚构事件的二次反应已发生；后续方向仍不确定。'});}const fade=Math.exp(-e.age/e.decay);eventLiquidity=Math.max(eventLiquidity,(e.liquidity??0)*fade);eventDrift+=e.sign*e.magnitude*.004*fade;if(e.reversal&&e.age>e.secondAt)eventDrift-=e.sign*e.magnitude*.007*fade;eventVol+=e.magnitude*.00006*fade;e.age++;}
 this.events=this.events.filter(e=>e.age<e.duration);
 this.variance=clamp(PACE.varianceFloor+.06*Math.min(.003,(this.lastReturn-this.lastJump)**2)+.90*this.variance+eventVol,.00004,.0016);
 const sigma=Math.sqrt(this.variance)*session*(this.state==='stress'?1.3:1)*(mid/150)*this.scale;
 // Standardized Student-t with 5 degrees of freedom: finite variance, heavier tails.
 let chi=0;for(let i=0;i<5;i++)chi+=this.normal()**2;
 const fat=this.normal()/Math.sqrt(Math.max(.00001,chi)/5)*Math.sqrt(3/5);
 const reversion=this.state==='range'?.003*Math.tanh((this.fair-mid)/1.5):0;
 const drift=this.state==='trend'?this.trend:0;
 let extremeMove=0;const x=this.extreme;if(x&&this.openTicks>=x.at){if(!x.fired){x.fired=true;x.reverse=this.random()<.3;const crash=x.kind==='crash';extremeMove=crash?-mid*(.003+this.random()*.0035):mid*(.002+this.random()*.002);this.queue.push({id:this.newsSeq++,publishTick:this.openTicks,time,tag:'极端行情',title:crash?'流动性突然枯竭，USD/JPY发生闪崩':'美元买盘持续涌入，USD/JPY进入单边牛市',body:'三局轮换挑战事件。报价跳跃会影响当前多空头寸，止损与强平按实际可用报价执行。虚构游戏新闻。'});}else if(x.age<60)extremeMove=(x.kind==='bull'?1:-1)*(x.reverse&&x.age>20?-1:1)*(.002+this.random()*.004)*Math.exp(-x.age/45);x.age++;}
 const noise=6*sigma*Math.tanh(fat/6);const change=drift+reversion+eventDrift+noise+this.flow*.0012+jump+extremeMove;
 const next=clamp(mid+change,50,300);this.lastReturn=next-mid;this.lastJump=jump+extremeMove;
 this.depth=clamp(220000*session*(1-eventLiquidity)/(1+sigma/.025+Math.abs(jump+extremeMove)*3)*(this.state==='stress'?.65:1),25000,350000);
 const spread=this.spreadScale*clamp(.0025+sigma*.06+Math.abs(this.flow)*.0008+Math.abs(jump+extremeMove)*.009+eventVol*4+eventLiquidity*.012+(hour>=21||hour<1?.0015:0),.003,.065);
 const published=this.queue.filter(n=>n.publishTick<=this.openTicks);this.queue=this.queue.filter(n=>n.publishTick>this.openTicks);for(const n of published)this.news.unshift({...n,publishedAt:time});this.news=this.news.slice(0,60);
 return{mid:Number(next.toFixed(5)),spread:Number(spread.toFixed(5)),vol:sigma,depth:this.depth,published};
 }
 static restore(data,seed){const m=new Market(seed);if(data)Object.assign(m,data);m.modelVersion=12;m.base??=150;m.scale??=1;m.spreadScale??=1;m.flow??=0;m.depth??=180000;m.targetTrend??=m.trend;m.fundamental??=m.fair;return m;}
}

