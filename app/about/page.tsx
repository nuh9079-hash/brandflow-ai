import type { Metadata } from "next";
import { PublicPage } from "@/components/marketing/PublicSite";
export const metadata: Metadata = { title: "Hakkında | BrandFlow AI", description: "BrandFlow AI’ın içerik hazırlama ve planlama yaklaşımı." };
export default function AboutPage() {
 return <PublicPage title="Bir sonraki paylaşımın belli olsun" intro="BrandFlow AI, küçük işletmelerin ve içerik hazırlayan ekiplerin ürün fikirlerini sosyal medya içeriklerine dönüştürmesini kolaylaştırmak için geliştiriliyor.">
  <div className="mt-12 space-y-6"><section className="rounded-3xl border border-white/10 p-8"><h2 className="text-2xl font-bold">Kontrol sende</h2><p className="mt-4 leading-8 text-zinc-400">AI bir başlangıç önerisi hazırlar. Sen metni değerlendirir, markana göre düzenler ve ne zaman kullanılacağına karar verirsin.</p></section><section className="rounded-3xl border border-white/10 p-8"><h2 className="text-2xl font-bold">Hazırla, düzenle, planla</h2><p className="mt-4 leading-8 text-zinc-400">Amacımız içerik üretimini tek bir düğmeye indirgemek değil; fikirden taslağa ve takvime uzanan adımları anlaşılır hale getirmek. Ürün geliştikçe yeni özellikler bu akışa ekleniyor.</p></section></div>
 </PublicPage>;
}
