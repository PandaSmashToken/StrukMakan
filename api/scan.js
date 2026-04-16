import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Image is required' });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY belum diisi di Vercel Environment Variables.' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Baca foto struk restoran/kafe ini dan keluarkan JSON valid saja tanpa markdown.
Skema wajib:
{
  "restaurant_name": string,
  "date": string,
  "items": [{"name": string, "qty": number, "price": number}],
  "subtotal": number,
  "tax": number,
  "service": number,
  "discount": number,
  "total": number
}
Aturan:
- price = total harga pada baris item itu, bukan harga satuan.
- Jika tidak yakin, gunakan tebakan paling masuk akal.
- Jika ada diskon/promo/voucher/pembulatan/adjustment, masukkan ke discount sebagai angka positif jika mengurangi total.
- Pastikan total konsisten dengan subtotal + tax + service - discount.
- Jika nilai tidak ada, isi 0.
- Jangan tambahkan penjelasan apa pun di luar JSON.`
            },
            {
              type: 'input_image',
              image_url: image,
              detail: 'high'
            }
          ]
        }
      ]
    });

    const raw = response.output_text || '{}';
    let receipt;
    try {
      receipt = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI tidak mengembalikan JSON yang valid.');
      receipt = JSON.parse(match[0]);
    }

    return res.status(200).json({ receipt });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unknown error' });
  }
}
