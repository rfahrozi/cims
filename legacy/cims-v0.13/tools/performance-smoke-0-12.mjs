import { performance } from 'node:perf_hooks';
import { startTestApp, login, authHeaders } from '../tests/helpers/test-app.mjs';

const total=Number(process.env.PERF_REQUESTS??400);const concurrency=Number(process.env.PERF_CONCURRENCY??25);
const app=await startTestApp({loginRateLimitPerMinute:1000,publicRateLimitPerMinute:1000});
try{
  const token=await login(app.baseUrl,'admin@cims.local','Admin123!');
  const durations=[];let success=0;let failed=0;let cursor=0;
  async function worker(){while(true){const index=cursor++;if(index>=total)return;const started=performance.now();try{const path=index%3===0?'/health':index%3===1?'/api/v1/compliance-dashboard':'/api/v1/audit-events/verify-chain';const response=await fetch(app.baseUrl+path,{headers:path==='/health'?{}:authHeaders(token)});await response.arrayBuffer();if(response.ok)success++;else failed++;}catch{failed++;}finally{durations.push(performance.now()-started);}}}
  await Promise.all(Array.from({length:concurrency},()=>worker()));durations.sort((a,b)=>a-b);
  const pct=(p)=>durations[Math.min(durations.length-1,Math.floor((durations.length-1)*p))];
  const result={version:'0.12.0',total_requests:total,concurrency,success,failed,duration_ms:{min:Number(durations[0].toFixed(2)),p50:Number(pct(.5).toFixed(2)),p95:Number(pct(.95).toFixed(2)),p99:Number(pct(.99).toFixed(2)),max:Number(durations.at(-1).toFixed(2)),average:Number((durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(2))},target:{success_rate_min:0.99,p95_ms_max:250},passed:success/total>=.99&&pct(.95)<=250,executed_at:new Date().toISOString()};
  console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
}finally{await app.stop();}
