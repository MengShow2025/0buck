const fs = require('fs');
const path = require('path');

const SHOP_NAME = "pxjkad-zt";
const ACCESS_TOKEN = "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";
const GRAPHQL_URL = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`;

const categories = [
    { file: 'smart_home.json', category: 'Smart Home' },
    { file: 'office_tech.json', category: 'Office Tech' },
    { file: 'outdoor.json', category: 'Outdoor Life' }
];

const DATA_DIR = path.join(__dirname, '../data/1688');

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

async function shopifyQuery(query, variables = {}) {
    try {
        const response = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': ACCESS_TOKEN
            },
            body: JSON.stringify({ query, variables })
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.data;
    } catch (e) {
        console.error("Fetch Error:", e.message);
        return null;
    }
}

const CREATE_PRODUCT_MUTATION = `
mutation productCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
  productCreate(input: $input, media: $media) {
    product {
      id
      title
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
mutation productVariantUpdate($input: ProductVariantInput!) {
  productVariantUpdate(input: $input) {
    productVariant {
      id
      price
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
    const offerMatch = item.product_url.match(/offerId=(\d+)/) || 
                       item.product_url.match(/offer\/(\d+)\.html/);
    const offerId = offerMatch ? offerMatch[1] : "offer_" + Math.random().toString(36).substr(2, 9);

    const input = {
        title: `[0Buck] ${item.title.substring(0, 80)}`, 
        descriptionHtml: `<p>${item.title}</p><p>Imported from 1688 with 0Buck AI sync.</p>`,
        vendor: "0Buck",
        productType: category,
        status: "ACTIVE",
        metafields: [
          {
            namespace: "0buck_sync",
            key: "source_1688_id",
            value: offerId,
            type: "single_line_text_field"
          },
          {
            namespace: "0buck_sync",
            key: "is_reward_eligible",
            value: isRewardEligible ? "true" : "false",
            type: "single_line_text_field"
          }
        ]
    };
    
    const mediaInput = item.image_url ? [{
        mediaContentType: "IMAGE",
        originalSource: item.image_url
    }] : [];

    console.log(`Syncing: ${item.title.substring(0, 30)}...`);
    const result = await shopifyQuery(CREATE_PRODUCT_MUTATION, { input, media: mediaInput });
    
    if (result && result.productCreate && result.productCreate.product) {
        const product = result.productCreate.product;
        console.log(`   [SUCCESS] Product: ${product.id}`);
        
        // Update price on the default variant
        const variantId = product.variants.edges[0]?.node.id;
        if (variantId) {
            console.log(`   Updating Variant: ${variantId} -> $${price}`);
            await shopifyQuery(UPDATE_VARIANT_MUTATION, {
                input: {
                    id: variantId,
                    price: price,
                    sku: `1688-${offerId}`
                }
            });
        }
        return true;
    } else {
        console.log(`   [FAILED] ${JSON.stringify(result?.productCreate?.userErrors)}`);
    }
    return false;
}

async function main() {
    for (const cat of categories) {
        const filePath = path.join(DATA_DIR, cat.file);
        if (!fs.existsSync(filePath)) continue;

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`\n--- Category: ${cat.category} (${data.length} items) ---`);
        
        // Sync 3 items per category
        for (let i = 0; i < 3; i++) {
            if (data[i]) await syncProduct(data[i], cat.category);
            await new Promise(r => setTimeout(r, 1500)); 
        }
    }
}

main().catch(console.error);
