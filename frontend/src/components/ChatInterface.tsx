'use client';

import {useState, useEffect, useRef} from 'react';
import {Send, Image as ImageIcon, Loader2} from 'lucide-react';
import ProductCard from './ProductCard';
import {useShopify} from '@shopify/hydrogen-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  products?: any[];
  isStreaming?: boolean;
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {role: 'assistant', content: "Welcome to 0buck! I'm your AI shopping assistant. Send me a picture or describe what you're looking for."}
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {storeDomain, storefrontToken, storefrontApiVersion} = useShopify();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchRealProduct = async (shopifyId: string) => {
    try {
      // Ensure it's a GID
      const gid = shopifyId.startsWith('gid://') ? shopifyId : `gid://shopify/Product/${shopifyId}`;
      
      const response = await fetch(`https://${storeDomain}/api/${storefrontApiVersion}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken || '',
        },
        body: JSON.stringify({
          query: `
            query getProduct($id: ID!) {
              product(id: $id) {
                id
                title
                handle
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                featuredImage {
                  url
                  altText
                  width
                  height
                }
              }
            }
          `,
          variables: {id: gid},
        }),
      });

      const json = await response.json();
      return json.data?.product;
    } catch (error) {
      console.error('Error fetching product from Shopify:', error);
      return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {role: 'user', content: input};
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Prepare assistant message for streaming
    const assistantMessage: Message = {role: 'assistant', content: '', isStreaming: true};
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/agent/stream`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({content: input}),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let products: any[] = [];

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'text') {
                assistantContent += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const last = newMessages[newMessages.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content = assistantContent;
                  }
                  return newMessages;
                });
              } else if (data.type === 'products') {
                // Fetch real product data for each mock product
                const realProducts = await Promise.all(
                  data.products.map(async (p: any) => {
                    const real = await fetchRealProduct(p.shopify_id);
                    if (real) return real;
                    
                    // Fallback formatting for mock product to match ProductCard expectations
                    return {
                      id: p.shopify_id,
                      title: p.title,
                      handle: p.id,
                      priceRange: {
                        minVariantPrice: {
                          amount: p.price.toString(),
                          currencyCode: 'USD'
                        }
                      },
                      featuredImage: p.images?.[0] ? {
                        url: p.images[0],
                        altText: p.title,
                        width: 800,
                        height: 800
                      } : undefined
                    };
                  })
                );
                
                products = [...products, ...realProducts.filter(Boolean)];
                setMessages(prev => {
                  const newMessages = [...prev];
                  const last = newMessages[newMessages.length - 1];
                  if (last && last.role === 'assistant') {
                    last.products = products;
                  }
                  return newMessages;
                });
              } else if (data.type === 'done') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const last = newMessages[newMessages.length - 1];
                  if (last && last.role === 'assistant') {
                    last.isStreaming = false;
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const last = newMessages[newMessages.length - 1];
        if (last && last.role === 'assistant') {
          last.content = "Sorry, I encountered an error. Please try again.";
          last.isStreaming = false;
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="p-4 bg-white border-b flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">0</div>
          <h1 className="text-xl font-bold text-gray-900">0buck AI</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Live Agent</div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-3 ${
              msg.role === 'user' ? 'bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none' : ''
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-blue-600 text-xs font-bold">AI</span>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm text-gray-800 leading-relaxed">
                      {msg.content}
                      {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-blue-400 ml-1 animate-pulse vertical-middle"></span>}
                    </div>
                    
                    {msg.products && msg.products.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {msg.products.map((product, idx) => (
                          <ProductCard key={product.id || idx} product={product} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {msg.role === 'user' && msg.content}
            </div>
          </div>
        ))}
      </main>

      {/* Input */}
      <footer className="p-4 bg-white border-t safe-bottom">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <button className="text-gray-400 hover:text-blue-600 transition-colors">
            <ImageIcon size={22} />
          </button>
          <input 
            type="text" 
            placeholder="Search products or ask anything..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1 text-gray-800"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button 
            onClick={handleSend} 
            className={`${isLoading ? 'text-gray-400' : 'text-blue-600 hover:scale-110'} transition-all`}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} />}
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          Powered by Global Cloud AI • Optimized for shop.0buck.com
        </p>
      </footer>
    </div>
  );
}
