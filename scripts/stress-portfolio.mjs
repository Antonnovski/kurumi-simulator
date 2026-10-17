import {performance} from 'node:perf_hooks';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {Engine} from '../dist/engine.js';import {encodeSave,decodeSave} from '../dist/save-codec.js';
const rows=[];
for(const count of [200,1000,5000]){
 let e=new Engine(71);e.setGameMode('sprint20');const start=performance.now();
 for(let i=0;i<count;i++){e.setInstrument(['USDJPY','EURJPY','GBPJPY','AUDJPY'][i%4]);e.place({side:i%2?'buy':'sell',units:1000});}
 const opened=performance.now();e=Engine.restore(decodeSave(encodeSave(e)));assert.equal(e.positions.length,count);const restored=performance.now();
 const result=e.settle();assert.equal(e.positions.length,0);assert.equal(e.orders.length,0);assert.equal(result.entries,count);assert.equal(result.exits,count);assert.equal(e.stats.wins+e.stats.losses+e.stats.flat,count);assert.equal(e.account().floating,0);assert.equal(e.account().margin,0);assert.ok(Number.isFinite(result.final));assert.equal(result.final,e.balance);
 rows.push({count,openMs:opened-start,restoreMs:restored-opened,settleMs:performance.now()-restored,final:result.final,exits:result.exits});
}
const result={ok:true,rows};await writeFile(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
