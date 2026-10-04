import Image from "next/image";
import Link from "next/link";
import LandingBrief from "./LandingBrief";
import styles from "./LandingPage.module.css";

const journey = [
  ["01", "Anlat", "Fikrini, hedefini veya ürününü kısaca paylaş. İçeriğin buradan şekillensin."],
  ["02", "Düzenle", "Hazırlanan metni markanın diline yaklaştır. Kendi dokunuşunu ekle."],
  ["03", "Görselleştir", "Görsel stüdyosunda fikrine bir görünüm kazandır ya da kendi dosyanı kullan."],
  ["04", "Planla", "Taslağını sakla, takvimine ekle. Ne zaman hazır olacağına sen karar ver."],
] as const;
const examples = [
  ["Bakım", "Doğal içeriklerle günlük bakım ritüeli.", "Amber bakım şişesi ve zeytin dalları"],
  ["Moda", "Zamansız parçalar, kendine ait bir duruş.", "Doğal ışıkta keten kıyafetli model"],
  ["Kafe", "Güne iyi bir kahve ile başla.", "Seramik fincanda bir cappuccino"],
] as const;

export default function LandingPage({ clerkEnabled }: { clerkEnabled: boolean }) {
  const startHref = clerkEnabled ? "/sign-up" : "/create";
  return <main className={styles.page}>
    <a href="#welcome" className={styles.skip}>İçeriğe geç</a>
    <section className={styles.hero} aria-labelledby="welcome-title">
      <Image src="/marketing/creative-desk.webp" alt="" fill preload sizes="100vw" className={styles.scene} />
      <header className={styles.header}><Link href="/" className={styles.brand}>BrandFlow <span>AI</span></Link><Link href="/sign-in" className={styles.account}>Giriş yap ↗</Link></header>
      <nav aria-label="Ana menü" className={styles.sideNav}><a href="#icerikler">İçerikler</a><a href="#surec">Süreç</a><Link href="/about">Hakkında</Link></nav>
      <div id="welcome" className={styles.paper}><p className={styles.eyebrow}>BrandFlow yaratıcı çalışma alanı</p><h1 id="welcome-title">Bir <em>fikir</em> bırak.</h1><p className={styles.subtitle}>Markanın içeriği buradan başlasın.</p><LandingBrief /><p className={styles.reassurance}>Önce taslak. Son karar <span>sende.</span></p></div>
      <a className={styles.scroll} href="#surec">Fikrinin izini sür <span aria-hidden="true">↓</span></a>
    </section>
    <section id="surec" className={styles.process} aria-labelledby="process-title">
      <div className={styles.sectionIntro}><h2 id="process-title">Fikrinin geçtiği yollar.</h2><p>Bir fikrin, markana yakışan içeriğe dönüşme yolculuğu.<br />Sade, yaratıcı ve senin kontrolünde.</p></div>
      <ol className={styles.journey}>{journey.map(([number, title, text]) => <li key={number}><span className={styles.number}>{number}</span><h3>{title}</h3><div className={styles.pencilLine} /><p>{text}</p>{number === "02" && <div className={styles.swatches} aria-hidden="true"><i /><i /><i /></div>}{number === "04" && <div className={styles.note}>Bir sonraki paylaşımın<br /><em>burada yerini bulur.</em></div>}</li>)}</ol>
      <Link href="/features" className={styles.textLink}>Çalışma alanını tanı ↗</Link>
    </section>
    <section id="icerikler" className={styles.examples} aria-labelledby="examples-title"><div className={styles.sectionIntro}><p className={styles.eyebrow}>Örnek içerikler</p><h2 id="examples-title">Aynı araç. Farklı markalar.</h2><p>Her birinin hikâyesi farklı. Yaratıcı başlangıç noktası aynı.</p></div><div className={styles.polaroids}>{examples.map(([label, caption, alt], index) => <figure key={label} className={styles.polaroid}><span className={styles.tape}>{label}</span><div className={styles.photo} role="img" aria-label={alt} style={{ backgroundPosition: `${index * 50}% center` }} /><figcaption>{caption}</figcaption></figure>)}</div><div className={styles.week}><span>Haftalık plan örneği</span>{["Pzt · Ürün tanıtımı", "Sal · Kamera arkası", "Çar · Bir hikâye", "Per · Günlük ritüel", "Cum · Mekân / Atmosfer"].map(day => <span key={day}>{day}</span>)}</div><p className={styles.disclaimer}>Görseller ve plan, tasarım için hazırlanmış temsili örneklerdir.</p></section>
    <section className={styles.control} aria-labelledby="control-title"><div className={styles.sectionIntro}><h2 id="control-title">Kontrol her adımda sende.</h2><p>Taslağını incele, değiştir ve hazır olduğunda planla.</p></div><div className={styles.controlBody}><div className={styles.personalNote}>Senin fikrin.<br />Senin markan.<span /></div><div className={styles.answers}><details><summary>Nereden başlamalıyım?</summary><p>Yukarıya fikrini yaz. Giriş yaptıktan sonra içerik stüdyosunda fikrinle devam edebilirsin. Yeniysen giriş ekranından hesap oluşturabilirsin.</p></details><details><summary>İçerikleri değiştirebilir miyim?</summary><p>Evet. Hazırlanan metni düzenleyebilir, taslağını saklayabilir ve kendi görsellerini kullanabilirsin.</p></details><details><summary>Planlamak, otomatik paylaşmak mı?</summary><p>Takvime eklemek içeriğini planlar. Otomatik yayın için desteklenen bir sosyal hesabın bağlı olması ve yayın ayarlarının hazır olması gerekir.</p></details></div></div></section>
    <footer className={styles.footer}><div><Link href="/" className={styles.brand}>BrandFlow <span>AI</span></Link><nav aria-label="Alt menü"><Link href="/features">Özellikler</Link><Link href="/about">Hakkında</Link><Link href="/sign-in">Giriş yap</Link></nav><small>© BrandFlow AI</small></div><div className={styles.finalInvitation}><h2>Sıradaki <em>fikir</em> senin.</h2><Link href={startHref} className={styles.primary}>Bir fikirle başla <span aria-hidden="true">→</span></Link></div></footer>
  </main>;
}
