const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SHOP_NAME = "pxjkad-zt";
const ACCESS_TOKEN = "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";
const API_URL = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`;

const DATA_DIR = path.join(__dirname, '../data/1688');
const mapping = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'translated_mapping.json'), 'utf-8'));

const categories = [
    { file: 'smart_home.json', category: 'Smart Home' },
    { file: 'office_tech.json', category: 'Office Tech' },
    { file: 'outdoor.json', category: 'Outdoor Life' }
];

function shopifyRequest(query, variables = {}) {
    const tmpFile = path.join(__dirname, 'tmp_query.json');
    fs.writeFileSync(tmpFile, JSON.stringify({ query, variables }));
    const cmd = `curl -s -X POST "${API_URL}" -H "Content-Type: application/json" -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}" -d @${tmpFile}`;
    try {
        const out = execSync(cmd).toString();
        return JSON.parse(out);
    } catch (e) {
        console.error("   [CURL EXEC ERROR]:", e.message);
        return null;
    } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
}

async function SYNC_ITEM(item, category) {
    const costCny = parseFloat(item.price) || 50;
    const costUsd = costCny * 0.14;
    let multiplier = 1.4;
    if (costUsd <= 5) multiplier = 3.0;
    else if (costUsd <= 20) multiplier = 2.0;
    else if (costUsd <= 50) multiplier = 1.6;
    const price = (costUsd * multiplier).toFixed(2);

    const enriched = mapping[item.title] || { title_en: item.title, description_en: item.title };
    const offerMatch = item.product_url.match(/offerId=(\d+)/) || item.product_url.match(/offer\/(\d+)\.html/);
    const offerId = offerMatch ? offerMatch[1] : "sku-" + Math.random().toString(36).slice(2, 7);

    console.log(`Syncing: ${enriched.title_en.substring(0, 40)}...`);

    const CREATE = `mutation create($input: ProductInput!) {
      productCreate(input: $input) {
        product { id variants(first: 1) { edges { node { id } } } }
        userErrors { message }
      }
    }`;
    const input = {
        title: `[0Buck] ${enriched.title_en}`,
        descriptionHtml: enriched.description_en,
        vendor: "0Buck",
        status: "ACTIVE",
        productType: category
    };
    
    const res1 = shopifyRequest(CREATE, { input });
    if (res1?.data?.productCreate?.product) {
        const product = res1.data.productCreate.product;
        const pid = product.id;
        const vid = product.variants.edges[0].node.id;

        const BULK_UPDATE = `mutation bulk($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id price }
            userErrors { message }
          }
        }`;
        const res2 = shopifyRequest(BULK_UPDATE, {
            productId: pid,
            variants: [{ id: vid, price: price, sku: `1688-${offerId}` }]
        });
        
        if (res2?.data?.productVariantsBulkUpdate?.productVariants) {
            console.log(`   [SUCCESS] Product: ${pid} | Price: $${price}`);
            return true;
        } else {
            console.error("   [FAILED Price Update]");
        }
    } else {
        console.error("   [FAILED Product Creation]");
    }
    return false;
}

async function main() {
    for (const cat of categories) {
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, cat.file), 'utf-8'));
        console.log(`\n--- ${cat.category} ---`);
        for (const item of data) {
            await SYNC_ITEM(item, cat.category);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

main();
