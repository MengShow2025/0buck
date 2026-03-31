const fs = require('fs');
const https = require('https');

const SHOP_NAME = "pxjkad-zt";
const ACCESS_TOKEN = "process.env.SHOPIFY_ACCESS_TOKEN";

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
            res.on('end', () => resolve(JSON.parse(body)));
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
      title
      variants(first: 1) {
        edges {
          node {
            id
            price
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

async function test() {
    const input = {
        title: "[0Buck] TEST PRICE SYNC v3",
        vendor: "0Buck",
        status: "ACTIVE",
        variants: [
            {
                price: "123.45",
                sku: "test-sku-001"
            }
        ]
    };
    const result = await shopifyRequest(CREATE_PRODUCT, { input });
    console.log("Result:", JSON.stringify(result, null, 2));
}

test();
