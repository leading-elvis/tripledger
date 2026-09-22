import { AppError, ensure, uuid, newTrip, mutateTrip, LIMITS, receiptMeta } from './domain.mjs';
import { createBackup, inspectBackup, decode, sha256, checkFile } from './backup.mjs';

function json(value,status=200) {return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
async function body(request) {
  ensure(request.headers.get('content-type')?.startsWith('application/json'),'請傳送 JSON');
  const reader=request.body?.getReader();ensure(reader,'缺少資料');let length=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>LIMITS.bodyBytes){await reader.cancel();throw new AppError('資料過大，備份上限為 14 MB',413);}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AppError('JSON 資料無效');}
}
export async function handleApi(request,{repo,objects,subject,mode='sites'}) {
  try {
    ensure(subject,'請先登入',401);
    const url=new URL(request.url),parts=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean), method=request.method;
    if(method!=='GET') {const origin=request.headers.get('origin');ensure(!origin || origin===url.origin,'不允許跨網站操作',403);}
    const owner=await repo.account(subject);
    if(parts[0]==='state' && method==='GET')return json({trips:await repo.list(owner),mode});
    if(parts[0]==='trips' && parts.length===1 && method==='POST') {
      const input=await body(request),trip=newTrip(input);const existing=await repo.get(trip.id,owner);if(existing)return json({trip:existing});
      const changed=await repo.insert(trip,owner);ensure(changed,'旅程已存在或已達 50 個旅程上限',409);return json({trip:{...trip,revision:1}},201);
    }
    if(parts[0]==='import' && method==='POST') {
      const {trip,files}=await inspectBackup(await body(request));
      ensure(!(await repo.get(trip.id,owner)),'同一旅程已存在；匯入不會覆蓋目前資料',409);
      // Remap object IDs before writing: an untrusted backup cannot overwrite an existing object's key.
      const uploaded=[];let cleanupSafe=true;
      try {
        for(const {meta,bytes} of files) {const id=crypto.randomUUID();const e=trip.expenses.find(e=>e.receipt?.id===meta.id);e.receipt.id=id;const key=`${trip.id}/${id}`;await objects.put(key,bytes,meta.mime);uploaded.push(key);}
        cleanupSafe=false; // A thrown DB response may follow a successful commit.
        const inserted=await repo.insert(trip,owner);if(!inserted)cleanupSafe=true;
        ensure(inserted,'旅程已存在或已達上限；未覆蓋任何資料',409);
      }catch(error){if(cleanupSafe)await Promise.allSettled(uploaded.map(key=>objects.delete(key)));throw error;}
      return json({trip:{...trip,revision:1}},201);
    }
    if(parts[0]==='trips' && parts[1]) {
      const id=uuid(parts[1]),trip=await repo.get(id,owner);ensure(trip,'找不到旅程',404);
      if(parts[2]==='backup' && parts.length===3 && method==='GET')return json(await createBackup(trip,objects));
      if(parts[2]==='receipts' && parts.length===4 && method==='GET') {
        const receipt=trip.expenses.find(e=>e.receipt?.id===parts[3])?.receipt;ensure(receipt,'找不到收據',404);const bytes=await objects.get(`${trip.id}/${receipt.id}`);ensure(bytes,'找不到收據',404);
        return new Response(bytes,{headers:{'Content-Type':receipt.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
      }
      if(parts.length===3 && method==='POST') {
        const input=await body(request),action=parts[2];uuid(input.id);
        if(action==='expense' && trip.expenses.some(e=>e.id===input.id) || action==='repayment' && trip.repayments.some(r=>r.id===input.id))return json({trip});
        ensure(input.revision===trip.revision,'帳目已更新，請重新整理後再送出',409);
        let meta,key;let cleanupSafe=true;
        try {
          if(action==='expense' && input.file) {
            const bytes=decode(input.file.data);meta=receiptMeta({id:crypto.randomUUID(),mime:input.file.mime,size:bytes.length,sha256:await sha256(bytes)});await checkFile(meta,bytes);key=`${trip.id}/${meta.id}`;
          }
          const updated=mutateTrip(trip,action,input,meta);
          if(meta)await objects.put(key,decode(input.file.data),meta.mime);
          cleanupSafe=false;
          const changed=await repo.update(updated,owner,trip.revision);if(!changed)cleanupSafe=true;
          ensure(changed,'帳目已更新，請重新整理後再送出',409);
          return json({trip:{...updated,revision:trip.revision+1}});
        }catch(error){if(key&&cleanupSafe)await objects.delete(key).catch(()=>{});throw error;}
      }
    }
    throw new AppError('找不到此功能',404);
  }catch(error){if(error instanceof AppError)return json({error:error.message,mode},error.status);console.error('TripLedger request failed:',error instanceof Error?error.message:'unknown');return json({error:'暫時無法儲存或讀取，請稍後再試'},500);}
}
