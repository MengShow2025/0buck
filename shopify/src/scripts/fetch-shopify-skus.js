const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const store = process.env.SHOPIFY_STORE;
const token = process.env.SHOPIFY_ACCESS_TOKEN;

async function fetchShopifySkus() {
    console.log(`🚀 Fetching products from ${store}...`);
    let url = `https://${store}/admin/api/2026-01/products.json?limit=250`;
    let allProducts = [];

    while (url) {
        try {
            const response = await axios.get(url, {
                headers: { 'X-Shopify-Access-Token': token }
            });
            allProducts = allProducts.concat(response.data.products);
            
            const linkHeader = response.headers['link'];
            if (linkHeader && linkHeader.includes('rel="next"')) {
                const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                url = nextMatch ? nextMatch[1] : null;
            } else {
                url = null;
            }
            console.log(`   Fetched ${allProducts.length} products...`);
        } catch (error) {
            console.error('Error fetching from Shopify:', error.message);
            break;
        }
    }

    const mapping = allProducts.map(p => ({
        id: p.id,
        title: p.title,
        sku: p.variants[0]?.sku,
        price: p.variants[0]?.price,
        compare_at_price: p.variants[0]?.compare_at_price,
        tags: p.tags
    }));

    fs.writeFileSync(path.join(__dirname, '../../shopify_mapping.json'), JSON.stringify(mapping, null, 2));
    console.log(`✅ Saved ${mapping.length} product mappings to shopify_mapping.json`);
}

fetchShopifySkus().catch(console.error);
