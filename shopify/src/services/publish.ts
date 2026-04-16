import axios from 'axios';
import * as dotenv from 'dotenv';
import { DraftProduct } from '../types';

dotenv.config();

export class PublishService {
  private store = process.env.SHOPIFY_STORE || '';
  private token = process.env.SHOPIFY_ACCESS_TOKEN || '';

  async polishContent(draft: DraftProduct): Promise<string> {
    // 模拟调用大模型进行 SEO 优化和去侵权润色
    // 在实际生产中，这里应调用 OpenAI API
    console.log(`[PublishService] Polishing content for: ${draft.title}`);
    const prefix = draft.productType === 'CASHBACK' 
      ? '<h2>Exclusive 20-Phase Cashback Offer!</h2>' 
      : '<h2>0Buck Verified Artisan - Premium Quality</h2>';
    
    const salesHook = `<p><strong>Why pay brand tax?</strong> Get the same professional results with 0Buck Verified Artisan quality. 
    Direct from the source, no middleman markups.</p>`;

    return `${prefix}${salesHook}${draft.descriptionHtml}`;
  }

  async pushToShopify(draft: DraftProduct, polishedHtml: string): Promise<void> {
    console.log(`[PublishService] Pushing to Shopify: ${draft.title}`);
    
    try {
      // 1. Check if product already exists by SKU (using a mapping or search)
      // For this implementation, we assume we want to update if we have a Shopify ID, 
      // or create if not. 
      // In this recovery flow, product_id might be "SHOPIFY-XXXX"
      let existingId: string | null = null;
      if (draft.product_id.startsWith('SHOPIFY-')) {
        existingId = draft.product_id.replace('SHOPIFY-', '');
      }

      const productData = {
        product: {
          title: draft.title, // Title already polished
          body_html: polishedHtml,
          vendor: '0Buck Artisan',
          product_type: draft.category,
          tags: [draft.productType, 'US_WAREHOUSE'].join(','),
          variants: draft.variants.map((v: any) => ({
            title: v.variantKey || v.variantNameEn || 'Default',
            price: draft.priceUSD.toString(),
            compare_at_price: draft.comparePriceUSD.toString(),
            sku: v.variantSku,
            inventory_management: 'shopify',
            inventory_quantity: draft.inventory,
            weight: v.variantWeight,
            weight_unit: 'g'
          })),
          images: draft.media.images.map(src => ({ src }))
        }
      };

      let response;
      if (existingId) {
        console.log(`   Updating existing product: ${existingId}`);
        response = await axios.put(
          `https://${this.store}/admin/api/2026-01/products/${existingId}.json`,
          productData,
          {
            headers: {
              'X-Shopify-Access-Token': this.token,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        response = await axios.post(
          `https://${this.store}/admin/api/2026-01/products.json`,
          productData,
          {
            headers: {
              'X-Shopify-Access-Token': this.token,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      if (response.status === 200 || response.status === 201) {
        draft.status = 'PUBLISHED';
        console.log(`[PublishService] Successfully ${existingId ? 'updated' : 'published'}! Shopify ID: ${response.data.product.id}\n`);
      } else {
        console.error('[PublishService] Shopify API failed:', response.data);
      }
    } catch (error: any) {
      console.error('[PublishService] Error pushing to Shopify:', error.response?.data || error.message);
    }
  }
}
