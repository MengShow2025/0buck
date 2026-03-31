import './globals.css';
import {ShopifyProvider} from '@shopify/hydrogen-react';

const shopifyConfig = {
  storeDomain: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'shop.0buck.com',
  storefrontToken: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '',
  storefrontApiVersion: '2026-01',
  countryIsoCode: 'US',
  languageIsoCode: 'EN',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ShopifyProvider {...shopifyConfig}>
          {children}
        </ShopifyProvider>
      </body>
    </html>
  );
}
