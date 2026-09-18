import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { handleApiRequest } from './src/db/apiHandlers';

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Static route for uploads if local
  const uploadsPath = path.join(process.cwd(), 'data', 'uploads');
  app.use('/data/uploads', express.static(uploadsPath));

  // Mount unified API handler for all standard /api/* endpoints
  app.all('/api/*', async (req, res, next) => {
    if (req.path === '/api/ai/sales-assistant' || req.path === '/api/health') {
      return next();
    }
    try {
      const response = await handleApiRequest(req.path, req.method, req.body, req.headers);
      res.status(response.status).json(response.json);
    } catch (err: any) {
      console.error('Local Express API Error:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  });

  // Health check API
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI Sales Assistant Endpoint: Takes unstructured text/JSON and outputs structured info + English (SA) & Angolan Portuguese Pitches
  app.post('/api/ai/sales-assistant', async (req, res) => {
    try {
      const { rawContent, senderName = 'Olisbel', portfolioUrl = 'https://webcraftstudio.com', previewUrl = '' } = req.body;

      if (!rawContent || typeof rawContent !== 'string') {
        return res.status(400).json({ error: 'rawContent string is required' });
      }

      const effectivePreviewUrl = previewUrl || '[Insert Link to Preview]';
      const effectivePortUrl = portfolioUrl || 'https://webcraftstudio.com';
      const effectiveSender = senderName || 'Olisbel';

      const systemInstruction = `You are an expert sales assistant for a freelance web designer. Your task is to take unstructured information about a business (provided via JSON or text) and generate two concise, polite outreach messages: one in English and one in Angolan Portuguese.

For every business processed, extract or identify:
- Person/Business Name ([Name])
- Whether they need a website or a redesign.

Follow these exact constraints for the outputs:
1. Tone: Formal yet polite, direct, but opening with a natural context-setting sentence.
2. Structure:
   - Mention finding their business and noticing they don't have a website yet (or need an upgrade).
   - Point to a placeholder link for the design concept.
   - Present the special pricing offer.
3. Pricing & Currency by Region/Language:
   - English version (South Africa / general): R650 per year, payable in 3 installments.
   - Portuguese version (Angola): 30,000 Kz per year, payable in 3 installments (use natural Angolan Portuguese phrasing, e.g., "30.000 Kz/ano pagos em 3 prestações").

Output your response clearly separated into English and Portuguese formats using the templates below.

---
### English Version Template:
Hi [Name],

I came across [Business Name] and noticed you don't have a website yet, so I put together a modern design concept for you:

👉 ${effectivePreviewUrl}

If you like the direction, I'm currently running a special to get you online for R650/year (payable in 3 installments), and I can set everything up for you. 

Best,  
${effectiveSender}  
🌐 ${effectivePortUrl}

---
### Portuguese Version Template:
Olá [Name],

Vi a [Business Name] e notei que ainda não têm um site, por isso criei um conceito de design moderno para vocês:

👉 ${effectivePreviewUrl}

Se gostarem da direção, estou com uma promoção especial para vos colocar online por apenas 30.000 Kz/ano (pagos em 3 prestações), e posso tratar de tudo para vocês.

Melhores cumprimentos,  
${effectiveSender}  
🌐 ${effectivePortUrl}

Return ONLY valid JSON adhering strictly to this schema:
{
  "businessName": "Extracted business name or candidate name",
  "contactPerson": "Extracted contact person name, or same as business name if individual",
  "websiteNeed": "needs_website" or "needs_redesign",
  "category": "Extracted industry/service category",
  "country": "Extracted or inferred country (e.g. South Africa, Angola, etc.)",
  "city": "Extracted city if available",
  "phone": "Extracted phone or whatsapp number if available",
  "email": "Extracted email if available",
  "sourceUrl": "Extracted listing URL if available",
  "englishMessage": "Full English outreach pitch string",
  "portugueseMessage": "Full Angolan Portuguese outreach pitch string"
}`;

      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `Here is the unstructured business info:\n\n${rawContent}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json'
          }
        });

        const textResponse = response.text?.trim() || '{}';
        const parsed = JSON.parse(textResponse);
        return res.json({
          success: true,
          data: parsed
        });
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to deterministic extraction:', geminiError.message);

        // Deterministic Regex extraction fallback
        let candidateName = 'Business Owner';
        let candidateContact = 'Business Owner';
        let candidateCategory = 'General Services';
        let candidateCity = '';
        let candidatePhone = '';
        let candidateEmail = '';
        let needsRedesign = false;

        // Simple text scanning
        const emailMatch = rawContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) candidateEmail = emailMatch[0];

        const phoneMatch = rawContent.match(/(?:\+?[\d\s()-]{7,15})/);
        if (phoneMatch) candidatePhone = phoneMatch[0].trim();

        if (/redesign|upgrade|old site|slow site|outdated/i.test(rawContent)) {
          needsRedesign = true;
        }

        // Check if rawContent is JSON
        try {
          const jsonObj = JSON.parse(rawContent);
          if (jsonObj.name || jsonObj.businessName) candidateName = jsonObj.name || jsonObj.businessName;
          if (jsonObj.contactPerson) candidateContact = jsonObj.contactPerson;
          if (jsonObj.category) candidateCategory = jsonObj.category;
          if (jsonObj.city) candidateCity = jsonObj.city;
          if (jsonObj.phone) candidatePhone = jsonObj.phone;
          if (jsonObj.email) candidateEmail = jsonObj.email;
        } catch {
          const lines = rawContent.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            candidateName = lines[0].replace(/^(Business Name:|Name:|Empresa:|Nome:)/i, '').trim();
            candidateContact = candidateName;
          }
        }

        const engSentence = needsRedesign
          ? "noticed your website could use a modern upgrade, so I put together a fresh design concept for you:"
          : "noticed you don't have a website yet, so I put together a modern design concept for you:";

        const ptSentence = needsRedesign
          ? "notei que o vosso site beneficiaria de uma modernização, por isso criei um novo conceito de design para vocês:"
          : "notei que ainda não têm um site, por isso criei um conceito de design moderno para vocês:";

        const englishMessage = `Hi ${candidateContact},\n\nI came across ${candidateName} and ${engSentence}\n\n👉 ${effectivePreviewUrl}\n\nIf you like the direction, I'm currently running a special to get you online for R650/year (payable in 3 installments), and I can set everything up for you.\n\nBest,\n${effectiveSender}\n🌐 ${effectivePortUrl}`;

        const portugueseMessage = `Olá ${candidateContact},\n\nVi a ${candidateName} e ${ptSentence}\n\n👉 ${effectivePreviewUrl}\n\nSe gostarem da direção, estou com uma promoção especial para vos colocar online por apenas 30.000 Kz/ano (pagos em 3 prestações), e posso tratar de tudo para vocês.\n\nMelhores cumprimentos,\n${effectiveSender}\n🌐 ${effectivePortUrl}`;

        return res.json({
          success: true,
          data: {
            businessName: candidateName,
            contactPerson: candidateContact,
            websiteNeed: needsRedesign ? 'needs_redesign' : 'needs_website',
            category: candidateCategory,
            country: 'South Africa',
            city: candidateCity,
            phone: candidatePhone,
            email: candidateEmail,
            englishMessage,
            portugueseMessage
          }
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error processing business information' });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WebCraft Studio Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
