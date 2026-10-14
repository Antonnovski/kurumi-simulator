const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
// Cost in JPY per USD. The displayed depth is synthetic capacity, not a real order book.
export function executionCost(units,vol=.018,depth=180000,spread=.003,shock=0){
 const participation=Math.max(0,units)/Math.max(10000,depth);
 const stress=1+Math.min(2,Math.abs(shock)/.3);
 const impact=clamp((spread*.16+vol*.11)*Math.sqrt(participation)*stress,0,.08);
 const uncertainty=clamp(vol*.035*(1+.3*Math.sqrt(participation))*stress,0,.025);
 return {impact,uncertainty,reserve:impact+uncertainty*3};
}
export function liquidationSpeed(speed,ratio,line,hasPosition){const selected=Math.min(10,Math.max(1,speed));return hasPosition&&Number.isFinite(ratio)&&ratio<line*1.25?1:selected;}

