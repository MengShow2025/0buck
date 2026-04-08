# 0Buck VCC Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the VCC (Vortex Chat Container) frontend combining WhatsApp's chat flow with floating quick replies and a "WeChat Mini-Shop" `[+]` extension menu.

**Architecture:** We will wrap the `stream-chat-react` UI components. The main chat container will have a fixed bottom input bar. Custom BAP cards will be rendered by intercepting the Stream `Message` component. The `[+]` button will trigger a bottom sheet/drawer containing the Mini-Shop entry and other utilities.

**Tech Stack:** React, TailwindCSS, stream-chat-react, Framer Motion (for bottom sheet/drawer), Lucide Icons.

---

### Task 1: Setup VCC Base Layout, Theme (Dark Mode) & i18n Context

**Files:**
- Create: `frontend/src/components/VCC/AppContext.tsx`
- Create: `frontend/src/components/VCC/VortexContainer.tsx`
- Create: `frontend/src/components/VCC/VCCHeader.tsx`
- Modify: `frontend/src/components/VCC/styles.css`

- [ ] **Step 1: Update styles.css for Dark Mode Support**
Add `.dark` class variables mirroring WeChat Dark Mode, but retaining 0Buck Orange accents.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --wa-teal: #F35B25; /* 0Buck Orange */
    --wa-bg: #ECE5DD;
    --wa-bubble-out: #FFE0D3;
    --wa-bubble-in: #FFFFFF;
    --brand-gray: #7A7A7A;
    
    /* WeChat Style Dark Mode Overrides */
    &.dark {
      --wa-teal: #D94B1B; /* Slightly muted orange for dark mode */
      --wa-bg: #111111;   /* Deep WeChat Gray/Black */
      --wa-bubble-out: #2C2C2C; /* Darker outgoing bubble */
      --wa-bubble-in: #1E1E1E;  /* Darker incoming bubble */
      --brand-gray: #999999;
      color: #E5E5E5;
    }
  }
}
```

- [ ] **Step 2: Create AppContext for Theme & Language**

### Task 5: AI System Control ("System as Chat" Interceptor)

**Files:**
- Modify: `frontend/src/components/VCC/CustomMessageUI.tsx`

- [ ] **Step 1: Intercept `0B_SYSTEM_ACTION` to mutate AppContext**

```tsx
import React, { useEffect } from 'react';
import { ProductGridCard } from './BAPCards/ProductGridCard';
import { CashbackRadarCard } from './BAPCards/CashbackRadarCard';
import { useAppContext } from './AppContext';

export const CustomMessageUI = (props: any) => {
  const { message, isMyMessage } = props;
  const { setTheme, setLanguage } = useAppContext();
  
  // 1. Check for AI System Actions
  const systemAction = message.attachments?.find((a: any) => a.type === '0B_SYSTEM_ACTION');

  useEffect(() => {
    // If there is a system action, apply the state change when the message mounts
    if (systemAction && !isMyMessage()) {
      if (systemAction.action === 'SET_THEME') {
        setTheme(systemAction.value);
      } else if (systemAction.action === 'SET_LANGUAGE') {
        setLanguage(systemAction.value);
      }
    }
  }, [systemAction, setTheme, setLanguage]);

  // 2. Render BAP Cards
  const bapAttachment = message.attachments?.find((a: any) => a.type === '0B_CARD_V3');
  // ... [Keep existing BAP logic]

  // 3. Fallback Bubble Render (Standard)
  // Even if it's a system action, we still render the text (e.g., "帮您切换至黑色模式啦🌙")
  return (
    <div className={`flex w-full my-1 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
      <div className={`...`}>{message.text}</div>
    </div>
  );
};
```
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'zh';

interface AppContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  language: Language;
  setLanguage: (l: Language) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>('zh');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <AppContext.Provider value={{ theme, setTheme, language, setLanguage }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext)!;
```

- [ ] **Step 2: Implement VCCHeader**
Create the sticky header with Avatar, Status, Wallet, and Order icons.

```tsx
import React from 'react';
import { Wallet, ShoppingBag, ChevronLeft } from 'lucide-react';

export const VCCHeader = () => {
  return (
    <div className="flex items-center justify-between h-16 px-4 bg-[var(--wa-teal)] text-white shadow-md z-20">
      <div className="flex items-center gap-3">
        <ChevronLeft className="w-6 h-6 cursor-pointer" />
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl overflow-hidden">🐘</div>
        <div>
          <h1 className="font-semibold text-base leading-tight">Dumbo (0Buck)</h1>
          <span className="text-xs opacity-80">verified artisan assistant</span>
        </div>
      </div>
      <div className="flex gap-4">
        <Wallet className="w-6 h-6 cursor-pointer" />
        <ShoppingBag className="w-6 h-6 cursor-pointer" />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Scaffold VortexContainer**
Create the main wrapper that holds the Header, Stream Chat, and Bottom Input.

```tsx
import React from 'react';
import { VCCHeader } from './VCCHeader';
import './styles.css';

export const VortexContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-[var(--wa-bg)] relative overflow-hidden shadow-2xl">
      <VCCHeader />
      <div className="flex-1 overflow-y-auto relative">
        {/* Chat background pattern overlay */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "url('/wa-pattern.png')" }} />
        <div className="relative z-10 h-full">
            {children}
        </div>
      </div>
    </div>
  );
};
```

### Task 2: Build the Floating Quick Replies & Magic Pocket Input

**Files:**
- Create: `frontend/src/components/VCC/VCCInput.tsx`
- Create: `frontend/src/components/VCC/MagicPocketMenu.tsx`

- [ ] **Step 1: Implement MagicPocketMenu (The `+` Drawer)**
A simple grid menu for the `+` button that includes the WeChat Mini-Shop entry.

```tsx
import React from 'react';
import { Image, Store, MapPin, HeadphonesIcon } from 'lucide-react';

export const MagicPocketMenu = ({ isOpen }: { isOpen: bool }) => {
  if (!isOpen) return null;
  
  return (
    <div className="w-full bg-gray-100 border-t border-gray-200 p-4 grid grid-cols-4 gap-4">
      <div className="flex flex-col items-center gap-2 cursor-pointer">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm"><Store /></div>
        <span className="text-xs text-gray-600">0Buck 小店</span>
      </div>
      <div className="flex flex-col items-center gap-2 cursor-pointer">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm"><Image /></div>
        <span className="text-xs text-gray-600">发图找同款</span>
      </div>
      <div className="flex flex-col items-center gap-2 cursor-pointer">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm"><MapPin /></div>
        <span className="text-xs text-gray-600">修改地址</span>
      </div>
      <div className="flex flex-col items-center gap-2 cursor-pointer">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-700 shadow-sm"><HeadphonesIcon /></div>
        <span className="text-xs text-gray-600">人工客服</span>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Implement VCCInput with Floating Capsules**

```tsx
import React, { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { MagicPocketMenu } from './MagicPocketMenu';

export const VCCInput = ({ onSendMessage }: { onSendMessage: (text: string) => void }) => {
  const [text, setText] = useState('');
  const [showPocket, setShowPocket] = useState(false);

  const quickReplies = ['⚡️ 0Buck 严选', '💸 我的返现', '📦 查物流', '🤝 拼团广场'];

  return (
    <div className="flex flex-col w-full bg-transparent pb-4 z-20">
      {/* Floating Quick Replies */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
        {quickReplies.map(reply => (
          <button 
            key={reply}
            onClick={() => onSendMessage(reply)}
            className="whitespace-nowrap px-4 py-1.5 bg-white border border-gray-200 rounded-full text-[var(--wa-teal)] text-sm font-medium shadow-sm active:bg-gray-50"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Main Input Bar */}
      <div className="flex items-center gap-2 px-3 pb-2">
        <button onClick={() => setShowPocket(!showPocket)} className="p-2 text-gray-500">
          <Plus className="w-6 h-6" />
        </button>
        <div className="flex-1 bg-white rounded-full border border-gray-300 px-4 py-2 flex items-center">
          <input 
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message Dumbo..."
            className="w-full outline-none text-gray-800 bg-transparent"
          />
        </div>
        <button 
          onClick={() => { if(text) { onSendMessage(text); setText(''); } }}
          className="w-10 h-10 rounded-full bg-[var(--wa-teal)] text-white flex items-center justify-center shadow-md active:opacity-80"
        >
          <Send className="w-5 h-5 ml-1" />
        </button>
      </div>

      {/* Magic Pocket Drawer */}
      <MagicPocketMenu isOpen={showPocket} />
    </div>
  );
};
```

### Task 3: Build BAP Custom Message Renderers

**Files:**
- Create: `frontend/src/components/VCC/BAPCards/ProductGridCard.tsx`
- Create: `frontend/src/components/VCC/BAPCards/CashbackRadarCard.tsx`

- [ ] **Step 1: Build ProductGridCard (WhatsApp Business Catalog Style)**

```tsx
import React from 'react';

interface ProductGridProps {
  data: {
    title: string;
    price: number;
    original_price: number;
    physical_verification: { weight_kg: number; dimensions_cm: string };
    image_url: string;
  };
}

export const ProductGridCard = ({ data }: ProductGridProps) => {
  return (
    <div className="w-[280px] bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 my-1 self-start rounded-tl-none">
      <div className="w-full h-48 bg-gray-100 relative">
        <img src={data.image_url} alt={data.title} className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-semibold">
          ⚖️ {data.physical_verification.weight_kg}kg Verified
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 leading-tight mb-1">{data.title}</h3>
        <p className="text-xs text-gray-500 mb-2">📦 {data.physical_verification.dimensions_cm}</p>
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-bold text-gray-900">${data.price.toFixed(2)}</span>
          <span className="text-sm text-gray-400 line-through">${data.original_price.toFixed(2)}</span>
        </div>
        <button className="w-full py-2.5 bg-[#E8F5E9] text-[#128C7E] font-semibold text-sm rounded-lg border border-[#C8E6C9] active:bg-[#C8E6C9]">
          Check out & Get 100% Back
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Build CashbackRadarCard**

```tsx
import React from 'react';

export const CashbackRadarCard = ({ current_phase, total_phases, amount_returned, amount_total }: any) => {
  const percentage = (current_phase / total_phases) * 100;
  
  return (
    <div className="w-[260px] bg-white rounded-xl p-4 shadow-sm border border-gray-100 my-1 self-start rounded-tl-none">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-gray-800">Cashback Radar</span>
        <span className="text-orange-500 font-semibold">${amount_returned} / ${amount_total}</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${percentage}%` }} />
      </div>
      <div className="text-right text-xs text-gray-500 font-medium">
        Phase {current_phase} of {total_phases}
      </div>
    </div>
  );
};
```

### Task 4: Integrate with Stream Chat (Message Interceptor)

**Files:**
- Create: `frontend/src/components/VCC/CustomMessageUI.tsx`

- [ ] **Step 1: Create the Interceptor Component**
This component checks if a message has `attachments` of type `0B_CARD_V3` and renders the appropriate BAP card. Otherwise, it renders standard WhatsApp style bubbles.

```tsx
import React from 'react';
import { MessageSimple } from 'stream-chat-react';
import { ProductGridCard } from './BAPCards/ProductGridCard';
import { CashbackRadarCard } from './BAPCards/CashbackRadarCard';

export const CustomMessageUI = (props: any) => {
  const { message, isMyMessage } = props;
  
  // Check for BAP Attachments
  const bapAttachment = message.attachments?.find((a: any) => a.type === '0B_CARD_V3');

  if (bapAttachment) {
    if (bapAttachment.component === '0B_PRODUCT_GRID') {
      return <ProductGridCard data={bapAttachment.data} />;
    }
    if (bapAttachment.component === '0B_CASHBACK_RADAR') {
      return <CashbackRadarCard {...bapAttachment.data} />;
    }
  }

  // Standard Text Bubble Fallback
  return (
    <div className={`flex w-full my-1 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-3 py-2 rounded-lg text-[15px] relative ${
        isMyMessage() 
          ? 'bg-[var(--wa-bubble-out)] rounded-tr-none text-black' 
          : 'bg-[var(--wa-bubble-in)] rounded-tl-none text-black shadow-sm'
      }`}>
        {message.text}
        <span className="text-[10px] text-gray-500 ml-3 float-right mt-2">
          {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    </div>
  );
};
```