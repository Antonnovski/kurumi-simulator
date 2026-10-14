import test from 'node:test';
import assert from 'node:assert/strict';
import {tickerItems,tickerKey,tickerDuration} from '../dist/ticker.js';
test('滚动栏只使用已发布新闻，最多八条，保持最新顺序',()=>{const news=Array.from({length:10},(_,i)=>({id:i,publishedAt:i,title:'新闻'+i,tag:'经济',hidden:'未来冲击'}));const items=tickerItems(news);assert.equal(items.length,8);assert.equal(items[0].id,0);assert.equal(items[7].id,7);assert.equal(items[0].hidden,undefined);});
test('相同新闻不重启动画，新新闻更新内容，空新闻无虚构标题',()=>{assert.equal(tickerKey([]),'');assert.deepEqual(tickerItems([]),[]);const news=[{id:1,title:'日本央行消息',tag:'政策'}];assert.equal(tickerKey(news),tickerKey([...news]));assert.notEqual(tickerKey(news),tickerKey([{id:2,title:'经济数据',tag:'经济'},...news]));assert.ok(tickerDuration([])>=30);assert.ok(tickerDuration(tickerItems(news))<=160);});
