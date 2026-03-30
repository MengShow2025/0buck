const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const SHOP = "pxjkad-zt";
const TOKEN = "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";
const URL = `https://${SHOP}.myshopify.com/admin/api/2024-01/graphql.json`;

const DATA_DIR = path.join(__dirname, '../data/1688');
const mapping = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'translated_mapping.json'), 'utf-8'));

function call(q, v = {}) {
    const payload = JSON.stringify({ query: q, variables: v });
    const cmd = `curl -s -X POST "${URL}" -H "Content-Type: application/json" -H "X-Shopify-Access-Token: ${TOKEN}" -d @- <<'EOF'\n${payload}\nEOF`;
    try {
        return JSON.parse(execSync(cmd).toString());
    } catch (e) {
        return { error: e.message };
    }
}

async function sync(item, cat) {
    const cost = parseFloat(item.price) || 50;
    const price = (cost * 0.14 * (cost < 35 ? 3 : 1.6)).toFixed(2);
    const info = mapping[item.title] || { title_en: item.title, description_en: item.title };
    
    console.log(`> ${info.title_en.substring(0, 30)}... ($${price})`);
    
    const res1 = call(`mutation($i: ProductInput!) { productCreate(input: $i) { product { id variants(first:1){edges{node{id}}} } } }`, {
        i: { title: `[0Buck] ${info.title_en}`, descriptionHtml: info.description_en, vendor: "0Buck", status: "ACTIVE", productType: cat }
    });
    
    const pid = res1?.data?.productCreate?.product?.id;
    const vid = res1?.data?.productCreate?.product?.variants?.edges[0]?.node?.id;
    
    if (pid && vid) {
        call(`mutation($p: ID!, $v: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $p, variants: $v) { product { id } } }`, {
            p: pid, v: [{ id: vid, price: price }]
        });
        console.log(`  [OK] ${pid}`);
        return true;
    }
    console.log(`  [FAIL] ${JSON.stringify(res1)}`);
    return false;
}

async function main() {
    const files = [['smart_home.json', 'Smart Home'], ['office_tech.json', 'Office Tech'], ['outdoor.json', 'Outdoor Life']];
    for (const [f, c] of files) {
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8'));
        for (const item of data.slice(0, 5)) { // Sync 5 per cat
            await sync(item, c);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}
main();
