# 🎮 Neon Tetris PWA

Modern, neon-pastel temalı bir Tetris oyunu. Mobil cihazlar ve tabletler için optimize edilmiş Progressive Web App (PWA).

## ✨ Özellikler

- 🎨 **Neon-Pastel Tema** — Karanlık arka plan üzerinde parlayan neon renkli bloklar
- 📱 **PWA Desteği** — Ana ekrana eklenebilir, tam ekran deneyimi
- 🎵 **Ses Sistemi** — Arka plan müziği ve ses efektleri (Web Audio API)
- 🔊 **Ses Kontrolleri** — SFX ve BGM ayrı ayrı açılıp kapatılabilir
- 📳 **Titreşim Desteği** — Mobil cihazlarda dokunsal geri bildirim
- 🔄 **Wall Kick** — Kenarlarda akıllı döndürme sistemi
- 💥 **Parçacık Efektleri** — Satır silindiğinde patlama animasyonu ve ekran sarsıntısı
- 🏆 **En İyi Skor** — Yerel depolama ile kalıcı skor takibi
- ⏸️ **Durdur/Devam** — Oyun duraklatma ve ses ayarları
- 🎯 **Ghost Piece** — Bloğun düşeceği yeri gösteren hayalet parça
- 📦 **Hold Sistemi** — Bir bloğu saklayıp sonra kullanma

## 🚀 Kurulum

**Gereksinimler:** Node.js

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

## 🎮 Kontroller

### Klavye
| Tuş | Aksiyon |
|-----|---------|
| ← → | Sola / Sağa hareket |
| ↓ | Yumuşak düşürme |
| ↑ | Döndürme |
| Space | Sert düşürme |
| C | Hold (Saklama) |
| P | Durdur / Devam |

### Dokunmatik
Ekrandaki butonları kullanın: Sol, Sağ, Aşağı, Sert Düşürme, Döndürme, Hold

## 🛠️ Teknolojiler

- **TypeScript** — Tip güvenli oyun mantığı
- **Vite** — Hızlı geliştirme ve derleme
- **Canvas API** — 2D oyun çizimi
- **Web Audio API** — Sentetik ses efektleri ve müzik
- **CSS3** — Glassmorphism, neon glow, responsive tasarım
- **PWA** — Service Worker, Web App Manifest

## 📁 Proje Yapısı

```
├── index.html          # Ana HTML dosyası
├── src/
│   ├── main.ts         # Oyun mantığı (Game sınıfı + SoundManager)
│   ├── constants.ts    # Sabitler (renkler, şekiller, boyutlar)
│   ├── types.ts        # TypeScript tip tanımları
│   └── style.css       # Tüm stiller ve responsive tasarım
├── public/
│   ├── manifest.json   # PWA manifest
│   └── sw.js           # Service Worker
└── package.json
```
