import {encodeSave,decodeSave} from '../dist/save-codec.js';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {Engine} from '../dist/engine.js';
import {candlesFromQuotes} from '../dist/candles.js';
import {reportRows} from '../dist/png-report.js';
let seed=Number(process.argv[2])||1,rng=seed>>>0||1;
const rand=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;return(rng+.5)/4294967296;};
const pairs=['USDJPY','EURJPY','GBPJPY','AUDJPY'];
let steps=0,actions=0,restores=0,rejections=0,rounds=0;
function check(e){const a=e.account();for(const x of [a.balance,a.equity,a.floating,a.margin,a.exposure,e.debt(),e.maxDrawdown])assert.ok(Number.isFinite(x),'nonfinite account');
 const expected=1000000+e.stats.grossProfit-e.stats.grossLoss+e.stats.swap+e.loans.borrowed-e.loans.repaid;assert.ok(Math.abs(expected-e.balance)<.025,'cash ledger mismatch');assert.ok(Math.abs(a.equity-a.balance-a.floating)<.015,'equity mismatch');
 const ids=[...e.positions,...e.orders].map(x=>x.id);assert.equal(new Set(ids).size,ids.length,'duplicate ids');
 for(const pair of pairs){const q=e.instrument(pair);assert.ok(Number.isFinite(q.mid)&&q.mid>0&&q.bid<q.ask,'bad quote');assert.ok(Number.isFinite(q.depth)&&q.depth>0);assert.ok(q.history.length<=50000);}
 if(e.settlement){assert.equal(e.positions.length,0);assert.equal(e.orders.length,0);assert.ok(Math.abs(e.settlement.final-(e.balance-e.debt()))<.015);assert.equal(reportRows(e).length,16);}
}
const start=performance.now();
try{
 for(let episode=0;episode<12;episode++){
  let e=new Engine((seed*7919+episode*104729)>>>0,episode%3+1);if(episode%3===0)e.setGameMode('sprint20');else if(episode%3===1)e.setBold(true);
  for(let i=0;i<1000&&!e.settlement&&!e.halted;i++){
   if(i%7===0&&e.isOpen()){
    const pair=pairs[Math.floor(rand()*4)];e.setInstrument(pair);const side=rand()<.5?'buy':'sell',units=(1+Math.floor(rand()*20))*1000,kind=Math.floor(rand()*10);
    try{actions++;if(kind<=2&&e.positions.length<12)e.place({side,units,sl:side==='buy'?e.bid-.4:e.ask+.4,tp:side==='buy'?e.ask+.6:e.bid-.6,trail:rand()<.2?.2:null});
     else if(kind===3&&e.orders.length<20)e.place({side,units,type:'limit',price:side==='buy'?e.bid-.04:e.ask+.04,expiry:e.time+45*60000});
     else if(kind===4&&e.orders.length<18)e.placeOCO({units,upper:e.ask+.05,lower:e.bid-.05,trail:.2,expiry:e.time+30*60000});
     else if(kind===5&&e.positions.length){const p=e.positions[Math.floor(rand()*e.positions.length)];e.close(p.id,p.units>=2000?Math.floor(p.units/2000)*1000:p.units);}
     else if(kind===6&&e.orders.length)e.cancel(e.orders[Math.floor(rand()*e.orders.length)].id);
     else if(kind===7&&e.positions.length)e.setTrail(e.positions[Math.floor(rand()*e.positions.length)].id,.05+Math.floor(rand()*30)/100);
     else if(kind===8&&e.canBorrow()&&!e.loans.active)e.borrow(500000,['rescueFast','rescue','rescueLong'][Math.floor(rand()*3)]);
     else if(kind===9&&e.debt()&&e.account().free>10000)e.repay(Math.min(10000,e.debt()));
    }catch(error){if(error.name!=='Error'||!/保证金|资金|上限|净值|结束|结算|还款|借款|数量|方向/.test(error.message))throw error;rejections++;}
   }
   e.step();steps++;if(i%25===0)check(e);
   if(i%211===0){const c=Engine.restore(decodeSave(encodeSave(e)));assert.deepEqual(c.account(),e.account());e=c;restores++;}
  }
  if(!e.settlement)e.settle();check(e);rounds++;
 }
 // Real public borrowing flow, all plans and early payments, without fabricating cash.
 for(const plan of ['rescueFast','rescue','rescueLong']){let e=new Engine(seed);e.setBold(true);e.allIn('buy');e.place({side:'buy',units:20000});assert.ok(e.canBorrow());e.borrow(500000,plan);for(const p of [...e.positions])e.close(p.id);if(seed%2)e.repay(50000);for(let i=0;i<190;i++){e.step();steps++;if(i===23){e=Engine.restore(decodeSave(encodeSave(e)));restores++;}check(e);}assert.equal(e.loans.active,null);actions+=6;rounds++;}
 // Retention boundary and derived charts on a long uninterrupted account.
 if(seed%12===0){let e=new Engine(seed);for(let i=0;i<55000;i++){e.step();steps++;}check(e);assert.equal(e.history.length,50000);assert.ok(candlesFromQuotes(e.history,5).length>5000);const c=Engine.restore(decodeSave(encodeSave(e)));e.step();c.step();assert.equal(c.mid,e.mid);restores++;}
 console.log(JSON.stringify({ok:true,seed,steps,actions,restores,rejections,rounds,ms:performance.now()-start,rss:process.memoryUsage().rss}));
}catch(error){console.log(JSON.stringify({ok:false,seed,steps,actions,restores,rounds,message:error.message,stack:error.stack,ms:performance.now()-start}));process.exitCode=1;}
