export const PACE={defaultSpeed:3,ordinaryEventChance:.0045,stressEventChance:.009,varianceFloor:.000010,stateChance:.009};
export function effectiveSpeed(speed,tick){return tick<10?Math.min(1,speed):Math.min(10,Math.max(1,speed));}
export function advanceMinutes(engine,minutes){let advanced=0;for(let i=0;i<minutes;i++){if(engine.settlement||engine.halted)break;engine.step();advanced++;}return advanced;}

