// All instruments quote in JPY: quantity is units of their base currency.
export const INSTRUMENTS={
 USDJPY:{label:'USD / JPY',base:'USD',name:'美元 / 日元',start:150,scale:1,spread:1,swapLong:-18,swapShort:12},
 EURJPY:{label:'EUR / JPY',base:'EUR',name:'欧元 / 日元',start:163,scale:1.12,spread:1.4,swapLong:-15,swapShort:9},
 GBPJPY:{label:'GBP / JPY',base:'GBP',name:'英镑 / 日元',start:195,scale:1.45,spread:1.9,swapLong:-22,swapShort:14},
 AUDJPY:{label:'AUD / JPY',base:'AUD',name:'澳元 / 日元',start:98,scale:.85,spread:1.3,swapLong:-10,swapShort:6}
};
export const QUOTE_KEYS=['mid','spread','bid','ask','vol','depth','market','history'];

