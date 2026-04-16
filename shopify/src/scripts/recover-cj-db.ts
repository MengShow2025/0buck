import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { MatcherService } from '../services/matcher';
import { RulesService } from '../services/rules';
import { DraftProduct, TrendProduct, CJProduct } from '../types';

dotenv.config();

async function recoverUltimateDatabase() {
  const matcher = new MatcherService();
  const rules = new RulesService();
  
  const resultsMap = new Map<string, DraftProduct>();

  // 1. Process Shopify Mapping (252 items)
  const mappingPath = path.join(__dirname, '../../shopify_mapping.json');
  if (fs.existsSync(mappingPath)) {
    const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`📂 Processing ${mappingData.length} items from Shopify mapping...`);
    
    for (const item of mappingData) {
      const sku = item.sku;
      if (!sku || resultsMap.has(sku)) continue;
      
      console.log(`🔍 Processing Shopify SKU: ${sku}...`);
      const cjProduct = await matcher.getProductBySku(sku);
      
      if (cjProduct) {
        // Reverse engineer Amazon price from Shopify price (Shopify = Amazon * 0.6)
        const shopifyPrice = parseFloat(item.price || '0');
        const amazonPrice = Number((shopifyPrice / 0.6).toFixed(2));
        
        const trend: TrendProduct = {
          id: `SHOPIFY-${item.id}`,
          platform: 'shopify-recovered',
          category: cjProduct.categoryName || 'General',
          title: item.title.split(' | ')[0], // Remove the " | 0Buck Verified" suffix
          priceUSD: amazonPrice,
          imageUrl: cjProduct.images[0] || '',
          sales: 0,
          url: cjProduct.sourceUrl
        };
        
        const draft = rules.evaluateAndPrice(trend, cjProduct);
        if (draft) {
          draft.status = 'PUBLISHED'; // Already in Shopify
          resultsMap.set(sku, draft);
        }
      }
    }
  }

  // 2. Process legacy drafts from desktop (56 items)
  const legacyPath = '/Users/long/Desktop/frontend/shopify/drafts.json';
  if (fs.existsSync(legacyPath)) {
    const legacyData = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    console.log(`📂 Processing ${legacyData.length} items from Legacy Desktop...`);
    
    for (const legacy of legacyData) {
      const sku = legacy.cjSku || legacy.sku;
      if (!sku || resultsMap.has(sku)) continue;
      
      console.log(`🔍 Processing Legacy SKU: ${sku}...`);
      const cjProduct = await matcher.getProductBySku(sku);
      if (cjProduct) {
        const trend: TrendProduct = {
          id: legacy.trendId || `LEGACY-${sku}`,
          platform: 'amazon',
          category: legacy.amazonCategory || cjProduct.categoryName || 'Unknown',
          title: legacy.amazonTitle || cjProduct.title,
          priceUSD: legacy.amazonPrice || (cjProduct.costUSD * 6.67),
          imageUrl: cjProduct.images[0] || '',
          sales: 0,
          url: legacy.sourceUrl || cjProduct.sourceUrl
        };
        
        const draft = rules.evaluateAndPrice(trend, cjProduct);
        if (draft) resultsMap.set(sku, draft);
      }
    }
  }

  // 3. Process products from cj_dump.json (10 items)
  const dumpPath = path.join(__dirname, '../../../cj_dump.json');
  if (fs.existsSync(dumpPath)) {
    const dumpData = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
    console.log(`📂 Processing ${dumpData.length} items from cj_dump.json...`);
    
    for (const p of dumpData) {
      const pid = p.id;
      const sku = p.sku;
      if (resultsMap.has(sku)) continue;
      
      console.log(`🔍 Processing Dump PID: ${pid} (SKU: ${sku})...`);
      const cjProduct = await matcher.getProductByPid(pid);
      if (cjProduct) {
        const amazonPrice = Number((cjProduct.costUSD * 6.67).toFixed(2));
        const trend: TrendProduct = {
          id: `DUMP-${pid}`,
          platform: 'cj-dump',
          category: cjProduct.categoryName || 'Sourcing',
          title: cjProduct.title,
          priceUSD: amazonPrice,
          imageUrl: cjProduct.images[0] || '',
          sales: 0,
          url: cjProduct.sourceUrl
        };
        
        const draft = rules.evaluateAndPrice(trend, cjProduct);
        if (draft) {
          draft.status = 'PENDING_MANUAL_REVIEW';
          resultsMap.set(sku, draft);
        }
      }
    }
  }

  // 4. Save to drafts.json
  const finalResults = Array.from(resultsMap.values());
  const outputPath = path.join(__dirname, '../../drafts.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
  console.log(`\n🎉 Total ${finalResults.length} unique products recovered and saved to ${outputPath}`);
}

recoverUltimateDatabase().catch(console.error);
