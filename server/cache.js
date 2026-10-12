// Bounded, isolate-local cache. Never stores user sessions or failed requests.
export function createCache(limit=200, now=Date.now) {
  const values=new Map(), pending=new Map();
  return {async get(key,ttl,read,fresh=false) {
    const hit=values.get(key);
    if(!fresh&&hit?.until>now())return hit.value;
    if(pending.has(key))return pending.get(key);
    const task=Promise.resolve().then(read).then(value=>{
      if(values.size>=limit)values.delete(values.keys().next().value);
      values.set(key,{value,until:now()+ttl});return value;
    }).finally(()=>pending.delete(key));
    pending.set(key,task);return task;
  }};
}
