import test from 'node:test';
import assert from 'node:assert/strict';
import {FX_PROFILES,FxFactors,factorReturn,fxSession,realisedVol} from '../dist/fx-model.js';
import {Engine} from '../dist/engine.js';
import {Market} from '../dist/market.js';
import {EVENT_CATALOG} from '../dist/events.js';
const pairs=Object.keys(FX_PROFILES);
function frame(changes={},stress=0){const f=new FxFactors(5).advance(0);for(const k of Object.keys(f.shocks)){f.shocks[k]=0;f.levels[k]=0;}Object.assign(f.shocks,changes);f.stress=stress;return f;}
test('日元意外走强共同压低四个日元交叉盘，美元避险流可部分抵消',()=>{
 const f=frame({JPY:1});for(const pair of pairs)assert.ok(factorReturn(pair,f).systematic<0);
 const both=frame({JPY:1,dollar:1,funding:1});assert.ok(factorReturn('USDJPY',both).systematic>factorReturn('USDJPY',f).systematic);
});
test('本国政策预期、商品和能源冲击具有差异化响应，不套用单一倍率',()=>{
 const rate=frame({GBP:1});assert.ok(factorReturn('GBPJPY',rate).systematic>0);assert.equal(factorReturn('USDJPY',rate).systematic,0);
 const ore=frame({commodity:1});assert.ok(factorReturn('AUDJPY',ore).systematic>factorReturn('USDJPY',ore).systematic*10);
 assert.ok(factorReturn('EURJPY',frame({energy:1})).systematic<0);
 const risk=frame({risk:-1}),stress=frame({risk:-1},1.5);assert.ok(factorReturn('AUDJPY',risk).systematic<factorReturn('USDJPY',risk).systematic);
 assert.ok(Math.abs(factorReturn('AUDJPY',stress).systematic)>Math.abs(factorReturn('AUDJPY',risk).systematic));
});
test('欧美与悉尼夏令时改变活跃窗口，纽约换日降低深度而不停止交易',()=>{
 assert.equal(fxSession('GBPJPY',Date.UTC(2026,6,13,7)).label,'欧洲盘');
 assert.notEqual(fxSession('GBPJPY',Date.UTC(2026,0,12,7)).label,'欧洲盘');
 assert.equal(fxSession('EURJPY',Date.UTC(2026,6,13,13)).label,'欧美重叠');
 const winter=fxSession('USDJPY',Date.UTC(2026,0,12,22)),summer=fxSession('USDJPY',Date.UTC(2026,6,13,21));
 assert.ok(winter.rollover&&summer.rollover);assert.ok(summer.liquidity<fxSession('USDJPY',Date.UTC(2026,6,13,20)).liquidity);
 assert.ok(fxSession('AUDJPY',Date.UTC(2026,9,12,0)).liquidity>fxSession('GBPJPY',Date.UTC(2026,9,12,0)).liquidity);
});
test('每币种尾部、条件波动和流动性参数独立；伦敦盘英镑深度改善',()=>{
 assert.ok(FX_PROFILES.GBPJPY.df<FX_PROFILES.USDJPY.df);assert.ok(FX_PROFILES.AUDJPY.asymmetry>FX_PROFILES.USDJPY.asymmetry);
 const a=new Engine(503),b=new Engine(503);a.time=Date.UTC(2026,9,12,0);b.time=Date.UTC(2026,9,12,13);a.step();b.step();
 assert.ok(b.instrument('GBPJPY').depth>a.instrument('GBPJPY').depth);
 assert.ok(a.instrument('GBPJPY').spread>a.instrument('USDJPY').spread);
});
test('同一商品事件对澳元的报价比例冲击最强；币种事件持续期有差异',()=>{
 const e=new Engine(),template=EVENT_CATALOG.find(x=>x.id==='iron-ore'),spec={template,sign:1,draws:[.5,.5,.99,.3,.4,.5]};const xs=pairs.map(pair=>e.instrument(pair).market.createEvent(e.time,spec));
 assert.ok(xs[3].magnitude/98>xs[0].magnitude/150*10);assert.notEqual(xs[1].duration,xs[2].duration);
});
test('共享因子每个开市分钟只推进一次；休市不消耗，切币和交易不改变未来行情',()=>{
 const a=new Engine(707),b=new Engine(707);b.setInstrument('GBPJPY');b.place({side:'sell',units:1000});
 for(let i=0;i<500;i++){a.step();b.step();}assert.equal(a.fxFactors.tick,500);assert.deepEqual(a.fxFactors,b.fxFactors);
 for(const pair of pairs)assert.equal(a.instrument(pair).mid,b.instrument(pair).mid);
 a.time=Date.UTC(2026,9,17,10);a.step();assert.equal(a.fxFactors.tick,500);
});
test('公共因子及各币种条件方差刷新后延续相同路径',()=>{
 const a=new Engine(1207);for(let i=0;i<120;i++)a.step();const b=Engine.restore({version:2,engine:a.snapshot()});
 for(let i=0;i<300;i++){a.step();b.step();}assert.deepEqual(a.fxFactors,b.fxFactors);
 for(const pair of pairs){assert.equal(a.instrument(pair).mid,b.instrument(pair).mid);assert.deepEqual(a.instrument(pair).market,b.instrument(pair).market);}
});
test('v13存档迁移不改旧报价、历史和账户，不以初始价格重置外币',()=>{
 const a=new Engine(909);a.setInstrument('AUDJPY');a.place({side:'buy',units:10000});for(let i=0;i<10;i++)a.step();const data=a.snapshot();delete data.fxFactors;
 for(const m of [data.market,...Object.values(data.instruments).map(x=>x.market)]){m.modelVersion=12;m.trend=.001;m.targetTrend=.002;delete m.variance14;delete m.lastZ;}
 const b=Engine.restore({version:2,engine:data});assert.deepEqual(b.account(),a.account());assert.deepEqual(b.history,a.history);assert.equal(b.mid,a.mid);assert.equal(b.game.deadline,a.game.deadline);b.step();assert.ok(Number.isFinite(b.mid));
});
test('独立Market调用也能恢复自己的因子序列；价格不被统一50至300区间截断',()=>{
 const m=new Market(519);let mid=350;m.base=m.fair=m.fundamental=350;for(let i=0;i<50;i++)mid=m.advance(i*60000,mid,false,false).mid;assert.ok(mid>300);
 const c=Market.restore(JSON.parse(JSON.stringify(m)),519);assert.deepEqual(m.advance(3000000,mid,false,false),c.advance(3000000,mid,false,false));
});
test('已实现波动仅使用过去连续报价，休市跳空与未来点不伪造分钟内路径',()=>{
 const h=[{time:0,mid:100},{time:60000,mid:101},{time:120000,mid:100},{time:3600000,mid:300},{time:3660000,mid:301}];
 const a=realisedVol(h,120000);assert.equal(a.samples,2);assert.ok(Math.abs(a.percent-Math.sqrt(2)*Math.log(1.01)*100)<1e-9);
 assert.equal(realisedVol(h,3600000).samples,0);assert.equal(realisedVol([],0).samples,0);
});
