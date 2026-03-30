const fs = require('fs');
const path = require('path');
const https = require('https');

const SHOP_NAME = "pxjkad-zt";
const ACCESS_TOKEN = "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";

const categories = [
    { file: 'smart_home.json', category: 'Smart Home' },
    { file: 'office_tech.json', category: 'Office Tech' },
    { file: 'outdoor.json', category: 'Outdoor Life' }
];

const DATA_DIR = path.join(__dirname, '../data/1688');
const MAPPING_FILE = path.join(DATA_DIR, 'translated_mapping.json');

const translationMapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));

function calculatePrice(costCny) {
    const costUsd = costCny * 0.14;
    let multiplier = 1.4;
    if (costUsd <= 5) multiplier = 3.0;
    else if (costUsd <= 20) multiplier = 2.0;
    else if (costUsd <= 50) multiplier = 1.6;

    return {
        price: (costUsd * multiplier).toFixed(2),
        isRewardEligible: multiplier >= 1.6
    };
}

function shopifyRequest(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ query, variables });
        const options = {
            hostname: `${SHOP_NAME}.myshopify.com`,
            port: 443,
            path: '/admin/api/2024-01/graphql.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': ACCESS_TOKEN,
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 15000
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.errors) {
                        console.error("   [Shopify Errors]:", JSON.stringify(parsed.errors));
                    }
                    resolve(parsed.data);
                } catch (e) {
                    console.error("   [JSON Parse Error]:", e.message);
                    console.error("   [Raw Body]:", body);
                    resolve(null);
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error("Request Timeout"));
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

const SYNC_MUTATION = `
mutation syncProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
  productCreate(input: $input, media: $media) {
    product {
      id
      variants(first: 1) {
        edges {
          node {
            id
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const UPDATE_VARIANT_MUTATION = `
mutation updateVariant($input: ProductVariantInput!) {
  productVariantUpdate(input: $input) {
    productVariant {
      id
    }
    userErrors {
      field
      message
    }
  }
}
`;

async function syncProduct(item, category) {
    const costCny = parseFloat(item.price) || 50;
    const { price, isRewardEligible } = calculatePrice(costCny);
    
    const enriched = translationMapping[item.title] || {
        title_en: item.title,
        description_en: `<p>${item.title}</p>`
    };
    
    const offerMatch = item.product_url.match(/offerId=(\d+)/) || 
                       item.product_url.match(/offer\/(\d+)\.html/);
    const offerId = offerMatch ? offerMatch[1] : "offer_" + Math.random().toString(36).substr(2, 9);

    const input = {
        title: `[0Buck] ${enriched.title_en}`, 
        descriptionHtml: enriched.description_en,
        vendor: "0Buck",
        productType: category,
        status: "ACTIVE",
        metafields: [
          {
            namespace: "0buck_sync",
            key: "source_1688_id",
            value: offerId,
            type: "single_line_text_field"
          }
        ]
    };
    
    const mediaInput = item.image_url ? [{
        mediaContentType: "IMAGE",
        originalSource: item.image_url
    }] : [];

    console.log(`   --> Syncing: ${enriched.title_en.substring(0, 30)}...`);
    try {
        const result = await shopifyRequest(SYNC_MUTATION, { input, media: mediaInput });
        
        if (result && result.productCreate && result.productCreate.product) {
            const product = result.productCreate.product;
            const variantId = product.variants.edges[0].node.id;
            
            console.log(`   [SUCCESS] Created ${product.id}. Updating Price: $${price}...`);
            
            const updateResult = await shopifyRequest(UPDATE_VARIANT_MUTATION, {
                input: {
                    id: variantId,
                    price: price,
                    sku: `1688-${offerId}`
                }
            });
            
            if (updateResult && updateResult.productVariantUpdate && !updateResult.productVariantUpdate.userErrors.length) {
                console.log(`   [SUCCESS] Price Updated.`);
                return true;
            } else {
                console.error(`   [FAILED Price] ${JSON.stringify(updateResult?.productVariantUpdate?.userErrors)}`);
            }
        } else {
            console.error(`   [FAILED Product] ${JSON.stringify(result?.productCreate?.userErrors)}`);
        }
    } catch (e) {
        console.error(`   [SYSTEM ERROR] ${e.message}`);
    }
    return false;
}

async function main() {
    for (const cat of categories) {
        const filePath = path.join(DATA_DIR, cat.file);
        if (!fs.existsSync(filePath)) continue;

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`\n--- Batch Sync: ${cat.category} ---`);
        
        for (let i = 0; i < 3; i++) {
            if (data[i]) await syncProduct(data[i], cat.category);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

main().catch(console.error);
