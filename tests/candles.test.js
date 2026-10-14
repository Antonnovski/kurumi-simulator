import test from 'node:test';
import assert from 'node:assert/strict';
import {candlesFromQuotes,guidanceWindow} from '../dist/candles.js';
test('指导覆盖第0至9分钟，第10分钟结束，刷新不重计',()=>{assert.deepEqual(guidanceWindow(0),{active:true,remaining:10});assert.deepEqual(guidanceWindow(9),{active:true,remaining:1});assert.deepEqual(guidanceWindow(10),{active:false,remaining:0});assert.equal(guidanceWindow(200).active,false);});
test('5分钟OHLC聚合实际报价，跨桶以前一报价开盘',()=>{const start=Date.UTC(2026,9,12,0);const quotes=[150,151,149,150.5,150.2,150.8].map((mid,i)=>({mid,time:start+i*60000}));const bars=candlesFromQuotes(quotes,5);assert.deepEqual(bars[0],{time:start,open:150,high:151,low:149,close:150.2,samples:5,lastTime:start+240000});assert.equal(bars[1].open,150.2);assert.equal(bars[1].close,150.8);assert.equal(bars[1].samples,1);});
test('一分钟蜡烛仅有报价端点，不制造影线；零报价安全',()=>{const start=Date.UTC(2026,9,12);const bars=candlesFromQuotes([{time:start,mid:150},{time:start+60000,mid:151}],1);assert.equal(bars[1].high,151);assert.equal(bars[1].low,150);assert.deepEqual(candlesFromQuotes([]),[]);});
test('跳过休市报价，不在重开时连成虚假的周末蜡烛',()=>{const bars=candlesFromQuotes([{time:Date.UTC(2026,9,16,20,59),mid:150},{time:Date.UTC(2026,9,17),mid:150},{time:Date.UTC(2026,9,18,21),mid:152}],5);assert.equal(bars.length,2);assert.equal(bars[1].open,152);assert.equal(bars[1].low,152);});
