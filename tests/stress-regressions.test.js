import test from 'node:test';import assert from 'node:assert/strict';
import {Engine} from '../dist/engine.js';import {encodeSave,decodeSave} from '../dist/save-codec.js';
test('长期四币种存档在保留全部50000条报价时仍低于5MiB保守UTF16预算',()=>{
 const e=new Engine(999);for(let i=0;i<55000;i++)e.step();e.setInstrument('AUDJPY');
 const raw=encodeSave(e);assert.ok(raw.length*2<5*1024*1024,'storage bytes '+raw.length*2);
 const c=Engine.restore(decodeSave(raw));assert.equal(c.history.length,50000);assert.deepEqual(c.account(),e.account());
 for(const pair of ['USDJPY','EURJPY','GBPJPY','AUDJPY']){const a=e.instrument(pair),b=c.instrument(pair);assert.equal(b.history.length,a.history.length);for(const i of [0,123,49999])for(const k of ['time','mid','bid','ask'])assert.ok(Math.abs(a.history[i][k]-b.history[i][k])<1e-9);}
 e.step();c.step();assert.equal(c.mid,e.mid);assert.deepEqual(c.fxFactors,e.fxFactors);
});
test('压缩存档兼容旧格式，保护报价精度及非连续时间、同时间结算曲线',()=>{
 const e=new Engine(13);e.place({side:'buy',units:10000});e.step();e.time+=600000;e.step();e.settle();
 const original=e.snapshot(),c=Engine.restore(decodeSave(encodeSave(e)));assert.deepEqual(c.account(),e.account());assert.deepEqual(c.settlement,e.settlement);assert.deepEqual(c.history,e.history);assert.equal(c.curve.at(-1).time,e.curve.at(-1).time);
 assert.deepEqual(decodeSave(JSON.stringify({version:2,engine:original})).engine,original);
 const broken=JSON.parse(encodeSave(e));broken.engine.history.data=broken.engine.history.data.slice(0,-4);assert.throws(()=>decodeSave(broken),/损坏/);
});
test('已过现实截止的手动结算也按到时处理，不延长一局时长',()=>{
 const e=new Engine();e.setGameMode('sprint20');e.beginRealtime(Date.now()-1200001);const r=e.settle();assert.equal(r.endReason,'现实20分钟到时');assert.equal(r.realMinutes,20);
});

test('同一个行情步跨过截止时间，保护单与到时结算不会抛未捕获异常',t=>{
 const e=new Engine();e.setGameMode('sprint20');e.place({side:'buy',units:1000,sl:149.9});const deadline=e.game.deadline;let calls=0;
 e.market.advance=()=>({mid:149.8,spread:.003,vol:.01,depth:180000});t.mock.method(Date,'now',()=>calls++===0?deadline-1:deadline);
 assert.doesNotThrow(()=>e.step());assert.ok(e.settlement);assert.equal(e.settlement.endReason,'现实20分钟到时');assert.equal(e.settlement.realMinutes,20);assert.equal(e.stepping,false);assert.equal(e.positions.length,0);
});

test('连续交易模式保留周末真实生成的K线，自由局继续跳过休市平线',async()=>{
 const {candlesFromQuotes}=await import('../dist/candles.js');const start=Date.UTC(2026,9,17,10),quotes=[0,1,2].map(i=>({time:start+i*60000,mid:150+i*.1}));
 assert.equal(candlesFromQuotes(quotes,1).length,0);const bars=candlesFromQuotes(quotes,1,{continuous:true});assert.equal(bars.length,3);assert.equal(bars[2].close,150.2);
});
test('免保证金局的挂单指导不再要求保证金',async()=>{
 const {coaching}=await import('../dist/coach.js');const e=new Engine();e.setGameMode('sprint20');e.place({side:'buy',type:'limit',price:149,units:1000});assert.match(coaching(e,{side:'buy',units:1000}).text,/不占用保证金/);
});

test('高持仓数量与日志按字段表压缩，保留全部字段和值和记录顺序',()=>{
 const e=new Engine(19);e.setGameMode('sprint20');for(let i=0;i<5000;i++)e.place({side:i%2?'buy':'sell',units:1000});const c=Engine.restore(decodeSave(encodeSave(e)));assert.deepEqual(c.positions,e.positions);assert.deepEqual(c.orders,e.orders);assert.deepEqual(c.logs,e.logs);assert.deepEqual(c.account(),e.account());
});
