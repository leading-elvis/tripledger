import { LIMITS } from './domain.mjs';

export async function prepareReceipt(file:File):Promise<File> {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('請選擇 JPG、PNG 或 WebP；HEIC 請先轉成 JPG');
  if(file.size<=LIMITS.receiptBytes)return file;
  if(file.size>20*1024*1024)throw new Error('原始圖片上限 20 MB，請先縮小圖片');
  const image=await createImageBitmap(file);
  try{
    const scale=Math.min(1,2000/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    const context=canvas.getContext('2d');if(!context)throw new Error('無法處理圖片，請改選較小的 JPG');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.85,.7,.5]){
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('無法縮小收據圖片')),'image/jpeg',quality));
      if(blob.size<=LIMITS.receiptBytes)return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
    }
    throw new Error('縮小後仍超過 1 MB，請裁切收據後再選取');
  }finally{image.close();}
}
export async function imagePayload(file:File|null) {
  if(!file)return undefined;
  if(file.size>LIMITS.receiptBytes)throw new Error('每張收據上限為 1 MB');
  const bytes=new Uint8Array(await file.arrayBuffer());let text='';
  for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {mime:file.type,data:btoa(text)};
}
