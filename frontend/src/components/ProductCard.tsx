import {Image} from '@shopify/hydrogen-react';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    handle: string;
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    featuredImage?: {
      url: string;
      altText?: string;
      width: number;
      height: number;
    };
  };
}

export default function ProductCard({product}: ProductCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer w-48 shrink-0">
      <div className="aspect-square bg-gray-100 relative">
        {product.featuredImage && (
          <Image 
            data={product.featuredImage}
            className="object-cover w-full h-full"
            sizes="200px"
          />
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 truncate">{product.title}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-blue-600 font-bold">${product.priceRange.minVariantPrice.amount}</span>
          <button className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md">Buy Now</button>
        </div>
      </div>
    </div>
  );
}
