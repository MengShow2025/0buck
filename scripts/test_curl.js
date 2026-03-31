const { execSync } = require('child_process');

const SHOP_NAME = "pxjkad-zt";
const ACCESS_TOKEN = "process.env.SHOPIFY_ACCESS_TOKEN";
const API_URL = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/graphql.json`;

function shopifyCurl(query, variables = {}) {
    const data = JSON.stringify({ query, variables });
    const cmd = `curl -s -X POST "${API_URL}" -H "Content-Type: application/json" -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}" -d '${data.replace(/'/g, "'\\''")}'`;
    try {
        const out = execSync(cmd).toString();
        return JSON.parse(out);
    } catch (e) {
        console.error("   [CURL ERROR]:", e.message);
        return null;
    }
}

async function test() {
    console.log("Creating Product with Curl...");
    const CREATE_PRODUCT = `
    mutation {
      productCreate(input: { title: "[0Buck] CURL TEST v4", vendor: "0Buck", status: ACTIVE }) {
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
      }
    }
    `;
    const res = shopifyCurl(CREATE_PRODUCT);
    const product = res?.data?.productCreate?.product;
    if (product) {
        const pid = product.id;
        const vid = product.variants.edges[0].node.id;
        console.log(`   [OK] Product: ${pid}, Variant: ${vid}`);
        
        console.log("   Waiting 3s...");
        await new Promise(r => setTimeout(r, 3000));
        
        console.log("   Updating Price to $9.99...");
        const UPDATE_VARIANT = `
        mutation {
          productVariantUpdate(input: { id: "${vid}", price: "9.99" }) {
            productVariant {
              id
              price
            }
          }
        }
        `;
        const res2 = shopifyCurl(UPDATE_VARIANT);
        console.log("   [FINAL] Result:", JSON.stringify(res2));
    } else {
        console.log("   [FAILED] Product Creation:", JSON.stringify(res));
    }
}

test();
