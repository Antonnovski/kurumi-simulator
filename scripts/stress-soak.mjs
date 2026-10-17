import {spawn} from 'node:child_process';
import {mkdir,writeFile,appendFile,readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {createServer} from '../server.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),out=path.join(root,'.local','stress-'+new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(out,{recursive:true});const start=performance.now(),seconds=Number(process.argv[2]??3600),end=start+seconds*1000;
const state={startedAt:new Date().toISOString(),durationSeconds:seconds,out,batches:0,failedBatches:0,steps:0,actions:0,restores:0,rounds:0,http:0,httpFailures:0,peakWorkerRss:0,realtime:[],revisions:{}};
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const run=(file,args=[])=>new Promise(resolve=>{const child=spawn(process.execPath,[path.join(root,'scripts',file),...args],{cwd:root,windowsHide:true});let stdout='',stderr='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.on('error',e=>resolve({code:-1,stdout,stderr:String(e)}));child.on('close',code=>resolve({code,stdout,stderr}));});
const revision=async()=>{const bytes=await Promise.all(['dist/engine.js','dist/market.js','dist/fx-model.js','dist/app.js','dist/loans.js'].map(p=>readFile(path.join(root,p))));return createHash('sha256').update(Buffer.concat(bytes)).digest('hex').slice(0,12);};
const save=async()=>{state.elapsedSeconds=Math.floor((performance.now()-start)/1000);state.controllerRss=process.memoryUsage().rss;await writeFile(path.join(out,'status.json'),JSON.stringify(state,null,2));};
console.log(JSON.stringify({started:true,out,pid:process.pid,seconds}));
const realtime=(async()=>{for(let n=1;n<=Math.floor(seconds/1200);n++){const r=await run('realtime-soak.mjs',[path.join(out,'realtime-'+n+'.json'),String(n)]);state.realtime.push({...r,round:n});await appendFile(path.join(out,'realtime.ndjson'),JSON.stringify({...r,round:n})+'\n');}})();
let seed=1;
while(performance.now()<end){const rev=await revision(),r=await run('stress-worker.mjs',[String(seed++)]);let parsed;try{parsed=JSON.parse(r.stdout.trim());}catch{parsed={ok:false,message:r.stderr||r.stdout};}state.batches++;state.revisions[rev]??={pass:0,fail:0};if(parsed.ok&&r.code===0){state.revisions[rev].pass++;for(const k of ['steps','actions','restores','rounds'])state[k]+=parsed[k]??0;state.peakWorkerRss=Math.max(state.peakWorkerRss,parsed.rss??0);}else{state.failedBatches++;state.revisions[rev].fail++;await appendFile(path.join(out,'failures.ndjson'),JSON.stringify({at:new Date().toISOString(),rev,...parsed,stderr:r.stderr})+'\n');}
 const tests=[['/',200],['/fx-model.js?v=140',200],['/engine.js',200],['/missing',404],['/_local/health',200],['/%2e%2e%2fpackage.json',403]];
 for(const [url,expected]of tests){try{const response=await fetch(base+url);await response.arrayBuffer();state.http++;if(response.status!==expected)throw Error('HTTP '+url+' '+response.status);}catch(error){state.httpFailures++;await appendFile(path.join(out,'http-failures.ndjson'),JSON.stringify({message:error.message})+'\n');}}
 await save();await new Promise(r=>setTimeout(r,750));
}
await realtime;state.finishedAt=new Date().toISOString();await save();await new Promise(r=>server.close(r));await writeFile(path.join(out,'complete.json'),JSON.stringify(state,null,2));console.log(JSON.stringify({complete:true,...state}));
