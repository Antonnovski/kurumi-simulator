import {LOAN_PLANS,loanBook,createLoan} from './loans.js?v=12';
export function renderLoans(e,$,yen,clock){
 yen=x=>'¥'+x.toLocaleString('ja-JP',{minimumFractionDigits:2,maximumFractionDigits:2});
 const l=e.loans.active,ended=!!e.settlement;if(l){if(![...$('loanPlan').options].some(o=>o.value===l.key)){const option=document.createElement('option');option.value=l.key;option.textContent=`旧合同 · 每${l.period}分钟${l.rate*100}%`; $('loanPlan').append(option);}$('loanPlan').value=l.key;$('loanAmount').value=l.original;}else if(!$('loanPlan').value||!$('loanPlan').value.startsWith('rescue'))$('loanPlan').value='rescue';for(const x of $('loanForm').elements)x.disabled=ended||!!l;
 $('borrowMoney').disabled=ended||!!l||!e.canBorrow();$('loanGate').textContent=e.canBorrow()?'救急窗口已开放 · 可借50万–200万日元':`救急窗口锁定 · 有持仓且维持率≤${e.rules().liquidationRatio*150}%时开放；穿仓后无法借款`;
 for(const id of ['repayPart','repayAll','repayAmount'])$(id).disabled=ended||!l;
 const p=LOAN_PLANS[$('loanPlan').value],amount=Number($('loanAmount').value);if(Number.isFinite(amount)&&amount>=500000&&amount<=2000000&&amount%10000===0){const sample=createLoan(loanBook(),amount,$('loanPlan').value,e.time);$('loanEstimate').textContent=`借入 ${yen(amount)} · 每期约 ${yen(sample.installment)} · 按计划总还约 ${yen(sample.installment*p.terms)}（提前还款会变化）`;}else $('loanEstimate').textContent='输入50万–200万日元，金额为1万的整数倍';
 $('loanTitle').textContent=l?`当前欠款 ${yen(e.debt())}`:'没有未还借款';
 $('loanInfo').textContent=l?`剩余 ${l.terms-l.paidTerms} 期 · 每期应还 ${yen(Math.min(l.installment,e.debt()))} · 下次截止 ${clock(l.nextDue)} JST · 剩余 ${Math.max(0,Math.ceil((l.nextDue-e.time)/60000))} 个模拟分钟`:`累计借入 ${yen(e.loans.borrowed)} · 已还 ${yen(e.loans.repaid)} · 已付利息 ${yen(e.loans.interestPaid)}`;
 $('loanFailure').hidden=!e.settlement?.loanDefault;
}

