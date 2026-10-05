// Read-only copy audit. Emits apply_patch patches; never changes API keys or identifiers.
/* eslint-disable @typescript-eslint/no-require-imports -- This standalone Node script uses CommonJS. */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const words = `
doğrula doğrulama doğrulandı doğrulanabilir doğrulanıyor doğrulanacak doğrulanmış doğrulanamadı
başvuru başvurular başvurularım başvurularımı başvuruları başvuruyu başvurunuz başvurun başvurusunu başvurusu
öğrenci öğrenciler öğrencileri öğrencinin öğrenciye öğrencilere öğrencilerin öğrenci-mezun
giriş çıkış iletişim sıkça şifre şifrenizi şifreniz şifreni şifreyi şifresi şifreler
güvenli güvenlik güvenle gönüllü gönüllülük gönüllülüğü
kullanıcı kullanıcının kullanıcılar kullanıcıları kullanıcıya kullanıcıların
yönetim yönetimi yönetimine yönetilir yönetilirken yönetici yöneticiler yönetiliyor
yükleniyor yüklenemedi yükle yükleme yüklenen yüklendi
gönder gönderildi gönderiliyor gönderilemedi gönderilen gönderdiğiniz gönderdiğin gönderildikten gönderildiğinde
güncel güncelle güncelleme güncellendi güncelleniyor güncellenemedi güncellenir güncellenirken
için içeriği içerik içerikler içerikleri içeriklerin içeriklerini içerikleriniz içeren
önce önceki önizleme öncelik öncelikli
aç açıklama açıklamalar açıklamaları açıklamasını açıklaması açıklama alanı açık açığı açılan açılır açıldığında açtığı
katılım katılımcı katılımcılar katılımcıları katılımcının katılımcılara katılımcıların katılımı katılımın katılımını katılımınız katılım kaydı kayıt kayıtlar kayıtları kaydı kaydın kaydını kaydınız kayıtlı kaydınızın kayıtlarını kaydına kaydının
dönem dönemi dönemler dönemleri dönemin dönemine dönemden dönemde dönemlerin
tüm tür türü türleri türünü
seç seçin seçim seçimi seçiniz seçilen seçili seçeneği seçenek seçenekler seçenekleri seçeneklerini
gör görüntü görüntüle görüntüleme görüntülenir görüntüleniyor görüntülenemedi görüntülenecek görüntüleyin görüntüleyebilirsiniz görünür görünmüyor görünüyor göster gösterilir gösteriliyor gösterilecek gösterge gösterilmez
değil değiştir değişiklik değişiklikler değişiklikleri değiştirilemez değiştirmek değişti değiştirdi
değer değerler değerleri değerlendirme değerlendirildi değerlendirilir değerlendiriliyor değerlendirmeyi değerlendir
çalışma çalışmaları çalışır çalışıyor çalışan
oluştur oluşturma oluşturuldu oluşturulabilir oluşturulacak oluşturulamadı oluşturun oluşturuyor oluşturuluyor oluşturulan oluştu
silindi silinemedi gün günler günü günün gününde günlük
başarı başarıyla başarılı başarısız başlangıç başlangıcı başlat başlangıcını
bitiş bitişi bitişinde
geçerli geçersiz geçmiş geçmişi geçmişim geçiş geçildi geçin
süre süresi süreç süreci sürecin sürecini süreçleri süreçlerini
özet özeti özgeçmiş özgeçmişim özelleştir özel özellik özellikler
sayısı sayıları sayı toplamı toplamını
eğitim eğitimler eğitimleri eğitimi eğitimini eğitimde eğitmen
koordinatör koordinatörler koordinatörü koordinatöre
takım takımlar takımın takımınız
alın alındı alınamadı alınır alınıyor alınan
bulunamadı bulunmuyor bulunması
tanımlı tanımları tanımla tanımlama tanımlanmış tanımlanabilir tanımlayın
yardım yardımcı yardımcısı
hesabı hesabınız hesabını hesabına hesabının hesabınızı
onayı onaylı onaylandı onaylanmadı onaylanıyor onayına
dosyası dosyaları dosyanın dosyayı dosyalarını
alanı alanları alanlarını alanında alanına alanıdır
kuralları koşulları koşullarını şartları şartlarını uyarı uyarıları uyarılarıyla
zorunludur zorunlu sağlanır sağlandı sağlar sağlamak sağlanamadı
olduğu olduğunda olduğun olduğunu olduğu için
bilgisi bilgileri bilgilerinizi bilgilerin bilgilerini
adınız soyadınız adını adı adının
zamanı saati tarihi tarihini
anasayfa bağlantı bağlantısı bağlantıyı bağlantıları bağlantısını bağlı
profilinizi düzenle düzenleme düzenlendi düzenlenebilir düzenleniyor düzenleyin düzeni
fırsat fırsatlar fırsatları fırsatı
mezuniyet dönüş geri bildirim başarılar
gelişim gelişimi geliştirme keşfet keşif
doğru doğruyu yanlış yanlışlıkla eksik
sırada sıra sırası sıralama sırala sırayı
çevir çevrimiçi çevrimdışı
tamamlandı tamamlandığında tamamlanmış tamamlanamadı
hatırlat hatırlatma hatırlamıyorum
mülakat mülakatı mülakatlar mülakatları mülakatın
puanı puanları puanlama
akışı akışını akış
ilanı ilanları ilanını ilanın
kişisel kişi kişiler kişileri kişiye kişilik
numarası numaranız numaranızı
yanıt yanıtla yanıtı yanıtları
şimdi şablon şablonu şablonları şart şartlar
dışında dışa içe yazısı yazılar yazıları
okuduğunuz okudum anladım katılıyorum rıza rızası
bulundu bulunuyor gösterilen görsel görseller görseli görselleri
bohça bohçası dijital
henüz ödev ödevler ödevleri ödevlerim görev görevler görevleri görevi görevin görevini
başlık başlığı başlığını yaklaşan kısa kısaca işlem işlemi işlemler işlemleri işlemine
çekilemedi çekiliyor mesajı mesajınız mesajınızı yazın ödül ödüller ödülü ödülleri
üniversite üniversitesi toplantı toplantılar toplantıları toplantının toplantısı
detayları detaylı yüklenirken danışman danışmanı vazgeç atamaları ayarları ayarlarını kapalı
ortaklık ortaklığı ortaklıkları seçince modül modülü modüller modülleri kapanış
girilmemiş planlandı tarafından görüntülemek görünürlük eşleştirmesi eşleştirme eşleştir
tümünü diğer canlı sonuç sonuçlar sonuçları sonuçlarını sonuçlarıyla örnek örnekler örneğin
programı programları gönderim seçmeden göre üzerinden bölüm bölümü bölümler özlük
varsayılan kaldır fotoğraf fotoğrafları atanmış sertifikası lütfen kartları kartlarını
akışları kapsamında ödeme ödemeler ödemeleri gerekçe uzmanlık sonrası yükleyen portalı duyuruları
yalnızca tanıtım taslağı taslakları tasarım görünenleri hızlı seçilmelidir eşik toplanır
okunmamış tamamlayamadı aksiyonları menü menüsü menüsünü menüden üst üstte üstünde üstündeki
aşağı aşağıdaki aşağıya bağlamı bağlamında kapsamı bazlı aylık yıllık yüzde
erişim erişimi erişiminiz erişiminde erişimle
başvuruların başvurularınız başvurularınızı başvuruya başvuru için
karşı karşılık karşılığı karşılaştır karşılaştırma karşılanmadı
paylaş paylaşım paylaşımı paylaşılan paylaşılmış paylaşıldı paylaşılacak
gönderebilirsin güncelleyebilirsin indirebilirsiniz ekleyebilirsiniz
ayrıntı ayrıntılar ayrıntıları ayrıntılı
çık çıkın girişinde girişinizi
silinmiş silinmedi silinecek
kimliği kimlik numarası ad soyad
okunmuş oluşturamaz oluşturulamaz seçilecek
istediğiniz istediğin değişikliklere uygulandı uygulanamadı
onaylayın onaylayabilirsiniz reddedilmiş iş işaretle işaretli işaretlenmiş işaretleyin
döküm dönüşü dönüşüm tarih aralığı aralığını aralığında
artık yalnız bağlıdır bağlantınız bağlantınızın
güçlü güçlüdür küçük büyük küçült büyüt
çözüm çözülmüş çözülmedi çözümle ücret ücretli ücretsiz
katıl katıldığı katıldığınız katıldığın katıldım
görünümü görünüm görünümde gösterimi göstermek gösterilsin
indirdiğiniz güncellenen değiştirildi değiştirebilirsiniz başvuruldu doğrulayarak yaptırımları verdiğim
`.trim().split(/\s+/);
const ascii = (s) => s.replace(/[çğıöşü]/g, c => ({ç:"c",ğ:"g",ı:"i",ö:"o",ş:"s",ü:"u"}[c]));
const dict = new Map(words.filter(w => ascii(w) !== w).map(w => [ascii(w), w]));
function correct(text) {
  return text.replace(/[A-Za-zÇĞİÖŞÜçğıöşü]+/g, word => {
    const lower = word.toLowerCase();
    const replacement = dict.get(lower);
    if (!replacement) return word;
    if (word === word.toUpperCase()) return replacement.toLocaleUpperCase("tr-TR");
    if (word[0] === word[0].toUpperCase()) return replacement[0].toLocaleUpperCase("tr-TR") + replacement.slice(1);
    return replacement;
  });
}
const displayAttrs = new Set(["placeholder", "title", "alt", "aria-label", "label", "description", "message", "detail", "subtitle", "emptyText"]);
const protectedAttrs = new Set(["className","href","src","id","name","value","key","type","role","action","method","htmlFor","variant","size","permission","status","code"]);
function files(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir,e.name)] : []); }
const patches = [];
for (const file of files("src")) {
  const original = fs.readFileSync(file,"utf8");
  const source = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  function visit(node) {
    let eligible = ts.isJsxText(node);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const parent = node.parent;
      const attr = ts.isJsxAttribute(parent) ? parent.name.getText(source) : "";
      const prop = ts.isPropertyAssignment(parent) && parent.initializer === node ? parent.name.getText(source).replace(/['"]/g,"") : "";
      // Only prose or explicitly display-only properties; not machine-readable single tokens.
      eligible = displayAttrs.has(attr) || displayAttrs.has(prop) || /\s/.test(node.text) || (/^[A-Z][a-z]+$/.test(node.text) && dict.has(node.text.toLowerCase())) || (ts.isConditionalExpression(parent) && parent.condition !== node);
      if (protectedAttrs.has(attr) || protectedAttrs.has(prop) || /https?:|\/api\/|kdm-|=>|[{}]/.test(node.text)) eligible = false;
      if (ts.isImportDeclaration(parent) || ts.isLiteralTypeNode(parent) || (ts.isPropertyAssignment(parent) && parent.name === node)) eligible = false;
    }
    if (eligible) {
      const start = node.getStart(source);
      const text = original.slice(start,node.end);
      const next = correct(text);
      if (next !== text) edits.push({start,end:node.end,next});
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  let updated = original;
  for(const edit of edits.sort((a,b)=>b.start-a.start)) updated = updated.slice(0,edit.start)+edit.next+updated.slice(edit.end);
  if(updated !== original) {
    // Small, line-based hunks keep the review focused.
    const before=original.split("\n"), after=updated.split("\n");
    const hunks=[];
    for(let i=0;i<before.length;i++) if(before[i]!==after[i]) hunks.push("@@\n-"+before[i]+"\n+"+after[i]);
    patches.push({file,count:edits.length,patch:"*** Begin Patch\n*** Update File: "+path.resolve(file)+"\n"+hunks.join("\n")+"\n*** End Patch"});
  }
}
console.log(JSON.stringify(patches));
