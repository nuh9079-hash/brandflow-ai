import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const categories = ["Satış","Hizmet","Reklam","Abonelik","Ekip","Araçlar","İş Birliği","Diğer"] as const;

function cleanText(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):""}
function cleanAmount(value:unknown){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:null}

export async function GET(){
 const {userId}=await auth();if(!userId)return Response.json({error:"Giriş gerekli."},{status:401});
 const supabase=getSupabaseServerClient();if(!supabase)return Response.json({error:"Veritabanı yapılandırılmadı."},{status:503});
 const {data,error}=await supabase.from("cashflow_entries").select("id,entry_type,category,title,amount,entry_date,note,created_at").eq("clerk_user_id",userId).order("entry_date",{ascending:false}).order("created_at",{ascending:false}).limit(300);
 if(error)return Response.json({error:"Hesap akışı yüklenemedi."},{status:500});return Response.json({data:data||[]});
}

export async function POST(request:Request){
 const {userId}=await auth();if(!userId)return Response.json({error:"Giriş gerekli."},{status:401});
 const supabase=getSupabaseServerClient();if(!supabase)return Response.json({error:"Veritabanı yapılandırılmadı."},{status:503});
 const raw=await request.json().catch(()=>({}));const type=raw?.entryType==="income"||raw?.entryType==="expense"?raw.entryType:null;const title=cleanText(raw?.title,160);const amount=cleanAmount(raw?.amount);const category=categories.includes(raw?.category)?raw.category:"Diğer";const note=cleanText(raw?.note,800);const date=/^\d{4}-\d{2}-\d{2}$/.test(String(raw?.entryDate||""))?raw.entryDate:new Date().toISOString().slice(0,10);
 if(!type||!title||amount===null)return Response.json({error:"Tür, açıklama ve geçerli tutar gerekli."},{status:400});
 const {data,error}=await supabase.from("cashflow_entries").insert({clerk_user_id:userId,entry_type:type,category,title,amount,entry_date:date,note}).select("id,entry_type,category,title,amount,entry_date,note,created_at").single();
 if(error)return Response.json({error:"Kayıt eklenemedi."},{status:500});return Response.json({data},{status:201});
}

export async function DELETE(request:Request){
 const {userId}=await auth();if(!userId)return Response.json({error:"Giriş gerekli."},{status:401});const supabase=getSupabaseServerClient();if(!supabase)return Response.json({error:"Veritabanı yapılandırılmadı."},{status:503});const id=new URL(request.url).searchParams.get("id");if(!id)return Response.json({error:"Kayıt kimliği gerekli."},{status:400});const {error}=await supabase.from("cashflow_entries").delete().eq("clerk_user_id",userId).eq("id",id);if(error)return Response.json({error:"Kayıt silinemedi."},{status:500});return Response.json({data:{deleted:true}});
}
