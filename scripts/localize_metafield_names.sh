#!/bin/bash

SHOP_NAME="pxjkad-zt"
TOKEN="${SHOPIFY_ACCESS_TOKEN}"
API_VERSION="2024-01"

update_metafield_definition_name() {
  local namespace=$1
  local key=$2
  local new_name=$3
  local owner_type=$4

  echo "Updating display name for $namespace.$key to '$new_name' ($owner_type)..."

  curl -s -X POST "https://$SHOP_NAME.myshopify.com/admin/api/$API_VERSION/graphql.json" \
    -H "X-Shopify-Access-Token: $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"mutation { metafieldDefinitionUpdate(definition: { namespace: \\\"$namespace\\\", key: \\\"$key\\\", ownerType: $owner_type, name: \\\"$new_name\\\" }) { updatedDefinition { id name } userErrors { field message } } }\"
    }" | jq .
}

# --- Update to Simplified Chinese Names ---
update_metafield_definition_name "0buck_rewards" "wallet_balance" "钱包余额" "CUSTOMER"
update_metafield_definition_name "0buck_rewards" "referral_code" "邀请码" "CUSTOMER"
update_metafield_definition_name "0buck_rewards" "inviter_id" "邀请人 Shopify ID" "CUSTOMER"
update_metafield_definition_name "0buck_rewards" "user_level" "会员等级" "CUSTOMER"

update_metafield_definition_name "0buck_sync" "source_1688_id" "1688 货源 ID" "PRODUCT"
update_metafield_definition_name "0buck_sync" "original_cost" "原始成本 (CNY)" "PRODUCT"
update_metafield_definition_name "0buck_sync" "is_reward_eligible" "是否符合奖励资格" "PRODUCT"
update_metafield_definition_name "0buck_sync" "supplier_info" "供应商信息" "PRODUCT"
update_metafield_definition_name "0buck_sync" "last_sync_timestamp" "最后同步时间" "PRODUCT"

echo "Metafield names localized to Simplified Chinese."
