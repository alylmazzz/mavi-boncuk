// Blog takvim testi: node tools/blog-test.js — 365 yazının her birini kendi yayın gününde açar, bir gün önce görünmediğini, liste/RSS/site haritasının çalıştığını denetler.
const path=require('path');const K=process.argv[2] || path.join(__dirname, "..");
const Y=require(path.join(K,'api/_lib/yazilar.json'));
const tarihler=Y.map(y=>y.tarih).sort();
const ilk=tarihler[0], son=tarihler[tarihler.length-1];
const gun=(t)=>Math.round((Date.parse(t)-Date.parse(ilk))/864e5);
const eksik=[];for(let i=0;i<=gun(son);i++){const t=new Date(Date.parse(ilk)+i*864e5).toISOString().slice(0,10);if(!tarihler.includes(t))eksik.push(t);}
const ciftT=tarihler.filter((t,i)=>tarihler.indexOf(t)!==i);
const sluglar=Y.map(y=>y.slug);const ciftS=sluglar.filter((s,i)=>sluglar.indexOf(s)!==i);
const bos=Y.filter(y=>!y.baslik||!y.govde||y.govde.length<500||!y.ozet).map(y=>y.slug);
console.log('yazı',Y.length,'ilk',ilk,'son',son,'eksik gün',eksik.length,eksik.slice(0,5),'aynı gün',ciftT.length,'aynı slug',ciftS.length,'boş/kısa',bos.length);
// her yazıyı kendi gününde, TR saatiyle 00:05'te çalıştır
const gercek=Date.now;let hata=[];
const cagir=(mod,url)=>new Promise((ok)=>{const res={statusCode:200,h:{},setHeader(k,v){this.h[k]=v},end(b){ok({kod:this.statusCode,govde:String(b||''),h:this.h})}};delete require.cache[require.resolve(mod)];require(mod)({url,method:'GET',headers:{host:'maviboncukortaca.vercel.app'},query:Object.fromEntries(new URL(url,'http://x').searchParams)},res);});
(async()=>{
 const yazi=path.join(K,'api/yazi.js'), blog=path.join(K,'api/blog.js'), rss=path.join(K,'api/rss.js'), sm=path.join(K,'api/sitemap.js');
 for(const y of Y){
  const an=Date.parse(y.tarih+'T00:05:00+03:00'); Date.now=()=>an;
  // blog modülleri bugun() fonksiyonunu Date.now'dan hesaplıyor; önbelleği sıfırla
  for(const m of Object.keys(require.cache)) if(m.includes(path.join('api','_lib','blog'))) delete require.cache[m];
  const r=await cagir(yazi,'/api/yazi?slug='+y.slug);
  if(r.kod!==200||!r.govde.includes(y.baslik.slice(0,20).replace(/&/g,'&amp;')))hata.push(['yazi',y.tarih,y.slug,r.kod]);
  // bir gün önce görünmemeli
  Date.now=()=>an-10*60*1000; for(const m of Object.keys(require.cache)) if(m.includes(path.join('api','_lib','blog'))) delete require.cache[m];
  const o=await cagir(yazi,'/api/yazi?slug='+y.slug); if(o.kod===200)hata.push(['erken görünüyor',y.tarih,y.slug]);
 }
 // birkaç gün için liste, rss, sitemap
 for(const t of [ilk,'2027-01-01','2027-06-15',son]){Date.now=()=>Date.parse(t+'T12:00:00+03:00');for(const m of Object.keys(require.cache)) if(m.includes(path.join('api','_lib','blog'))) delete require.cache[m];
  for(const [mod,u] of [[blog,'/api/blog'],[rss,'/api/rss'],[sm,'/api/sitemap']]){const r=await cagir(mod,u);if(r.kod!==200||r.govde.length<500)hata.push([path.basename(mod),t,r.kod,r.govde.length]);}}
 Date.now=gercek;
 console.log('hata',hata.length,JSON.stringify(hata.slice(0,10)));
})();
