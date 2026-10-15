import {chartWindow} from './history-view.js?v=1000';
import {candlesFromQuotes} from './candles.js?v=1000';
export function drawChart(canvas,engine,view,period,offset=0){
 const r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=r.width*dpr;canvas.height=r.height*dpr;
 const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const w=r.width,h=r.height,left=18,right=75,top=30,bottom=35;
 const all=candlesFromQuotes(engine.history,period,{continuous:engine.isRealtime()}),win=chartWindow(all.length,offset),bars=all.slice(win.start,win.end),points=engine.curve.slice(-240),series=view==='price'?bars:points;
 if(!series.length){ctx.fillStyle='#7f90a5';ctx.font='12px sans-serif';ctx.fillText('等待开市报价生成 K 线',left,50);return{caption:'暂无开市报价',ohlc:'—'};}
 const lows=view==='price'?bars.map(b=>b.low):points.map(p=>p.equity),highs=view==='price'?bars.map(b=>b.high):points.map(p=>p.equity);
 let lo=Math.min(...lows),hi=Math.max(...highs),pad=Math.max((hi-lo)*.15,view==='price'?.035:100);lo-=pad;hi+=pad;
 const plotW=Math.max(1,w-left-right),plotH=Math.max(1,h-top-bottom),y=v=>top+(hi-v)/(hi-lo)*plotH;
 const slot=plotW/series.length,x=i=>left+slot*(i+.5);ctx.font='10px monospace';
 for(let i=0;i<5;i++){const yy=top+i*plotH/4;ctx.strokeStyle='#25303d';ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(w-right,yy);ctx.stroke();ctx.fillStyle='#8092a9';const v=hi-i*(hi-lo)/4;ctx.fillText(view==='price'?v.toFixed(3):Math.round(v).toLocaleString(),w-right+8,yy+3);}
 for(let i=0;i<4;i++){const ix=Math.round(i*(series.length-1)/3);ctx.fillStyle='#667c95';ctx.fillText(new Date(series[ix].time).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'}),Math.max(left,Math.min(w-120,x(ix)-15)),h-16);}
 if(view==='price'){
 const body=Math.max(2,Math.min(18,slot*.62));
 bars.forEach((b,i)=>{const color=b.close>=b.open?'#64e7b0':'#ff7989';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x(i),y(b.high));ctx.lineTo(x(i),y(b.low));ctx.stroke();const highY=y(Math.max(b.open,b.close)),height=Math.max(1.5,Math.abs(y(b.open)-y(b.close)));ctx.fillRect(x(i)-body/2,highY,body,height);});
 for(const p of engine.positions.filter(p=>(p.pair??'USDJPY')===(engine.pair??'USDJPY'))){if(p.entry<lo||p.entry>hi)continue;ctx.strokeStyle=p.side==='buy'?'#64e7b075':'#ff798975';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(left,y(p.entry));ctx.lineTo(w-right,y(p.entry));ctx.stroke();ctx.setLineDash([]);}
 }else{const gradient=ctx.createLinearGradient(0,top,0,h-bottom);gradient.addColorStop(0,'#64e7b032');gradient.addColorStop(1,'#64e7b000');ctx.beginPath();ctx.moveTo(x(0),h-bottom);points.forEach((p,i)=>ctx.lineTo(x(i),y(p.equity)));ctx.lineTo(x(points.length-1),h-bottom);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.equity)):ctx.moveTo(x(i),y(p.equity)));ctx.strokeStyle='#64e7b0';ctx.lineWidth=1.8;ctx.stroke();}
 const b=bars.at(-1);return {caption:view==='price'?`${engine.pair??'USDJPY'} · ${period} 分钟 K 线 · 第 ${win.start+1}–${win.end} / ${all.length} 根 · ${win.offset?'历史浏览':'跟随最新 · 末根形成中'}`:'账户净值 · 最近 240 点',maxOffset:win.max,offset:win.offset,ohlc:view==='price'&&b?`开 ${b.open.toFixed(3)}  高 ${b.high.toFixed(3)}  低 ${b.low.toFixed(3)}  收 ${b.close.toFixed(3)}`:'账户净值曲线'};
}

