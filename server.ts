import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // --- IMAGE PROXY TO BYPASS CORS ---
  app.get('/api/proxy-image', async (req, res) => {
    try {
      let imageUrl = req.query.url;
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).send('URL is required');
      }

      // If client passed a data: URI, decode and return it directly
      if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const buffer = Buffer.from(parts[1] || '', 'base64');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', mime);
        return res.send(buffer);
      }

      // -- SMART URL RESOLVER --
      let driveId = '';
      if (imageUrl.includes('drive.google.com')) {
        const dMatch = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (dMatch && dMatch[1]) {
          driveId = dMatch[1];
        }
      }

      const candidateUrls: string[] = [];
      if (driveId) {
        // Direct Google CDN & Thumbnail Endpoints for Drive images
        candidateUrls.push(`https://lh3.googleusercontent.com/d/${driveId}`);
        candidateUrls.push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w2500`);
        candidateUrls.push(`https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`);
      } else if (imageUrl.includes('dropbox.com/') && imageUrl.includes('?dl=0')) {
        candidateUrls.push(imageUrl.replace('?dl=0', '?raw=1'));
      } else if (imageUrl.includes('imgur.com/') && !imageUrl.includes('i.imgur.com')) {
        const match = imageUrl.match(/imgur\.com\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          candidateUrls.push(`https://i.imgur.com/${match[1]}.jpg`);
        }
      } else if (imageUrl.includes('ibb.co/')) {
        try {
          const htmlRes = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const htmlText = await htmlRes.text();
          const match = htmlText.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) || htmlText.match(/<link\s+rel="image_src"\s+href="([^"]+)"/i);
          if (match && match[1]) {
            candidateUrls.push(match[1]);
          }
        } catch(e) {}
        candidateUrls.push(imageUrl);
      } else {
        candidateUrls.push(imageUrl);
      }

      let validBuffer: Buffer | null = null;
      let validContentType = 'image/jpeg';

      for (const targetUrl of candidateUrls) {
        try {
          const imageRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
              'Referer': targetUrl
            },
            redirect: 'follow'
          });

          if (!imageRes.ok) continue;

          let contentType = imageRes.headers.get('content-type') || '';
          const arrayBuf = await imageRes.arrayBuffer();
          const buf = Buffer.from(arrayBuf);

          if (contentType.includes('text/html')) {
            const htmlText = buf.toString('utf-8');
            const ogImageMatch = htmlText.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
            if (ogImageMatch && ogImageMatch[1]) {
              const retryRes = await fetch(ogImageMatch[1], {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': targetUrl },
                redirect: 'follow'
              });
              if (retryRes.ok) {
                validContentType = retryRes.headers.get('content-type') || 'image/jpeg';
                validBuffer = Buffer.from(await retryRes.arrayBuffer());
                break;
              }
            }
            continue;
          }

          if (buf.length > 50) {
            validBuffer = buf;
            validContentType = contentType || 'image/jpeg';
            break;
          }
        } catch (e) {
          // continue to next candidate url
        }
      }

      if (!validBuffer) {
        throw new Error('Could not retrieve image buffer from candidate URLs');
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Content-Type', validContentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(validBuffer);
    } catch (err) {
      console.error('[Image Proxy Error]', err);
      res.status(404).send('Image fetch failed');
    }
  });

  // --- STEADFAST COURIER (SFC) INTEGRATION ---
  const STEADFAST_API_KEY = process.env.STEADFAST_API_KEY || 'lhigcp1yxdqrcdtmhth0cvdekae3c8u2';
  const STEADFAST_SECRET_KEY = process.env.STEADFAST_SECRET_KEY || '7ksaufrn6qqjhxpk0prsugls';
  const STEADFAST_BASE_URL = 'https://portal.packzy.com/api/v1';

  // In-memory cache for Steadfast status queries (30 seconds TTL)
  const sfcCache = new Map<string, { data: any; expiresAt: number }>();

  async function querySteadfastStatus(cnNumber?: any, trackingCode?: any) {
    const rawCn = (cnNumber !== undefined && cnNumber !== null ? String(cnNumber) : '').trim();
    const rawTrack = (trackingCode !== undefined && trackingCode !== null ? String(trackingCode) : '').trim();
    
    const cacheKey = `${rawCn}||${rawTrack}`;
    const cached = sfcCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const headers = {
      'Api-Key': STEADFAST_API_KEY,
      'Secret-Key': STEADFAST_SECRET_KEY,
      'Content-Type': 'application/json'
    };

    // Candidates for CID lookup
    const cidCandidates: string[] = [];
    if (rawCn) {
      cidCandidates.push(rawCn);
      const digitsOnly = rawCn.replace(/^[^\d]+/, '').trim();
      if (digitsOnly && digitsOnly !== rawCn) {
        cidCandidates.push(digitsOnly);
      }
    }

    // 1. Try status_by_cid
    for (const cid of cidCandidates) {
      try {
        const res = await fetch(`${STEADFAST_BASE_URL}/status_by_cid/${encodeURIComponent(cid)}`, { headers });
        if (res.ok) {
          const json: any = await res.json();
          if (json && (json.status === 200 || json.delivery_status)) {
            const rawCharge = json.delivery_charge !== undefined ? json.delivery_charge : (json.delivery_fee !== undefined ? json.delivery_fee : (json.charge !== undefined ? json.charge : (json.parcel && json.parcel.delivery_charge !== undefined ? json.parcel.delivery_charge : undefined)));
            const deliveryCharge = rawCharge !== undefined ? Number(rawCharge) : undefined;
            const codFee = json.cod_fee !== undefined ? Number(json.cod_fee) : (json.cod_charge !== undefined ? Number(json.cod_charge) : undefined);
            const result = { 
              success: true, 
              delivery_status: json.delivery_status || 'unknown', 
              delivery_charge: deliveryCharge,
              cod_fee: codFee,
              details: json, 
              matchedBy: 'cid', 
              matchedId: cid 
            };
            sfcCache.set(cacheKey, { data: result, expiresAt: Date.now() + 30000 });
            return result;
          }
        }
      } catch (e) {
        console.warn(`[SFC] CID lookup failed for ${cid}:`, e);
      }
    }

    // 2. Try status_by_trackingcode
    const trackCandidate = rawTrack || (rawCn.length > 5 ? rawCn : '');
    if (trackCandidate) {
      try {
        const res = await fetch(`${STEADFAST_BASE_URL}/status_by_trackingcode/${encodeURIComponent(trackCandidate)}`, { headers });
        if (res.ok) {
          const json: any = await res.json();
          if (json && (json.status === 200 || json.delivery_status)) {
            const rawCharge = json.delivery_charge !== undefined ? json.delivery_charge : (json.delivery_fee !== undefined ? json.delivery_fee : (json.charge !== undefined ? json.charge : (json.parcel && json.parcel.delivery_charge !== undefined ? json.parcel.delivery_charge : undefined)));
            const deliveryCharge = rawCharge !== undefined ? Number(rawCharge) : undefined;
            const codFee = json.cod_fee !== undefined ? Number(json.cod_fee) : (json.cod_charge !== undefined ? Number(json.cod_charge) : undefined);
            const result = { 
              success: true, 
              delivery_status: json.delivery_status || 'unknown', 
              delivery_charge: deliveryCharge,
              cod_fee: codFee,
              details: json, 
              matchedBy: 'tracking_code', 
              matchedId: trackCandidate 
            };
            sfcCache.set(cacheKey, { data: result, expiresAt: Date.now() + 30000 });
            return result;
          }
        }
      } catch (e) {
        console.warn(`[SFC] Tracking lookup failed for ${trackCandidate}:`, e);
      }
    }

    // 3. Try status_by_invoice
    const invCandidates: string[] = [];
    if (rawCn) invCandidates.push(rawCn);
    for (const inv of invCandidates) {
      try {
        const res = await fetch(`${STEADFAST_BASE_URL}/status_by_invoice/${encodeURIComponent(inv)}`, { headers });
        if (res.ok) {
          const json: any = await res.json();
          if (json && (json.status === 200 || json.delivery_status)) {
            const rawCharge = json.delivery_charge !== undefined ? json.delivery_charge : (json.delivery_fee !== undefined ? json.delivery_fee : (json.charge !== undefined ? json.charge : (json.parcel && json.parcel.delivery_charge !== undefined ? json.parcel.delivery_charge : undefined)));
            const deliveryCharge = rawCharge !== undefined ? Number(rawCharge) : undefined;
            const codFee = json.cod_fee !== undefined ? Number(json.cod_fee) : (json.cod_charge !== undefined ? Number(json.cod_charge) : undefined);
            const result = { 
              success: true, 
              delivery_status: json.delivery_status || 'unknown', 
              delivery_charge: deliveryCharge,
              cod_fee: codFee,
              details: json, 
              matchedBy: 'invoice', 
              matchedId: inv 
            };
            sfcCache.set(cacheKey, { data: result, expiresAt: Date.now() + 30000 });
            return result;
          }
        }
      } catch (e) {
        console.warn(`[SFC] Invoice lookup failed for ${inv}:`, e);
      }
    }

    const notFoundResult = { success: false, delivery_status: 'not_found', message: 'No active Steadfast record found' };
    sfcCache.set(cacheKey, { data: notFoundResult, expiresAt: Date.now() + 20000 });
    return notFoundResult;
  }

  app.get('/api/steadfast/status/:cnNumber', async (req, res) => {
    try {
      const cnNumber = req.params.cnNumber;
      const trackingCode = req.query.tracking as string;
      const result = await querySteadfastStatus(cnNumber, trackingCode);
      res.json(result);
    } catch (err: any) {
      console.error('[SFC API Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/steadfast/status', async (req, res) => {
    try {
      const { cnNumber, trackingCode } = req.body;
      const result = await querySteadfastStatus(cnNumber, trackingCode);
      res.json(result);
    } catch (err: any) {
      console.error('[SFC API Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/steadfast/bulk-status', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items must be an array' });
      }
      const results: Record<string, any> = {};
      await Promise.all(
        items.slice(0, 100).map(async (item: any) => {
          if (!item || !item.id) return;
          const status = await querySteadfastStatus(item.cnNumber, item.trackingCode);
          results[item.id] = status;
        })
      );
      res.json({ results });
    } catch (err: any) {
      console.error('[SFC Bulk API Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/steadfast/balance', async (req, res) => {
    try {
      const resp = await fetch(`${STEADFAST_BASE_URL}/get_balance`, {
        headers: {
          'Api-Key': STEADFAST_API_KEY,
          'Secret-Key': STEADFAST_SECRET_KEY,
          'Content-Type': 'application/json'
        }
      });
      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      console.error('[SFC Balance Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- STEADFAST FRAUD CHECK ENGINE ---
  const fraudCache = new Map<string, { data: any; expiresAt: number }>();

  function normalizeCustomerPhone(rawPhone: any): string {
    if (rawPhone === undefined || rawPhone === null) return '';
    let str = String(rawPhone).trim();
    // Convert Bengali digits (০-৯) to English digits (0-9)
    const bnToEn: Record<string, string> = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
    str = str.replace(/[০-৯]/g, d => bnToEn[d] || d);
    
    // Remove non-digit characters
    let digits = str.replace(/\D/g, '');
    
    // Handle Bangladesh country code prefixes (+880, 880, 88)
    if (digits.startsWith('880') && digits.length >= 13) {
      digits = digits.slice(2); // leaves 01... (11 digits)
    } else if (digits.startsWith('880')) {
      digits = digits.slice(2);
    } else if (digits.startsWith('88') && digits.length >= 13) {
      digits = digits.slice(2);
    }

    // If starts with 1 and is 10 digits (e.g. 1711223344), attach leading 0
    if (digits.length === 10 && digits.startsWith('1')) {
      digits = '0' + digits;
    }
    
    // If doesn't start with 0 and is up to 10 digits, attach leading 0
    if (digits.length > 0 && !digits.startsWith('0') && digits.length <= 10) {
      digits = '0' + digits;
    }

    return digits;
  }

  async function querySteadfastFraudCheck(phoneInput: any) {
    const normalized = normalizeCustomerPhone(phoneInput);
    if (!normalized || normalized.length < 8) {
      return { success: false, phone: normalized, reason: 'Invalid or missing phone number' };
    }

    const cached = fraudCache.get(normalized);
    if (cached && cached.expiresAt > Date.now() && cached.data && cached.data.success) {
      return cached.data;
    }

    const candidateUrls = [
      `https://portal.packzy.com/api/v1/fraud_check/${encodeURIComponent(normalized)}`,
      `https://portal.steadfast.com.bd/api/v1/fraud_check/${encodeURIComponent(normalized)}`
    ];

    let lastError = '';

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            'Api-Key': STEADFAST_API_KEY,
            'Secret-Key': STEADFAST_SECRET_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const json: any = await res.json();
          const totalParcels = Number(json.total_parcels) || 0;
          const totalDelivered = Number(json.total_delivered) || 0;
          const totalCancelled = Number(json.total_cancelled) || 0;
          const fraudReports = Array.isArray(json.total_fraud_reports) ? json.total_fraud_reports : [];
          const hasFraudReports = fraudReports.length > 0;

          let deliveryRate = 0;
          let cancelRate = 0;
          let riskLevel: 'low' | 'medium' | 'high' | 'fraud' | 'new' = 'new';
          let riskLabel = 'New Customer';

          if (totalParcels > 0) {
            deliveryRate = Math.round((totalDelivered / totalParcels) * 100);
            cancelRate = Math.round((totalCancelled / totalParcels) * 100);

            if (hasFraudReports) {
              riskLevel = 'fraud';
              riskLabel = `Fraud Alert (${fraudReports.length})`;
            } else if (deliveryRate >= 80) {
              riskLevel = 'low';
              riskLabel = `Reliable (${deliveryRate}%)`;
            } else if (deliveryRate >= 50) {
              riskLevel = 'medium';
              riskLabel = `Moderate (${deliveryRate}%)`;
            } else {
              riskLevel = 'high';
              riskLabel = `High Risk (${deliveryRate}%)`;
            }
          } else if (hasFraudReports) {
            riskLevel = 'fraud';
            riskLabel = `Fraud Alert (${fraudReports.length})`;
          }

          const result = {
            success: true,
            phone: normalized,
            rawPhone: phoneInput,
            totalParcels,
            totalDelivered,
            totalCancelled,
            deliveryRate,
            cancelRate,
            fraudReports,
            riskLevel,
            riskLabel,
            timestamp: new Date().toISOString()
          };

          // Cache verified results for 10 minutes
          fraudCache.set(normalized, { data: result, expiresAt: Date.now() + 10 * 60 * 1000 });
          return result;
        } else {
          const errorText = await res.text();
          let displayError = errorText;
          try {
            const parsed = JSON.parse(errorText);
            displayError = parsed.error || parsed.message || errorText;
          } catch (e) {}
          lastError = displayError;
          // If not 404, might be rate limit, try next or fallback
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    // If both failed, return a structured fallback without corrupting long-term cache
    const fallback = {
      success: false,
      phone: normalized,
      rawPhone: phoneInput,
      error: lastError || 'Check Failed',
      riskLevel: 'unknown',
      riskLabel: 'Check Failed'
    };
    return fallback;
  }

  app.get('/api/steadfast/fraud-check/:phone', async (req, res) => {
    try {
      const phone = req.params.phone;
      const result = await querySteadfastFraudCheck(phone);
      res.json(result);
    } catch (err: any) {
      console.error('[SFC Fraud Check API Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/steadfast/bulk-fraud-check', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items must be an array of objects or phones' });
      }
      const results: Record<string, any> = {};
      const batch = items.slice(0, 50);

      // Throttled processing to avoid Steadfast rate-limits (concurrency: 4)
      const chunkSize = 4;
      for (let i = 0; i < batch.length; i += chunkSize) {
        const chunk = batch.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (item: any) => {
            if (!item) return;
            const key = typeof item === 'object' ? (item.id || item.phone) : item;
            const phone = typeof item === 'object' ? (item.phone || item.customerPhone) : item;
            if (!key || !phone) return;
            const fraudData = await querySteadfastFraudCheck(phone);
            results[key] = fraudData;
          })
        );
        if (i + chunkSize < batch.length) {
          await new Promise(r => setTimeout(r, 60));
        }
      }
      res.json({ results });
    } catch (err: any) {
      console.error('[SFC Bulk Fraud Check Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
