#!/bin/bash

SHOP_NAME="pxjkad-zt"
ACCESS_TOKEN="${SHOPIFY_ACCESS_TOKEN}"
API_URL="https://$SHOP_NAME.myshopify.com/admin/api/2024-01/graphql.json"

create_product() {
  local title="$1"
  local desc="$2"
  local price="$3"
  local category="$4"
  local image="$5"

  echo "Creating Product: $title..."
  
  # 1. Create Product
  QUERY='mutation { productCreate(input: { title: "'"$title"'", descriptionHtml: "'"$desc"'", vendor: "0Buck", status: ACTIVE, productType: "'"$category"'" }) { product { id variants(first: 1) { edges { node { id } } } } userErrors { message } } }'
  
  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Access-Token: $ACCESS_TOKEN" \
    -d "{\"query\": \"$QUERY\"}")

  PRODUCT_ID=$(echo $RESPONSE | jq -r '.data.productCreate.product.id')
  VARIANT_ID=$(echo $RESPONSE | jq -r '.data.productCreate.product.variants.edges[0].node.id')

  if [ "$PRODUCT_ID" != "null" ]; then
    echo "   [OK] Product Created: $PRODUCT_ID"
    echo "   [OK] Variant ID: $VARIANT_ID"
    
    # 2. Update Price (wait a bit)
    sleep 3
    echo "   Updating Price to $price..."
    UPDATE_QUERY='mutation { productVariantUpdate(input: { id: "'"$VARIANT_ID"'", price: "'"$price"'" }) { productVariant { id price } userErrors { message } } }'
    
    UPDATE_RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "X-Shopify-Access-Token: $ACCESS_TOKEN" \
      -d "{\"query\": \"$UPDATE_QUERY\"}")
    
    NEW_PRICE=$(echo $UPDATE_RESPONSE | jq -r '.data.productVariantUpdate.productVariant.price')
    echo "   [FINAL] New Price: $NEW_PRICE"
  else
    echo "   [ERROR] $(echo $RESPONSE | jq -r '.data.productCreate.userErrors[0].message')"
  fi
}

# Test with one item
create_product "[0Buck] ULTIMATE TEST" "Best product ever" "99.99" "Smart Home" "https://sc01.alicdn.com/kf/Abafe897f47f7466ab81e2fd5d542336ce.png"
