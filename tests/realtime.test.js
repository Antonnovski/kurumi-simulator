import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/engine.js';
import {gameResult} from '../dist/gameplay.js';
import {reportRows} from '../dist/png-report.js';
const setup=(seed=19,round=1)=>{const e=new Engine(seed,round);e.setGameMode('sprint20');return e;};
test('现实倒计时开始一次，待机不计时，开始后不可换局制',()=>{
 const e=setup();assert.equal(e.updateRealtime(Date.now()+99999999),false);assert.equal(gameResult(e).remainingSeconds,1200);
 const now=Date.now();e.beginRealtime(now);e.beginRealtime(now+5000);assert.equal(e.game.deadline,now+1200000);
 assert.throws(()=>e.setGameMode('free'),/开局/);assert.throws(()=>e.setBold(true),/独立/);
});
test('首笔有效挂单开始计时；无效订单不启动，撤单不延长期限',()=>{
 const e=setup();assert.throws(()=>e.place({side:'buy',units:123}));assert.equal(e.game.startedAt,null);
 const o=e.place({side:'buy',units:1000,type:'limit',price:149});const deadline=e.game.deadline;e.cancel(o.id);assert.equal(e.game.deadline,deadline);
});
test('不推进报价也会按现实截止结算，晚回来记录仍为20分钟且不补造行情',()=>{
 const e=setup();e.place({side:'buy',units:10000});const c=Engine.restore({version:2,engine:e.snapshot()}),old=c.history.length;
 assert.equal(c.game.deadline,e.game.deadline);assert.equal(c.updateRealtime(c.game.deadline+3600000),true);
 assert.equal(c.tick,0);assert.equal(c.history.length,old);assert.equal(c.positions.length,0);assert.equal(c.settlement.realMinutes,20);
 assert.equal(c.settlement.endReason,'现实20分钟到时');assert.throws(()=>c.place({side:'buy',units:1000}),/结算/);
 assert.ok(reportRows(c).some(([k,v])=>k==='交易模式'&&v.includes('免保证金')));
});
test('免保证金支持高敞口多币持仓且周末连续交易，不以维持率强平',()=>{
 const e=setup();e.time=Date.UTC(2026,9,17,12);assert.equal(e.isOpen(),true);
 for(const pair of ['USDJPY','EURJPY','GBPJPY','AUDJPY']){e.setInstrument(pair);e.place({side:'buy',units:1000000});}
 assert.ok(e.account().exposure>600000000);assert.equal(e.account().margin,0);assert.equal(e.account().ratio,Infinity);
 e.balance=50000;e.risk();assert.equal(e.positions.length,4);assert.equal(e.stats.forced,0);assert.equal(e.settlement,null);
 e.step();assert.equal(e.tick,1);assert.equal(e.market.openTicks,1);
});
test('取消保证金强平仍保留净值耗尽结算，亏损不被抹平',()=>{
 const e=setup();const p=e.place({side:'buy',units:1000000});e.mid=e.bid=p.entry-2;e.ask=e.mid+.003;e.process();
 assert.ok(e.settlement);assert.ok(e.settlement.final<0);assert.equal(e.settlement.endReason,'净资金耗尽');assert.equal(e.stats.forced,0);assert.equal(e.positions.length,0);
});
test('一键10倍仓位是参考尺寸，手动可超过；成交成本仍真实扣除',()=>{
 const e=setup();const p=e.allIn('buy');assert.ok(p.units>=65000&&p.units<=67000);assert.ok(e.account().floating<0);
 e.place({side:'sell',units:500000});assert.ok(e.account().leverage>70);assert.equal(e.account().margin,0);
 e.balance=1;assert.throws(()=>e.place({side:'buy',units:1000000}),/耗尽/);
});
test('救急借款使用延长的150分钟周期，提前清偿与旧合同均保留',()=>{
 const e=setup();e.place({side:'buy',units:1000});assert.equal(e.canBorrow(),false);e.balance=300000;assert.ok(e.canBorrow());
 const l=e.borrow(500000,'rescueFast');assert.equal(l.period,150);assert.equal(l.nextDue-e.time,150*60000);
 e.time+=75*60000;assert.ok(Math.abs(e.debt()-500000*Math.sqrt(1.06))<.01);
 const c=Engine.restore({version:2,engine:e.snapshot()});assert.equal(c.loans.active.period,150);assert.equal(c.loans.active.nextDue,l.nextDue);c.repay(c.debt());assert.equal(c.loans.active,null);
});
test('第三局特殊行情延后3至10分钟，切回自由局恢复原时刻',()=>{
 const e=setup(25,3),x=e.market.extreme;assert.ok(x.at>=180&&x.at<=594);const at=x.at;e.setGameMode('free');assert.ok(x.at>=20&&x.at<=89);e.setGameMode('sprint20');assert.equal(x.at,at);
});
test('跳过休市到开市而非冻结贷款和到期挂单，跳过期间普通事件不推进',()=>{
 const e=new Engine(31);e.place({side:'buy',units:1000,type:'limit',price:100,expiry:e.time+60000});e.time=Date.UTC(2026,9,16,21);
 const t=e.time,advanced=e.skipClosed();assert.equal(advanced,2880);assert.equal(e.time-t,2880*60000);assert.ok(e.isOpen());assert.equal(e.orders.length,0);
 assert.equal(e.eventDirector.openTicks,1);assert.equal(e.market.openTicks,1);
 assert.throws(()=>e.skipClosed(),/已经开市/);assert.throws(()=>setup().skipClosed(),/连续交易/);
});
test('休市跳过遇到还款违约立即停止，不能跳过付款截止',()=>{
 const e=new Engine();e.place({side:'buy',units:150000});e.borrow(500000,'rescueFast');e.close(e.positions[0].id);
 e.balance=100;e.time=Date.UTC(2026,9,16,21);e.loans.active.lastAccrued=e.time;e.loans.active.nextDue=e.time+15*60000;
 assert.equal(e.skipClosed(),15);assert.ok(e.settlement.loanDefault);assert.equal(e.tick,15);assert.equal(e.isOpen(),false);
});
