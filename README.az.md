[English](README.md) · [Français](README.fr.md) · [Türkçe](README.tr.md) · [Azərbaycanca](README.az.md)

# Cairn

**Claude Code söhbətləriniz, bütün hesablarda.**

> **Beta.** Windows-da başdan sona yoxlanılıb — həftələrlə görünməz qalmış
> 23 söhbət bir dəfə yenidən başlatdıqdan sonra geri qayıtdı. macOS və Linux
> yolları yazılıb, amma heç vaxt işlədilməyib. Heç nə silinmir və `undo` hər
> dəyişikliyi geri qaytarır.

```bash
npx claude-cairn
```

<p align="center">
  <img src="docs/home.svg" alt="Cairn" width="810">
</p>

2-ci variantı seçsəniz, qarşınıza nömrələnmiş siyahı çıxır — istədiyiniz
nömrələri yazın, enter-ə basın, Claude-u yenidən başladın. Hamısı geri qayıdıb.

---

## Tarixçənizi yeyib-udan iki şey

### 1. Claude Code transkriptləri 30 gündən sonra silir

Hər söhbət diskinizdə saxlanılır, sonra isə `cleanupPeriodDays` müddətini keçən
kimi avtomatik silinir — **standart olaraq 30 gün**. Üstəlik bu açar təzə
`settings.json` faylında ümumiyyətlə olmur, ona görə də geri sayımın
işlədiyindən demək olar ki, heç kimin xəbəri olmur.

### 2. Hesab dəyişmək köhnə hesabdakı hər şeyi gizlədir

Söhbətin özü və onu siyahıda göstərən yan panel qeydi iki ayrı fayldır:

| | Harada yerləşir | Hesabınıza bağlıdır? |
|---|---|---|
| **Söhbətin özü** | `~/.claude/projects/<project>/<id>.jsonl` | Xeyr |
| **Yan panel qeydi** | `<appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json` | **Bəli** |

Başqa hesabla daxil olduğunuz anda tətbiq artıq başqa qovluğu oxuyur.
Söhbətləriniz hələ də diskdədir — sadəcə artıq siyahıya düşmür.

Cairn söhbətlərin ehtiyat nüsxəsini təmizləmənin əli çatmadığı yerə çıxarır,
çatışmayan yan panel qeydlərini isə hazırda istifadə etdiyiniz hesabın altında
yazır.

---

## Quraşdırma

Quraşdırılacaq heç nə yoxdur. Node 22.16+ tələb olunur (Node-un içində gələn
SQLite tam mətn axtarışı üçün):

```bash
npx claude-cairn
```

Yaxud əlinizin altında saxlayın:

```bash
npm install -g claude-cairn
```

---

## Qoy Claude sizin öz tarixçənizdə axtarış aparsın

```bash
npx claude-cairn install-mcp
```

Bu, Cairn-i MCP server kimi qeydiyyatdan keçirir. **MCP serverləri hesab üzrə
deyil, maşın üzrə konfiqurasiya olunur** — bütün fənd də elə budur. Tamamilə
yeni bir hesaba daxil olun, Claude yenə də indiyədək etdiyiniz hər şeyə çatır:

> *«köhnə söhbətlərimdə axtar, auth baqını necə düzəltmişdik»*

İşə saldıqdan sonra Claude-u yenidən başladın.

---

## Əmrlər

`cairn` əmrini arqumentsiz işə salsanız, yuxarıdakı interfeys açılır. Adı ilə
çağırılan əmrlər isə skript yazmaq və arxa fonda ehtiyat nüsxə çıxarmaq üçündür.

| Əmr | Nə edir |
|---|---|
| `cairn` | İnteraktiv interfeys |
| `autostart on` | Arxa fonda, həmişəlik sinxronlaşdırır · `--every 10` |
| `sync` | Bir dəfə ehtiyat nüsxə çıxarır və bütün hesablara yayır |
| `watch` | Siz dayandırana qədər sinxronlaşdırmağa davam edir · `--every 10` |
| `status` | Nə var, nə gizlidir, nə risk altındadır |
| `backup` | Yalnız ehtiyat nüsxə çıxarır, sinxronlaşdırma yoxdur |
| `restore` | Yalnız cari hesaba sinxronlaşdırır · öncədən baxmaq üçün `--dry` |
| `undo` | Sinxronlaşdırmanın yazdığı hər şeyi geri qaytarır |
| `search <words>` | Bütün hesablar üzrə axtarır |
| `install-mcp` | Qoy Claude arxivdə özü axtarsın |
| `export` | Hər şeyi Markdown kimi yazır · `--out DIR` |
| `pack [ids…]` | Söhbətləri yeni bir çat üçün tək fayla yığır |
| `reindex` | Axtarış indeksini yenidən qurur |

## Qur və unut

```bash
npx claude-cairn autostart on
```

Bundan sonra Cairn kompüterinizlə birlikdə işə düşür və hər on dəqiqədən bir:

- hər söhbət 30 günlük təmizləmənin əli çatmadığı yerə kopyalanır;
- **bu maşındakı hər hesaba bütün söhbətlər verilir** — təkcə daxil olduğunuz
  hesaba yox.

Beləliklə gediş-gəliş işləyir: 1-ci hesabda nəyəsə başlayın, 2-ci hesaba keçin
— iş oradadır. 2-ci hesabda işləyin, 1-ci hesaba qayıdın, həmin iş də oradadır.
Hesab dəyişdikdən sonra Claude-u yenidən başladın — tətbiq bu faylları yalnız
bir dəfə, işə düşərkən oxuyur.

`autostart off` ilə söndürün. Bunu edəndə heç nə silinmir.

### Hesablar nə üçün əvvəlcə kod kimi görünür

Claude sessiya qovluqlarını hesabın UUID-i üzrə saxlayır, maşınınızda isə
UUID-i konkret bir insanla əlaqələndirən heç nə yoxdur — masaüstü tətbiqin
OAuth keşi şifrələnib, loglar isə ünvanı heç vaxt yazmır. Yalnız indi daxil
olduğunuz hesab özünü `~/.claude.json` faylında tanıdır.

Ona görə də Cairn hər işə düşəndə bunu qeyd edir. Bundan sonra istifadə
etdiyiniz hər hesab ilk dəfə daxil olanda özünü adlandırır. Cairn-i
quraşdırmazdan *əvvəl* istifadə etdiyiniz hesablar isə siz onları
**Name an account** bölməsində adlandırana qədər kodları ilə qalır — siyahı hər
birinin neçə söhbətlə başladığını, sonuncu dəfə nə vaxt işlədildiyini və
başlıqlarından birini göstərir ki, bu da adətən onu tanımaq üçün kifayət edir.

Anbar standart olaraq `~/ClaudeCairn` qovluğudur. `--vault <dir>` ilə və ya
`CAIRN_VAULT` mühit dəyişəni ilə dəyişdirin.

---

## Məlumatlarınız hara gedir

Heç yerə. Cairn faylları maşınınızdakı bir qovluqdan yenə maşınınızdakı başqa
bir qovluğa kopyalayır.

- **Sıfır asılılıq.** `package.json` faylında `dependencies` bloku boşdur.
- **Sıfır şəbəkə sorğusu.** Nə telemetriya var, nə yeniləmə yoxlaması, nə də
  analitika. Wi-Fi-ınızı söndürün, bütün əmrlər yenə işləyəcək — bunu yoxlamağın
  ən asan yolu budur.
- MCP server Claude Desktop ilə stdin/stdout üzərindən danışır və heç bir soket
  açmır.
- Anbardan heç vaxt heç nə silinmir və `undo` yalnız Cairn-in özünün yazdığı
  faylları silir; onlar ölçüyə və vaxt möhürünə görə müəyyən edilir — o vaxtdan
  bəri Claude-un yenidən yazdığı fayla toxunulmur.

Bu, sadə JavaScript-dir, heç bir build mərhələsi yoxdur. Buyurun, oxuyun.

---

## Bu alət nəyi *etmir*

Açıq deyirik, çünki bu sual dərhal ortaya çıxır:

- ❌ **O, söhbətləri claude.ai hesabının içinə qoya bilmir.** Anthropic-in
  sənədləri açıq şəkildə deyir ki, ixrac edilmiş məlumatları başqa bir şəxsi
  hesaba idxal etmək mümkün deyil və heç bir API — nə açıq, nə daxili, nə də
  korporativ — söhbətə köməkçi mesajı yazmaq imkanı vermir. Bunun əksini iddia
  edən hər hansı alət əslində sadəcə sizin mesajlarınızı yenidən oynadır və
  Claude-a sıfırdan cavab verdirir.
- ❌ **O, claude.ai söhbətlərinə toxunmur** (adi çat məhsulu). Onlar
  Anthropic-in serverlərində saxlanılır. Bir hesabı tərk etməzdən əvvəl
  *Settings → Privacy → Export Data* bölməsindən istifadə edin.
- ✅ **Claude Code sessiyalarının isə öhdəsindən tam gəlir**, çünki onlar artıq
  sizin diskinizdədir.

Konteksti yeni hesaba daşımaq üçün `pack` tək bir Markdown faylı yazır, siz də
onu təzə söhbətə əlavə edirsiniz — rəsmi olaraq dəstəklənən və tam oxunacağına
zəmanət verilən yeganə üsul budur.

---

## Necə işləyir

```
~/.claude/projects/<project-slug>/<cliSessionId>.jsonl
    the conversation — JSONL, one message per line
    deleted after cleanupPeriodDays (default 30)

<appData>/Claude/claude-code-sessions/<accountUuid>/<orgUuid>/local_*.json
    the sidebar entry — title, project, model, and cliSessionId
    partitioned per account, which is why switching hides your history

<vault>/sessions/<cliSessionId>/transcript.jsonl
    Cairn's copy, outside the reach of the cleanup

<vault>/index.db
    SQLite FTS5 over user and assistant prose
```

`backup` hər iki saxlancı gəzir və onları `cliSessionId` üzrə birləşdirir.
Transkriptlər yalnız sona əlavə olunur, ona görə də ölçüsü dəyişməyən fayl
atlanılır. Anbardan heç vaxt heç nə çıxarılmır: Claude Code-un artıq təmizlədiyi
söhbət nişanlanmış halda yerində qalır, çünki artıq mövcud olan yeganə nüsxə
elə odur.

`restore` bölünməni ləğv edir — çatışmayan hər şey üçün cari hesabınızın altında
yan panel qeydi yazır və təmizləmənin artıq apardığı transkriptləri geri qoyur.

Yollar hər platforma üçün ayrıca müəyyən edilir (Windows-da
`%APPDATA%\Claude`, macOS-da `~/Library/Application Support/Claude`).

---

## Töhfə vermək

Issue və PR-lar məmnuniyyətlə qarşılanır. Xüsusilə faydalı olanlar:

- macOS-da sessiya indeksinin quruluşunu təsdiqləyən məlumat
- Bu faylların yerini və ya formasını dəyişən Claude Desktop buraxılışları

```bash
npm test
```

---

## Lisenziya

MIT
