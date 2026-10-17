import {performance} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {positionSeries} from '../dist/history-view.js';
import {otherBriefs} from '../dist/briefing.js';
import {Engine} from '../dist/engine.js';
// Isolated derived-view workload; this is not a browser rendering benchmark.
const file=process.argv[2],samples=50000,e=new Engine(42),start=e.time-samples*60000;
for(const pair of ['USDJPY','EURJPY','GBPJPY','AUDJPY']){const q=e.instrument(pair),base=q.mid;q.history=Array.from({length:samples},(_,i)=>({time:start+(i+1)*60000,mid:base+Math.sin(i*.017)*.3,bid:base+Math.sin(i*.017)*.3-.003,ask:base+Math.sin(i*.017)*.3+.003}));}
const p={created:start,side:'buy',units:10000,entry:150},timings=[];
for(let frame=0;frame<250;frame++){const t=performance.now();const briefs=otherBriefs(e);assert.equal(briefs.length,3);assert.ok(briefs.every(b=>b.points.length===31));for(let position=0;position<20;position++){const points=positionSeries(e.history,p,{maxPoints:600});assert.ok(points.length<=600);assert.equal(points.at(-1).time,e.time);}timings.push(performance.now()-t);}
timings.sort((a,b)=>a-b);const result={ok:true,frames:timings.length,historyPerPair:samples,visiblePositions:20,maxDrawPoints:600,medianMs:timings[125],p95Ms:timings[Math.floor(timings.length*.95)],maxMs:timings.at(-1),rss:process.memoryUsage().rss,scope:'Node derived-view calculations, excludes DOM/canvas and browser frame time'};
await writeFile(file,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
