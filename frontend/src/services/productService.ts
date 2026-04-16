import axios from 'axios';
import { getApiUrl } from '../utils/api';
import { Product } from '../types';

export interface DiscoveryResponse {
  vortex_featured: Product[];
  category_feeds: {
    category: string;
    products: Product[];
  }[];
  butler_greeting: string;
  highlight_index: number;
}

export const productService = {
  async getDiscovery(userCountry: string = 'US', mode: 'LOCAL' | 'GLOBAL' = 'LOCAL'): Promise<DiscoveryResponse> {
    const url = getApiUrl('/v1/products/discovery');
    const response = await axios.get(url, {
      params: {
        user_country: userCountry,
        mode: mode.toLowerCase()
      }
    });
    return response.data;
  },

  async getProduct(id: string): Promise<Product> {
    const url = getApiUrl(`/v1/products/${id}`);
    const response = await axios.get(url);
    return response.data;
  }
};
