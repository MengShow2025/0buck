#!/bin/bash

SHOP_NAME="pxjkad-zt"
TOKEN="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"
API_VERSION="2024-01"

create_metafield_definition() {
  local namespace=$1
  local key=$2
  local name=$3
  local type=$4
  local owner_type=$5

  echo "Deploying $namespace.$key ($owner_type)..."

  curl -s -X POST "https://$SHOP_NAME.myshopify.com/admin/api/$API_VERSION/graphql.json" \
    -H "X-Shopify-Access-Token: $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"mutation { metafieldDefinitionCreate(definition: { name: \\\"$name\\\", namespace: \\\"$namespace\\\", key: \\\"$key\\\", type: \\\"$type\\\", ownerType: $owner_type }) { createdDefinition { id name key namespace } userErrors { field message code } } }\"
    }" | jq .
}

# --- 0buck_rewards (Customer) ---
create_metafield_definition "0buck_rewards" "wallet_balance" "Wallet Balance" "number_decimal" "CUSTOMER"
create_metafield_definition "0buck_rewards" "referral_code" "Referral Code" "single_line_text_field" "CUSTOMER"
create_metafield_definition "0buck_rewards" "inviter_id" "Inviter Shopify ID" "number_integer" "CUSTOMER"
create_metafield_definition "0buck_rewards" "user_level" "User Membership Level" "single_line_text_field" "CUSTOMER"

# --- 0buck_sync (Product) ---
create_metafield_definition "0buck_sync" "source_1688_id" "1688 Source ID" "single_line_text_field" "PRODUCT"
create_metafield_definition "0buck_sync" "original_cost" "Original Cost (CNY)" "number_decimal" "PRODUCT"
create_metafield_definition "0buck_sync" "is_reward_eligible" "Is Reward Eligible" "boolean" "PRODUCT"
create_metafield_definition "0buck_sync" "supplier_info" "Supplier Info" "json" "PRODUCT"
create_metafield_definition "0buck_sync" "last_sync_timestamp" "Last Sync Timestamp" "date_time" "PRODUCT"

echo "Done."
