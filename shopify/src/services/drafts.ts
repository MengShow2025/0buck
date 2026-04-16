import * as fs from 'fs';
import * as path from 'path';
import { DraftProduct } from '../types';

export class DraftsService {
  private filePath = path.join(process.cwd(), 'drafts.json');

  async saveDraft(product: DraftProduct): Promise<void> {
    console.log(`[DraftsService] Saving to JSON for SKU: ${product.cjSku} | Type: ${product.productType}`);
    
    let drafts: DraftProduct[] = [];
    if (fs.existsSync(this.filePath)) {
      drafts = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    }

    const index = drafts.findIndex(d => d.cjSku === product.cjSku);
    if (index >= 0) {
      drafts[index] = product;
    } else {
      drafts.push(product);
    }

    fs.writeFileSync(this.filePath, JSON.stringify(drafts, null, 2));

    if (product.riskLevel === 'HIGH_RISK') {
      console.log(`[DraftsService] AUDIT: High risk flagged for ${product.title}`);
    }
  }

  async getDrafts(): Promise<DraftProduct[]> {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
  }
}
