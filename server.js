import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};
export function createServer(){let pageViews=0;return http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end('Method not allowed');}
 try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name==='/_local/health'){res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(req.method==='HEAD'?'':JSON.stringify({app:'kurumi-simulator',name:'久留美模拟器',version:'0.12.2',pid:process.pid,root,pageViews}));}
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name)),relative=path.relative(root,file);
 if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(part=>part.startsWith('.'))){res.writeHead(403);return res.end('Forbidden');}
 const data=await readFile(file);if(name==='/'&&req.method==='GET')pageViews++;const mime=types[path.extname(file)]??'application/octet-stream';res.setHeader('Content-Type',mime+(mime.startsWith('text/')?'; charset=utf-8':''));res.end(req.method==='HEAD'?undefined:data);
 }catch(error){res.writeHead(error instanceof URIError?400:404);res.end('Not found');}
 });}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--port'),port=i<0?4173:Number(process.argv[i+1]);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('端口必须为1–65535');
 const server=createServer();server.on('error',e=>{console.error('无法启动本地游戏：'+e.message);process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log('久留美模拟器 本地版：http://127.0.0.1:'+port));
}
