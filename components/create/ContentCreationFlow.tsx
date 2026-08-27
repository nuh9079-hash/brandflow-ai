"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MediaMode = "image" | "video" | "text" | "edit";
type Platform = "Instagram" | "Reels" | "TikTok" | "YouTube Shorts" | "Facebook" | "LinkedIn";
type ImproveStyle = "professional" | "sales" | "natural" | "short" | "viral";
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
type AiPack = { data: AiResult; source: "ai" | "fallback" };

type Draft = {
  mode?: MediaMode;
  purpose?: string;
  brief?: string;
  platform?: Platform;
  improveStyle?: ImproveStyle;
  visualStyle?: string;
  videoDuration?: string;
  videoFormat?: string;
  textLength?: string;
  editRequest?: string;
};

const DRAFT_KEY = "brandflow-create-draft-v3";
const CALENDAR_PREFILL_KEY = "brandflow-calendar-prefill-v1";

const modes: Array<{ id: MediaMode; title: string; desc: string; icon: string }> = [
  { id: "image", title: "Görsel paylaşımı", desc: "Görsel oluştur, düzenle veya kendi görselini kullan.", icon: "▧" },
  { id: "video", title: "Video / Reels", desc: "Reels, TikTok veya Shorts için video hazırla.", icon: "▶" },
  { id: "text", title: "Sadece metin", desc: "Görsel olmadan güçlü bir paylaşım hazırla.", icon: "Aa" },
  { id: "edit", title: "Dosyamı geliştir", desc: "Elindeki görsel veya videoyu AI yönlendirmesiyle geliştir.", icon: "✦" },
];

const purposes = ["Ürün satmak", "Takipçi artırmak", "Etkileşim almak", "Marka tanıtımı", "Kampanya", "Kişisel paylaşım"];
const platforms: Platform[] = ["Instagram", "Reels", "TikTok", "YouTube Shorts", "Facebook", "LinkedIn"];
const improveStyles: Array<{ id: ImproveStyle; label: string }> = [
  { id: "professional", label: "Daha profesyonel" },
  { id: "sales", label: "Satış odaklı" },
  { id: "natural", label: "Daha doğal" },
  { id: "short", label: "Daha kısa" },
  { id: "viral", label: "Daha dikkat çekici" },
];

function platformRatio(platform: Platform) {
  if (platform === "Reels" || platform === "TikTok" || platform === "YouTube Shorts") return "aspect-[9/16] max-h-[680px]";
  if (platform === "Instagram") return "aspect-[4/5]";
  return "aspect-[4/3]";
}

function calendarPlatform(platform: Platform) {
  if (platform === "Instagram" || platform === "Reels") return "instagram";
  if (platform === "TikTok") return "tiktok";
  if (platform === "YouTube Shorts") return "youtube";
  if (platform === "Facebook") return "facebook";
  return "linkedin";
}

export function ContentCreationFlow() {
  const [mode, setMode] = useState<MediaMode>("image");
  const [purpose, setPurpose] = useState("Ürün satmak");
  const [brief, setBrief] = useState("");
  const [platform, setPlatform] = useState<Platform>("Instagram");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"image" | "video" | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [improveStyle, setImproveStyle] = useState<ImproveStyle>("professional");
  const [visualStyle, setVisualStyle] = useState("Premium ve temiz");
  const [videoDuration, setVideoDuration] = useState("30 saniye");
  const [videoFormat, setVideoFormat] = useState("Reels");
  const [textLength, setTextLength] = useState("Kısa");
  const [editRequest, setEditRequest] = useState("");
  const [aiByPlatform, setAiByPlatform] = useState<Partial<Record<Platform, AiPack>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        if (draft.mode) setMode(draft.mode);
        if (draft.purpose) setPurpose(draft.purpose);
        if (draft.brief) setBrief(draft.brief);
        if (draft.platform) setPlatform(draft.platform);
        if (draft.improveStyle) setImproveStyle(draft.improveStyle);
        if (draft.visualStyle) setVisualStyle(draft.visualStyle);
        if (draft.videoDuration) setVideoDuration(draft.videoDuration);
        if (draft.videoFormat) setVideoFormat(draft.videoFormat);
        if (draft.textLength) setTextLength(draft.textLength);
        if (draft.editRequest) setEditRequest(draft.editRequest);
      }
    } catch {
      // Bozuk yerel taslak yeni taslağın açılmasını engellemesin.
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ mode, purpose, brief, platform, improveStyle, visualStyle, videoDuration, videoFormat, textLength, editRequest }));
  }, [mode, purpose, brief, platform, improveStyle, visualStyle, videoDuration, videoFormat, textLength, editRequest, draftReady]);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const current = aiByPlatform[platform];
  const ai = current?.data ?? null;
  const previewCaption = useMemo(() => ai?.caption || "AI hazırladığında paylaşım metnin burada görünecek.", [ai]);
  const completedPlatforms = Object.keys(aiByPlatform).length;
  const isVideo = mode === "video" || fileType === "video";
  const step = !brief.trim() ? 2 : !ai ? 3 : 4;

  function resetAi() {
    setAiByPlatform({});
    setError("");
  }

  function changeMode(value: MediaMode) {
    setMode(value);
    resetAi();
  }

  function changePurpose(value: string) {
    setPurpose(value);
    resetAi();
  }

  function changeBrief(value: string) {
    setBrief(value);
    resetAi();
  }

  function handleFile(file?: File) {
    if (!file) return;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileName(file.name);
    setFileType(file.type.startsWith("video/") ? "video" : "image");
    setFileUrl(URL.createObjectURL(file));
    resetAi();
  }

  function removeFile() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl("");
    setFileName("");
    setFileType(null);
    resetAi();
  }

  function updateCaption(value: string) {
    setAiByPlatform((previous) => {
      const pack = previous[platform];
      if (!pack) return previous;
      return { ...previous, [platform]: { ...pack, data: { ...pack.data, caption: value } } };
    });
  }

  function buildBrief() {
    const details: string[] = [brief.trim()];
    if (mode === "image") details.push(`Görsel stili: ${visualStyle}.`);
    if (mode === "video") details.push(`Video süresi: ${videoDuration}. Format: ${videoFormat}.`);
    if (mode === "text") details.push(`Metin uzunluğu: ${textLength}. Görselsiz paylaşım olacak.`);
    if (mode === "edit") details.push(`Mevcut dosyada istenen düzenleme: ${editRequest.trim() || "Markaya uygun, profesyonel bir iyileştirme yap."}`);
    return details.join("\n");
  }

  function openCalendar() {
    if (!ai) return;
    const caption = [ai.caption, ai.hashtags.join(" ")].filter(Boolean).join("\n\n");
    localStorage.setItem(CALENDAR_PREFILL_KEY, JSON.stringify({
      title: (brief.trim() || `${platform} paylaşımı`).slice(0, 100),
      caption,
      platform: calendarPlatform(platform),
      bestTime: ai.bestTime,
      timingReason: ai.timingReason,
      referenceFileName: fileName || null,
    }));
    window.location.href = "/calendar";
  }

  async function generateAi(style = improveStyle) {
    if (!brief.trim()) {
      setError("Bana önce ne yapmak istediğini bir iki cümleyle anlat.");
      return;
    }
    if (mode === "edit" && !fileName) {
      setError("Dosyamı geliştir seçeneğinde önce bir görsel veya video ekle.");
      return;
    }

    setLoading(true);
    setError("");
    setImproveStyle(style);
    try {
      const response = await fetch("/api/create-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, purpose, brief: buildBrief(), platform, improveStyle: style, fileName, fileType }),
      });
      const json = await response.json() as { data?: AiResult; error?: string; source?: "ai" | "fallback" };
      if (!response.ok || !json.data) throw new Error(json.error || "İçerik hazırlanamadı.");
      setAiByPlatform((previous) => ({ ...previous, [platform]: { data: json.data!, source: json.source === "fallback" ? "fallback" : "ai" } }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "İçerik hazırlanamadı. Tekrar deneyebilirsin.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="space-y-6 pb-24">
    <section className="rounded-3xl border border-white/10 bg-[#070a16]/75 p-4 backdrop-blur-2xl sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">İçerik hazırlama</p><h2 className="mt-1 text-xl font-black text-white">4 adımda paylaşmaya hazırla</h2></div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500"><span className="rounded-full border border-white/10 px-3 py-1.5">Taslak otomatik kaydedilir</span>{completedPlatforms > 0 && <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-emerald-200">{completedPlatforms} platform hazır</span>}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{["Tür", "Ne istiyorsun?", "AI hazırlasın", "Önizle & yayınla"].map((label, index) => { const number = index + 1; return <div key={label} className={`rounded-xl border px-2 py-2 text-center text-[11px] font-bold ${number < step ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : number === step ? "border-violet-400/35 bg-violet-500/15 text-white" : "border-white/8 text-zinc-600"}`}>{number}. {label}</div>; })}</div>
    </section>

    <section className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
      <p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">1 · Ne hazırlıyoruz?</p>
      <h2 className="mt-2 text-2xl font-black text-white">İçerik türünü seç</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{modes.map((item) => <button type="button" key={item.id} onClick={() => changeMode(item.id)} className={`rounded-2xl border p-4 text-left transition ${mode === item.id ? "border-violet-400/60 bg-violet-500/15 shadow-[0_0_30px_rgba(124,58,237,.1)]" : "border-white/10 bg-white/[.03] hover:border-white/20"}`}><span className="text-xl text-violet-200">{item.icon}</span><p className="mt-3 font-black text-white">{item.title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{item.desc}</p></button>)}</div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <div className="space-y-5 rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">2 · Ne istiyorsun?</p><h2 className="mt-2 text-xl font-black text-white">Bana sonucu anlat, paylaşım metnini değil</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Örneğin “yeni kahve ürünümü gençlere tanıt, samimi ama premium olsun” yaz. <b className="text-zinc-300">Buraya yazdığını aynen paylaşmayacağım;</b> ne istediğini anlayıp sana yeni bir paylaşım metni hazırlayacağım.</p></div>
        <div className="flex flex-wrap gap-2">{purposes.map((item) => <button type="button" key={item} onClick={() => changePurpose(item)} className={`rounded-full border px-3 py-2 text-xs font-bold ${purpose === item ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-zinc-400"}`}>{item}</button>)}</div>
        <textarea value={brief} onChange={(event) => changeBrief(event.target.value)} rows={5} placeholder="Ne yapmak istiyorsun? Hedef kitle, ürün, tarz, kampanya veya vermek istediğin mesajı yaz..." className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/50" />

        {mode === "image" && <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.05] p-4"><p className="text-sm font-black text-white">Görsel nasıl görünsün?</p><select value={visualStyle} onChange={(event) => { setVisualStyle(event.target.value); resetAi(); }} className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none"><option>Premium ve temiz</option><option>Canlı ve enerjik</option><option>Minimal</option><option>Ürün odaklı</option><option>Doğal ve sıcak</option></select></div>}

        {mode === "video" && <div className="grid gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/[.05] p-4 sm:grid-cols-2"><label className="text-sm font-black text-white">Video süresi<select value={videoDuration} onChange={(event) => { setVideoDuration(event.target.value); resetAi(); }} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none"><option>15 saniye</option><option>30 saniye</option><option>60 saniye</option></select></label><label className="text-sm font-black text-white">Video formatı<select value={videoFormat} onChange={(event) => { setVideoFormat(event.target.value); resetAi(); }} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none"><option>Reels</option><option>TikTok</option><option>YouTube Shorts</option></select></label></div>}

        {mode === "text" && <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.05] p-4"><p className="text-sm font-black text-white">Metin ne kadar uzun olsun?</p><div className="mt-3 flex flex-wrap gap-2">{["Kısa", "Orta", "Uzun"].map((item) => <button type="button" key={item} onClick={() => { setTextLength(item); resetAi(); }} className={`rounded-full border px-3 py-2 text-xs font-bold ${textLength === item ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-zinc-400"}`}>{item}</button>)}</div></div>}

        {mode === "edit" && <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.05] p-4"><p className="text-sm font-black text-white">Dosyada ne değişsin?</p><textarea value={editRequest} onChange={(event) => { setEditRequest(event.target.value); resetAi(); }} rows={3} placeholder="Örn. arka planı sadeleştir, ürünü öne çıkar, daha premium görünüm ver..." className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white outline-none placeholder:text-zinc-600" /></div>}

        {mode !== "text" && <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-white">{mode === "edit" ? "Düzenlenecek dosyayı ekle" : "Görsel veya video eklemek ister misin?"}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{mode === "edit" ? "Bu modda dosya gereklidir." : "İsteğe bağlı. Kendi dosyanı veya referansını ekleyebilirsin."}</p></div>{fileUrl && <button type="button" onClick={removeFile} className="shrink-0 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold text-red-200">Kaldır</button>}</div>
          <label className="mt-3 block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[.025] transition hover:border-violet-400/40"><input type="file" accept="image/*,video/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />{fileUrl ? <div className="space-y-3 p-3">{fileType === "video" ? <video src={fileUrl} controls className="max-h-[300px] w-full rounded-xl bg-black object-contain" /> : <img src={fileUrl} alt="Yüklenen referans" className="max-h-[300px] w-full rounded-xl bg-black object-contain" />}<div className="flex items-center justify-between gap-3 px-1 pb-1"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{fileName}</p><p className="text-xs text-zinc-500">Dosya hazır ve önizlemede kullanılacak.</p></div><span className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200">Değiştir</span></div></div> : <div className="p-5 text-center"><p className="font-bold text-white">Dosya veya referans ekle</p><p className="mt-1 text-xs text-zinc-500">JPG, PNG, WEBP veya video seçebilirsin.</p></div>}</label>
        </div>}

        <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[.055] p-4"><p className="text-sm font-black text-white">Nasıl bir ton istiyorsun?</p><div className="mt-3 flex flex-wrap gap-2">{improveStyles.map((item) => <button type="button" key={item.id} onClick={() => { setImproveStyle(item.id); resetAi(); }} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${improveStyle === item.id ? "border-violet-400/50 bg-violet-500/20 text-white" : "border-white/10 bg-black/15 text-zinc-400 hover:text-white"}`}>{item.label}</button>)}</div></div>

        {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4"><p className="text-sm font-bold text-red-100">İçerik hazırlanamadı.</p><p className="mt-1 text-xs leading-5 text-red-200/80">{error}</p><button type="button" onClick={() => void generateAi()} className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-100">Tekrar dene</button></div>}
        <button type="button" onClick={() => void generateAi()} disabled={loading || !brief.trim()} className="w-full rounded-2xl bg-violet-600 px-4 py-4 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">{loading ? `${platform} için hazırlanıyor...` : ai ? `${platform} içeriğini yeniden hazırla` : `${platform} için AI içeriğini hazırla`}</button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">3 · AI önerisi</p><h2 className="mt-2 text-xl font-black text-white">Paylaşmadan önce kontrol et ve düzenle</h2></div>{current && <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${current.source === "ai" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-amber-400/25 bg-amber-400/10 text-amber-200"}`}>{current.source === "ai" ? "AI tarafından hazırlandı" : "Genel yedek öneri"}</span>}</div>
        {current?.source === "fallback" && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-3 text-xs leading-5 text-amber-100">AI servisine tam erişilemediği için temel öneri gösteriyorum. İstersen tekrar deneyebilirsin.</div>}

        {ai ? <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.05] p-4"><div className="flex items-center justify-between gap-3"><label htmlFor="generated-caption" className="text-sm font-black text-emerald-100">Paylaşım metni</label><span className="text-[11px] font-semibold text-zinc-500">İstersen düzenle · {ai.caption.length} karakter</span></div><textarea id="generated-caption" value={ai.caption} onChange={(event) => updateCaption(event.target.value)} rows={6} className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none focus:border-emerald-400/40" /><p className="mt-2 text-[11px] leading-5 text-zinc-500">Buradaki değişiklik önizlemeye ve takvime aynen taşınır. Üstte yazdığın brief doğrudan paylaşılmaz.</p></div> : <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-zinc-500">AI içeriğini hazırladığında, paylaşım metnini burada görecek ve yayınlamadan önce değiştirebileceksin.</div>}

        <div className="mt-4 space-y-3"><Advice title="Önerilen zaman" value={ai?.bestTime || "İçeriği hazırladığında burada görünecek."} /><Advice title="Neden bu zaman?" value={ai?.timingReason || "Hesabın verisi uygunsa kişiselleştirilecek."} /><Advice title="İlk cümle / Hook" value={ai?.hook || "İçeriği hazırladığında burada görünecek."} /><Advice title="Harekete geçirici mesaj" value={ai?.cta || "İçeriği hazırladığında burada görünecek."} /><Advice title="Görsel / video yönü" value={ai?.visualDirection || "İçeriği hazırladığında burada görünecek."} /></div>
        {ai && <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4"><div className="flex items-center justify-between"><span className="text-sm font-bold text-emerald-100">Yayın öncesi skor</span><span className="text-2xl font-black text-white">{ai.contentScore}/100</span></div><p className="mt-2 text-xs leading-5 text-zinc-400">{ai.scoreReason}</p></div>}
        {ai && isVideo && ai.videoScript.length > 0 && <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Video akışı</p><div className="mt-2 space-y-2">{ai.videoScript.map((item, index) => <p key={`${index}-${item}`} className="text-sm text-zinc-300">{index + 1}. {item}</p>)}</div></div>}
      </div>
    </section>

    <section className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-fuchsia-300">4 · Önizle ve yayınla</p><h2 className="mt-2 text-xl font-black text-white">Gerçekte nasıl görünecek?</h2><p className="mt-1 text-xs text-zinc-500">Platform değiştirince daha önce hazırladığın içerik kaybolmaz.</p></div><div className="flex flex-wrap gap-2">{platforms.map((item) => <button type="button" key={item} onClick={() => { setPlatform(item); setError(""); }} className={`relative rounded-full px-3 py-2 text-xs font-bold ${platform === item ? "bg-white text-black" : "border border-white/10 text-zinc-400"}`}>{item}{aiByPlatform[item] && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#070a16] bg-emerald-400" />}</button>)}</div></div>

      {!ai && brief.trim() && <div className="mx-auto mt-5 max-w-[620px] rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-4 text-center"><p className="text-sm font-bold text-violet-100">{platform} için henüz içerik hazırlamadın.</p><button type="button" onClick={() => void generateAi()} disabled={loading} className="mt-3 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white">{loading ? "Hazırlanıyor..." : `${platform} içeriğini hazırla`}</button></div>}

      <div className="mx-auto mt-6 max-w-[620px] overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 p-4"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" /><div><p className="text-sm font-black text-white">markan</p><p className="text-[11px] text-zinc-500">{platform} · önizleme</p></div></div>
        {mode === "text" ? <div className="flex min-h-[260px] items-center justify-center bg-gradient-to-br from-[#15182b] via-[#090b14] to-[#25103c] p-10 text-center"><p className="max-w-md text-2xl font-black leading-tight text-white">{previewCaption}</p></div> : fileUrl ? <div className={`flex items-center justify-center bg-black ${platformRatio(platform)}`}>{fileType === "video" ? <video src={fileUrl} controls className="h-full max-h-[680px] w-full object-contain" /> : <img src={fileUrl} alt="Platform önizlemesi" className="h-full max-h-[680px] w-full object-contain" />}</div> : <div className={`flex items-center justify-center bg-gradient-to-br from-[#15182b] via-[#090b14] to-[#25103c] ${platformRatio(platform)}`}><div className="px-8 text-center"><p className="text-4xl">{mode === "video" ? "▶" : "✦"}</p><p className="mt-3 text-sm font-bold text-zinc-300">{mode === "edit" ? "Düzenlenecek dosyan" : `Üretilen ${mode === "video" ? "video" : "görsel"}`} burada görünecek.</p></div></div>}
        <div className="p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200"><b>markan</b> {previewCaption}</p>{ai && ai.hashtags.length > 0 && <p className="mt-2 text-xs leading-5 text-violet-300">{ai.hashtags.join(" ")}</p>}<p className="mt-3 text-xs text-zinc-500">♡ Beğen &nbsp; ◯ Yorum &nbsp; ↗ Paylaş</p></div>
      </div>

      <div className="mx-auto mt-5 grid max-w-[760px] gap-3 sm:grid-cols-3"><button type="button" onClick={openCalendar} disabled={!ai} className={`rounded-2xl px-5 py-3.5 text-center text-sm font-black ${ai ? "bg-white text-black" : "cursor-not-allowed bg-white/10 text-zinc-600"}`}>Takvime planla</button><Link href="/publish" className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 py-3.5 text-center text-sm font-black text-violet-100">Yayın Merkezine git</Link><Link href={mode === "video" ? "/video-studio" : "/image-studio"} className={`rounded-2xl border border-white/10 bg-white/[.04] px-5 py-3.5 text-center text-sm font-black text-white ${mode === "text" ? "pointer-events-none opacity-40" : ""}`}>{mode === "edit" ? "Dosyayı ileri düzenle" : mode === "video" ? "Videoyu ileri düzenle" : "Görseli ileri düzenle"}</Link></div>
      <p className="mt-3 text-center text-[11px] text-zinc-600">Takvime planla dediğinde düzenlediğin metin, platform ve AI zaman önerisi otomatik taşınır.</p>
    </section>
  </div>;
}

function Advice({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[.035] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{title}</p><p className="mt-1 text-sm font-semibold leading-6 text-zinc-200">{value}</p></div>;
}
