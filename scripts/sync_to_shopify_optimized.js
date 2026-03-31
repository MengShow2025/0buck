const fs = require('fs');
const path = require('path');

const SHOP_NAME = "pxjkad-zt";
const ACCESS_TOKEN = "process.env.SHOPIFY_ACCESS_TOKEN";
const GEMINI_API_KEY = "AIzaSyAiiICu3XOGQgUk3Pt_6qRbnGJ_b3dvt2s";
const GRAPHQL_URL = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`;

const categories = [
    { file: 'smart_home.json', category: 'Smart Home' },
    { file: 'office_tech.json', category: 'Office Tech' },
    { file: 'outdoor.json', category: 'Outdoor Life' }
];

const DATA_DIR = path.join(__dirname, '../data/1688');

async function aiEnrich(originalTitle, category) {
    console.log(`   [AI] Processing: ${originalTitle.substring(0, 30)}...`);
    const prompt = `
    Task: Translate and optimize for US Shopify store.
    Category: ${category}
    Chinese Title: ${originalTitle}
    
    Output JSON ONLY:
    {
      "title_en": "Professional Catchy English Title (max 70 chars)",
      "description_en": "Professional English description with 3-4 bullet points (HTML format)"
    }`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error("   [AI API Error]:", data.error.message);
            throw new Error(data.error.message);
        }

        let text = data.candidates[0].content.parts[0].text;
        // Strip markdown code blocks if any
        text = text.replace(/```json|```/g, "").trim();
        
        const result = JSON.parse(text);
        return {
            title_en: result.title_en || originalTitle,
            description_en: result.description_en || "Professional quality product sourced for 0Buck."
        };
    } catch (e) {
        console.error("   [AI FAILED]:", e.message);
        return {
            title_en: originalTitle.substring(0, 50),
            description_en: "<p>Premium quality product carefully sourced from reliable suppliers.</p>"
        };
    }
}

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
        if (data.errors) {
            console.error("   [Shopify Errors]:", JSON.stringify(data.errors));
        }
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
    
    // AI Enrich
    const enriched = await aiEnrich(item.title, category);
    
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
                sku: `1688-${offerId}`
            }
        ],
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
        console.log(`\n--- Optimizing & Syncing: ${cat.category} ---`);
        
        for (let i = 0; i < 2; i++) {
            if (data[i]) await syncProduct(data[i], cat.category);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

main().catch(console.error);
