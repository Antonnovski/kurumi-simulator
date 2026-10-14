// Fictional scenarios. Positive/negative surprises are not price predictions.
export const EVENT_PROFILES={
 policy:{amplitude:[.0005,.0017],duration:[60,180],reversal:.22,decay:[40,95],second:[.12,.3]},
 data:{amplitude:[.0003,.0011],duration:[25,95],reversal:.4,decay:[18,55],second:[.15,.4]},
 risk:{amplitude:[.0005,.0015],duration:[45,140],reversal:.32,decay:[30,75],second:[.15,.35]},
 commodity:{amplitude:[.0003,.0010],duration:[40,120],reversal:.3,decay:[25,65],second:[.15,.35]},
 rumor:{amplitude:[.0002,.0007],duration:[15,60],reversal:.7,decay:[10,35],second:[.35,.6]},
 liquidity:{amplitude:[.0004,.0014],duration:[15,65],reversal:.55,decay:[12,35],second:[.2,.5]}
};
const usd={USDJPY:1,EURJPY:.2,GBPJPY:.25,AUDJPY:.15},eur={USDJPY:.15,EURJPY:1,GBPJPY:.3,AUDJPY:.15},gbp={USDJPY:.1,EURJPY:.3,GBPJPY:1,AUDJPY:.1},aud={USDJPY:.1,EURJPY:.15,GBPJPY:.1,AUDJPY:1},yen={USDJPY:1,EURJPY:1,GBPJPY:1,AUDJPY:1},risk={USDJPY:.55,EURJPY:.8,GBPJPY:.9,AUDJPY:1.15};
const E=(id,tag,profile,response,up,down,body,weight=1)=>({id,tag,profile,response,up,down,body,weight});
export const EVENT_CATALOG=[
 E('fed-rate','美联储','policy',usd,'美联储利率路径高于预期','美联储利率路径低于预期','市场重新定价美国利率路径。',1.4),
 E('fed-speech','美联储','rumor',usd,'美联储官员释放偏鹰派信号','美联储官员释放偏鸽派信号','讲话解读存在分歧，首轮反应可能回吐。'),
 E('boj-rate','日本央行','policy',yen,'日本央行政策较预期宽松','日本央行政策较预期紧缩','日元利率预期调整影响多个日元交叉盘。',1.4),
 E('boj-guidance','日本央行','rumor',yen,'日本央行淡化近期加息可能','日本央行强调政策正常化','市场等待政策细节，随后消息可能修正初始判断。'),
 E('intervention','汇市干预','liquidity',yen,'日本当局口头表态缓和干预担忧','日本当局突然买入日元','报价深度下降，日元相关订单集中调整。',.45),
 E('ecb-rate','欧洲央行','policy',eur,'欧洲央行政策较预期偏鹰','欧洲央行政策较预期偏鸽','欧元利差预期变化，欧元交叉盘反应较强。'),
 E('boe-rate','英国央行','policy',gbp,'英国央行政策较预期偏鹰','英国央行政策较预期偏鸽','英镑利差预期发生调整。'),
 E('rba-rate','澳洲央行','policy',aud,'澳洲央行政策较预期偏鹰','澳洲央行政策较预期偏鸽','澳元利率预期调整。'),
 E('us-jobs','就业数据','data',usd,'美国就业数据高于预期','美国就业数据低于预期','就业与薪资数据改变美元需求。',1.2),
 E('us-cpi','通胀数据','data',usd,'美国通胀数据高于预期','美国通胀数据低于预期','市场重新评估降息空间。',1.2),
 E('us-gdp','增长数据','data',usd,'美国经济增长高于预期','美国经济增长低于预期','经济增长预期出现修正。'),
 E('us-sales','消费数据','data',usd,'美国零售销售高于预期','美国零售销售低于预期','消费数据改变短期美元报价。'),
 E('jp-cpi','日本通胀','data',yen,'日本通胀低于预期','日本通胀高于预期','日元政策路径的市场预期发生变化。'),
 E('jp-wages','日本薪资','data',yen,'日本薪资增长低于预期','日本薪资增长高于预期','薪资与通胀循环受到关注。'),
 E('eu-pmi','欧元区数据','data',eur,'欧元区PMI高于预期','欧元区PMI低于预期','欧元区增长预期调整。'),
 E('eu-cpi','欧元区通胀','data',eur,'欧元区通胀高于预期','欧元区通胀低于预期','欧洲央行利率路径预期变化。'),
 E('uk-cpi','英国通胀','data',gbp,'英国通胀高于预期','英国通胀低于预期','英镑利率预期被重新定价。'),
 E('uk-jobs','英国就业','data',gbp,'英国就业与薪资强于预期','英国就业与薪资弱于预期','市场调整英国经济判断。'),
 E('au-jobs','澳洲就业','data',aud,'澳洲就业数据强于预期','澳洲就业数据弱于预期','澳元相关订单集中调整。'),
 E('china-growth','贸易伙伴','data',aud,'中国需求数据好于预期','中国需求数据弱于预期','澳洲出口需求预期变化。'),
 E('iron-ore','铁矿石','commodity',aud,'铁矿石需求与价格上升','铁矿石需求与价格下降','商品需求变化主要影响澳元。'),
 E('energy','能源市场','commodity',{USDJPY:.3,EURJPY:-.7,GBPJPY:-.4,AUDJPY:.35},'能源供应冲击推高价格','能源供应恢复压低价格','能源进口成本与商品货币反应可能方向相反。'),
 E('risk-sentiment','风险情绪','risk',risk,'全球风险偏好回升','全球避险情绪迅速升温','避险日元与风险货币出现联动。',1.3),
 E('geopolitics','地缘局势','risk',risk,'地区紧张局势缓和','地区紧张局势突然升级','风险头寸调整扩大短期波动。',.7),
 E('bank-stress','金融压力','risk',risk,'银行流动性担忧缓解','银行流动性担忧升温','跨市场去杠杆可能降低报价深度。',.65),
 E('trade-policy','贸易政策','rumor',risk,'贸易谈判出现积极进展','贸易摩擦突然升级','消息尚有不确定性，后续澄清可能逆转报价。'),
 E('carry-unwind','套利头寸','liquidity',yen,'日元融资套利头寸集中建立','日元融资套利头寸集中平仓','头寸拥挤使多个日元交叉盘同步调整。',.8),
 E('thin-book','流动性','liquidity',yen,'薄弱时段集中涌入外币买盘','薄弱时段集中涌入日元买盘','点差扩大，成交滑点可能上升。'),
 E('policy-leak','政策传闻','rumor',yen,'宽松政策传闻扩散','紧缩政策传闻扩散','未经证实的传闻可能被后续消息纠正。',.7),
 E('fixing-flow','结算资金流','liquidity',yen,'结算窗口外币需求集中增加','结算窗口日元需求集中增加','结算资金流可能短暂改变报价。',.8)
];
export function chooseEvent(random,pair='USDJPY'){const pool=EVENT_CATALOG.filter(e=>Math.abs(e.response[pair]??0)>.01),total=pool.reduce((s,e)=>s+e.weight,0);let r=random()*total;return pool.find(e=>(r-=e.weight)<0)??pool.at(-1);}
export class EventDirector{
 constructor(seed){this.rng=(seed^0x51ed270b)>>>0||1;this.cooldown=0;this.serial=0;this.lastId=null;}
 random(){let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return(this.rng+.5)/4294967296;}
 advance(time,instruments){this.cooldown=Math.max(0,this.cooldown-1);const stress=instruments.some(q=>q.market.state==='stress');if(this.cooldown||this.random()>(stress?.014:.0075))return null;let template=chooseEvent(()=>this.random());if(template.id===this.lastId)template=EVENT_CATALOG[(EVENT_CATALOG.indexOf(template)+1)%EVENT_CATALOG.length];this.lastId=template.id;this.serial++;const spec={template,sign:this.random()<.5?-1:1,draws:Array.from({length:6},()=>this.random()),sharedId:this.serial};for(const q of instruments)q.market.createEvent(time,spec);this.cooldown=18+Math.floor(this.random()*18);return template.id;}
 static restore(data,seed){return Object.assign(new EventDirector(seed),data??{});}
}
