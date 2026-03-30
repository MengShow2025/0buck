import shopify
import os
import json
from backend.app.core.config import settings

def create_metafield_definition(namespace, key, name, type, owner_type):
    """
    Creates a metafield definition using GraphQL.
    owner_type: PRODUCT, CUSTOMER, ORDER, etc.
    """
    query = """
    mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
          key
          namespace
        }
        userErrors {
          field
          message
          code
        }
      }
    }
    """
    
    variables = {
        "definition": {
            "name": name,
            "namespace": namespace,
            "key": key,
            "type": type,
            "ownerType": owner_type
        }
    }
    
    result = shopify.GraphQL().execute(query, variables)
    result_data = json.loads(result)
    
    if "data" in result_data and result_data["data"]["metafieldDefinitionCreate"]["userErrors"]:
        errors = result_data["data"]["metafieldDefinitionCreate"]["userErrors"]
        for error in errors:
            if error["code"] == "TAKEN":
                print(f"[SKIP] Metafield definition {namespace}.{key} already exists.")
            else:
                print(f"[ERROR] Failed to create {namespace}.{key}: {error['message']}")
    elif "data" in result_data and result_data["data"]["metafieldDefinitionCreate"]["createdDefinition"]:
        print(f"[SUCCESS] Created Metafield definition: {namespace}.{key}")
    else:
        print(f"[ERROR] Unknown error for {namespace}.{key}: {result}")

def deploy_all_definitions():
    # Initialize Shopify session
    shop_url = f"{settings.SHOPIFY_SHOP_NAME}.myshopify.com"
    access_token = settings.SHOPIFY_ACCESS_TOKEN
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    print(f"Deploying Metafield Definitions to {shop_url}...")

    # --- 0buck_sync (Product) ---
    product_metafields = [
        ("0buck_sync", "source_1688_id", "1688 Source ID", "single_line_text_field"),
        ("0buck_sync", "original_cost", "Original Cost (CNY)", "number_decimal"),
        ("0buck_sync", "is_reward_eligible", "Is Reward Eligible", "boolean"),
        ("0buck_sync", "supplier_info", "Supplier Info", "json"),
        ("0buck_sync", "last_sync_timestamp", "Last Sync Timestamp", "date_time"),
    ]
    
    for ns, key, name, m_type in product_metafields:
        create_metafield_definition(ns, key, name, m_type, "PRODUCT")

    # --- 0buck_rewards (Customer) ---
    customer_metafields = [
        ("0buck_rewards", "wallet_balance", "Wallet Balance", "number_decimal"),
        ("0buck_rewards", "referral_code", "Referral Code", "single_line_text_field"),
        ("0buck_rewards", "inviter_id", "Inviter Shopify ID", "number_integer"),
        ("0buck_rewards", "user_level", "User Membership Level", "single_line_text_field"),
    ]
    
    for ns, key, name, m_type in customer_metafields:
        create_metafield_definition(ns, key, name, m_type, "CUSTOMER")

    shopify.ShopifyResource.clear_session()
    print("Deployment complete.")

if __name__ == "__main__":
    deploy_all_definitions()
