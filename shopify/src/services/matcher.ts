import axios from 'axios';
import * as dotenv from 'dotenv';
import { TrendProduct, CJProduct } from '../types';

dotenv.config();

export class MatcherService {
  private cjToken = process.env.CJ_API_KEY || ''; // 实际应从数据库或环境变量获取最新 OAuth Token

  async getFreight(pid: string, vid: string): Promise<{ fee: number, days: string }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1100)); // QPS 限流保护，每秒 1 次
      const response = await axios.post(
        'https://developers.cjdropshipping.com/api2.0/v1/logistic/freightCalculate',
        {
          startCountryCode: 'CN',
          endCountryCode: 'US', // 修正为 endCountryCode
          products: [{ vid, quantity: 1 }]
        },
        {
          headers: { 'CJ-Access-Token': this.cjToken }
        }
      );

      if (response.data.code === 200 && response.data.data?.[0]) {
        const bestOption = response.data.data[0]; 
        console.log(`[Freight Success] ${vid} -> ${bestOption.logisticPrice} USD, ${bestOption.logisticAging} days`);
        return {
          fee: parseFloat(bestOption.logisticPrice || '0'), 
          days: bestOption.logisticAging || '7-15 days' 
        };
      } else {
        console.log(`[Freight Warning] No logistics data for ${vid}:`, JSON.stringify(response.data));
      }
      return { fee: 0, days: 'TBD' };
    } catch (error: any) {
      console.error(`Error calculating freight for ${vid}:`, error.message);
      return { fee: 0, days: 'TBD' };
    }
  }

  async getProductBySku(sku: string): Promise<CJProduct | null> {
    try {
      const detailResponse = await axios.get(
        'https://developers.cjdropshipping.com/api2.0/v1/product/query',
        {
          params: { productSku: sku, features: 'enable_video,enable_inventory' },
          headers: { 'CJ-Access-Token': this.cjToken }
        }
      );

      if (detailResponse.data.code !== 200 || !detailResponse.data.data) {
        console.warn(`[MatcherService] SKU Query failed for ${sku}:`, detailResponse.data.message);
        return null;
      }

      const detail = detailResponse.data.data;
      const inventory = detail.variants?.reduce((acc: number, v: any) => {
        const directInv = v.inventoryNum || 0;
        const totalInv = v.inventories?.reduce((subAcc: number, inv: any) => subAcc + (inv.totalInventory || 0), 0) || 0;
        return acc + Math.max(directInv, totalInv);
      }, 0) || 0;
      let images: string[] = [];
      if (typeof detail.productImage === 'string') {
        images = detail.productImage.startsWith('[') ? JSON.parse(detail.productImage) : detail.productImage.split(',');
      }
      const vid = detail.variants?.[0]?.vid || '';
      const freight = await this.getFreight(detail.pid, vid);

      return {
        sku: detail.productSku,
        cjPid: detail.pid,
        title: detail.productNameEn,
        categoryName: detail.categoryName || '',
        costUSD: parseFloat(detail.sellPrice || detail.variantSellPrice || '0'),
        overseasWarehouse: true,
        images: images.map((img: string) => img.replace(/^"|"$/g, '')),
        videos: detail.productVideo ? [detail.productVideo] : [],
        descriptionHtml: detail.description || '',
        variants: detail.variants || [],
        dimensions: detail.variants?.[0]?.variantStandard || '0x0x0 cm',
        weight: detail.variants?.[0]?.variantWeight || detail.productWeight || 0,
        inventory: inventory,
        freightFee: freight.fee,
        shippingDays: freight.days,
        sourceUrl: `https://www.cjdropshipping.com/product/-p-${detail.pid}.html`
      };
    } catch (error: any) {
      console.error(`Error fetching CJ product by SKU ${sku}:`, error.message);
      return null;
    }
  }

  async getProductByPid(pid: string): Promise<CJProduct | null> {
    try {
      const detailResponse = await axios.get(
        'https://developers.cjdropshipping.com/api2.0/v1/product/query',
        {
          params: { pid, features: 'enable_video,enable_inventory' },
          headers: { 'CJ-Access-Token': this.cjToken }
        }
      );

      if (detailResponse.data.code !== 200 || !detailResponse.data.data) {
        return null;
      }

      const detail = detailResponse.data.data;
      const inventory = detail.variants?.reduce((acc: number, v: any) => {
        const directInv = v.inventoryNum || 0;
        const totalInv = v.inventories?.reduce((subAcc: number, inv: any) => subAcc + (inv.totalInventory || 0), 0) || 0;
        return acc + Math.max(directInv, totalInv);
      }, 0) || 0;
      let images: string[] = [];
      if (typeof detail.productImage === 'string') {
        images = detail.productImage.startsWith('[') ? JSON.parse(detail.productImage) : detail.productImage.split(',');
      }
      const vid = detail.variants?.[0]?.vid || '';
      const freight = await this.getFreight(detail.pid, vid);

      return {
        sku: detail.productSku,
        cjPid: detail.pid,
        title: detail.productNameEn,
        categoryName: detail.categoryName || '',
        costUSD: parseFloat(detail.sellPrice || detail.variantSellPrice || '0'),
        overseasWarehouse: true,
        images: images.map((img: string) => img.replace(/^"|"$/g, '')),
        videos: detail.productVideo ? [detail.productVideo] : [],
        descriptionHtml: detail.description || '',
        variants: detail.variants || [],
        dimensions: detail.variants?.[0]?.variantStandard || '0x0x0 cm',
        weight: detail.variants?.[0]?.variantWeight || detail.productWeight || 0,
        inventory: inventory,
        freightFee: freight.fee,
        shippingDays: freight.days,
        sourceUrl: `https://www.cjdropshipping.com/product/-p-${detail.pid}.html`
      };
    } catch (error: any) {
      console.error(`Error fetching CJ product ${pid}:`, error.message);
      return null;
    }
  }

  async findCJAlternative(trend: TrendProduct): Promise<CJProduct | null> {
    console.log(`Searching CJ for 80% similarity alternative to: ${trend.title}`);
    
    try {
      // 1. 搜索关键词 - 尝试精简并清洗关键词
      const cleanTitle = trend.title.replace(/[^\w\s]/gi, ''); // 移除特殊字符
      const query = cleanTitle.split(' ').filter(word => word.length > 2).slice(0, 3).join(' ');
      console.log(`[MatcherService] Querying CJ with: "${query}"`);

      const searchResponse = await axios.get(
        'https://developers.cjdropshipping.com/api2.0/v1/product/listV2',
        {
          params: {
            keyWord: query,
            size: 5
          },
          headers: {
            'CJ-Access-Token': this.cjToken
          }
        }
      );

      const products = searchResponse.data.data?.content?.[0]?.productList;

      if (searchResponse.data.code !== 200 || !products?.length) {
        console.warn(`[MatcherService] No results for: "${query}" (Code: ${searchResponse.data.code})`);
        return null;
      }

      const topResult = products[0];
      
      // 2. 获取详情
      const detailResponse = await axios.get(
        'https://developers.cjdropshipping.com/api2.0/v1/product/query',
        {
          params: {
            pid: topResult.id || topResult.pid, // 使用正确的 ID 字段
            features: 'enable_video,enable_inventory'
          },
          headers: {
            'CJ-Access-Token': this.cjToken
          }
        }
      );

      if (detailResponse.data.code !== 200 || !detailResponse.data.data) {
        return null;
      }

      const detail = detailResponse.data.data;

      // 提取库存
      const inventory = detail.variants?.reduce((acc: number, v: any) => {
        const directInv = v.inventoryNum || 0;
        const totalInv = v.inventories?.reduce((subAcc: number, inv: any) => subAcc + (inv.totalInventory || 0), 0) || 0;
        return acc + Math.max(directInv, totalInv);
      }, 0) || 0;

      // 清洗图片 URL，处理可能的 JSON 字符串情况
      let images: string[] = [];
      if (typeof detail.productImage === 'string') {
        if (detail.productImage.startsWith('[')) {
          try {
            images = JSON.parse(detail.productImage);
          } catch {
            images = detail.productImage.split(',');
          }
        } else {
          images = detail.productImage.split(',');
        }
      }

      const vid = detail.variants?.[0]?.vid || '';
      const freight = await this.getFreight(detail.pid, vid);

      return {
        sku: detail.productSku,
        cjPid: detail.pid,
        title: detail.productNameEn,
        categoryName: detail.categoryName || '',
        costUSD: parseFloat(detail.sellPrice || detail.variantSellPrice || '0'),
        overseasWarehouse: true,
        images: images.map(img => img.replace(/^"|"$/g, '')),
        videos: detail.productVideo ? [detail.productVideo] : [],
        descriptionHtml: detail.description || '',
        variants: detail.variants || [],
        dimensions: detail.variants?.[0]?.variantStandard || '0x0x0 cm',
        weight: detail.variants?.[0]?.variantWeight || detail.productWeight || 0,
        inventory: inventory,
        freightFee: freight.fee,
        shippingDays: freight.days,
        sourceUrl: `https://www.cjdropshipping.com/product/-p-${detail.pid}.html`
      };

    } catch (error: any) {
      console.error('Error matching CJ product:', error.message);
      return null;
    }
  }
}
