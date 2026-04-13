# Wep Oyunu

Three.js ile hazirlanmis, tarayicidan oynanan 3D refleks oyunu prototipi.

## Ozellikler

- Three.js tabanli 3D sahne
- Kure karakter ve 3 seritli hareket sistemi
- Rastgele uretilen engeller
- Kamera takibi
- Sis, isik, glow ve golge kullanimi
- Mobil ve desktop kontrol desteği
- Vercel uyumlu statik proje yapisi
- Gercek model dosyalari ile asset paketi
- Skin sistemi
- Opsiyonel online leaderboard (Supabase)

## Kurulum

```bash
npm install
npm run generate:assets
npm run dev
```

Telefonla ayni agda test etmek istersen:

```bash
npm run dev:host
```

## Build

```bash
npm run build
```

## Online Leaderboard

Supabase kullanmak istersen:

1. `.env.example` dosyasini `.env` olarak kopyala
2. Supabase proje URL ve anon key bilgilerini gir
3. `supabase/schema.sql` icindeki tabloyu calistir

Env tanimli degilse oyun otomatik olarak yerel leaderboard moduna dusur.

## Yayina Alma

Bu proje `Vite` kullandigi icin GitHub'a push ettikten sonra Vercel'de dogrudan import edilerek yayina alinabilir.

1. `git init`
2. GitHub'da yeni repo olustur
3. Remote bagla ve push et
4. Vercel'de repo import et
5. Deploy sonrasi linki herkesle paylas
