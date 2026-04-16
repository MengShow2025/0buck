import axios from 'axios';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { TrendProduct } from '../types';

dotenv.config();

export class TrendsService {
  private ak = process.env.ALPHASHOP_ACCESS_KEY || '';
  private sk = process.env.ALPHASHOP_SECRET_KEY || '';

  private base64urlEncode(data: Buffer): string {
    return data.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private generateToken(): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const currentTime = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.ak,
      exp: currentTime + 1800,
      nbf: currentTime - 5
    };

    const headerB64 = this.base64urlEncode(Buffer.from(JSON.stringify(header)));
    const payloadB64 = this.base64urlEncode(Buffer.from(JSON.stringify(payload)));

    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = crypto
      .createHmac('sha256', this.sk)
      .update(signingInput)
      .digest();
    
    const signatureB64 = this.base64urlEncode(signature);

    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }

  async getTopAmazonProducts(category: string, limit: number = 5): Promise<TrendProduct[]> {
    console.log(`Fetching top ${limit} products for category: ${category}`);
    
    try {
      const token = this.generateToken();
      const response = await axios.post(
        'https://api.alphashop.cn/ai.agent.global1688.sel.getProductList/1.0',
        {
          platform: 'amazon',
          country: 'US',
          rankingType: 'SALE_GROW_LIST',
          limit: limit
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.resultCode !== 'SUCCESS' || !response.data.result?.data) {
        console.error('AlphaShop API Error:', response.data);
        return [];
      }

      return response.data.result.data.map((item: any) => ({
        id: item.productId || item.productUrl?.split('/dp/')?.[1]?.split('/')?.[0] || Math.random().toString(36),
        platform: 'Amazon',
        category: category || 'General',
        title: item.productTitle,
        priceUSD: typeof item.price === 'string' ? parseFloat(item.price.replace(/[^\d.]/g, '')) : (item.price || 0),
        imageUrl: item.productImage,
        sales: item.soldCnt?.value || 0,
        url: item.productUrl
      }));
    } catch (error: any) {
      console.error('Error fetching trends:', error.message);
      return [];
    }
  }
}
