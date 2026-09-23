import { AppError, ensure, uuid, newTrip, mutateTrip, LIMITS, receiptMeta, validateTrip, isChangeRetry, evenShares, normalizePayments } from './domain.mjs';
import { createBackup, inspectBackup, decode, sha256, checkFile } from './backup.mjs';
import { accessOf, memberOf, publicTrip, prepareActor, changeAccess, requestJoin, authorize } from './collaboration.mjs';

function json(value,status=200) {return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
async function body(request) {
  ensure(request.headers.get('content-type')?.startsWith('application/json'),'請傳送 JSON');
  const reader=request.body?.getReader();ensure(reader,'缺少資料');let length=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>LIMITS.bodyBytes){await reader.cancel();throw new AppError('資料過大，備份上限為 14 MB',413);}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AppError('JSON 資料無效');}
}
export async function handleApi(request,{repo,objects,subject,mode='sites',profile={}}) {
  try {
    ensure(subject,'請先登入',401);
    const url=new URL(request.url),parts=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean), method=request.method;
    if(method!=='GET') {const origin=request.headers.get('origin');ensure(!origin || origin===url.origin,'不允許跨網站操作',403);}
    const owner=await repo.account(subject);
    const present=trip=>publicTrip(trip,owner);
    if(parts[0]==='state' && method==='GET')return json({trips:(await repo.list(owner)).map(present),requests:await repo.requests(owner),mode});
    if(parts[0]==='join'&&parts.length===1&&method==='POST')return json(await requestJoin(repo,owner,profile,await body(request)));
    if(parts[0]==='trips' && parts.length===1 && method==='POST') {
      const input=await body(request),trip=newTrip(input);const existing=await repo.get(trip.id,owner);if(existing)return json({trip:present(existing)});
      const changed=await repo.insert(trip,owner);ensure(changed,'旅程已存在或已達 50 個旅程上限',409);return json({trip:present({...trip,revision:1,_owner:owner,_access:{}})},201);
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
      // No live account bindings, invitations or sessions are restored from the backup.
      return json({trip:present({...trip,revision:1,_owner:owner,_access:{}})},201);
    }
    if(parts[0]==='trips' && parts[1]) {
      const id=uuid(parts[1]),raw=await repo.get(id,owner);ensure(raw,'找不到旅程',404);
      const trip={...validateTrip(raw),revision:raw.revision,_owner:raw._owner,_access:raw._access};
      const me=memberOf(trip,owner);
      if(parts[2]==='backup' && parts.length===3 && method==='GET'){ensure(me.role==='admin','只有管理者可以匯出完整備份',403);return json(await createBackup(trip,objects));}
      if(parts[2]==='receipts' && parts.length===4 && method==='GET') {
        const receipt=trip.expenses.find(e=>e.receipt?.id===parts[3])?.receipt;ensure(receipt,'找不到收據',404);const bytes=await objects.get(`${trip.id}/${receipt.id}`);ensure(bytes,'找不到收據',404);
        return new Response(bytes,{headers:{'Content-Type':receipt.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
      }
      if(parts.length===3 && method==='POST') {
        const input=await body(request),action=parts[2];uuid(input.id);
        if(['create-invite','revoke-invite','approve-join','reject-join','change-member','remove-member','leave'].includes(action)) {
          ensure(mode!=='standalone','自架首版仍使用單一管理者登入；多人邀請請使用 Sites',400);
          ensure(input.revision===trip.revision,'帳本已有更新，請核對最新成員再重試',409);
          const result=await changeAccess(trip,owner,profile,action,input);
          ensure(await repo.update(result.trip,trip._owner,trip.revision,result.access),'帳本已有更新，請重試',409);
          if(action==='leave')return json({left:true});
          return json({trip:present({...result.trip,revision:trip.revision+1,_owner:trip._owner,_access:result.access}),...(result.token?{invitationToken:result.token}:{})});
        }
        const permission=authorize(trip,owner,action,input);
        if(action==='expense'&&trip.expenses.some(e=>e.id===input.id)) {
          const e=trip.expenses.find(e=>e.id===input.id),original=trip.history.find(h=>h.targetId===e.id)?.before??e;
          ensure((e.createdBy===permission.actorId||!e.createdBy&&permission.isOwner),'操作識別碼已使用',409);
          const shares=input.mode==='equal'?evenShares(input.amount,input.memberIds):input.shares;
          const payments=normalizePayments(input,new Set(trip.members.map(m=>m.id)));
          ensure(JSON.stringify([original.title,original.amount,original.payments,original.shares,original.date,original.category,original.splitMode])===JSON.stringify([input.title,input.amount,payments,shares,input.date,input.category,input.mode]),'同一支出識別碼不可送出不同內容',409);
          ensure(!!e.receipt===!!input.file&&(!e.receipt||(input.file.mime===e.receipt.mime&&await sha256(decode(input.file.data))===e.receipt.sha256)),'同一支出識別碼的收據不符',409);
          return json({trip:present(trip)});
        }
        if(action==='repayment'&&trip.repayments.some(r=>r.id===input.id)) {
          const r=trip.repayments.find(r=>r.id===input.id);ensure(r.createdBy===permission.actorId||!r.createdBy&&permission.isOwner,'操作識別碼已使用',409);
          ensure(JSON.stringify([r.fromId,r.toId,r.amount,r.date])===JSON.stringify([input.fromId,input.toId,input.amount,input.date]),'同一還款識別碼不可送出不同內容',409);return json({trip:present(trip)});
        }
        if(input.operationId){const h=trip.history.find(h=>h.id===input.operationId);if(h){ensure(h.actorId===permission.actorId,'操作識別碼已使用',409);if(isChangeRetry(trip,action,input))return json({trip:present(trip)});}
          for(const r of trip.repayments){const e=r.events.find(e=>e.id===input.operationId);if(e){ensure(r.id===input.id&&`${e.action}-repayment`===action&&e.actorId===permission.actorId,'操作識別碼已使用',409);return json({trip:present(trip)});}}}
        ensure(input.revision===trip.revision,'帳目已更新，請重新整理後再送出',409);
        if(action==='edit-expense'&&trip.expenses.find(e=>e.id===input.id)?.payments.length>1)ensure(Array.isArray(input.payments),'這筆支出有多位付款人，請重新整理頁面後再更正',409);
        const prepared=prepareActor(trip,owner,profile);
        let meta,key;let cleanupSafe=true;
        try {
          if(action==='expense' && input.file) {
            const bytes=decode(input.file.data);meta=receiptMeta({id:crypto.randomUUID(),mime:input.file.mime,size:bytes.length,sha256:await sha256(bytes)});await checkFile(meta,bytes);key=`${trip.id}/${meta.id}`;
          }
          const updated=mutateTrip(prepared.trip,action,{...input,proxy:permission.proxy},meta,prepared.me.actorId);
          if(updated===prepared.trip)return json({trip:present(trip)});
          // Reserve space for permission revocations even when normal accounting reaches capacity.
          ensure(new TextEncoder().encode(JSON.stringify(updated)).length<LIMITS.documentBytes-32768,'帳本接近容量上限，請先備份並建立新旅程',413);
          if(meta)await objects.put(key,decode(input.file.data),meta.mime);
          cleanupSafe=false;
          const changed=await repo.update(updated,trip._owner,trip.revision,prepared.access);if(!changed)cleanupSafe=true;
          ensure(changed,'帳目已更新，請重新整理後再送出',409);
          return json({trip:present({...updated,revision:trip.revision+1,_owner:trip._owner,_access:prepared.access})});
        }catch(error){if(key&&cleanupSafe)await objects.delete(key).catch(()=>{});throw error;}
      }
    }
    throw new AppError('找不到此功能',404);
  }catch(error){if(error instanceof AppError)return json({error:error.message,mode},error.status);console.error('TripLedger request failed:',error instanceof Error?error.message:'unknown');return json({error:'暫時無法儲存或讀取，請稍後再試'},500);}
}
