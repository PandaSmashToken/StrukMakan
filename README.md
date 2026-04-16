# SplitBill AI Final

Web app untuk membaca struk restoran dengan AI, edit manual item, membagi item ke banyak orang, split bill otomatis, export PNG, dan share ke WhatsApp.

## Deploy ke Vercel
1. Upload semua file ke repo GitHub.
2. Import repo ke Vercel.
3. Tambahkan Environment Variable:
   - `OPENAI_API_KEY`
4. Deploy.

## Struktur
- `index.html` - UI utama
- `style.css` - styling
- `app.js` - logic frontend
- `api/scan.js` - backend AI untuk scan struk
- `.env.example` - contoh env

## Catatan
- API key OpenAI hanya diisi di Vercel, jangan di frontend.
- Jika ada item dengan qty > 1, gunakan tombol **Pisahkan Qty** atau **Pisahkan Semua Qty > 1**.
- Satu item bisa dipilih untuk banyak orang sekaligus.
