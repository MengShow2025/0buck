const fs = require('fs');
const https = require('https');
const path = require('path');

const SHOP_NAME = "pxjkad-zt";
const ACCESS_TOKEN = "process.env.SHOPIFY_ACCESS_TOKEN";

const categories = [
    { file: 'smart_home.json', category: 'Smart Home' },
    { file: 'office_tech.json', category: 'Office Tech' },
    { file: 'outdoor.json', category: 'Outdoor Life' }
];

const DATA_DIR = path.join(__dirname, '../data/1688');
const mapping = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'translated_mapping.json'), 'utf-8'));

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
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error("Invalid JSON: " + body.substring(0, 100)));
                }
            });
        });
        req.on('error', e => reject(e));
        req.write(postData);
        req.end();
    });
}

const CREATE_PRODUCT = `
mutation productCreate($input: ProductInput!) {
  productCreate(input: $input) {
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
      message
    }
  }
}
`;

const UPDATE_VARIANT = `
mutation variantUpdate($input: ProductVariantInput!) {
  productVariantUpdate(input: $input) {
    productVariant {
      id
      price
    }
    userErrors {
      message
    }
  }
}
`;

async function syncItem(item, category) {
    const costCny = parseFloat(item.price) || 50;
    const costUsd = costCny * 0.14;
    let multiplier = 1.4;
    if (costUsd <= 5) multiplier = 3.0;
    else if (costUsd <= 20) multiplier = 2.0;
    else if (costUsd <= 50) multiplier = 1.6;
    const price = (costUsd * multiplier).toFixed(2);

    const enriched = mapping[item.title] || { title_en: item.title, description_en: item.title };
    const offerId = item.product_url.match(/offerId=(\d+)/)?.[1] || "sku-" + Math.random().toString(36).slice(2, 7);

    console.log(`Syncing: ${enriched.title_en.substring(0, 30)}...`);

    const productInput = {
        title: `[0Buck] ${enriched.title_en}`,
        descriptionHtml: enriched.description_en,
        vendor: "0Buck",
        status: "ACTIVE",
        productType: category
    };

    try {
        const res1 = await shopifyRequest(CREATE_PRODUCT, { input: productInput });
        if (res1.data?.productCreate?.product) {
            const product = res1.data.productCreate.product;
            const variantId = product.variants.edges[0].node.id;
            console.log(`   Created ${product.id}. Updating price to $${price}...`);
            
            const res2 = await shopifyRequest(UPDATE_VARIANT, {
                input: {
                    id: variantId,
                    price: price,
                    sku: `1688-${offerId}`
                }
            });
            
            if (res2.data?.productVariantUpdate?.productVariant) {
                console.log(`   [SUCCESS] Price set to $${price}`);
                return true;
            } else {
                console.error("   [ERROR Price]:", JSON.stringify(res2));
            }
        } else {
            console.error("   [ERROR Product]:", JSON.stringify(res1));
        }
    } catch (e) {
        console.error("   [SYSTEM ERROR]:", e.message);
    }
    return false;
}

async function main() {
    for (const cat of categories) {
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, cat.file), 'utf-8'));
        console.log(`\n--- ${cat.category} ---`);
        for (let i = 0; i < 3; i++) {
            if (data[i]) {
                await syncItem(data[i], cat.category);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
}

main();
