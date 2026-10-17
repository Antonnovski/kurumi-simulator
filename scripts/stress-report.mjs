import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import path from 'node:path';
const out=path.resolve(process.argv[2]),root=path.dirname(path.dirname(out)),version='1.0.1';
const json=async name=>JSON.parse(await readFile(path.join(out,name),'utf8'));
const state=await json('complete.json'),http=await json('http-concurrency.json'),ui=await json('ui-model.json'),memory=await json('memory-probe.json'),portfolio=await json('portfolio.json');assert.equal(portfolio.ok,true);
assert.ok(state.elapsedSeconds>=7200);assert.equal(state.httpFailures,0);assert.equal(http.failures,0);assert.ok(http.finishedAt);
assert.equal(state.realtime.length,6);const real=state.realtime.map(r=>{assert.equal(r.code,0);const data=JSON.parse(r.stdout);assert.equal(data.ok,true);assert.ok(data.elapsedMs>=1200000);return data;});
const tap=await readFile(path.join(out,'regression-final.tap'),'utf8');assert.match(tap,/^# fail 0$/m);const tests=Number(tap.match(/^# tests (\d+)$/m)[1]);
const bytes=await Promise.all(['dist/engine.js','dist/market.js','dist/fx-model.js','dist/app.js','dist/loans.js'].map(p=>readFile(path.join(root,p))));const revision=createHash('sha256').update(Buffer.concat(bytes)).digest('hex').slice(0,12),final=state.revisions[revision];assert.ok(final?.pass>0);assert.equal(final.fail,0);
const fmt=n=>n.toLocaleString('en-US'),date=t=>new Date(t).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}),mib=n=>(n/1048576).toFixed(2);
const report=`# 久留美模拟器 V${version} 两小时压力测试与页面修复

测试窗口：${date(state.startedAt)} 至 ${date(state.finishedAt)}（北京时间），现实持续 **${state.elapsedSeconds} 秒**。基线为V1.0.0；在持续窗口内修复，后续工作进程加载更新代码。实际等待两小时，未用模拟快进替代现实等待。

## 结果

|项目|观测值|
|---|---:|
|随机压力批次|${fmt(state.batches)}|
|模拟推进分钟|${fmt(state.steps)}|
|随机操作尝试|${fmt(state.actions)}|
|存档恢复检查|${fmt(state.restores)}|
|独立账户/轮次|${fmt(state.rounds)}|
|全窗口失败批次|${state.failedBatches}|
|最终代码指纹|${revision}|
|最终代码批次|${fmt(final.pass)}通过 / ${final.fail}失败|
|持续HTTP状态检查|${fmt(state.http)}次 / ${state.httpFailures}失败|
|12并发访问|${fmt(http.requests)}次 / ${http.failures}失败|
|并发最大观测延迟|${http.maxLatencyMs.toFixed(1)}毫秒|
|最终回归|${tests}项通过 / 0失败|

操作尝试包括未执行分支和预期拒单，不等同于成交笔数。HTTP包含故意请求的403/404，按预期状态判断通过。并发窗口为${date(http.startedAt)}至${date(http.finishedAt)}，比主测试略短。

覆盖四币种交易、OCO、挂单到期、部分平仓、移动止损、借款及提前/分期还款、资金账恒等式、有限数值、ID唯一性、压缩恢复与50,000点保留边界。

## 六轮真实20分钟

|轮次|现实经过|报价推进|恢复次数|结果|
|---|---:|---:|---:|---|
${real.map(r=>`|${r.round}|${(r.elapsedMs/1000).toFixed(3)}秒|${r.ticks}|${r.restores}|通过|`).join('\n')}

各轮均等到实际截止后结算，报告为20分钟并清空仓位。测试在引擎层进行，采样次数受定时器调度影响，不代表浏览器渲染帧数。

## 修复与优化

1. 顶部信息过高、完整简报吸顶遮挡：压缩信息区，取消完整简报吸顶，增加可保存的专注交易视图、K线与下单定位。桌面右侧保留持仓和订单，独立滚动；订单标题注明当前币种。修正挑战开关被全宽输入框样式撑开的排版。
2. 持仓区每次报价都重建：普通报价更新复用控件，每页最多20条；大量仓位不再一次创建全部图表。历史按钮到边界时禁用。
3. 长历史绘图和简报重复开销：持仓图按宽度预算采样，每桶保留峰谷与时间顺序；简报二分定位已发生的30分钟报价；主K线一次绘制只聚合一次。原始历史与账户计算精度不变。
4. 多标签页覆盖存档：保存前检查已读取基线，并监听其他页更新；检测冲突后停止本页行情/写入，提示重新载入。网页已实际验证双页冲突、重新载入与原资金/时间保留。同步检查不是跨进程原子事务，完全同时的竞争仍不作事务保证。
5. 跳过休市后播放按钮未同步：停止播放时同时重置按钮与时间余量。保存失败提示明确PNG仅供复盘，不能用于恢复存档。
6. 压测工具原先固定三轮现实局：按测试时长计算轮数，两小时覆盖六轮。

新增回归覆盖五万点曲线峰谷保留、窗口时间边界、未来报价隔离、多页旧写入拒绝、重新读取、配额恢复及删除冲突。

## 性能与页面验证范围

独立视图计算负载：每币种${fmt(ui.historyPerPair)}报价、20可见仓位、250次计算；中位${ui.medianMs.toFixed(2)}毫秒，P95 ${ui.p95Ms.toFixed(2)}毫秒，最大${ui.maxMs.toFixed(2)}毫秒。此为Node派生数据计算，**不含浏览器DOM、Canvas和帧渲染耗时**。

另以200、1,000及5,000个四币种仓位检验建仓、压缩恢复和全仓结算；笔数、资金与清仓不变量均通过。5,000仓样本结算${portfolio.rows.at(-1).settleMs.toFixed(1)}毫秒。该样本是独立规模边界验证，不等同于持续两小时持有5,000仓。

工作进程最大观测RSS ${mib(state.peakWorkerRss)} MiB，控制进程末次RSS ${mib(state.controllerRss)} MiB。另做${fmt(memory.requests)}次读取，在检查点强制GC；预热后堆占用${mib(Math.min(...memory.points.slice(1).map(p=>p.heapUsed)))}–${mib(Math.max(...memory.points.slice(1).map(p=>p.heapUsed)))} MiB。RSS包含分配器保留页，不能据此单独断言泄漏或无泄漏。

已在公开网页检查完整/专注布局、1440桌面与390手机宽度的横向溢出、币种切换、存档刷新保留、冲突提示与控制台。没有用用户的交易账户执行买卖、结算或重置。两小时为引擎/本地服务持续负载，未声称整段时间的浏览器后台节流或绘制压力验证。

## 复现

node scripts/stress-soak.mjs 7200；并发脚本为scripts/stress-http.mjs（仅允许经身份验证的测试回环服务），视图计算为scripts/stress-ui-model.mjs 输出JSON路径。最终回归：node --test --test-reporter=tap tests/*.test.js。原始状态、完成标记及NDJSON保留于本机.local测试目录，不随源码发布。
`;
const target=path.join(root,'STRESS-V1.0.1.md');await writeFile(target,report);console.log(JSON.stringify({report:target,seconds:state.elapsedSeconds,tests,finalRevision:revision}));
