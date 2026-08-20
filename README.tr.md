[English](README.md) · [Français](README.fr.md) · [Türkçe](README.tr.md) · [Azərbaycanca](README.az.md)

# Cairn

**Claude Code konuşmalarınız, her hesapta.**

> **Beta.** Windows üzerinde uçtan uca doğrulandı — haftalardır görünmeyen 23
> konuşma, bir yeniden başlatmanın ardından geri geldi. macOS ve Linux yolları
> yazıldı ama hiç çalıştırılmadı. Hiçbir şey silinmez, `undo` da her
> değişikliği geri alır.

```bash
npx claude-cairn
```

<p align="center">
  <img src="docs/home.svg" alt="Cairn" width="810">
</p>

İkinci seçeneği seçin, karşınıza numaralı bir liste gelir — istediğiniz
numaraları yazın, enter'a basın, Claude'u yeniden başlatın. Hepsi geri geldi.

---

## Geçmişinizi yiyip bitiren iki şey

### 1. Claude Code, transkriptleri 30 gün sonra siler

Her konuşma diskinizde saklanır; `cleanupPeriodDays` değerinden daha eski
olduğu anda da çöp toplayıcı tarafından silinir — **varsayılan olarak 30 gün**.
Üstelik bu anahtar yepyeni bir `settings.json` dosyasında hiç yer almaz;
dolayısıyla geri sayımın işlediğini neredeyse hiç kimse bilmez.

### 2. Hesap değiştirmek, eski hesaptaki her şeyi gizler

Konuşmanın kendisi ile onu listeleyen kenar çubuğu kaydı iki ayrı dosyadır:

| | Nerede durur | Hesabınıza bağlı mı? |
|---|---|---|
| **Konuşma** | `~/.claude/projects/<project>/<id>.jsonl` | Hayır |
| **Kenar çubuğu kaydı** | `<appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json` | **Evet** |

Başka bir hesapla oturum açtığınızda uygulama farklı bir klasörü okur.
Konuşmalarınız hâlâ diskinizde durur — yalnızca artık listelenmiyor.

Cairn, konuşmaları temizliğin ulaşamayacağı bir yere yedekler ve eksik kenar
çubuğu kayıtlarını şu anda kullandığınız hesabın altına yazar.

---

## Kurulum

Kurulacak bir şey yok. Node 22.16+ gerekiyor (Node'un içinde gelen SQLite tam
metin araması için):

```bash
npx claude-cairn
```

Ya da elinizin altında dursun isterseniz:

```bash
npm install -g claude-cairn
```

---

## Claude kendi geçmişinizde arama yapsın

```bash
npx claude-cairn install-mcp
```

Bu komut, Cairn'i bir MCP sunucusu olarak kaydeder. **MCP sunucuları hesap
başına değil, makine başına yapılandırılır** — işin bütün püf noktası da bu.
Yepyeni bir hesapla oturum açsanız bile Claude, bugüne kadar yaptığınız her
şeye ulaşabilir:

> *"eski konuşmalarımda auth hatasını nasıl düzelttiğimizi ara"*

Çalıştırdıktan sonra Claude'u yeniden başlatın.

---

## Komutlar

`cairn` komutunu argümansız çalıştırmak yukarıdaki arayüzü açar. Adlandırılmış
komutlar ise betik yazmak ve arka planda yedekleme almak için var.

| Komut | Ne yapar |
|---|---|
| `cairn` | Etkileşimli arayüz |
| `autostart on` | Arka planda, sürekli senkronize eder · `--every 10` |
| `sync` | Bir kez yedekler ve her hesaba dağıtır |
| `watch` | Siz durdurana kadar senkronize etmeyi sürdürür · `--every 10` |
| `status` | Neler burada, neler gizli, neler risk altında |
| `backup` | Yalnızca yedekler, senkronizasyon yok |
| `restore` | Yalnızca geçerli hesaba senkronize eder · önizleme için `--dry` |
| `undo` | Senkronizasyonun yazdığı her şeyi geri alır |
| `search <words>` | Bütün hesaplarda arama yapar |
| `install-mcp` | Claude'un arşivde kendi başına arama yapmasını sağlar |
| `export` | Her şeyi Markdown olarak yazar · `--out DIR` |
| `pack [ids…]` | Yeni bir sohbet için konuşmaları tek dosyada toplar |
| `reindex` | Arama dizinini yeniden oluşturur |

## Kur ve unut

```bash
npx claude-cairn autostart on
```

O andan itibaren, bilgisayarınızla birlikte açılıp her on dakikada bir:

- her konuşma, 30 günlük temizliğin ulaşamayacağı bir yere kopyalanır;
- **bu makinedeki her hesaba her konuşma verilir** — yalnızca oturum açtığınız
  hesaba değil.

Böylece gidiş dönüş tam olarak işler: birinci hesapta bir işe başlayın, ikinci
hesaba geçin — iş orada. İkinci hesapta çalışın, birinci hesaba dönün — o iş de
orada. Hesap değiştirdikten sonra Claude'u yeniden başlatın; uygulama bu
dosyaları yalnızca bir kez, açılışta okur.

`autostart off` ile kapatabilirsiniz. Kapattığınızda hiçbir şey silinmez.

### Hesaplar neden başta kod olarak görünür

Claude, oturum klasörlerini hesap UUID'sine göre saklar ve makinenizde bir
UUID'yi tekrar bir kişiyle eşleştiren hiçbir şey yoktur — masaüstü uygulamasının
OAuth önbelleği şifrelidir, loglar da adresi asla yazmaz. Yalnızca şu anda
oturum açtığınız hesap kendini tanıtır, `~/.claude.json` içinde.

Bu yüzden Cairn, her çalıştığında bunu not eder. Bundan sonra kullanacağınız her
hesap, ilk oturum açışınızda kendi adını bildirir. Cairn'i kurmadan *önce*
kullandığınız hesaplar ise siz **Name an account** altında adlandırana kadar
kodlarıyla kalır — liste, her hesabın kaç konuşmayla yola çıktığını, en son ne
zaman kullanıldığını ve başlıklarından birini gösterir; bu da onu tanımaya
genellikle yeter.

Kasa varsayılan olarak `~/ClaudeCairn` dizinidir. `--vault <dir>` ile ya da
`CAIRN_VAULT` ortam değişkeniyle değiştirebilirsiniz.

---

## Verileriniz nereye gidiyor

Hiçbir yere. Cairn, makinenizdeki bir klasörden yine makinenizdeki başka bir
klasöre dosya kopyalar.

- **Sıfır bağımlılık.** `package.json` dosyasındaki `dependencies` bloğu boştur.
- **Sıfır ağ isteği.** Telemetri yok, güncelleme kontrolü yok, analitik yok.
  Wi-Fi'nizi kapatın, bütün komutlar yine de çalışır — bunu doğrulamanın en
  kolay yolu.
- MCP sunucusu, Claude Desktop ile stdin/stdout üzerinden konuşur ve hiçbir
  soket açmaz.
- Kasadan hiçbir zaman bir şey silinmez; `undo` yalnızca Cairn'in kendi yazdığı
  dosyaları, boyutlarından ve zaman damgalarından tanıyarak kaldırır — o
  zamandan beri Claude'un yeniden yazdığı bir dosyaya dokunulmaz.

Düz JavaScript, derleme adımı yok. Buyurun okuyun.

---

## Bu aracın yapmadıkları

Açık konuşalım, çünkü bu soru hemen geliyor:

- ❌ **Konuşmaları bir claude.ai hesabının içine koyamaz.** Anthropic'in
  dokümantasyonu, dışa aktarılan verilerin başka bir kişisel hesaba
  aktarılamayacağını açıkça söylüyor; ayrıca hiçbir API — herkese açık, dahili
  ya da kurumsal — bir konuşmanın içine asistan mesajı yazmanın yolunu sunmuyor.
  Aksini iddia eden her araç, aslında sizin tarafınızı yeniden oynatıp Claude'a
  sıfırdan cevap verdiriyordur.
- ❌ **claude.ai sohbetlerine dokunmaz** (normal sohbet ürünü). Onlar
  Anthropic'in sunucularında durur. Bir hesabı bırakmadan önce *Settings →
  Privacy → Export Data* yolunu kullanın.
- ✅ **Claude Code oturumlarını eksiksiz halleder**, çünkü onlar zaten
  diskinizde.

Bağlamı yeni bir hesaba taşımak için `pack`, yeni bir sohbete ekleyeceğiniz tek
bir Markdown dosyası yazar — resmî olarak desteklenen ve tamamının okunacağı
garanti edilen tek yöntem bu.

---

## Nasıl çalışır

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

`backup`, her iki depoyu da tarar ve ikisini `cliSessionId` üzerinden
birleştirir. Transkriptler yalnızca sona eklenerek büyüdüğü için, boyutu
değişmemiş bir dosya atlanır. Kasadan hiçbir zaman bir şey çıkarılmaz: Claude
Code'un çoktan temizlediği bir konuşma, işaretlenmiş hâlde kasada kalır; çünkü
artık var olan tek kopya odur.

`restore` ise bu bölümlenmeyi geri alır — eksik olan her şey için geçerli
hesabınızın altına bir kenar çubuğu kaydı yazar ve temizliğin alıp götürdüğü
transkriptleri geri koyar.

Yollar platforma göre çözülür (Windows'ta `%APPDATA%\Claude`, macOS'ta
`~/Library/Application Support/Claude`).

---

## Katkıda bulunma

Issue'lar ve PR'lar memnuniyetle karşılanır. Özellikle şunlar işe yarar:

- macOS'taki oturum indeksi yapısının doğrulanması
- Bu dosyaların yerini ya da yapısını değiştiren Claude Desktop sürümleri

```bash
npm test
```

---

## Lisans

MIT
