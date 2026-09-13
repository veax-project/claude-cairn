<div align="center">

<img src="docs/hero.svg" alt="Cairn — Claude Code söhbətləriniz, bütün hesablarda" width="100%">

<br><br>

# Cairn

**Claude Code söhbətləriniz, bütün hesablarda.**<br>
Claude onları silməmişdən əvvəl saxlanılır, daxil olduğunuz hər hesabda qarşınıza çıxır.

<br>

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-D97757?style=flat-square)](LICENSE)
[![For Claude Code](https://img.shields.io/badge/for-Claude%20Code-1B1B1F?style=flat-square)](https://claude.com/claude-code)
[![Dependencies: none](https://img.shields.io/badge/dependencies-none-3A3A44?style=flat-square)](#-where-your-data-goes)
[![No network calls](https://img.shields.io/badge/network%20calls-none-3A3A44?style=flat-square)](#-where-your-data-goes)
[![Status: beta](https://img.shields.io/badge/status-beta-D6A854?style=flat-square)](#-beta)

🇬🇧 [English](README.md) · 🇫🇷 [Français](README.fr.md) · 🇹🇷 [Türkçe](README.tr.md) · 🇦🇿 Azərbaycanca

</div>

<br>

---

## 🎯 Niyə

Başqa bir Claude hesabına daxil oldunuz və söhbətləriniz yoxa çıxdı.

**Onlar itməyib.** Onlar diskinizdə, tam olaraq əvvəlki yerindədir. Claude hər
hesab üçün ayrıca siyahı saxlayır və siz başqa yerdən daxil olandan sonra o,
yanlış siyahını oxuyur.

Daha səssiz, amma daha pis olan ikinci bir problem də var: **Claude Code
söhbətləri 30 gündən sonra silir.** Standart olaraq, sizə heç nə demədən.
Çoxu bunu istədiyi bir şey artıq yoxa çıxandan sonra öyrənir.

Cairn hər ikisini həll edir və sonra yolunuzdan çəkilir.

---

## 🚀 Quraşdırma

### 🪟 Windows — terminal lazım deyil

| | |
|---|---|
| **1** | [**⬇ `Cairn.cmd` faylını yükləyin**](https://github.com/veax-project/claude-cairn/releases/download/v1.0.0-beta.2/Cairn.cmd) — brauzeriniz faylı saxlamaq istəyib-istəmədiyinizi soruşa bilər. Saxlayın. |
| **2** | Faylın üzərinə **iki dəfə klikləyin**. |
| **3** | **`1`** düyməsinə basın, bir neçə saniyə gözləyin. |
| **4** | **Claude-u tamamilə bağlayın**, sonra yenidən açın. |

Hazırdır. Söhbətləriniz yan panelə qayıdıb.

Bir dəfə də işə salın və avtomatik sinxronizasiyanı qoşmaq üçün **`3`**
düyməsinə basın — beləcə bu, əl ilə nəsə etdiyiniz son dəfə olar.

### 🍎 macOS / 🐧 Linux

```bash
npx github:veax-project/claude-cairn
```

Eyni ekran, eyni addımlar.

<br>

> ### ⚠️ Sonra Claude-dan çıxın və yenidən açın
> Claude söhbət siyahısını **yalnız bir dəfə, işə düşəndə** oxuyur. Cairn bu
> siyahıya əlavə edə bilər, amma Claude bunu növbəti açılışa qədər görməyəcək.
> İnsanların «işləmədi» deyə düşünməsinin 1 nömrəli səbəbi budur.

> ### 📦 [Node.js](https://nodejs.org) tələb olunur
> Əksər developerlərdə artıq var. Sizdə yoxdursa, pəncərə bunu deyəcək və
> sizi ora yönləndirəcək — **LTS** işarəli versiyanı quraşdırın, sonra yenidən
> işə salın.

---

## ✨ Nə edir

- 💾 **Onları saxlayır.** Hər söhbət Claude-un silmədiyi bir yerə köçürülür. O nüsxə sizindir və onu heç nə silmir.
- 🔄 **Onları paylaşır.** Kompüterinizdəki hər hesab bütün söhbətləri alır — **hər iki istiqamətdə**. Bir hesabda başlayın, digərinə keçin — söhbət oradadır. Geri qayıdın, arada gördüyünüz iş də oradadır.
- 👁️ **İzləyir.** Avtomatik sinxronizasiyanı qoşun — hər ikisi kompüteriniz açılan andan etibarən hər on dəqiqədən bir təkrarlanacaq. Bir daha bu barədə düşünməyəcəksiniz.
- 🔎 **Claude-a orada axtarış etməyə imkan verir.** İstənilən hesabdan, hətta beş dəqiqə əvvəl yaratdığınızdan belə.
- ↩️ **Özünü geri alır.** Bir əmr onun yazdığını tam olaraq silir, başqa heç nəyə toxunmur.

---

## 🔌 Claude öz tarixçənizdə axtarış etsin

```bash
npx github:veax-project/claude-cairn install-mcp
```

Claude-u yenidən başladın, sonra ondan belə şeylər soruşun:

> *köhnə söhbətlərimdə auth xətasını necə düzəltdiyimizi axtar*

<div align="center">
<img src="docs/accounts.svg" alt="Hesablar ekranı" width="820">
</div>

Bu, **istənilən** hesabda işləyir — hətta təzəcə yaratdığınızda da. Bütün məsələ
elə budur: bağlantı hesaba yox, kompüterinizə aiddir.

---

## 🔗 Qoşulmalar

Cairn həm də hər hesabın hansı qoşulmalardan istifadə etdiyini qeyd edir —
Vercel, Gmail, Stripe, Supabase və digərləri — və yeni hesabda hansılarının
əskik olduğunu göstərir.

```bash
npx github:veax-project/claude-cairn connectors
```

```
On this account
  OK  Vercel          37 tools, last used 2026-08-26

You had these, this account does not
  --  Resend          91 tools, last used 2026-08-04
  --  Stripe           9 tools, last used 2026-08-04
  --  Supabase        29 tools, last used 2026-08-04
```

> **O bunları yenidən qoşa bilməz, heç nə də qoşa bilməz.** Bir xidməti
> Claude-a bağlamaq Anthropic-in serverlərində yalnız bir hesab üçün saxlanılan
> icazədir; kompüterinizdə köçürüləcək token yoxdur. Yaxşı xəbər: eyni xidmət
> istədiyiniz qədər Claude hesabına qoşula bilər — yeganə xərc kliklərdir, bu
> siyahı isə yadda saxlamaq məcburiyyətindən azad edir.

> **Yerli MCP serverləri isə ayrı məsələdir.** `~/.claude.json` içindəkilər —
> giriş etməklə deyil, komanda ilə əlavə etdikləriniz — onsuz da kompüterə
> bağlıdır, ona görə də hesablar arasında özləri sizinlə gəlir. Geridə
> qalanlar brauzerdə icazə verdiyiniz uzaq qoşulmalardır.

---

## 🧯 Problemlərin həlli

| Əlamət | Səbəb | Həlli |
|---|---|---|
| 😐 Heç nə qayıtmadı | Claude artıq açıq idi | **Onu tamamilə bağlayın** və yenidən açın — siyahını yalnız işə düşəndə oxuyur |
| 🪟 Pəncərə dərhal bağlandı | Node.js yoxdur | [nodejs.org](https://nodejs.org) saytından quraşdırın, **LTS**-i seçin, faylı yenidən işə salın |
| 🤷 Bir söhbət hələ də yoxdur | O, başqa layihəyə aid idi | Yan panel layihəyə görə süzülür — həmin layihənin qovluğunu açın |
| 🔢 Hesablar kod kimi görünür | Diskinizdə onların kim olduğunu yazan heç nə yoxdur | **`4`** düyməsinə basıb onlara ad verin; yeni hesablar özləri ad alır |
| 😱 Vəziyyəti daha da pisləşdirdi | — | `undo` hər şeyi tam əvvəlki halına qaytarır |
| 🍎 Mac-də ümumiyyətlə heç nə olmur | Orada heç vaxt sınaqdan keçirilməyib | [Nə baş verdiyini bizə yazın](https://github.com/veax-project/claude-cairn/issues/new?template=platform_report.md) — düzəlməsinin yeganə yolu budur |

---

## 🛡️ Məlumatlarınız hara gedir

**Heç yerə.** Cairn faylları kompüterinizdəki bir qovluqdan yenə
kompüterinizdəki başqa bir qovluğa köçürür.

- 🚫 **Sıfır asılılıq.** `package.json` faylındakı `dependencies` bloku boşdur.
- 🚫 **Sıfır şəbəkə sorğusu.** Telemetriya yoxdur, yeniləmə yoxlaması yoxdur, analitika yoxdur. **Wi-Fi-ı söndürün, bütün əmrlər yenə işləyir** — özünüz yoxlamağın ən asan yolu budur.
- 🔌 MCP serveri Claude ilə standart giriş və çıxış üzərindən danışır. Heç bir soket açmır.
- 🗑️ Ehtiyat nüsxənizdən **heç vaxt heç nə silinmir**. Hətta Cairn-in özü tərəfindən də.
- ↩️ `undo` yalnız öz yazdığını silir — onu ölçüsünə və vaxt möhürünə görə tanıyır; o vaxtdan bəri Claude-un toxunduğu heç nəyə dəymir.

<details>
<summary><b>📄 Nə quraşdırdığınızı dəqiq görün</b></summary>

<br>

Təxminən 3000 sətir sadə JavaScript; nə build addımı var, nə bundler. `src/`
qovluğunda on bir fayl var və onların hər birini oxuya bilərsiniz.

Başlatma faylı 90 sətirlik bir `.cmd`-dir: Node-un olub-olmadığını yoxlayır,
buraxılış arxivini yükləyir və onu işə salır. Tam ASCII-dir və başqa heç nə
etmir.

</details>

---

## 📋 Əmrlər

| Əmr | Nə edir |
|---|---|
| `cairn` | Bu səhifənin yuxarısındakı ekranı açır |
| `cairn sync` | Hər şeyi saxlayır, sonra hər hesaba hər şeyi verir |
| `cairn autostart on` | Bunu kompüter açılandan etibarən hər 10 dəqiqədən bir təkrarlayır |
| `cairn status` | Burada nə var, nə gizlidir, nə risk altındadır |
| `cairn undo` | Son sinxronizasiyanın yazdığını tam olaraq silir |
| `cairn search <words>` | Bütün hesablar üzrə axtarış |
| `cairn connectors` | Bu hesabda əskik olan qoşulmalar |
| `cairn install-mcp` | Claude arxivdə özü axtarış etsin |
| `cairn export` | Hər söhbəti Markdown kimi yazır |
| `cairn pack` | Söhbətləri bir fayla yığır ki, onu bir söhbətə əlavə edə biləsiniz |

Ehtiyat nüsxəniz `~/ClaudeCairn` qovluğunda saxlanılır. Onu `--vault <folder>`
və ya `CAIRN_VAULT` mühit dəyişəni ilə başqa yerə köçürə bilərsiniz.

---

## 🔬 Necə işləyir

<details>
<summary><b>Cairn-dən istifadə etmək üçün buna ehtiyacınız yoxdur — amma söhbətlərinizə toxunan bir alət özünü izah edə bilməlidir</b></summary>

<br>

Claude Code iki ayrı şeyi, iki ayrı yerdə saxlayır:

```
~/.claude/projects/<project>/<id>.jsonl
    the conversation itself
    deleted once it is older than cleanupPeriodDays — 30 by default

<appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json
    the sidebar entry that lists it
    one folder per account, which is why switching hides everything
```

Cairn birincisini təhlükəsiz bir yerə köçürür, ikincisini isə tapdığı hər
hesabın altında yazır. Söhbətlərə yalnız sonundan əlavə olunur, ona görə də
böyüməyən fayl atlanılır. Ehtiyat nüsxədən heç vaxt heç nə silinmir — Claude-un
artıq sildiyi bir söhbət orada qalır, çünki həmin nüsxə artıq mövcud olan
yeganə nüsxədir.

Claude hər yan panel qeydini siyahıya salmazdan əvvəl ciddi bir formata uyğun
gəldiyini yoxlayır və uyğun gəlməyəni səssizcə atır. Cairn onları real
fayllarda müşahidə olunan formaya görə qurur: **vaxt möhürləri mətn yox, rəqəm
kimi**, artıq sahə olmadan və bəzən transkriptlərdə rast gəlinən doldurucu
dəyərlərin heç biri olmadan.

Axtarış indeksi SQLite-ın tam mətn axtarışına əsaslanır və Node-un daxilində
hazır gələn nüsxədən istifadə edir. Heç bir asılılığın olmamasının səbəbi budur.

</details>

---

## ⚠️ Beta

İlk buraxılış. Windows-da başdan-sona yoxlanılıb: yenidən başlatdıqdan sonra
**həftələrlə görünməyən 23 söhbət** yan panelə qayıtdı və Cairn-in yazdığı hər
qeyd qəbul edildi.

21 avtomatlaşdırılmış test var; onlardan biri düzülüş xətalarını tutmaq üçün
interfeysi simulyasiya edilmiş terminalda yeddi fərqli pəncərə ölçüsündə
yenidən çəkir.

| | |
|---|---|
| ✅ **Sübut olunub** | Windows |
| ❓ **Heç vaxt işlədilməyib** | macOS, Linux — kod yazılıb və nəzərdən keçirilib, o qədər |
| ❌ **Mümkün deyil** | İlk ehtiyat nüsxənizdən əvvəl Claude-un sildiyi söhbətlər. Onları heç nə geri qaytara bilməz. |
| ❌ **Əhatə dairəsindən kənar** | Adi claude.ai söhbətləri. Onlar Anthropic-in serverlərində saxlanılır və hesablar arasında köçürülə bilməz — bu, alətin yox, məhsulun məhdudiyyətidir. |

[Issue açın](https://github.com/veax-project/claude-cairn/issues/new/choose) — xüsusən də Mac istifadə edirsinizsə.

---

<div align="center">

**GPL-3.0** · Hesab dəyişəndə işinizi itirməməlisiniz deyə hazırlanıb.

</div>
