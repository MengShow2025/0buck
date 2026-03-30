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
        const data = await response.json();
        return data.data;
    } catch (e) {
        console.error("   [Shopify Fetch Error]:", e.message);
        return null;
    }
}

const CREATE_PRODUCT_MUTATION = `
mutation productCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
  productCreate(input: $input, media: $media) {
    product {
      id
      title
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
    
    // Get pre-translated content or fallback
    const enriched = translationMapping[item.title] || {
        title_en: item.title,
        description_en: `<p>${item.title}</p><p>Imported from 1688 with 0Buck AI sync.</p>`
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
        variants: [
            {
                price: price,
                sku: `1688-${offerId}`,
                inventoryPolicy: "DENY",
                inventoryItem: {
                    tracked: false
                }
            }
        ],
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

    console.log(`   --> Syncing: ${enriched.title_en.substring(0, 40)} ($${price})...`);
    const result = await shopifyQuery(CREATE_PRODUCT_MUTATION, { input, media: mediaInput });
    
    if (result && result.productCreate && result.productCreate.product) {
        console.log(`   [SUCCESS] Product: ${result.productCreate.product.id}`);
        return true;
    } else {
        const errors = result?.productCreate?.userErrors || [];
        console.error(`   [FAILED] Errors: ${JSON.stringify(errors)}`);
    }
    return false;
}

async function main() {
    for (const cat of categories) {
        const filePath = path.join(DATA_DIR, cat.file);
        if (!fs.existsSync(filePath)) continue;

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`\n--- Pre-Optimized Sync: ${cat.category} ---`);
        
        // Let's sync 5 items per category now that we have mapping
        for (let i = 0; i < 5; i++) {
            if (data[i]) await syncProduct(data[i], cat.category);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

main().catch(console.error);
