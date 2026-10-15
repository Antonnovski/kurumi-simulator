import {createServer} from '../server.js';import {writeFile} from 'node:fs/promises';
if(!global.gc)throw Error('Run this diagnostic with --expose-gc');
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,points=[];
const sample=round=>{global.gc();points.push({round,...process.memoryUsage()});};
sample(0);for(let round=1;round<=20;round++){for(let batch=0;batch<50;batch++)await Promise.all(Array.from({length:12},async(_,i)=>{const r=await fetch(base+(i%2?'/app.js':'/'));await r.arrayBuffer();}));sample(round);}
await new Promise(r=>server.close(r));sample(21);const result={requests:12000,points};if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
