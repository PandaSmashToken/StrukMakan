import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `You are extracting restaurant receipt data. Return ONLY valid JSON using this exact schema:\n{\n  "restaurant_name": "string",\n  "date": "string",\n  "items": [\n    { "name": "string", "qty": number, "price": number }\n  ],\n  "subtotal": number,\n  "tax": number,\n  "service": number,\n  "total": number\n}\nRules:\n- Detect restaurant or cafe name from the header.\n- Detect transaction date/time if visible.\n- Include only food/drink line items in items.\n- qty must default to 1 if unclear.\n- price must be final numeric value per line item.\n- subtotal, tax, service, total must be numbers, use 0 if missing.\n- Ignore cashier name, table number, payment method, change, promo, rounding, member info, and thank-you text.\n- If uncertain, still provide best-effort structured extraction.`,
            },
            {
              type: 'input_image',
              image_url: image,
            },
          ],
        },
      ],
    });

    return res.status(200).json({ result: response.output_text });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Failed to scan receipt' });
  }
}
