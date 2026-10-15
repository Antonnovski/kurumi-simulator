// Synchronous delta/varint storage preserves five-decimal quotes and cent amounts.
// Keeping this synchronous also makes pagehide saves work without async compression.
function base64(bytes){const chunks=[];for(let i=0;i<bytes.length;i+=16384)chunks.push(String.fromCharCode(...bytes.subarray(i,i+16384)));return btoa(chunks.join(''));}
function unbase64(text){return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
function pushInt(bytes,n){let v=n<0?-n*2-1:n*2;if(!Number.isSafeInteger(v))throw Error('存档数值超出安全精度');while(v>=128){bytes.push(v%128|128);v=Math.floor(v/128);}bytes.push(v);}
function readInt(bytes,cursor){let value=0,multiplier=1,done=false;for(let i=0;i<8&&cursor.i<bytes.length;i++){const b=bytes[cursor.i++];value+=(b&127)*multiplier;if(b<128){done=true;break;}multiplier*=128;}if(!done||!Number.isSafeInteger(value))throw Error('压缩存档损坏');return value%2?-(value+1)/2:value/2;}
function pack(points,kind){
 if(!Array.isArray(points)||!points.length)return points;
 const keys=kind==='quotes'?['mid','bid','ask']:['equity'],scale=kind==='quotes'?100000:100;
 // Fall back for arbitrary legacy precision; do not silently coarsen it.
 if(points.some(p=>!Number.isFinite(p.time)||keys.some(k=>!Number.isFinite(p[k])||Math.abs(p[k]*scale-Math.round(p[k]*scale))>1e-5)))return points;
 const bytes=[],previous=keys.map(()=>0),jumps=[];const time=points[0].time;let expectedTime=time;
 points.forEach((p,i)=>{if(p.time!==expectedTime)jumps.push([i,p.time]);expectedTime=p.time+60000;const values=keys.map(k=>Math.round(p[k]*scale));if(kind==='quotes'){values[1]=values[0]-values[1];values[2]-=values[0];}for(let j=0;j<values.length;j++){pushInt(bytes,values[j]-previous[j]);previous[j]=values[j];}});
 return {encoding:'delta-v1',kind,count:points.length,start:time,jumps,data:base64(Uint8Array.from(bytes))};
}
function unpack(p,kind){
 if(Array.isArray(p))return p;
 if(!p||p.encoding!=='delta-v1'||p.kind!==kind||!Number.isInteger(p.count)||p.count<1||p.count>50001||!Number.isFinite(p.start)||!Array.isArray(p.jumps)||typeof p.data!=='string'||p.data.length>16000000)throw Error('压缩存档格式无效');
 const bytes=unbase64(p.data),cursor={i:0},width=kind==='quotes'?3:1,previous=Array(width).fill(0),points=[],jumps=new Map(p.jumps);let expectedTime=p.start;
 for(let i=0;i<p.count;i++){for(let j=0;j<width;j++){previous[j]+=readInt(bytes,cursor);if(!Number.isSafeInteger(previous[j]))throw Error('存档数值无效');}const time=jumps.get(i)??expectedTime;expectedTime=time+60000;if(!Number.isFinite(time))throw Error('存档时间无效');if(kind==='quotes')points.push({time,mid:previous[0]/100000,bid:(previous[0]-previous[1])/100000,ask:(previous[0]+previous[2])/100000});else points.push({time,equity:previous[0]/100});}
 if(cursor.i!==bytes.length)throw Error('压缩存档尾部损坏');return points;
}
function packRecords(records){
 if(!Array.isArray(records)||!records.length)return records;
 const schemas=[],lookup=new Map(),rows=records.map(record=>{const keys=Object.keys(record).filter(k=>record[k]!==undefined),signature=JSON.stringify(keys);let index=lookup.get(signature);if(index==null){index=schemas.length;schemas.push(keys);lookup.set(signature,index);}return [index,...keys.map(k=>record[k])];});
 return {encoding:'rows-v1',schemas,rows};
}
function unpackRecords(value){
 if(Array.isArray(value))return value;
 if(!value||value.encoding!=='rows-v1'||!Array.isArray(value.schemas)||!Array.isArray(value.rows)||value.rows.length>100000)throw Error('存档记录格式无效');
 return value.rows.map(row=>{const keys=value.schemas[row[0]];if(!Array.isArray(keys)||row.length!==keys.length+1||keys.some(k=>typeof k!=='string'||k==='__proto__'))throw Error('存档记录损坏');return Object.fromEntries(keys.map((key,i)=>[key,row[i+1]]));});
}
export function encodeSave(engine){
 const state={...engine,instruments:{...engine.instruments},history:pack(engine.history,'quotes'),curve:pack(engine.curve,'curve')};
 // The active instrument already lives on the root object, not twice in storage.
 delete state.instruments[engine.pair];
 for(const [pair,q]of Object.entries(state.instruments))state.instruments[pair]={...q,history:pack(q.history,'quotes')};
 for(const key of ['positions','orders','logs'])state[key]=packRecords(engine[key]);
 return JSON.stringify({version:3,engine:state});
}
export function decodeSave(raw){
 const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.version!==3)return data;
 const state=data.engine;if(!state||typeof state!=='object')throw Error('存档账户无效');
 const engine={...state,history:unpack(state.history,'quotes'),curve:unpack(state.curve,'curve'),instruments:{...state.instruments}};
 for(const [pair,q]of Object.entries(engine.instruments))engine.instruments[pair]={...q,history:unpack(q.history,'quotes')};
 for(const key of ['positions','orders','logs'])engine[key]=unpackRecords(state[key]);
 return {version:2,engine};
}
