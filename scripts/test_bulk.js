const { execSync } = require('child_process');

const SHOP_NAME = "pxjkad-zt";
const ACCESS_TOKEN = "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";
const API_URL = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`;

function shopifyCurl(query, variables = {}) {
    const data = JSON.stringify({ query, variables });
    const cmd = `curl -s -X POST "${API_URL}" -H "Content-Type: application/json" -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}" -d '${data.replace(/'/g, "'\\''")}'`;
    try {
        const out = execSync(cmd).toString();
        return JSON.parse(out);
    } catch (e) {
        return null;
    }
}

async function test() {
    console.log("Creating Product...");
    const CREATE = `mutation { productCreate(input: { title: "[0Buck] BULK UPDATE TEST", vendor: "0Buck" }) { product { id variants(first: 1) { edges { node { id } } } } } }`;
    const res = shopifyCurl(CREATE);
    const pid = res.data.productCreate.product.id;
    const vid = res.data.productCreate.product.variants.edges[0].node.id;
    
    console.log(`Product: ${pid}, Variant: ${vid}`);
    console.log("Updating Price via productVariantsBulkUpdate...");
    
    const BULK_UPDATE = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        product { id }
        productVariants { id price }
        userErrors { field message }
      }
    }
    `;
    const variables = {
        productId: pid,
        variants: [{ id: vid, price: "88.88" }]
    };
    
    const res2 = shopifyCurl(BULK_UPDATE, variables);
    console.log("Result:", JSON.stringify(res2, null, 2));
}

test();
