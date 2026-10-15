import {encodeSave,decodeSave} from '../dist/save-codec.js';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Engine} from '../dist/engine.js';
const output=process.argv[2],round=Number(process.argv[3]??1);let e=new Engine(10000+round,round);e.setGameMode('sprint20');e.beginRealtime();const started=e.game.startedAt;let restores=0;
await new Promise((resolve,reject)=>{const timer=setInterval(async()=>{try{
 e.updateRealtime();if(!e.settlement){e.step();if(e.tick%60===0){e.setInstrument(['USDJPY','EURJPY','GBPJPY','AUDJPY'][Math.floor(e.tick/60)%4]);if(e.positions.length)e.close(e.positions[0].id);e.place({side:e.tick%120?'buy':'sell',units:1000});}if(e.tick%90===0){e=Engine.restore(decodeSave(encodeSave(e)));restores++;}}
 await writeFile(output,JSON.stringify({round,startedAt:started,elapsedMs:Date.now()-started,ticks:e.tick,restores,settled:!!e.settlement,equity:e.account().equity}));
 if(e.settlement){clearInterval(timer);assert.equal(e.settlement.endReason,'现实20分钟到时');assert.equal(e.settlement.realMinutes,20);assert.ok(Date.now()-started>=1200000);assert.ok(Date.now()-started<1210000);assert.equal(e.positions.length,0);resolve();}
 }catch(error){clearInterval(timer);reject(error);}},1000);});
console.log(JSON.stringify({ok:true,round,elapsedMs:Date.now()-started,ticks:e.tick,restores}));
