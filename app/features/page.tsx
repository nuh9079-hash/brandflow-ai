import type { Metadata } from "next";
import { PublicPage } from "@/components/marketing/PublicSite";
export const metadata: Metadata = { title: "Özellikler | BrandFlow AI", description: "Marka bilgileriyle içerik hazırlama, düzenleme, medya ve takvim akışını keşfet." };
const features = [
  ["01", "Markana göre içerik hazırla", "Ürününü, hedef kitleni ve istediğin tonu anlat. Seçtiğin platform için AI destekli paylaşım metni hazırla."],
  ["02", "Kontrol et ve düzenle", "Oluşturulan metni incele, değiştir ve paylaşım önizlemesinde kontrol et. Son karar sende."],
  ["03", "Taslaklarını takip et", "Kaydedilen içeriklerine geçmişten ulaş, aradığını bul ve favorilerini ayır."],
  ["04", "Medyanı bir arada tut", "Görsellerini ve videolarını medya merkezinde yönet, içeriğinde kullanacağın dosyayı seç."],
  ["05", "Takvimine ekle", "İçeriğinin tarih ve saatini belirle. Taslaklarını ve planlanan gönderilerini aynı takvimde takip et."],
];
export default function FeaturesPage() {
 return <PublicPage title="Bir fikirden planlanmış içeriğe" intro="İçeriğini hazırlarken farklı araçlar arasında kaybolma. Marka bilgileri, düzenleme ve planlama adımlarını aynı akışta yönet.">
  <div className="mt-12 grid gap-5 sm:grid-cols-2">{features.map(([n,title,body])=><section key={n} className="rounded-3xl border border-white/10 bg-black/20 p-7"><p className="font-bold text-violet-300">{n}</p><h2 className="mt-3 text-xl font-bold">{title}</h2><p className="mt-3 leading-7 text-zinc-400">{body}</p></section>)}</div>
  <section className="mt-8 rounded-3xl border border-white/10 p-7"><h2 className="text-xl font-bold">Otomatik yayın nasıl çalışır?</h2><p className="mt-3 leading-7 text-zinc-400">Takvime eklemek, sosyal medyada otomatik paylaşmakla aynı işlem değildir. Otomatik yayın için desteklenen hesabının bağlı olması ve yayın hizmetinin hazır olması gerekir. Hesap bağlantısı ve hazır olma durumu uygulamada gösterilir.</p></section>
 </PublicPage>;
}
