import React, { useState } from 'react';
import { VortexContainer } from './components/VCC/VortexContainer';
import { VCCInput } from './components/VCC/VCCInput';
import { CustomMessageUI } from './components/VCC/CustomMessageUI';

// Mock data to preview the UI
const initialMessages = [
  {
    id: 'msg-1',
    text: 'Hello! I am Dumbo, your artisan assistant. What can I find for you today?',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    attachments: [],
    user: { id: 'dumbo' }
  },
  {
    id: 'msg-2',
    text: 'Show me some cool tech gadgets.',
    created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    attachments: [],
    user: { id: 'user' }
  },
  {
    id: 'msg-3',
    text: 'Here is a great deal on a verified item:',
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    attachments: [
      {
        type: '0B_CARD_V3',
        component: '0B_PRODUCT_GRID',
        data: {
          title: 'Artisan Crafted Wireless Earbuds with Noise Cancellation',
          price: 29.99,
          original_price: 59.99,
          physical_verification: { weight_kg: 0.15, dimensions_cm: '10x10x5 cm' },
          image_url: 'https://images.unsplash.com/photo-1606220588913-b3aea06b026a?w=400&q=80'
        }
      }
    ],
    user: { id: 'dumbo' }
  },
  {
    id: 'msg-4',
    text: '',
    created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    attachments: [
      {
        type: '0B_CARD_V3',
        component: '0B_CASHBACK_RADAR',
        data: {
          current_phase: 7,
          total_phases: 20,
          amount_returned: 14.50,
          amount_total: 45.00
        }
      }
    ],
    user: { id: 'dumbo' }
  }
];

function App() {
  const [messages, setMessages] = useState(initialMessages);

  const handleSendMessage = (text: string) => {
    // Check for mock AI command
    const isDarkModeCommand = text.toLowerCase().includes('dark') || text.includes('黑');
    const isLightModeCommand = text.toLowerCase().includes('light') || text.includes('亮');

    const newMsg = {
      id: `msg-${Date.now()}`,
      text,
      created_at: new Date().toISOString(),
      attachments: [],
      user: { id: 'user' }
    };

    setMessages((prev) => [...prev, newMsg]);

    // Mock AI Response
    setTimeout(() => {
      let aiAttachments: any[] = [];
      let aiText = "I'm looking into that for you!";

      if (isDarkModeCommand) {
        aiText = "已经为您切换到暗黑模式啦！🌙";
        aiAttachments = [{ type: '0B_SYSTEM_ACTION', action: 'SET_THEME', value: 'dark' }];
      } else if (isLightModeCommand) {
        aiText = "已经为您切换到明亮模式啦！☀️";
        aiAttachments = [{ type: '0B_SYSTEM_ACTION', action: 'SET_THEME', value: 'light' }];
      }

      const aiMsg = {
        id: `msg-${Date.now() + 1}`,
        text: aiText,
        created_at: new Date().toISOString(),
        attachments: aiAttachments,
        user: { id: 'dumbo' }
      };

      setMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  return (
    <VortexContainer>
      <div className="flex flex-col gap-2 pb-24">
        {messages.map((msg) => (
          <CustomMessageUI 
            key={msg.id} 
            message={msg} 
            isMyMessage={() => msg.user.id === 'user'} 
          />
        ))}
      </div>
      
      {/* Absolute positioned input at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-[var(--wa-bg)] to-transparent pt-6">
        <VCCInput onSendMessage={handleSendMessage} />
      </div>
    </VortexContainer>
  );
}

export default App;
