import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const model = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";

type Body = { mode?: "image" | "video" | "text" | "edit"; purpose?: string; brief?: string; platform?: string; improveStyle?: string; fileName?: string; fileType?: "image" | "video" | null };
type AiResult = { caption:string; hook:string; cta:string; hashtags:string[]; bestTime:string; timingReason:string; visualDirection:string; videoScript:string[]; contentScore:number; scoreReason:string };

function parseJson(text:string):AiResult|null { try { const clean=text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim(); const p=JSON.parse(clean) as Partial<AiResult>; if(!p || [p.caption,p.hook,p.cta].some(value => typeof value !== "string" || !value.trim()))return null; return {caption:String(p.caption),hook:String(p.hook),cta:String(p.cta),hashtags:Array.isArray(p.hashtags)?p.hashtags.map(String).slice(0,20):[],bestTime:String(p.bestTime||"Akşam 19:00–21:00"),timingReason:String(p.timingReason||"Genel etkileşim alışkanlıklarına göre öneri."),visualDirection:String(p.visualDirection||"Mesajı tek odakta ve net biçimde sun."),videoScript:Array.isArray(p.videoScript)?p.videoScript.map(String).slice(0,8):[],contentScore:Math.max(0,Math.min(100,Number.isFinite(Number(p.contentScore)) ? Number(p.contentScore) : 70)),scoreReason:String(p.scoreReason||"İçerik kullanılabilir durumda.")}; } catch{return null;} }

export async function POST(req:Request){
 const {isAuthenticated}=await auth(); if(!isAuthenticated)return Response.json({error:"Giriş yapmanız gerekiyor."},{status:401});
 try{
  const body=(await req.json().catch(() => null)) as Body | null; if(!body || typeof body !== "object" || Array.isArray(body) || typeof body.brief !== "string" || !body.brief.trim())return Response.json({error:"Ne istediğini kısaca anlatmalısın."},{status:400});
  if(body.brief.length > 12000)return Response.json({error:"Açıklama en fazla 12000 karakter olabilir."},{status:400});
  if(!process.env.GROQ_API_KEY?.trim())return Response.json({error:"AI servisi henüz yapılandırılmadı. Lütfen daha sonra tekrar dene.",code:"AI_NOT_CONFIGURED"},{status:503});
  const prompt=`BrandFlow için sosyal medya içerik stratejisti gibi davran. Kullanıcı Türkçe konuşuyor.\nİçerik türü: ${body.mode||"image"}\nAmaç: ${body.purpose||"Belirtilmedi"}\nPlatform: ${body.platform||"Instagram"}\nİyileştirme stili: ${body.improveStyle||"professional"}\nBrief: ${body.brief}\nYüklenen dosya: ${body.fileName||"Yok"}\nDosya türü: ${body.fileType||"Yok"}\nBrief'i aynen caption olarak kopyalama. Yayınlanabilir yeni metin üret. Platforma uygun caption, hook, CTA, hashtag, yayın zamanı, görsel yönlendirme ve video ise kısa senaryo oluştur. contentScore 0-100 arası sayı olsun. SADECE JSON döndür: {"caption":"","hook":"","cta":"","hashtags":[""],"bestTime":"","timingReason":"","visualDirection":"","videoScript":[""],"contentScore":80,"scoreReason":""}`;
  try{
   const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 25000, maxRetries: 0 });
   const completion=await groq.chat.completions.create({model,messages:[{role:"system",content:"Sen profesyonel bir Türkçe sosyal medya stratejistisin. Sadece geçerli JSON döndür."},{role:"user",content:prompt}],temperature:0.6,response_format:{type:"json_object"}});
   const raw=completion.choices[0]?.message?.content||""; const parsed=parseJson(raw); if(!parsed)return Response.json({error:"AI geçerli bir içerik döndürmedi. Lütfen tekrar dene.",code:"AI_INVALID_RESPONSE"},{status:502});
   return Response.json({data:parsed,source:"ai"});
  }catch(aiError){ const status = (aiError as { status?: number })?.status;
   console.error("Groq create-assistant request failed", { status });
   return Response.json({error:status===429?"AI servisi şu an yoğun. Biraz bekleyip tekrar dene.":"AI servisine şu an ulaşılamıyor. Lütfen tekrar dene.",code:status===429?"AI_RATE_LIMITED":"AI_UNAVAILABLE"},{status:status===429?429:502}); }
 }catch(error){ console.error(error instanceof Error?error.message:"create-assistant error"); return Response.json({error:"AI içerik önerisi oluşturulamadı."},{status:500}); }
}
