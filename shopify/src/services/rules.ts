import { TrendProduct, CJProduct, DraftProduct, RiskLevel } from '../types';

export class RulesService {
  private readonly HIGH_RISK_CATEGORIES = [
    'skincare', 'dietary supplement', 'hoverboard', 'otc', 'health', 'baby'
  ];

  evaluateAndPrice(trend: TrendProduct, cj: CJProduct): DraftProduct | null {
    // 1. 处理亚马逊划线价缺失情况：缺失时，令其等于亚马逊销售价
    const amazonComparePrice = trend.comparePriceUSD || trend.priceUSD;

    // 2. 本店销售价 = 亚马逊销售价 * 60%
    const salePrice = Number((trend.priceUSD * 0.60).toFixed(2));
    
    // 3. 本店划线价 = 亚马逊划线价 * 95%
    const comparePrice = Number((amazonComparePrice * 0.95).toFixed(2));
    
    /**
     * 【重要优化】0Buck 利润率基准
     * 公式：本店售价 / 拿货成本 (cjCost)
     * 说明：用户在前端会额外支付拿货运费与税费，因此计算倍率时不包含运费
     */
    const profitRatio = cj.costUSD > 0 ? salePrice / cj.costUSD : 999;

    // 比价原则过滤
    if (cj.costUSD > 0 && profitRatio < 1.5) {
      console.log(`[Reject] ${trend.title} - Profit ratio ${profitRatio.toFixed(1)}X is below 1.5X requirement (Sale: ${salePrice}, Cost: ${cj.costUSD})`);
      return null;
    }

    // 标签判定
    // >= 4X: 返现商品 (CASHBACK)
    // 1.5X <= Ratio < 4X: 促销/普通商品 (NORMAL)
    const productType = profitRatio >= 4 ? 'CASHBACK' : 'NORMAL';
    console.log(`[Accept] ${trend.title} - Ratio: ${profitRatio.toFixed(1)}X -> Classified as ${productType}`);

    // 5. 合规性黑名单过滤
    const isHighRisk = this.HIGH_RISK_CATEGORIES.some(riskCat => 
      trend.category.toLowerCase().includes(riskCat) || 
      trend.title.toLowerCase().includes(riskCat)
    );
    
    // 6. 状态判定逻辑
    let status: 'DRAFT' | 'PENDING_MANUAL_REVIEW' = 'DRAFT';
    const issues: string[] = [];

    if (isHighRisk) {
      status = 'PENDING_MANUAL_REVIEW';
      issues.push('HIGH_RISK_CATEGORY');
    }
    if (cj.costUSD <= 0) {
      status = 'PENDING_MANUAL_REVIEW';
      issues.push('CJ_COST_ZERO');
    }

    if (status === 'PENDING_MANUAL_REVIEW') {
      console.log(`[Warning] ${trend.title} flagged: ${issues.join(', ')}. Moving to PENDING_MANUAL_REVIEW.`);
    }

    return {
      product_id: trend.id, // 0Buck 商品唯一 ID (使用 trendId)
      title: trend.title, // 商品标题 (清洗后)
      category: trend.category, // 分类 (Amazon 类目)
      
      // Pricing
      priceUSD: salePrice, // 0Buck 售价 (0.6x Amazon)
      comparePriceUSD: comparePrice, // 0Buck 划线价 (0.95x Amazon)
      profitRatio: Number(profitRatio.toFixed(2)), // 利润率 (Sale / Cost)
      
      // CJ / Supplier Info
      cjSku: cj.sku,
      cjPid: cj.cjPid,
      cjCost: cj.costUSD, // 拿货成本
      sourceUrl: cj.sourceUrl,
      
      // Media
      media: {
        images: cj.images,
        videos: cj.videos
      },
      descriptionHtml: cj.descriptionHtml,
      
      // Logistics
      freightFee: cj.freightFee || 0, // 真实运费
      shippingDays: cj.shippingDays || 'TBD', // 物流时效
      inventory: cj.inventory, // 实时库存
      
      // Physical
      dimensions: cj.dimensions,
      weight: cj.weight,
      
      // Frontend / Business
      status: status,
      productType: productType,
      riskLevel: isHighRisk ? 'HIGH_RISK' : 'LOW_RISK',
      variants: cj.variants, // 必须包含变体信息以对齐前端矩阵
      
      // Reference
      amazonPrice: trend.priceUSD // 原始亚马逊售价
    };
  }

  // 补丁 1：价格雷达逻辑
  checkPriceRadar(oldAmazonPrice: number, newAmazonPrice: number): boolean {
    const priceChangeRatio = Math.abs(newAmazonPrice - oldAmazonPrice) / oldAmazonPrice;
    // 如果亚马逊价格变动超过 10%，触发调价逻辑
    return priceChangeRatio > 0.10;
  }

  // 补丁 3：逆向履约自动化逻辑
  handleRefund(salePrice: number, refundReason: string): 'AUTO_REFUND_ABANDON_GOODS' | 'TRIGGER_CJ_DISPUTE' {
    if (salePrice < 10) {
      return 'AUTO_REFUND_ABANDON_GOODS'; // 低于 10 美元，自动退款并放弃货物
    } else {
      return 'TRIGGER_CJ_DISPUTE'; // 高价值，触发 CJ Dispute
    }
  }

  // 进阶补丁 A：价格熔断机制 (Price Circuit Breaker)
  // 当亚马逊同行恶意倾销时，确保我们自动跟进的价格不会导致亏本
  checkPriceCircuitBreaker(salePrice: number, cjCostUSD: number, estimatedShippingUSD: number): boolean {
    const absoluteMinimumPrice = (cjCostUSD + estimatedShippingUSD) * 1.1;
    return salePrice >= absoluteMinimumPrice; // true 表示安全，false 表示触发熔断（应报错或下架）
  }

  // 进阶补丁 C：动态库存缓冲 (Inventory Buffer)
  // 留出 5 件的安全边际，防止 CJ 数据延迟导致 Shopify 超卖
  calculateSafeInventory(cjInventory: number): number {
    return Math.max(0, cjInventory - 5);
  }
}