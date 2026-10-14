export function tickerItems(news){return news.slice(0,8).map(n=>({id:n.id,time:n.publishedAt,tag:n.tag,title:n.title}));}
export function tickerKey(news){return news.slice(0,8).map(n=>n.id+':'+n.title).join('|');}
export function tickerDuration(items){return Math.max(30,Math.min(160,items.reduce((sum,n)=>sum+n.title.length+n.tag.length+20,0)*.18));}

