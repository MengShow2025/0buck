import { Message, User } from '../types';

const API_BASE_URL = '/api/v1';

export const apiService = {
  async sendMessage(content: string, type: 'text' | 'image' = 'text'): Promise<Message> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, type }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  },

  async getUserProfile(customerId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${customerId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return response.json();
  },

  async sync1688Product(productId: string) {
    const response = await fetch(`${API_BASE_URL}/sync/1688/${productId}`, {
      method: 'POST',
    });
    return response.json();
  }
};
