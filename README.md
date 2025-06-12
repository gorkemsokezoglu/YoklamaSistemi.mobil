# Yüz Tanıma Tabanlı Yoklama Sistemi 📱

Bu mobil uygulama, eğitim kurumları için yüz tanıma teknolojisi kullanarak yoklama almayı otomatikleştiren bir sistemdir. React Native ve Expo ile geliştirilmiştir.

## 🚀 Özellikler

- 👤 Yüz tanıma ile otomatik yoklama
- 📊 Yoklama istatistikleri ve raporlama
- 📅 Ders programı yönetimi
- 👥 Öğrenci ve öğretmen yönetimi
- 📱 Cross-platform (iOS ve Android desteği)
- 🔐 Güvenli kimlik doğrulama sistemi

## 🛠 Teknolojiler

- React Native
- Expo
- ML Kit Face Detection
- React Navigation
- Expo Camera
- React Native Paper
- Axios
- TypeScript

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- npm veya yarn
- Expo CLI
- iOS için Xcode (iOS geliştirmesi için)
- Android için Android Studio (Android geliştirmesi için)

## 🔧 Kurulum

1. Projeyi klonlayın:

```bash
git clone https://github.com/gorkemsokezoglu/YoklamaSistemi.mobil.git
cd YoklamaSistemi.mobil
```

2. Bağımlılıkları yükleyin:

```bash
npm install
# veya
yarn install
```

3. Uygulamayı başlatın:

```bash
npm start
# veya
yarn start
```

## 📱 Uygulama Kullanımı

1. **Giriş Yapma**

   - Öğretmen veya öğrenci hesabınızla giriş yapın
   - Güvenli kimlik doğrulama sistemi

2. **Yoklama Alma (Öğretmen)**

   - Yeni yoklama başlat
   - Öğrenci yüzlerini otomatik tanıma
   - Yoklama durumunu gerçek zamanlı görüntüleme

3. **Yoklama Görüntüleme (Öğrenci)**
   - Devam durumunu kontrol etme
   - Geçmiş yoklamaları görüntüleme
   - İstatistikleri inceleme

## 🔑 Ortam Değişkenleri

Uygulamayı çalıştırmak için aşağıdaki ortam değişkenlerini `.env` dosyasında tanımlamanız gerekmektedir:

```env
API_URL=your_api_url
```

## 📦 Derleme

Android için APK oluşturma:

```bash
expo build:android
```

iOS için IPA oluşturma:

```bash
expo build:ios
```
