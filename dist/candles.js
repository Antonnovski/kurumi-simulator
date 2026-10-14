export function guidanceWindow(tick){return {active:tick<10,remaining:Math.max(0,10-tick)};}
function isOpen(time){const d=new Date(time),day=d.getUTCDay(),hour=d.getUTCHours();return !(day===6||day===0&&hour<21||day===5&&hour>=21);}
// OHLC from observed mid quotes only. No fabricated intra-minute highs/lows.
export function candlesFromQuotes(history,minutes=5){
 if(![1,5,15].includes(minutes))throw Error('Unsupported candle period');
 const bars=[],width=minutes*60000;let previous=null;
 for(const q of history){if(!isOpen(q.time)){previous=null;continue;}const bucket=Math.floor(q.time/width)*width;let b=bars.at(-1);if(!b||b.time!==bucket){const open=previous&&q.time-previous.time===60000?previous.mid:q.mid;b={time:bucket,open,high:Math.max(open,q.mid),low:Math.min(open,q.mid),close:q.mid,samples:1,lastTime:q.time};bars.push(b);}else{b.high=Math.max(b.high,q.mid);b.low=Math.min(b.low,q.mid);b.close=q.mid;b.samples++;b.lastTime=q.time;}previous=q;}
 return bars;
}

