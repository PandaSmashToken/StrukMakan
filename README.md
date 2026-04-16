# SplitBill AI Final

Aplikasi web split bill berbasis AI Vision untuk scan struk restoran/cafe.

## Fitur
- Upload foto struk atau ambil dari kamera
- Scan AI untuk ekstrak nama resto, tanggal, item, subtotal, pajak, service, total
- Edit manual item dan harga
- Assign item ke nama orang
- Hitung split bill otomatis
- Share ke WhatsApp
- Export tagihan cantik ke PNG
- Dark mode

## Stack
- Frontend: static HTML/CSS/JS
- Backend: Vercel Serverless Function
- AI: OpenAI Vision via Responses API

## Deploy ke Vercel
1. Upload semua file project ke repo GitHub
2. Import repo ke Vercel
3. Tambahkan Environment Variable:
   - `OPENAI_API_KEY`
4. Deploy

## Test local
```bash
npm install
npm run dev
```

## Catatan
- Jangan simpan API key di frontend.
- Kalau scan AI gagal parse JSON, biasanya karena model mengembalikan format tidak murni. Di project ini sudah ada sanitasi dasar untuk code fence.
- Untuk akurasi lebih tinggi, bisa ganti model di `api/scan.js`.
