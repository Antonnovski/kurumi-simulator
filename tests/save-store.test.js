import test from 'node:test';import assert from 'node:assert/strict';
import {SaveStore,SaveConflictError} from '../dist/save-store.js';
function storage(value=null){return {value,getItem(){return this.value;},setItem(key,next){this.value=next;}};}
test('另一页面写入后拒绝旧页保存及退出覆盖，最新存档保留',()=>{const db=storage('初始'),a=new SaveStore(db),b=new SaveStore(db);a.read();b.read();a.write('A的新进度');assert.throws(()=>b.write('B的旧进度'),SaveConflictError);assert.equal(db.value,'A的新进度');assert.equal(b.current,'初始');});
test('重新读取可以继续保存，相同快照不误报冲突',()=>{const db=storage('相同'),a=new SaveStore(db),b=new SaveStore(db);a.read();b.read();a.write('相同');b.write('下一步');assert.equal(a.read(),'下一步');a.write('已恢复');assert.equal(db.value,'已恢复');});
test('配额拒绝不更新本页保存基线，空间恢复后可以重试',()=>{const db=storage('旧档'),a=new SaveStore(db);a.read();const write=db.setItem;db.setItem=()=>{throw new Error('QuotaExceeded');};assert.throws(()=>a.write('新档'),/QuotaExceeded/);assert.equal(a.current,'旧档');db.setItem=write;a.write('新档');assert.equal(db.value,'新档');});
test('其他页面删除存档也视为冲突，不自动复活旧档',()=>{const db=storage(),a=new SaveStore(db);assert.equal(a.read(),null);a.write('进行中');db.value=null;assert.equal(a.changed(),true);assert.throws(()=>a.write('旧档'),SaveConflictError);});
