import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const model = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";

type Body = { mode?: "image" | "video" | "text" | "edit"; purpose?: string; brief?: string; platform?: string; improveStyle?: string; fileName?: string; fileType?: "image" | "video" | null };
type AiResult = { caption:string; hook:string; cta:string; hashtags:string[]; bestTime:string; timingReason:string; visualDirection:string; videoScript:string[]; contentScore:number; scoreReason:string };

function fallback(body:Body):AiResult { const topic=body.brief?.trim()||"Bu içerik"; const isVideo=body.mode==="video"||body.fileType==="video"; return { caption:`${topic}. Mesajı kısa, net ve hedef odaklı tut.`, hook:isVideo?"İlk 3 saniyede sonucu göster ve merak uyandır.":"İlk cümlede en güçlü faydayı söyle.", cta:body.purpose==="Ürün satmak"?"Detay için profildeki bağlantıya göz at.":"Görüşünü yorumlarda paylaş.", hashtags:["#marka","#içerik","#sosyalmedya","#keşfet"], bestTime:body.platform==="LinkedIn"?"Salı 09:00–10:00":"Perşembe 19:30–21:00", timingReason:"Hesaba özel performans verisi yoksa bu saat genel kullanım alışkanlıklarına göre başlangıç önerisidir.", visualDirection:isVideo?"Dikey 9:16, güçlü ilk kare, temiz altyazı ve hızlı tempo kullan.":"Tek odaklı kompozisyon, net başlık ve yüksek kontrast kullan.", videoScript:isVideo?["0–3 sn: sonucu göster","3–10 sn: sorunu anlat","10–20 sn: çözümü göster","20–30 sn: CTA"]:[], contentScore:72, scoreReason:"Brief kullanılabilir durumda; daha güçlü özgün detaylar skoru yükseltir." }; }
function parseJson(text:string):AiResult|null { try { const clean=text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim(); const p=JSON.parse(clean) as Partial<AiResult>; if(!p.caption||!p.hook||!p.cta)return null; return {caption:String(p.caption),hook:String(p.hook),cta:String(p.cta),hashtags:Array.isArray(p.hashtags)?p.hashtags.map(String).slice(0,20):[],bestTime:String(p.bestTime||"Akşam 19:00–21:00"),timingReason:String(p.timingReason||"Genel etkileşim alışkanlıklarına göre öneri."),visualDirection:String(p.visualDirection||"Mesajı tek odakta ve net biçimde sun."),videoScript:Array.isArray(p.videoScript)?p.videoScript.map(String).slice(0,8):[],contentScore:Math.max(0,Math.min(100,Number(p.contentScore)||70)),scoreReason:String(p.scoreReason||"İçerik kullanılabilir durumda.")}; } catch{return null;} }

export async function POST(req:Request){
 const {isAuthenticated}=await auth(); if(!isAuthenticated)return Response.json({error:"Giriş yapmanız gerekiyor."},{status:401});
 try{
  const body=(await req.json()) as Body; if(!body.brief?.trim())return Response.json({error:"Ne istediğini kısaca anlatmalısın."},{status:400});
  if(!process.env.GROQ_API_KEY)return Response.json({data:fallback(body),source:"fallback"});
  const prompt=`BrandFlow için sosyal medya içerik stratejisti gibi davran. Kullanıcı Türkçe konuşuyor.\nİçerik türü: ${body.mode||"image"}\nAmaç: ${body.purpose||"Belirtilmedi"}\nPlatform: ${body.platform||"Instagram"}\nİyileştirme stili: ${body.improveStyle||"professional"}\nBrief: ${body.brief}\nYüklenen dosya: ${body.fileName||"Yok"}\nDosya türü: ${body.fileType||"Yok"}\nBrief'i aynen caption olarak kopyalama. Yayınlanabilir yeni metin üret. Platforma uygun caption, hook, CTA, hashtag, yayın zamanı, görsel yönlendirme ve video ise kısa senaryo oluştur. contentScore 0-100 arası sayı olsun. SADECE JSON döndür: {"caption":"","hook":"","cta":"","hashtags":[""],"bestTime":"","timingReason":"","visualDirection":"","videoScript":[""],"contentScore":80,"scoreReason":""}`;
  try{
   const completion=await groq.chat.completions.create({model,messages:[{role:"system",content:"Sen profesyonel bir Türkçe sosyal medya stratejistisin. Sadece geçerli JSON döndür."},{role:"user",content:prompt}],temperature:0.6,response_format:{type:"json_object"}});
   const raw=completion.choices[0]?.message?.content||""; const parsed=parseJson(raw); return Response.json({data:parsed||fallback(body),source:parsed?"ai":"fallback"});
  }catch(aiError){ console.error("Groq create-assistant failed; fallback used",aiError instanceof Error?aiError.message:aiError); return Response.json({data:fallback(body),source:"fallback"}); }
 }catch(error){ console.error(error instanceof Error?error.message:"create-assistant error"); return Response.json({error:"AI içerik önerisi oluşturulamadı."},{status:500}); }
}
