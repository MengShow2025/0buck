import * as fs from 'fs';
import * as path from 'path';
import { PublishService } from '../services/publish';
import { DraftProduct } from '../types';

async function publishBatch() {
  const publisher = new PublishService();
  const draftsPath = path.join(__dirname, '../../drafts.json');
  
  if (!fs.existsSync(draftsPath)) {
    console.error('❌ drafts.json not found.');
    return;
  }

  const drafts: DraftProduct[] = JSON.parse(fs.readFileSync(draftsPath, 'utf8'));
  console.log(`🚀 Starting batch publish of ${drafts.length} items...`);

  for (const draft of drafts) {
    if (draft.status === 'PENDING_MANUAL_REVIEW') {
      console.log(`⚠️ Skipping ${draft.title} (Pending manual review)...`);
      continue;
    }
    
    // Content is already polished in drafts.json
    const polishedHtml = draft.descriptionHtml; 
    
    await publisher.pushToShopify(draft, polishedHtml);
    
    // Add a delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  fs.writeFileSync(draftsPath, JSON.stringify(drafts, null, 2));
  console.log(`\n🎉 Batch publish complete. ${drafts.length} items updated.`);
}

publishBatch().catch(console.error);
