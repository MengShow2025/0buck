# 0Buck Headless Architecture: Shopify Backend Setup Checklist

This document outlines the mandatory Shopify backend configurations to support the 0Buck Headless architecture (Custom React Frontend on `0buck.com` + Shopify Checkout/CDN on `shop.0buck.com`).

## 1. Subdomain & CNAME Configuration
To ensure a seamless brand experience and secure checkout:
- **Subdomain**: `shop.0buck.com`
- **DNS Record**: Create a CNAME record pointing `shop.0buck.com` to `shops.myshopify.com`.
- **Verification**: Once the DNS propagates, add this domain in **Shopify Admin -> Settings -> Domains** and set it as a "Primary" domain for the Online Store.

## 2. Traffic Redirection (theme.liquid)
Since the custom React UI lives on `0buck.com`, we must redirect all traffic hitting the default Liquid pages back to the main site, except for the checkout process.

**Implementation**: Paste this script at the top of the `<head>` section in `Online Store -> Themes -> Edit Code -> Layout -> theme.liquid`:

```html
<script>
  (function() {
    var mainDomain = "https://0buck.com"; // Your production frontend URL
    var currentPath = window.location.pathname;

    // Do NOT redirect if the user is already in the checkout flow or account login
    if (!currentPath.includes('/checkout') && 
        !currentPath.includes('/account') && 
        !currentPath.includes('/cart')) {
      window.location.replace(mainDomain + currentPath);
    }
  })();
</script>
```

## 3. Checkout Visual Alignment (Black & Gold)
To match the "亲儿子" React UI, configure the checkout appearance in **Settings -> Checkout -> Customize Checkout**:

- **Logo**: Upload the high-res 0Buck logo (transparent PNG).
- **Colors**:
  - **Accents**: `#F97316` (obuck-orange)
  - **Buttons**: `#000000` (black)
  - **Backgrounds**: Use neutral or white to maintain a clean "Professional" feel.
- **Typography**: Choose a sans-serif font (e.g., Lato or Helvetica) to match the modern React vibe.

## 4. Storefront API Access
- **Private App**: Ensure the "Storefront API" is enabled.
- **Scopes**: 
  - `unauthenticated_read_product_listings`
  - `unauthenticated_read_product_inventory`
  - `unauthenticated_write_checkouts`
- **Token**: Use the existing Storefront Access Token for all product queries in the React app.

## 5. Global CDN Strategy
- **Usage**: Always use the Shopify-provided CDN URLs for product images in the React frontend.
- **Format**: `https://cdn.shopify.com/s/files/...`
- **Benefit**: This utilizes Shopify's global edge nodes for ultra-fast image loading worldwide at no extra cost.

---
*Configured by: Shopify Specialist*
