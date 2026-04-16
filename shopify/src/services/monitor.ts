import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { MatcherService } from './matcher';
import { RulesService } from './rules';
import { DraftProduct, CJProduct } from '../types';

dotenv.config();

export class MonitorService {
  private matcher = new MatcherService();
  private rules = new RulesService();
  private draftsPath = path.join(__dirname, '../../drafts.json');

  async syncInventory() {
    console.log('🚀 Starting Inventory & Price Monitor Scan...');
    
    if (!fs.existsSync(this.draftsPath)) {
      console.error('❌ drafts.json not found.');
      return;
    }

    const drafts: DraftProduct[] = JSON.parse(fs.readFileSync(this.draftsPath, 'utf8'));
    const updatedDrafts: DraftProduct[] = [];

    for (const draft of drafts) {
      console.log(`🔍 Monitoring [${draft.cjSku}] ${draft.title}...`);
      
      // 1. Sync CJ Inventory & Price
      const cjProduct = await this.matcher.getProductByPid(draft.cjPid);
      if (cjProduct) {
        // Apply safety buffer (-5)
        const safeInventory = this.rules.calculateSafeInventory(cjProduct.inventory);
        draft.inventory = safeInventory;
        
        // Update CJ Cost and Logistics
        draft.cjCost = cjProduct.costUSD;
        draft.freightFee = cjProduct.freightFee || 0;
        draft.shippingDays = cjProduct.shippingDays || 'TBD';
        draft.variants = cjProduct.variants;
        
        console.log(`   📦 Inventory: ${cjProduct.inventory} -> ${safeInventory} (Safe)`);
        
        // 2. Price Radar (Amazon Price Check)
        // In a real production system, this would use a proper Amazon API like Rainforest
        // Here we simulate or use web_search if needed. 
        // For now, we compare with the stored amazonPrice if we fetch a new one.
        // Let's assume we skip live Amazon scraping for every sync to save time/tokens,
        // but we flag it if CJ cost shifts significantly.
        
        const oldProfitRatio = draft.profitRatio;
        const newProfitRatio = Number((draft.priceUSD / draft.cjCost).toFixed(2));
        
        if (Math.abs(newProfitRatio - oldProfitRatio) > 0.1) {
          console.warn(`   ⚠️ Profit Ratio Shift: ${oldProfitRatio}X -> ${newProfitRatio}X`);
          draft.profitRatio = newProfitRatio;
          draft.status = 'PENDING_MANUAL_REVIEW';
        }
      } else {
        console.error(`   ❌ Failed to fetch CJ data for PID: ${draft.cjPid}`);
        draft.inventory = 0; // Mark as out of stock if PID is invalid
      }
      
      updatedDrafts.push(draft);
    }

    fs.writeFileSync(this.draftsPath, JSON.stringify(updatedDrafts, null, 2));
    console.log(`✅ Monitor scan complete. ${updatedDrafts.length} items updated in drafts.json`);
  }
}
