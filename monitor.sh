#!/bin/bash
TOKEN="os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOP="pxjkad-zt"
COUNT_URL="https://$SHOP.myshopify.com/admin/api/2024-01/products/count.json"
PRODUCTS_URL="https://$SHOP.myshopify.com/admin/api/2024-01/products.json?limit=250&fields=variants"

last_count=-1
stable_start=$(date +%s)

echo "Starting monitoring for shop $SHOP..."

while true; do
  count_json=$(curl -s -H "X-Shopify-Access-Token: $TOKEN" "$COUNT_URL")
  count=$(echo $count_json | jq -r '.count' 2>/dev/null)
  
  if [ "$count" = "" ] || [ "$count" = "null" ]; then
    echo "Error or empty response: $count_json"
    sleep 5
    continue
  fi
  
  now=$(date +%s)
  echo "[$(date '+%H:%M:%S')] Count: $count"
  
  if [ "$count" -ge 20 ]; then
    echo "Target count reached: $count"
    break
  fi
  
  if [ "$count" -ne "$last_count" ]; then
    last_count=$count
    stable_start=$now
  else
    diff=$((now - stable_start))
    if [ $diff -ge 180 ]; then
      echo "Count stable for 3 minutes at $count."
      break
    fi
  fi
  
  sleep 15
done

echo "Fetching final list of SKUs..."
skus=$(curl -s -H "X-Shopify-Access-Token: $TOKEN" "$PRODUCTS_URL" | jq -r '.products[].variants[].sku' | grep -v '^$')

echo "SKUs Found:"
echo "$skus"

total_skus=$(echo "$skus" | wc -l | xargs)
unique_skus=$(echo "$skus" | sort -u | wc -l | xargs)

echo "Total SKUs count: $total_skus"
echo "Unique SKUs count: $unique_skus"

if [ "$total_skus" -eq "$unique_skus" ] && [ "$total_skus" -gt 0 ]; then
  echo "SUCCESS: All SKUs are unique."
elif [ "$total_skus" -eq 0 ]; then
  echo "No SKUs found."
else
  echo "FAILURE: Duplicate SKUs found!"
fi
