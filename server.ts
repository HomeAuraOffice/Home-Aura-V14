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

  // In-memory cache for Steadfast status queries with multi-tier TTL
  // - Terminal status ('delivered', 'cancelled'): 24 hours
  // - Active status ('in_transit', 'pending', etc.): 10 minutes
  // - Not found: 5 minutes
  const sfcCache = new Map<string, { data: any; expiresAt: number }>();

  async function fetchWithTimeout(url: string, options: any, timeoutMs = 6000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async function querySteadfastStatus(cnNumber?: any, trackingCode?: any) {
    const rawCn = (cnNumber !== undefined && cnNumber !== null ? String(cnNumber) : '').trim();
    const rawTrack = (trackingCode !== undefined && trackingCode !== null ? String(trackingCode) : '').trim();
    
    if (!rawCn && !rawTrack) {
      return { success: false, delivery_status: 'not_found', message: 'No CN or tracking provided' };
    }

    const cacheKey = `${rawCn.toLowerCase()}||${rawTrack.toLowerCase()}`;
    const cached = sfcCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const headers = {
      'Api-Key': STEADFAST_API_KEY,
      'Secret-Key': STEADFAST_SECRET_KEY,
      'Content-Type': 'application/json'
    };

    const isNumericCn = /^\d+$/.test(rawCn) && rawCn.length >= 4;
    const digitsOnly = rawCn.replace(/\D/g, '');

    // Function to calculate appropriate cache TTL based on status
    const getTtl = (status: string) => {
      const s = (status || '').toLowerCase().trim();
      if (s === 'delivered' || s === 'cancelled' || s === 'partial_delivered') {
        return 24 * 60 * 60 * 1000; // 24 hours
      }
      if (s === 'in_transit' || s === 'pending' || s === 'in_review' || s === 'hold') {
        return 10 * 60 * 1000; // 10 minutes
      }
      return 5 * 60 * 1000; // 5 minutes default
    };

    // Helper to try an endpoint across base URLs
    const tryEndpoint = async (path: string) => {
      const baseUrls = [STEADFAST_BASE_URL, 'https://portal.steadfast.com.bd/api/v1'];
      for (const base of baseUrls) {
        try {
          const res = await fetchWithTimeout(`${base}/${path}`, { headers }, 5000);
          if (res.ok) {
            const json: any = await res.json();
            if (json && (json.status === 200 || json.delivery_status)) {
              return json;
            }
          }
        } catch {
          // ignore and continue
        }
      }
      return null;
    };

    // 1. If numeric CN or digits length >= 5, try status_by_cid
    if (isNumericCn || digitsOnly.length >= 5) {
      const cidToTry = isNumericCn ? rawCn : digitsOnly;
      const json = await tryEndpoint(`status_by_cid/${encodeURIComponent(cidToTry)}`);
      if (json) {
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
          matchedId: cidToTry 
        };
        sfcCache.set(cacheKey, { data: result, expiresAt: Date.now() + getTtl(result.delivery_status) });
        return result;
      }
    }

    // 2. Try status_by_trackingcode if trackingCode exists or rawCn is alphanumeric
    const trackToTry = rawTrack || (rawCn.length > 5 ? rawCn : '');
    if (trackToTry) {
      const json = await tryEndpoint(`status_by_trackingcode/${encodeURIComponent(trackToTry)}`);
      if (json) {
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
          matchedId: trackToTry 
        };
        sfcCache.set(cacheKey, { data: result, expiresAt: Date.now() + getTtl(result.delivery_status) });
        return result;
      }
    }

    // 3. Try status_by_invoice
    const invCandidates: string[] = [];
    if (rawCn) invCandidates.push(rawCn);
    if (digitsOnly && digitsOnly !== rawCn) invCandidates.push(digitsOnly);

    for (const inv of invCandidates) {
      const json = await tryEndpoint(`status_by_invoice/${encodeURIComponent(inv)}`);
      if (json) {
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
        sfcCache.set(cacheKey, { data: result, expiresAt: Date.now() + getTtl(result.delivery_status) });
        return result;
      }
    }

    const notFoundResult = { success: false, delivery_status: 'not_found', message: 'No active Steadfast record found' };
    sfcCache.set(cacheKey, { data: notFoundResult, expiresAt: Date.now() + (5 * 60 * 1000) });
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
      const batch = items.slice(0, 250);
      
      // Separate items already in cache vs items needing remote fetch
      const pendingFetch: any[] = [];
      for (const item of batch) {
        if (!item || !item.id) continue;
        const rawCn = (item.cnNumber !== undefined && item.cnNumber !== null ? String(item.cnNumber) : '').trim();
        const rawTrack = (item.trackingCode !== undefined && item.trackingCode !== null ? String(item.trackingCode) : '').trim();
        const cacheKey = `${rawCn.toLowerCase()}||${rawTrack.toLowerCase()}`;
        const cached = sfcCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          results[item.id] = cached.data;
        } else {
          pendingFetch.push(item);
        }
      }

      // Throttled processing with concurrency: 4 for uncached items
      const chunkSize = 4;
      for (let i = 0; i < pendingFetch.length; i += chunkSize) {
        const chunk = pendingFetch.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (item: any) => {
            const status = await querySteadfastStatus(item.cnNumber, item.trackingCode);
            results[item.id] = status;
          })
        );
        if (i + chunkSize < pendingFetch.length) {
          await new Promise(r => setTimeout(r, 120));
        }
      }
      
      res.json({ results });
    } catch (err: any) {
      console.error('[SFC Bulk API Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/steadfast/balance', async (req, res) => {
    try {
      const resp = await fetchWithTimeout(`${STEADFAST_BASE_URL}/get_balance`, {
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
        const res = await fetchWithTimeout(url, {
          headers: {
            'Api-Key': STEADFAST_API_KEY,
            'Secret-Key': STEADFAST_SECRET_KEY,
            'Content-Type': 'application/json'
          }
        }, 6000);

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

      // Throttled processing to avoid Steadfast rate-limits (concurrency: 3)
      const chunkSize = 3;
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
          await new Promise(r => setTimeout(r, 200));
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
