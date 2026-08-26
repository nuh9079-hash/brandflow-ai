import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Button, Card } from "@/components/ui";

const plans=[
 {name:"Ücretsiz",price:"$0",features:["20 AI kredisi","Temel geçmiş","Tek çalışma alanı"]},
 {name:"Pro",price:"$19",features:["500 AI kredisi","Favoriler","Marka ayarları","Öncelikli modeller"]},
 {name:"İşletme",price:"$49",features:["2.000 AI kredisi","Ekip çalışma alanı","Gelişmiş geçmiş","Öncelikli destek"]},
];

export default async function BillingPage(){await auth?.protect();return <main className="min-h-screen bg-[#09090b] text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar active="Plan & Faturalandırma"/><section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><Navbar title="Plan & Faturalandırma"><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">BrandFlow planını ve kullanım haklarını buradan yönet.</p></Navbar><div className="grid gap-4 pt-6 lg:grid-cols-3">{plans?.map(plan=><Card key={plan?.name} className="p-5"><p className="text-sm font-semibold text-violet-300">{plan?.name}</p><p className="mt-4 text-4xl font-black text-white">{plan?.price}<span className="text-sm font-medium text-zinc-500">/ay</span></p><ul className="mt-5 space-y-3 text-sm text-zinc-300">{plan?.features?.map(feature=><li key={feature}>✓ {feature}</li>)}</ul><Button type="button" className="mt-6 w-full" variant={plan?.name==="Pro"?"primary":"secondary"}>{plan?.name==="Ücretsiz"?"Mevcut plan":"Yakında"}</Button></Card>)}</div></section></div></main>;}
