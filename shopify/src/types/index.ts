export interface TrendProduct {
  id: string;
  platform: string;
  category: string; // 亚马逊商品类目，用于合规性检查
  title: string;
  priceUSD: number;
  comparePriceUSD?: number; // 亚马逊划线价（可能缺失）
  imageUrl: string;
  sales: number;
  url: string;
}

export interface CJProduct {
  sku: string;
  cjPid: string;
  title: string;
  categoryName: string;
  costUSD: number;
  overseasWarehouse: boolean;
  images: string[];
  videos: string[];
  descriptionHtml: string;
  variants: any[];
  dimensions: string; // "31x29x2 cm"
  weight: number; // g
  inventory: number;
  freightFee?: number;
  shippingDays?: string;
  sourceUrl: string;
}

export type RiskLevel = 'HIGH_RISK' | 'LOW_RISK';

/**
 * 0Buck Draft Product Matrix
 * 对齐 cj_fields_matrix.csv 标准
 */
export interface DraftProduct {
  // Product Basics
  product_id: string; // 0Buck 商品唯一 ID (trendId)
  title: string; // 清洗后的标题
  category: string; // Amazon 类目
  
  // Pricing
  priceUSD: number; // 0Buck 售价 (0.6x Amazon)
  comparePriceUSD: number; // 0Buck 划线价 (0.95x Amazon)
  profitRatio: number; // 利润率 (Sale / Cost)
  
  // CJ / Supplier Info
  cjSku: string;
  cjPid: string;
  cjCost: number; // 拿货成本
  sourceUrl: string;
  
  // Media
  media: {
    images: string[];
    videos: string[];
  };
  descriptionHtml: string;
  
  // Logistics
  freightFee: number; // 真实运费
  shippingDays: string; // 物流时效
  inventory: number; // 实时库存
  
  // Physical
  dimensions: string;
  weight: number;
  
  // Frontend / Business
  status: 'DRAFT' | 'PUBLISHED' | 'PENDING_MANUAL_REVIEW';
  productType: 'NORMAL' | 'CASHBACK'; // NORMAL (1.5X-4X) or CASHBACK (>= 4X)
  riskLevel: RiskLevel;
  variants: any[]; // 多规格矩阵
  
  // Reference
  amazonPrice: number; // 原始亚马逊售价
}
