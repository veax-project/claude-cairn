[English](README.md) · [Français](README.fr.md) · [Türkçe](README.tr.md) · [Azərbaycanca](README.az.md)

# Cairn

**Claude Code söhbətləriniz — bütün hesablarınızda.**

<p align="center">
  <img src="docs/home.svg" alt="Cairn" width="810">
</p>

Başqa bir Claude hesabına daxil oldunuz və söhbətləriniz yoxa çıxdı. Əslində
heç yerə getməyiblər. Cairn onları geri qaytarır və bunun bir də təkrarlanmasına
imkan vermir.

```bash
npx claude-cairn
```

Bu komanda yuxarıdakı ekranı açır. Siz nəyisə seçməyincə heç nə dəyişmir.

**Terminaldən istifadə sizə çətindirmi?**
[Cairn.cmd](https://github.com/veax-project/claude-cairn/releases/latest/download/Cairn.cmd)
faylını yükləyib iki dəfə klikləyin. Eyni işi görür və nəyisə quraşdırmaq
lazımdırsa, bunu sizə bildirir.

---

## Problem nədir

**Hesabı dəyişəndə tarixçəniz gizlənir.** Söhbətləriniz hələ də diskinizdədir,
heç birinə toxunulmayıb. Sadəcə Claude hər hesab üçün ayrıca siyahı saxlayır:
siz başqa hesaba keçən kimi o, səhv siyahını oxumağa başlayır.

**Üstəlik Claude Code söhbətləri 30 gündən sonra silir.** Standart olaraq,
səssizcə — hesabı dəyişsəniz də, dəyişməsəniz də. Çox adam bunu ancaq lazım olan
bir şey artıq itəndən sonra başa düşür.

---

## Cairn buna qarşı nə edir

Üç iş görür, sonra sizi rahat buraxır.

**Söhbətləri saxlayır.** Hər söhbət Claude-un silmədiyi bir yerə kopyalanır. O
nüsxə sizindir və heç kim onu götürmür.

**Söhbətləri paylaşdırır.** Kompüterinizdəki hər hesab bütün söhbətləri alır —
həm də hər iki istiqamətdə. Bir hesabda işə başlayın, o birinə keçin: söhbət
oradadır. Geri qayıdın: aralıqda gördüyünüz iş də oradadır.

**Göz qoyur.** Avtomatik sinxronizasiyanı qoşun: yuxarıdakı iki iş, kompüteriniz
açılan andan başlayaraq hər on dəqiqədən bir öz-özünə görülür. Bir daha bu barədə
düşünməyəcəksiniz.

---

## İlk addımlar

İşə salın:

```bash
npx claude-cairn
```

Sinxronizasiya üçün **1** düyməsini basın, sonra **Claude-u yenidən başladın**.
Söhbətləriniz yan panelə qayıdacaq.

Sonra avtomatik sinxronizasiyanı qoşmaq üçün **3** düyməsini basın: beləcə bu,
əl ilə nəsə etməli olduğunuz son dəfə olacaq.

> **Claude-u niyə yenidən başlatmaq lazımdır?** Claude söhbət siyahısını yalnız
> bir dəfə — açılanda oxuyur. Cairn həmin siyahıya yaza bilir, amma Claude bunu
> ancaq növbəti açılışda görəcək.

Menyu ilə işləmək istəmirsinizsə, hər əməliyyatın öz komandası var:

```bash
npx claude-cairn sync            # bir dəfə saxla və paylaşdır
npx claude-cairn autostart on    # hər 10 dəqiqədən bir təkrarla
npx claude-cairn status          # nə var, nə risk altındadır
```

---

## Qoy Claude öz tarixçənizdə axtarış aparsın

```bash
npx claude-cairn install-mcp
```

Claude-u yenidən başladın, sonra ondan belə şeylər soruşun:

> *köhnə söhbətlərimdə auth xətasını necə düzəltdiyimizi axtar*

Bu, **istənilən** hesabda işləyir — hətta beş dəqiqə əvvəl açdığınız hesabda da.
Məsələ də elə bundadır: bu bağlantı hesaba yox, kompüterinizə aiddir. Yəni lap
yeni bir hesab da bu günə qədər etdiyiniz hər şeyə çata bilir.

<p align="center">
  <img src="docs/accounts.svg" alt="Hesablar ekranı" width="810">
</p>

---

## İnsanların verdiyi suallar

**Məlumatlarım hara gedir?**

Heç yerə. Cairn faylları kompüterinizdəki bir qovluqdan yenə kompüterinizdəki
başqa bir qovluğa kopyalayır. Heç bir asılılıq yoxdur, telemetriya yoxdur,
yeniləmə yoxlaması yoxdur, şəbəkəyə bir dənə də sorğu getmir — wi-fi-ni söndürün,
bütün komandalar yenə işləyəcək. Özünüz yoxlamağın ən asan yolu da elə budur.

**Bəs nəyisə xarab etsə?**

```bash
npx claude-cairn undo
```

Bu komanda son sinxronizasiyanın əlavə etdiyini geri götürür, başqa heç nəyə
toxunmur. Öz fayllarını ölçüsünə və vaxt möhürünə görə tanıyır, ona görə də
Claude-un o vaxtdan bəri əl gəzdirdiyi heç nəyə qarışmır. Ehtiyat nüsxənizdən
isə heç vaxt heç nə silinmir.

**Niyə bəzi hesablarım ad əvəzinə kod kimi görünür?**

Çünki kompüterinizdə onların kimə aid olduğunu deyən heç nə yoxdur. Claude yalnız
hazırda daxil olduğunuz hesabın adını bildirir, Cairn də hər işə düşəndə həmin
adı bir kənara yazır. Bundan sonra istifadə edəcəyiniz hər hesab ilk girişdə öz
adını vermiş olacaq. Köhnələr üçün isə **4** düyməsini basıb adları əl ilə yaza
bilərsiniz — siyahı hər hesabda nə ilə başladığınızı və həmin hesabı ən son nə
vaxt işlətdiyinizi göstərir; adətən yada salmaq üçün bu, kifayət edir.

**Mac və ya Linux-da işləyir?**

Düzünü deyək: bilmirik. Cairn Windows-da hazırlanıb və orada yoxlanılıb. Mac və
Linux tərəfin kodu yazılıb, nəzərdən də keçirilib, amma heç vaxt real maşında işə
salınmayıb. Sınasanız, [başınıza gələni bizə yazın](https://github.com/veax-project/claude-cairn/issues/new?template=platform_report.md)
— düzəlməsinin yeganə yolu budur.

**Bu, adi Claude söhbətlərim üçün də işə yarayır?**

Xeyr. Yalnız Claude Code üçün. Adi söhbətlər Anthropic-in serverlərində durur və
hesablar arasında köçürülə bilmir — bu, alətin yox, məhsulun məhdudiyyətidir.
Hesabı tərk etməzdən əvvəl *Settings → Privacy → Export Data* yolundan istifadə
edin.

**Köhnə söhbətləri yeni hesabın söhbət tarixçəsinə sala bilir?**

Claude Code üçün bəli — elə tam olaraq bunu edir. Adi söhbətlər üçün isə xeyr;
başqa heç bir alət də bunu bacarmır: Claude hesabına keçmişdə verilmiş cavabı
yazmağın yolu yoxdur. Əksini iddia edən alətlər sadəcə söhbətin sizin tərəfinizi
yenidən göndərib Claude-a sıfırdan cavab verdirir.

---

## Komandalar

| Komanda | Nə edir |
|---|---|
| `cairn` | Bu səhifənin başındakı ekranı açır |
| `cairn sync` | Hər şeyi saxlayır, sonra hər hesaba hər şeyi verir |
| `cairn autostart on` | Bunu kompüter açılandan etibarən hər 10 dəqiqədən bir təkrarlayır |
| `cairn status` | Nə var, nə gizlidir, nə risk altındadır |
| `cairn undo` | Son sinxronizasiyanın yazdığını olduğu kimi geri götürür |
| `cairn search <words>` | Bütün hesablarda axtarış aparır |
| `cairn install-mcp` | Claude-un arxivdə özü axtarış aparmasını təmin edir |
| `cairn export` | Bütün söhbətləri Markdown kimi yazıb çıxarır |
| `cairn pack` | Söhbətləri bir çata qoşa biləcəyiniz tək fayla yığır |

Ehtiyat nüsxəniz `~/ClaudeCairn` qovluğunda saxlanılır. Başqa yerə köçürmək üçün
`--vault <folder>` seçimindən və ya `CAIRN_VAULT` mühit dəyişənindən istifadə
edin.

**Tələblər:** Node 22.16 və ya daha yenisi. Başqa heç nə — Cairn-in heç bir
asılılığı yoxdur.

---

## Necə işləyir

*Cairn-dən istifadə etmək üçün bunları bilmək lazım deyil. Burada olmasının
səbəbi sadədir: söhbətlərinizə toxunan bir alət özünü izah edə bilməlidir.*

Claude Code iki ayrı şeyi iki ayrı yerdə saxlayır:

```
~/.claude/projects/<project>/<id>.jsonl
    söhbətin özü
    cleanupPeriodDays-dakı müddətdən köhnə olan kimi silinir — standartı 30 gün

<appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json
    onu siyahıda göstərən yan panel qeydi
    hər hesab üçün ayrıca qovluq; hesab dəyişəndə hər şeyin itməsi buna görədir
```

Cairn birincini təhlükəsiz bir yerə kopyalayır, ikincini isə tapdığı hər hesabın
altına yazır. Söhbətlərə yalnız yeni sətirlər əlavə olunur, ona görə də ölçüsü
böyüməmiş fayl yenidən kopyalanmır; ehtiyat nüsxədən də heç vaxt heç nə
çıxarılmır — Claude-un artıq sildiyi söhbət orada qalır, çünki indi mövcud olan
yeganə nüsxə odur.

Claude hər yan panel qeydini siyahıya salmazdan əvvəl ciddi bir qəlibə görə
yoxlayır və uyğun gəlməyəni səssizcə kənara atır. Cairn bu qeydləri real
fayllarda müşahidə olunan qəlibə uyğun qurur: vaxt möhürləri mətn yox, rəqəm
kimi; artıq bir dənə də sahə olmadan; söhbət fayllarında bəzən rast gəlinən yer
tutucu dəyərlərdən istifadə etmədən.

Axtarış indeksi Node-un içində hazır gələn SQLite-ın tam mətn axtarışına
əsaslanır. MCP server Claude ilə standart giriş və çıxış üzərindən danışır, heç
bir soket açmır.

---

## Beta

Bu, ilk buraxılışdır. Windows-da başdan-ayağa yoxlanılıb: həftələrlə görünməyən
23 söhbət yenidən başlatmadan sonra yan panelə qayıtdı və Cairn-in yazdığı
qeydlərin hamısı qəbul olundu.

21 avtomatik test var; onlardan biri düzülüş qüsurlarını tutmaq üçün interfeysi
yeddi müxtəlif pəncərə ölçüsündə simulyasiya edilmiş terminalda yenidən çəkir.

**Sübut olunmayanlar:** macOS və Linux. Bir də, ilk ehtiyat nüsxənizdən əvvəl
Claude-un sildiyi söhbətlər itib — onları heç nə geri qaytara bilməz.

Problemlə qarşılaşdınız? [Issue açın](https://github.com/veax-project/claude-cairn/issues/new/choose).

---

MIT
