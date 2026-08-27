type Bucket={count:number;reset:number};
const buckets=new Map<string,Bucket>();
export function rateLimit(key:string,limit=12,windowMs=60_000){const now=Date.now();const b=buckets.get(key);if(!b||b.reset<now){buckets.set(key,{count:1,reset:now+windowMs});return true}if(b.count>=limit)return false;b.count++;return true}
// MVP note: in-memory limiting is per-instance. Replace with Upstash/Redis before high-scale production.
