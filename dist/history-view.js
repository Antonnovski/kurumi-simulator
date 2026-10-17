export function chartWindow(total,offset=0,size=80){const back=Math.min(Math.max(0,Math.round(offset)),Math.max(0,total-size));const end=total-back;return {start:Math.max(0,end-size),end,offset:back,max:Math.max(0,total-size)};}
export function quoteStart(history,time){let lo=0,hi=history.length;while(lo<hi){const mid=(lo+hi)>>>1;if(history[mid].time<time)lo=mid+1;else hi=mid;}return lo;}
// Keep first/last and both extrema in each bucket; peaks are not hidden by sampling.
export function positionSeries(history,p,{maxPoints=Infinity}={}){
 const start=quoteStart(history,p.created),length=history.length-start;
 const point=i=>({time:history[i].time,value:(p.side==='buy'?history[i].bid-p.entry:p.entry-history[i].ask)*p.units});
 if(length<=maxPoints)return history.slice(start).map((_,i)=>point(start+i));
 const buckets=Math.max(1,Math.floor((maxPoints-2)/2)),step=(length-2)/buckets,points=[point(start)];
 for(let b=0;b<buckets;b++){const from=start+1+Math.floor(b*step),to=start+1+Math.floor((b+1)*step);let low=null,high=null;for(let i=from;i<to;i++){const q=point(i);if(!low||q.value<low.value)low=q;if(!high||q.value>high.value)high=q;}if(low){if(low.time<=high.time){points.push(low);if(high.time!==low.time)points.push(high);}else points.push(high,low);}}
 points.push(point(history.length-1));return points;
}
export function drawPosition(canvas,history,p){const r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,points=positionSeries(history,p,{maxPoints:Math.max(4,Math.floor(r.width*2))});canvas.width=Math.max(1,r.width*dpr);canvas.height=r.height*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);const w=r.width,h=r.height;let lo=0,hi=0;for(const q of points){lo=Math.min(lo,q.value);hi=Math.max(hi,q.value);}if(hi===lo){hi+=1;lo-=1;}const y=v=>12+(hi-v)/(hi-lo)*Math.max(1,h-32);c.strokeStyle='#455266';c.setLineDash([3,4]);c.beginPath();c.moveTo(0,y(0));c.lineTo(w,y(0));c.stroke();c.setLineDash([]);if(points.length){c.strokeStyle=points.at(-1).value>=0?'#64e7b0':'#ff7989';c.lineWidth=1.7;c.beginPath();const first=points[0].time,span=points.at(-1).time-first||1;points.forEach((q,i)=>{const x=6+(q.time-first)/span*(w-12);i?c.lineTo(x,y(q.value)):c.moveTo(x,y(q.value));});c.stroke();}c.fillStyle='#94a6bc';c.font='10px sans-serif';c.fillText(points.length?`浮盈轨迹 · ${history.length-quoteStart(history,p.created)} 个报价点`:'等待下一分钟报价',6,h-5);}

