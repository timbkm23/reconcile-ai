import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type || 'image/jpeg'
          }
        },
        {
         text: 'Analyze this receipt and return ONLY a valid JSON object with the following keys: "merchant" (string), "date" (string), "total" (number or string), "tax" (number or string), "category" (string, choose the best fit from: Groceries, Dining, Travel, Office Supplies, Utilities, Software, or Other), and "items" (an array of objects, each with "description" and "price"). Do not include any markdown formatting wrappers or conversational filler outside the JSON.'    }
      ]
    });

    return NextResponse.json({ result: response.text });
  } catch (error: any) {
    console.error('Error processing receipt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}