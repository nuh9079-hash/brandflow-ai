import { auth } from "@clerk/nextjs/server";
import { createMedia,deleteMedia,updateMediaStorage } from "@/lib/media/server";
import { createSignedUpload,createUploadPath } from "@/lib/media/storage";
import { validateUploadRequest } from "@/lib/media/validation";

function mediaError(status:number,error:string){return Response.json({error},{status})}

export async function POST(req:Request){
 const {userId}=await auth();
 if(!userId)return mediaError(401,"Oturumun sona ermiş olabilir. Sayfayı yenileyip tekrar giriş yap.");

 let body:unknown;
 try{body=await req.json()}catch{return mediaError(400,"Dosya bilgileri okunamadı. Dosyayı yeniden seçip tekrar dene.")}
 const validation=validateUploadRequest(body);
 if(!validation.ok)return mediaError(400,validation.error||"Bu dosya yüklenemiyor. Dosya türünü ve boyutunu kontrol et.");

 const created=await createMedia(userId,validation.data.media);
 if(!created.ok)return mediaError(created.status,created.error||"Medya kaydı oluşturulamadı.");

 const storagePath=createUploadPath(userId,created.data.id,validation.data.filename);
 const stored=await updateMediaStorage(userId,created.data.id,storagePath);
 if(!stored.ok){await deleteMedia(userId,created.data.id);return mediaError(stored.status,stored.error||"Dosya yolu kaydedilemedi. Tekrar deneyebilirsin.")}

 const upload=await createSignedUpload(userId,storagePath);
 if(!upload.ok){await deleteMedia(userId,created.data.id);const message=upload.status===503?"Medya depolama bağlantısı hazır değil. Supabase Storage ayarlarını kontrol etmek gerekiyor.":upload.error||"Yükleme bağlantısı oluşturulamadı.";return mediaError(upload.status,message)}

 return Response.json({data:{media:stored.data,storagePath,upload:upload.data}});
}
