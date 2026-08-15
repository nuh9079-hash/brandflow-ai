import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(){
 const {userId}=await auth();if(!userId)return Response.json({error:"Giriş gerekli."},{status:401});
 const supabase=getSupabaseServerClient();if(!supabase)return Response.json({error:"Veritabanı yapılandırılmadı."},{status:503});
 const [media,scheduled,reports,cash]=await Promise.all([
  supabase.from("media_assets").select("id",{count:"exact",head:true}).eq("clerk_user_id",userId),
  supabase.from("scheduled_posts").select("id",{count:"exact",head:true}).eq("clerk_user_id",userId).eq("status","scheduled"),
  supabase.from("marketing_advisor_reports").select("id,platform,analysis,created_at").eq("clerk_user_id",userId).order("created_at",{ascending:false}).limit(1),
  supabase.from("cashflow_entries").select("entry_type,amount").eq("clerk_user_id",userId).limit(300),
 ]);
 const rows=cash.error?[]:(cash.data||[]);let income=0,expense=0;for(const row of rows){const amount=Number(row.amount)||0;if(row.entry_type==="income")income+=amount;else if(row.entry_type==="expense")expense+=amount}
 const latest=reports.error?null:reports.data?.[0]||null;
 return Response.json({data:{mediaCount:media.error?null:(media.count||0),scheduledCount:scheduled.error?null:(scheduled.count||0),latestAdvisor:latest,cashflow:cash.error?null:{income,expense,net:income-expense}}});
}
