// Only observed quotes and account state enter coaching; hidden market events never do.
export function coaching(e,draft){
 const a=e.account(),entry=draft.type==='market'?(draft.side==='buy'?e.ask:e.bid):draft.price;
 const distance=draft.sl==null?null:(draft.side==='buy'?entry-draft.sl:draft.sl-entry);
 const validSL=Number.isFinite(distance)&&distance>0;
 const planned=validSL?distance*draft.units:null;
 const completed=e.logs.filter(l=>l.pnl!=null).length;
 const stage=completed>=3?4:e.positions.length?2:e.orders.length?1:completed?3:0;
 const steps=['理解报价','计划订单','管理持仓','复盘交易','独立交易'];
 let title,text,tone='normal';
 if(e.halted){title='本局结束：先复盘，再重开';text='查看强平记录和最大回撤，找出仓位与保证金的变化。负余额会作为虚拟负债保留。';tone='danger';}
 else if(a.margin&&a.ratio<e.rules().liquidationRatio*1.5){title='保证金缓冲正在缩小';text=`维持率 ${(a.ratio*100).toFixed(1)}%，强平线 ${e.rules().liquidationRatio*100}%。减仓可以释放保证金；反向开仓仍会额外占用保证金。`;tone='danger';}
 else if(a.leverage>10){title='先检查仓位放大后的损失';text=`当前杠杆 ${a.leverage.toFixed(1)}×。价格变动 1 日元，现有总仓位的单边损益规模约 ¥${e.positions.reduce((s,p)=>s+p.units,0).toLocaleString()}；双向仓位须分别核算。`;tone='warn';}
 else if(e.positions.some(p=>p.sl==null&&p.trail==null)){title='这笔持仓还没有退出保护';text='持仓列表中可设置止损、止盈或移动止损。先确定可承受的损失；止损触发价不保证等于成交价。';tone='warn';}
 else if(e.positions.length){title='观察退出机制如何工作';text='浮动盈亏按可平仓报价计算。移动止损只向有利方向移动；部分平仓会减少剩余风险和保证金。';}
 else if(e.orders.length){title='挂单尚未成交';text=e.isRealtime()?'买单看 Ask、卖单看 Bid。本模式不占用保证金，触发时仍检查成交成本和剩余净资金；OCO 一侧成交会撤销另一侧。':'买单看 Ask、卖单看 Bid。触发时重新检查保证金；OCO 一侧成交会撤销另一侧。资金不足拒单不会算作成交。';}
 else if(completed){title='把结果和决策放在一起看';text=`你已完成 ${completed} 次平仓。查看交易记录的成交价与滑点；盈利不代表每次决策都合理，亏损也应结合事先风险计划复盘。`;}
 else if(!validSL){title='第一步：为交易写下退出计划';text='买入使用较高的 Ask，卖出使用较低的 Bid。尝试先填止损价，再看下方的计划风险；开仓后的小额浮亏通常来自点差。';}
 else{title='下单前检查三件事';text=`计划止损约 ¥${Math.round(planned).toLocaleString()}，占净值 ${a.equity>0?(planned/a.equity*100).toFixed(2):'—'}%。核对方向、数量和退出价；这是按当前输入估算，不含跳空与额外滑点。`;}
 if(planned!=null&&a.equity>0&&planned/a.equity>.02&&!e.positions.length){tone='warn';title='计划损失已超过净值的 2%';text=`当前输入估算止损约 ¥${Math.round(planned).toLocaleString()}。你可以调整数量或退出计划；2% 是教学提示阈值，不是市场规则。`;}
 const observed=e.history.slice(-30);const move=observed.length>1?observed.at(-1).mid-observed[0].mid:0;
 return{title,text,tone,stage,steps,planned,validSL,observation:`已发生的最近 ${Math.max(0,observed.length-1)} 分钟：汇价 ${move>=0?'+':''}${move.toFixed(3)} 日元 · 点差 ${(e.spread/.01).toFixed(2)} pips。没有方向预测。`};
}

