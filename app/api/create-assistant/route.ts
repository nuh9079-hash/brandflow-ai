import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Body = {
  mode?: "image" | "video" | "text" | "edit";
  purpose?: string;
  brief?: string;
  platform?: string;
  improveStyle?: string;
  fileName?: string;
  fileType?: "image" | "video" | null;
};

type AiResult = {
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  bestTime: string;
  timingReason: string;
  visualDirection: string;
  videoScript: string[];
  contentScore: number;
  scoreReason: string;
};

function fallback(body: Body): AiResult {
  const topic = body.brief?.trim() || "Bu içerik";
  const isVideo = body.mode === "video" || body.fileType === "video";
  return {
    caption: `${topic}. Mesajı kısa, net ve hedef odaklı tut.`,
    hook: isVideo ? "İlk 3 saniyede sonucu göster ve merak uyandır." : "İlk cümlede en güçlü faydayı söyle.",
    cta: body.purpose === "Ürün satmak" ? "Detay için profildeki bağlantıya göz at." : "Görüşünü yorumlarda paylaş.",
    hashtags: ["#marka", "#içerik", "#sosyalmedya", "#keşfet"],
    bestTime: body.platform === "LinkedIn" ? "Salı 09:00–10:00" : "Perşembe 19:30–21:00",
    timingReason: "Hesaba özel performans verisi yoksa bu saat genel kullanım alışkanlıklarına göre başlangıç önerisidir.",
    visualDirection: isVideo ? "Dikey 9:16, güçlü ilk kare, temiz altyazı ve hızlı tempo kullan." : "Tek odaklı kompozisyon, net başlık ve yüksek kontrast kullan.",
    videoScript: isVideo ? ["0–3 sn: sonucu göster", "3–10 sn: sorunu anlat", "10–20 sn: çözümü göster", "20–30 sn: CTA"] : [],
    contentScore: 72,
    scoreReason: "Brief kullanılabilir durumda; daha güçlü özgün detaylar skoru yükseltir.",
  };
}

function parseJson(text: string): AiResult | null {
  try {
    const clean = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(clean) as Partial<AiResult>;
    if (!parsed.caption || !parsed.hook || !parsed.cta) return null;
    return {
      caption: String(parsed.caption),
      hook: String(parsed.hook),
      cta: String(parsed.cta),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String).slice(0, 20) : [],
      bestTime: String(parsed.bestTime || "Akşam 19:00–21:00"),
      timingReason: String(parsed.timingReason || "Genel etkileşim alışkanlıklarına göre öneri."),
      visualDirection: String(parsed.visualDirection || "Mesajı tek odakta ve net biçimde sun."),
      videoScript: Array.isArray(parsed.videoScript) ? parsed.videoScript.map(String).slice(0, 8) : [],
      contentScore: Math.max(0, Math.min(100, Number(parsed.contentScore) || 70)),
      scoreReason: String(parsed.scoreReason || "İçerik kullanılabilir durumda."),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return Response.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });

  try {
    const body = (await req.json()) as Body;
    if (!body.brief?.trim()) return Response.json({ error: "Ne istediğini kısaca anlatmalısın." }, { status: 400 });

    if (!process.env.GROQ_API_KEY) return Response.json({ data: fallback(body), source: "fallback" });

    const prompt = `BrandFlow için sosyal medya içerik stratejisti gibi davran. Kullanıcı Türkçe konuşuyor.

İçerik türü: ${body.mode || "image"}
Amaç: ${body.purpose || "Belirtilmedi"}
Platform: ${body.platform || "Instagram"}
İyileştirme stili: ${body.improveStyle || "professional"}
Brief: ${body.brief}
Yüklenen dosya: ${body.fileName || "Yok"}
Dosya türü: ${body.fileType || "Yok"}

Brief'i aynen caption olarak kopyalama. Kullanıcının niyetini anlayıp yayınlanabilir yeni metin üret.
Platforma uygun caption, hook, CTA, hashtag, yayın zamanı, görsel yönlendirme ve video ise kısa senaryo oluştur.
Yayın zamanı hesabın gerçek analitiğine dayanmıyorsa timingReason içinde bunun genel öneri olduğunu açıkça söyle.
contentScore 0-100 arası sayı olsun.

SADECE geçerli JSON döndür. Şema:
{"caption":"","hook":"","cta":"","hashtags":[""],"bestTime":"","timingReason":"","visualDirection":"","videoScript":[""],"contentScore":80,"scoreReason":""}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Sen profesyonel bir Türkçe sosyal medya stratejistisin. Sadece istenen JSON şemasını döndür." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const data = parseJson(raw) || fallback(body);
    return Response.json({ data, source: parseJson(raw) ? "ai" : "fallback" });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "create-assistant error");
    return Response.json({ error: "AI içerik önerisi oluşturulamadı." }, { status: 500 });
  }
}
