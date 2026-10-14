import {Engine} from '../dist/engine.js';
import {INSTRUMENTS} from '../dist/instruments.js';
const summaries=[];
for(const strategy of ['small','all-in','portfolio']){
 const values=[];let forced=0,failed=0;
 for(let seed=1;seed<=1000;seed++){
  const e=new Engine(Math.imul(seed,2654435761)>>>0,3);e.setBold(true);e.setGameMode('sprint');
  if(strategy==='portfolio')for(const pair of Object.keys(INSTRUMENTS)){e.setInstrument(pair);e.place({side:seed%7<3?'buy':'sell',units:40000});}
  else {e.setInstrument(Object.keys(INSTRUMENTS)[seed%4]);if(strategy==='all-in')e.allIn(seed%7<3?'buy':'sell');else e.place({side:seed%7<3?'buy':'sell',units:10000});}
  for(let i=0;i<120;i++)e.step();const r=e.settle();values.push(r.returnPct);forced+=r.forced>0;failed+=r.final<=0;
 }
 values.sort((a,b)=>a-b);const q=p=>Number(values[Math.floor((values.length-1)*p)].toFixed(2));
 summaries.push({strategy,runs:values.length,min:q(0),p05:q(.05),median:q(.5),p95:q(.95),max:q(1),forcedPct:forced/10,failedPct:failed/10});
}
console.log(JSON.stringify(summaries,null,2));

