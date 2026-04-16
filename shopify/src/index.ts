import { TrendsService } from './services/trends';
import { MatcherService } from './services/matcher';
import { RulesService } from './services/rules';
import { DraftsService } from './services/drafts';
import { PublishService } from './services/publish';

async function main() {
  console.log('===================================================');
  console.log('=== Shopify Headless Dropshipping Automation    ===');
  console.log('===================================================\n');
  
  const trends = new TrendsService();
  const matcher = new MatcherService();
  const rules = new RulesService();
  const drafts = new DraftsService();
  const publisher = new PublishService();

  // 1. 获取热门类目商品
  const topProducts = await trends.getTopAmazonProducts('Home & Kitchen', 50);

  for (const trend of topProducts) {
    console.log(`\n>>> Processing Product: ${trend.title} <<<`);
    
    // 2. 匹配 80% 相似度的 CJ 同款
    const cjAlt = await matcher.findCJAlternative(trend);
    if (!cjAlt) {
      console.log('[Skip] No valid alternative found.');
      continue;
    }

    // 3. 应用商业规则 (海外仓、定价、1.5X / 4X 分类)
    const draft = rules.evaluateAndPrice(trend, cjAlt);
    if (!draft) {
      console.log('[Skip] Rejected by business rules.');
      continue;
    }

    // 4. 存入草稿服务器
    drafts.saveDraft(draft);

    // 5. 润色并推送到 Shopify
    const polishedContent = await publisher.polishContent(draft);
    await publisher.pushToShopify(draft, polishedContent);
    
    // （如果需要可再将已发布状态同步回正式服务器）
  }

  console.log('===================================================');
  console.log('=== Workflow Completed                          ===');
  console.log('===================================================');
}

main().catch(console.error);