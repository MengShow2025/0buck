import { RulesService } from '../src/services/rules';
import { TrendProduct, CJProduct } from '../src/types';

describe('RulesService - Pricing and Classification Logic', () => {
  let rulesService: RulesService;

  beforeEach(() => {
    rulesService = new RulesService();
  });

  const baseTrend: TrendProduct = {
    id: 'test-1',
    platform: 'Amazon',
    category: 'Electronics', // 默认安全类目
    title: 'Test Product',
    priceUSD: 100.00, // Amazon sale price $100
    // comparePriceUSD 故意省略，测试“缺失时等于销售价”的逻辑
    imageUrl: '',
    sales: 100,
    url: ''
  };

  const baseCJ: CJProduct = {
    sku: 'cj-1',
    title: 'CJ Alternative',
    costUSD: 10.00,
    overseasWarehouse: true,
    images: [],
    videos: [],
    descriptionHtml: ''
  };

  test('calculates sale price as 60% of Amazon sale price and compare price as 95% of Amazon compare price (when present)', () => {
    // Amazon Sale: 100, Amazon Compare: 120
    const trendWithComparePrice: TrendProduct = { ...baseTrend, comparePriceUSD: 120.00 };
    const result = rulesService.evaluateAndPrice(trendWithComparePrice, baseCJ);
    
    expect(result).not.toBeNull();
    expect(result?.calculatedSalePrice).toBe(60.00); // 100 * 60%
    expect(result?.calculatedComparePrice).toBe(114.00); // 120 * 95%
  });

  test('falls back to Amazon sale price when Amazon compare price is missing', () => {
    // Amazon Sale: 100, Amazon Compare: Missing (falls back to 100)
    const result = rulesService.evaluateAndPrice(baseTrend, baseCJ);
    
    expect(result).not.toBeNull();
    expect(result?.calculatedSalePrice).toBe(60.00); // 100 * 60%
    expect(result?.calculatedComparePrice).toBe(95.00); // 100 * 95%
  });

  test('rejects product if profit ratio is less than 1.5X', () => {
    // Amazon $100 -> Sale $60. CJ Cost $50. Ratio = 60 / 50 = 1.2X (< 1.5X)
    const expensiveCJ = { ...baseCJ, costUSD: 50.00 };
    const result = rulesService.evaluateAndPrice(baseTrend, expensiveCJ);
    
    expect(result).toBeNull();
  });

  test('classifies as NORMAL if profit ratio is between 1.5X and 4X', () => {
    // Amazon $100 -> Sale $60. CJ Cost $30. Ratio = 60 / 30 = 2.0X (between 1.5X and 4X)
    const midCostCJ = { ...baseCJ, costUSD: 30.00 };
    const result = rulesService.evaluateAndPrice(baseTrend, midCostCJ);
    
    expect(result).not.toBeNull();
    expect(result?.productType).toBe('NORMAL');
  });

  test('classifies as CASHBACK if profit ratio is exactly 4X or greater', () => {
    // Amazon $100 -> Sale $60. CJ Cost $15. Ratio = 60 / 15 = 4.0X (>= 4X)
    const cheapCJ = { ...baseCJ, costUSD: 15.00 };
    const result = rulesService.evaluateAndPrice(baseTrend, cheapCJ);
    
    expect(result).not.toBeNull();
    expect(result?.productType).toBe('CASHBACK');
  });
  
  test('classifies as CASHBACK if profit ratio is highly profitable (e.g. 6X)', () => {
    // Amazon $100 -> Sale $60. CJ Cost $10. Ratio = 60 / 10 = 6.0X (>= 4X)
    const veryCheapCJ = { ...baseCJ, costUSD: 10.00 };
    const result = rulesService.evaluateAndPrice(baseTrend, veryCheapCJ);
    
    expect(result).not.toBeNull();
    expect(result?.productType).toBe('CASHBACK');
  });

  // --- 补丁 1: 价格雷达测试 ---
  test('Price Radar: triggers update when price change is > 10%', () => {
    expect(rulesService.checkPriceRadar(100, 111)).toBe(true);  // +11%
    expect(rulesService.checkPriceRadar(100, 89)).toBe(true);   // -11%
    expect(rulesService.checkPriceRadar(100, 105)).toBe(false); // +5%
    expect(rulesService.checkPriceRadar(100, 95)).toBe(false);  // -5%
  });

  // --- 补丁 2: 合规性黑名单测试 ---
  test('Compliance Filter: flags HIGH_RISK based on category or title', () => {
    const riskyTrendCategory: TrendProduct = { ...baseTrend, category: 'Health & Personal Care', title: 'Safe Title' };
    const riskyTrendTitle: TrendProduct = { ...baseTrend, category: 'General', title: 'Skincare Cream' };
    
    const resultCategory = rulesService.evaluateAndPrice(riskyTrendCategory, baseCJ);
    const resultTitle = rulesService.evaluateAndPrice(riskyTrendTitle, baseCJ);
    
    expect(resultCategory?.riskLevel).toBe('HIGH_RISK');
    expect(resultCategory?.status).toBe('PENDING_MANUAL_REVIEW');

    expect(resultTitle?.riskLevel).toBe('HIGH_RISK');
    expect(resultTitle?.status).toBe('PENDING_MANUAL_REVIEW');
  });

  // --- 补丁 3: 逆向履约自动化测试 ---
  test('Refund Logic: abandons goods for low value items and triggers dispute for high value items', () => {
    expect(rulesService.handleRefund(9.99, 'Damaged')).toBe('AUTO_REFUND_ABANDON_GOODS');
    expect(rulesService.handleRefund(15.00, 'Not as described')).toBe('TRIGGER_CJ_DISPUTE');
  });

  // --- 进阶补丁 A: 价格熔断机制测试 ---
  test('Price Circuit Breaker: prevents selling below safety margin', () => {
    // 拿货价 $10, 运费 $5, 绝对底线 = 15 * 1.1 = 16.5
    expect(rulesService.checkPriceCircuitBreaker(17.00, 10, 5)).toBe(true);  // 安全
    expect(rulesService.checkPriceCircuitBreaker(16.50, 10, 5)).toBe(true);  // 刚刚好
    expect(rulesService.checkPriceCircuitBreaker(16.00, 10, 5)).toBe(false); // 亏本，熔断
  });

  // --- 进阶补丁 C: 动态库存缓冲测试 ---
  test('Inventory Buffer: calculates safe inventory with a margin of 5', () => {
    expect(rulesService.calculateSafeInventory(10)).toBe(5);
    expect(rulesService.calculateSafeInventory(5)).toBe(0);
    expect(rulesService.calculateSafeInventory(3)).toBe(0); // 不会出现负数
  });
});