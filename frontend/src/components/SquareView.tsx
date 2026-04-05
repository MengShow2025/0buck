import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Zap, Search, ShoppingCart, Share2, 
  Verified, Box, Cpu, Truck, 
  Star, ChevronRight, Activity, ChevronLeft,
  MoreVertical, Zap as Bolt, Terminal,
  Bot, Rocket, BarChart2,
  Timer, Users, MessageSquare,
  Globe
} from 'lucide-react';
import WishingWellProgressBar from './WishingWellProgressBar';
import { 
  Chat, 
  Channel, 
  ChannelList, 
  Window, 
  MessageList, 
  MessageInput, 
  Thread,
  ChannelHeader
} from 'stream-chat-react';
import StreamGuard from './StreamGuard';

const TICKER_PRODUCTS = [
  { name: 'Quantum Watch', price: '$189.00', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDx6xtrrjrkm9Nop69Vs3Q6Xiutv2YJO_Cb5UVFQMKhOy4w2IrCGRJ7WamXVErYW8dG7kDIFzJhUc78Gy6Zt7WTuCSXQpAz9xWIrXnqiBXufHpxW0m_5uCbbA9Ip6VGAR_pONOWPktCQ0SRLBIiWVOPD8YJxERY82_AlNJL2njuFQA_LJMXHylx_2Lh9wfG0OHPAcLOR5wgO_KzzXwgFn2q8rU7ztrM0gA-B8rO6cgLd43i6DDjkEdhXu5KSbu5U9x83kZ1QRo_ftC8' },
  { name: 'Strider X1', price: '$240.50', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZd-zWj8P_BkiDJIAniQV7NPRalSv4C0ahEJKo4OqzQ29rkTvin9YxAmLF_gt1GSFqH_DNTlhnmrvScuBf7hJAOsp-pWhDGA8P9rNppyJ2ofRFUhOClTp3_Ap2RtcPTXUMqWnHOb3rn9jHGC-WgmfeK2LyTQlYahubEm_PcByHR_KhmtMiSlACV-6UUlEY06pp2_LrSBPJ9EOFxhMLoIsRc-ZplKP8quAYHRaqaqtCHBhwJT_n_n0HNfdyGWplZKYMnHIuR772my5K' },
  { name: 'Sonic Core', price: '$320.00', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGDUQwEcu-U1eA5kGhX5wAXWcRIOiTYRhYKwGgw_90XbqzYBvbSQv5ChDUVlflk1g9TMKT8nXC9u5oM5kwHI3r8_KPAZkCEd7KzeoB3McZhvcSB9wT3ynDmnKMstUwu1zpCWuqvCrpRVq7wytjaNS1B8xKvvMVP1wWovhyOiBO5QwgiNp0r_vqKwgddgmB_35vvYwJRWlUiJAODcZaFJN4FoGzBRCYtafPLsjpDy9lYSclK3pY1HRTgYCwZG-FyRf4i5xotu0ZIbuJ' },
  { name: 'Quantum Watch', price: '$189.00', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGM2xYfayH7yuJvto0hsbnnO6Q0yE9BiyQzSfNtfytIG55axmsv2naxdQu3mBLTZfcGbwCwpeHLI2K-h6Qvf1-Y7aOZVc3cHaU9VNzoKyrgWERii9n-SxBk-1ewLm3hnQHTxzM7LSwXSKWRC1VmFBbMlw3-dpvoFuDSgZ_1rBQkck_qH85RDqngzBzSo8rOQhQc0RJMQ1y3Bc8xbISO-bq3Mi_DMDviCstsmk80euAI32QfJSrFvoT48tPdIIXvgETSYx7PoWa9jKW' },
  { name: 'Strider X1', price: '$240.50', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5xggtzHw3Eb4z1TxNmX57HfDdGf6Q-y3x2aP-tyUlGmVxjVljhoCB9Qe9VtV1wAIAC46rCjLb8vXkgtuMFrs6MmbQP9QAR_d3P717t4qnakNQ3BCI2PUy9zsKO8cGzQoxFRDQUZn2bkXfzcMqZ79evT54spZcKYv55Ms__lIn24GeBp7gt7smWc267XwO2Ss9e-3pJgpAfKk7RscAu_wadhThsSrismtOz2u48FENMTD2t5u3JMJSlAMZnAvYmpthjBDPmtFZN33J' }
];

// Extended mock data
const BASE_SUPPLIERS = [
  {
    id: 's1',
    name: 'Nexus Global Tech',
    nodeLevel: 5,
    productionRate: '98.4%',
    leadTime: '4-7 Days',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhB-hCyvLULak3qkYN0KWba8XZfsQyRFixjGMmN6gZaWXOMeG5d39s3AUFri3G0UVRumCcwfCtgjW_3fz9gaQf1TLNxGW3k_LQKkN3TklBKiLLshz8TGC3kQjbg5Ee_-IbeeqhBugbtT5I4NeCyOnIOGiUpwZyFFYOp-rEy-F8e_TrmOPwvKMFZgTM9berrJFkd4IDKCToaD679PSb-Xe3mmhHtbgn8NYulS53vavP0126sQjnlDdvq3_ueWGF8mlHaW2F3MFpZMFl',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlWh1xhbP41Jr0rXmJkatP7kWS3GQxC1Rbpk6DJKhlXnS6eF0ODaDqjdLqnIOEdUx75eHB73KLgwwQNxKOpLJZOWm77YI8zNu-FzhCkOpSe7eJOvRFMsMDRnkZqglRWvmopWynOQvx5MkOZlXSi4ufiO8JqR3H35Moo5TPzdxMUbLuPpzDt15pfWZHo4OqKvni9j5cKEfyO0C2LqttMELzMZuO_NfgNDW3YantHna8a-9KkAQ7D0G_irN6FXhglr02BWb9az4m8Q8N',
    products: [
      { id: 'p1', name: 'Cobalt Module v.2', price: '$45.00', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxAH0qKWGjuiOXJD-zQjAEfd0FjZyBcEJhm3TN9Q8EvGup0blVpAPm4SVZmzCvPWJGy2IuVxu96wRDHmvdgiUIw3oWAKOQIlgugM6K_cnEiC_anO7zfkBllPGs-IUzPUVs13mTb0VqHPFcTUce7rwHzfrjgblfmxWttfN4gzZlZrjslxrfmQzpPrPCAsPp1yiHeiLycLQRYX0Ij4GN3sAd_kVGAj3_ctZs9H8Mk2rMHOv6rub2Vz6jwzBKnI4PNrQJVaYFkJcy4L3S' },
      { id: 'p2', name: 'Neural Processor', price: '$890.00', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_ZnYtan6xp-qAG1ZSeBnDl-g0dBEMLZL1nd4YxHGe8n_Aln3fAkhClE0Rh57Cw-WYgshy4H2BoPyIJugspi302IHpw3UDNbgBI65nqVF3ds-b_t2bbcY_yyI2U4K138C2tFflW60FUhx311C8JthLXXtEfuGhCq31OrFse-8XBAcaB6641F3ncG23aLMF-Blbp4jATDU0sIGzO9SzvZ9SeoyOcd4wzgRLhst2dDMx7BrF8E3ao5t7UzXsSNGSkW-Egncd6R6_FvNu' },
      { id: 'p3', name: 'Titan Core', price: '$1,250.00', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_ZnYtan6xp-qAG1ZSeBnDl-g0dBEMLZL1nd4YxHGe8n_Aln3fAkhClE0Rh57Cw-WYgshy4H2BoPyIJugspi302IHpw3UDNbgBI65nqVF3ds-b_t2bbcY_yyI2U4K138C2tFflW60FUhx311C8JthLXXtEfuGhCq31OrFse-8XBAcaB6641F3ncG23aLMF-Blbp4jATDU0sIGzO9SzvZ9SeoyOcd4wzgRLhst2dDMx7BrF8E3ao5t7UzXsSNGSkW-Egncd6R6_FvNu' }
    ]
  },
  {
    id: 's2',
    name: 'Aether Logistics',
    nodeLevel: 4,
    productionRate: '1.2M Units',
    leadTime: 'Platinum',
    isService: true,
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwR1AGfLNgKDp-GWu26MQ0HmB7nYloDWZ0DFpqWSYA9p0zf3YcIX-5XNl8j42gzL0W4MkKO0Ak1LmtFeqzctI3yzvwmh3OiuMpMSJ_h6RJfIU-3w2fq6z3PWo_imxjO7V4dOUiX7Ew1HPCWzDmsKHdOABh5O-bSRzDl109A7HsBfgJ690p9EIOLbnUrELXSiQVGVGxvZvEQJFycvwGIsxTNtrLbCIdkjQessQyBvp3SS6lC9vWoqPgUgdFyPay3zyhrcO3Jvyuy4Xe',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASHjtwrj2L0jH3AtJOEwDigJukuMOXzqrKfARdNRR1Lj7tCvplxJXCClN-_1CP3RSi_L_gTlGl_ZzHOPCHe0eMF45lLLYi7vmj9Z_iOMQPWauKWSHVkTIE4HQIAuc40RRyGRMwoFR-S6GPD0mMzHkM2VrCmQhEYT47h9FI3pi2IruaHejH3tSPRiC1wJ7CPTwZhtsJujgx56FzXnRrJDfL07RD7sQnKrY0-N0UgAnJAJO119P1wWPe5QCCgkwqty06nXJt4342qsXR',
    products: [
      { id: 'p4', name: 'Express Fulfillment', price: '$1,200/mo', icon: 'Truck' },
      { id: 'p5', name: 'Smart Storage', price: '$450/mo', icon: 'Box' },
      { id: 'p6', name: 'Node Proxy', price: '$85/mo', icon: 'Cpu' }
    ]
  },
  {
    id: 's3',
    name: 'Orion Bio-Systems',
    nodeLevel: 5,
    productionRate: 'S-Class',
    leadTime: '99.9%',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRVjAJnQ1DU01xJRrnZekByfpjf4cbf52LyA0Mdb3xj5oiQ6D3Cu1lHn6Ipv5wBa8d8JHjuH4ikHW7JtdoAGK76lTjc0vAM1cemKmKdnt_ESG1-A5sjWtjwuUjfjxmp_pYPf8xA4bzLIFvBPF5ajW5H9J7RRuT2Jc6zam-7a0YGTUbbDkXHGQ7ZUhsTLdOT-Qma4WOSdBV4muUJCMxp18KV6aDcjdznzGBKmW8nlrq82fT-30h0yU8z-howYUB_8v54FPp8_kD2vUe',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5wXxbdAIPIQjyGe_5yWu6yUFdxfNRoLFc-LFbNS38ZA0vEhx5GByqPlNkDc09h4WI_KfxriG3aR9Z28NZj3Xi7BM19InURj6McP2DkY5xqc3FNPhZuH8tI_2mAJuKnqsnkUhPhNzCjc-kOktPsupYYdMdmDOHm4h_7lvViseeJJhQvvms_tkGwtR-EtvQJlL1HlMOMT8YQWbRgZ4oDWMAPtUA0O9U1d8wJlyf4fMG-nkf_30u0_J_ILjmPLeKAeDUOeRgNIr3SteQ',
    products: [
      { id: 'p7', name: 'Nano-Fiber S2', price: '$12.40/m', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCv4hx3t1qHBL1ehvyxY5ACgNWxEalxbUqkZ8SCKi83R7TIz0tCpcG6Ayb2QMHw2jpClyv4yO1Kdl_46Iv-HZhrNRcFNwnRM9YNHvCSUvJFHZFHCl06IsPZ6ASFAETsyxZ0KQGxWGrVWNyUTaZTXMNsvl_4BUJnbSoPEeXFn4GA39OeZ187irvhkYiXfny24Qbu_9O-SZjbAEza7k3puBLd0ZmnkzGqN8djtc0mAP_LEqoaQXN7C49S_t6HBIKgYIMOPmLc0zWz0cMQ' },
      { id: 'p8', name: 'Bio-Sync Cell', price: '$45.00', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCv4hx3t1qHBL1ehvyxY5ACgNWxEalxbUqkZ8SCKi83R7TIz0tCpcG6Ayb2QMHw2jpClyv4yO1Kdl_46Iv-HZhrNRcFNwnRM9YNHvCSUvJFHZFHCl06IsPZ6ASFAETsyxZ0KQGxWGrVWNyUTaZTXMNsvl_4BUJnbSoPEeXFn4GA39OeZ187irvhkYiXfny24Qbu_9O-SZjbAEza7k3puBLd0ZmnkzGqN8djtc0mAP_LEqoaQXN7C49S_t6HBIKgYIMOPmLc0zWz0cMQ' },
      { id: 'p9', name: 'Orion Pulse', price: '$89.00', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCv4hx3t1qHBL1ehvyxY5ACgNWxEalxbUqkZ8SCKi83R7TIz0tCpcG6Ayb2QMHw2jpClyv4yO1Kdl_46Iv-HZhrNRcFNwnRM9YNHvCSUvJFHZFHCl06IsPZ6ASFAETsyxZ0KQGxWGrVWNyUTaZTXMNsvl_4BUJnbSoPEeXFn4GA39OeZ187irvhkYiXfny24Qbu_9O-SZjbAEza7k3puBLd0ZmnkzGqN8djtc0mAP_LEqoaQXN7C49S_t6HBIKgYIMOPmLc0zWz0cMQ' }
    ]
  }
];

// Generate mock data (25 per page, 2 pages)
const ALL_SUPPLIERS = Array.from({ length: 50 }).map((_, i) => {
  const base = BASE_SUPPLIERS[i % BASE_SUPPLIERS.length];
  return {
    ...base,
    id: `s-${i}`,
    name: `${base.name} ${i + 1}`
  };
});

import VortexDiscovery from './VortexDiscovery';

interface SquareViewProps {
  onRequireAuth?: (action: () => void) => void;
  onMerchantClick?: (merchant: any) => void;
  onProductClick?: (product: any) => void;
  chatClient?: any;
  isChatReady?: boolean;
  isConnecting?: boolean; 
  BAPCustomAttachment?: any;
  onRetry?: () => void;
}

export default function SquareView({ 
  onRequireAuth, 
  onMerchantClick, 
  onProductClick,
  chatClient,
  isChatReady,
  isConnecting, 
  BAPCustomAttachment,
  onRetry
}: SquareViewProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('voting'); // Default to voting/wishing well
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const itemsPerPage = 25; // 5 rows * 5 columns

  const channelFilter = useMemo(() => ({
    type: 'messaging',
    platform_role: 'global' // We'll mark global channels with this metadata
  }), []);

  const handleChannelSelect = (channel: any) => {
    setActiveChannel(channel);
    setActiveTab('chat');
  };

  // Mock Wishes for C2M (v3.3)
  const MOCK_WISHES = [
    {
      id: 1,
      description: "Cyberpunk mechanical keyboard with transparent keycaps and RGB underglow.",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAFxyy3mwdo9fR04YVeWHLJnExub4QAzJhQvBl3Jnze1mNvYdK5uhIMkRUz_57K2e2MCCzTaZn3OPoYGDkQ5bFAmpd05IEQjnUzo6503OR_omm5-BEcbcfsR80c0TRXShzaC7SIaD-8bWqM_6z7OMA7XuqkGqkX3Osut3xJ1TvGbIC6dMeQUBtCy2ORl6S5kquShZkxDaMe_dkaEinbkiSTWXlM4Lev7_UOKMrdm6AQCV3EmZoqw8zn0TnybFPra4qqbYavAuHva2Oy",
      vote_count: 8,
      status: "pending",
      expiry_at: new Date(Date.now() + 3600000 * 12).toISOString() // 12h left
    },
    {
      id: 2,
      description: "Ultra-slim magnetic power bank with integrated aromatherapy diffuser.",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBGDUQwEcu-U1eA5kGhX5wAXWcRIOiTYRhYKwGgw_90XbqzYBvbSQv5ChDUVlflk1g9TMKT8nXC9u5oM5kwHI3r8_KPAZkCEd7KzeoB3McZhvcSB9wT3ynDmnKMstUwu1zpCWuqvCrpRVq7wytjaNS1B8xKvvMVP1wWovhyOiBO5QwgiNp0r_vqKwgddgmB_35vvYwJRWlUiJAODcZaFJN4FoGzBRCYtafPLsjpDy9lYSclK3pY1HRTgYCwZG-FyRf4i5xotu0ZIbuJ",
      vote_count: 12,
      status: "pre_order",
      expiry_at: new Date(Date.now() + 3600000 * 36).toISOString() // 36h left
    }
  ];

  const totalPages = Math.ceil(ALL_SUPPLIERS.length / itemsPerPage);
  
  const currentSuppliers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return ALL_SUPPLIERS.slice(start, start + itemsPerPage);
  }, [currentPage]);

  return (
    <div className="flex flex-col">
      <StreamGuard 
        isReady={isChatReady || false} 
        isConnecting={isConnecting || false}
        onRetry={onRetry}
      >
        <style>{`
        .ticker-scroll {
          animation: ticker 30s linear infinite;
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Activity Banner */}
      <div className="bg-primary px-8 py-1 flex justify-between items-center overflow-hidden">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-white fill-white" />
          <p className="text-white text-[10px] font-bold uppercase tracking-widest">{t('square.alert')}</p>
        </div>
        <div className="flex gap-4">
          <p className="text-white/80 text-[10px] font-medium">BRENT: $82.41 (+1.2%)</p>
          <p className="text-white/80 text-[10px] font-medium">BTC: $64,290.41</p>
        </div>
      </div>

      {/* Scrolling Product Ticker */}
      <div className="border-b border-white/5 py-2 overflow-hidden bg-zinc-950/50">
        <div className="ticker-scroll flex whitespace-nowrap gap-12 px-8">
          {[...TICKER_PRODUCTS, ...TICKER_PRODUCTS].map((p, idx) => (
            <div key={idx} className="flex items-center gap-3 cursor-pointer group" onClick={() => onProductClick && onProductClick(p)}>
              <div className="w-6 h-6 bg-zinc-800 rounded-md overflow-hidden border border-white/5 group-hover:border-primary/50 transition-colors">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-tight group-hover:text-white transition-colors">
                {p.name} · <span className="text-primary">{p.price}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <main className="pt-4 pb-12 px-6 max-w-[1800px] mx-auto min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
          
          {/* Left Sidebar Navigation */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-8 sticky top-40 max-h-[calc(100vh-200px)] overflow-y-auto no-scrollbar">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] px-2">{t('square.nav_title')}</h3>
              
              {chatClient && isChatReady ? (
                 <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                   <Chat client={chatClient} theme="str-chat__theme-dark">
                     <ChannelList 
                       filters={channelFilter} 
                       sort={{ last_message_at: -1 }} 
                     />
                   </Chat>
                 </div>
               ) : (
                <nav className="flex flex-col gap-1">
                  <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-sm" href="#">
                    <Activity className="w-5 h-5" />
                    <span>{t('square.feed')}</span>
                  </a>
                  <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-stone-400 hover:text-white transition-all text-sm" href="#">
                    <span className="material-symbols-outlined text-lg" data-icon="groups">groups</span>
                    <span>{t('square.communes')}</span>
                  </a>
                </nav>
              )}
            </div>
            <div className="mt-auto pt-8 border-t border-white/5">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20">
                <p className="text-[10px] font-bold text-primary uppercase tracking-tighter mb-2">{t('square.network_health')}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-white font-mono">99.2</span>
                  <span className="text-[10px] text-stone-500">ms</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Center Feed (Activities & Content) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Featured Editorial Section */}
            <section className="bg-zinc-900/50 backdrop-blur-md rounded-2xl overflow-hidden group border border-white/5">
              <div className="relative h-[300px]">
                <img 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-60" 
                  alt="futuristic server room with blue neon lights" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYVYZbcKz7Fv3tvXPIlPCnd4nxjEjAIp8EaRd5w3A9Vf7pkmREF6INf6b_YYGbPlshXy1DFf7WayPvl_K3NVdZQJKy5IJrjK2ibQb-pPl462OUI_FnzC-Vfb3_BUSTkyf8xl9TJsvMJUsFZa2SwQDvcyMpaVR65zwqdbxDTlWl-xNckuTbNAd8ABguuI0t57yU6IdrlK_WH_GwnGb9skcFGrp6NFAfP6chflxUHfh7p_yZL2ruw21C04gZi-bl9MnJL4E6dPskN7rO"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
                <div className="absolute bottom-0 p-8 space-y-3">
                  <span className="bg-primary text-black text-[10px] font-black px-3 py-1 rounded uppercase tracking-tighter">{t('square.editorial')}</span>
                  <h2 className="text-3xl font-extrabold font-headline text-white leading-tight">{t('square.article_title')}</h2>
                  <p className="text-stone-400 text-sm max-w-xl leading-relaxed">{t('square.article_desc')}</p>
                  <div className="flex gap-4 pt-2">
                    <button className="bg-white text-black px-6 py-2 rounded font-black text-xs uppercase tracking-tighter hover:bg-primary transition-colors">{t('square.access_data')}</button>
                  </div>
                </div>
              </div>
            </section>

            {/* Platform Activities Tabs */}
            <div className="flex gap-4 items-center mb-2">
              <button 
                onClick={() => setActiveTab('voting')}
                className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter transition-all ${
                  activeTab === 'voting' ? 'bg-primary text-black' : 'bg-white/5 border border-white/10 text-stone-400 hover:text-white'
                }`}
              >
                {t('square.tab_voting')}
              </button>
              <button 
                onClick={() => setActiveTab('group_buys')}
                className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter transition-all ${
                  activeTab === 'group_buys' ? 'bg-primary text-black' : 'bg-white/5 border border-white/10 text-stone-400 hover:text-white'
                }`}
              >
                {t('square.tab_group_buys')}
              </button>
              <button 
                onClick={() => setActiveTab('seeding')}
                className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter transition-all ${
                  activeTab === 'seeding' ? 'bg-primary text-black' : 'bg-white/5 border border-white/10 text-stone-400 hover:text-white'
                }`}
              >
                {t('square.tab_seeding')}
              </button>
              {activeChannel && (
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter transition-all ${
                    activeTab === 'chat' ? 'bg-primary text-black' : 'bg-white/5 border border-white/10 text-stone-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare size={12} />
                    {activeChannel.data?.name || 'Channel'}
                  </div>
                </button>
              )}
            </div>

            {/* Tab Content Rendering (v3.3) */}
            <AnimatePresence mode="wait">
              {activeTab === 'chat' && chatClient && isChatReady && activeChannel ? (
                <motion.div
                  key="chat-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-[600px] bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden"
                >
                  <Chat client={chatClient} theme="str-chat__theme-dark">
                    <Channel channel={activeChannel} Attachment={BAPCustomAttachment}>
                      <Window>
                        <ChannelHeader />
                        <MessageList />
                        <MessageInput focus />
                      </Window>
                      <Thread />
                    </Channel>
                  </Chat>
                </motion.div>
              ) : activeTab === 'voting' && (
                <motion.div 
                  key="voting-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {MOCK_WISHES.map((wish) => (
                      <div key={wish.id} className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 border border-white/5 group hover:border-primary/20 transition-all">
                        <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-white/5">
                          <img src={wish.image_url} alt={wish.description} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute top-3 left-3">
                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                              wish.status === 'pre_order' ? 'bg-green-500 text-black' : 'bg-primary text-black'
                            }`}>
                              {wish.status === 'pre_order' ? 'Pre-Order Unlocked' : 'Wishing Well'}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-4 line-clamp-2 leading-snug">{wish.description}</h4>
                        <WishingWellProgressBar 
                          voteCount={wish.vote_count} 
                          targetCount={10} 
                          expiryAt={wish.expiry_at} 
                          status={wish.status} 
                        />
                        <div className="flex gap-2 mt-6">
                          <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
                            Support Wish
                          </button>
                          <button className="flex-1 bg-primary hover:bg-white text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            View 1688 Source
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Community Call to Action */}
                  <div className="bg-gradient-to-r from-primary/10 to-transparent p-8 rounded-3xl border border-primary/20 flex items-center justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Your Vision, Our Supply Chain</h3>
                      <p className="text-xs text-stone-400 max-w-md">Can't find what you're looking for? Upload a photo or describe it, and our AI Butler will hunt down the source for you.</p>
                    </div>
                    <button className="bg-white text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-2xl">
                      Make a Wish
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vortex Predictive Matrix (v3.2 Easter Egg) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Vortex Discovery Matrix</h3>
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Personalized</span>
              </div>
              <VortexDiscovery userId={1} /> {/* Mock userId for now */}
            </section>

            {/* Integrated Feed */}
            <div className="space-y-6">
              
              {/* User Moment (Social) */}
              <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group border border-white/5">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <img 
                      alt="User" 
                      className="w-10 h-10 rounded-full border border-primary/20 p-0.5" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8lZ5kNH8pM3cr6vdWS0kXk_UVeFWmr7YHoqKOAuTk6sArrcf5X37rbdUTySk2bWfNGtMGeR0t6BL6jAalBuyZf524_sJmajVDoHjpLWBgSbEGL__SZnJHLhCRAKWEtoKSXqYAAUov7bJo1pWAmMDxCM1lDsUPNkRXCb8euvKhGK5v6Gtl9278HW8mYIjH5pwAPKR_KAFkH-gneg8U8UsRJg0h8RfQKm8MQCwxUjJG6pDKEkjJxEDDCPtrnpJjmb9CoV2HbIGT6s-V"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm">Sarah_Design_Studio</h4>
                      <p className="text-[10px] text-primary font-mono tracking-widest uppercase">{t('square.verified_backer')} • {t('square.post_time_1')}</p>
                    </div>
                  </div>
                  <MoreVertical className="text-stone-600 hover:text-primary cursor-pointer w-5 h-5" />
                </div>
                <p className="text-stone-300 text-sm mb-6 leading-relaxed">{t('square.post_content_1')}</p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="aspect-video rounded-xl overflow-hidden border border-white/5 bg-white/5">
                    <img 
                      className="w-full h-full object-cover opacity-80" 
                      alt="mechanical keyboard close-up" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFxyy3mwdo9fR04YVeWHLJnExub4QAzJhQvBl3Jnze1mNvYdK5uhIMkRUz_57K2e2MCCzTaZn3OPoYGDkQ5bFAmpd05IEQjnUzo6503OR_omm5-BEcbcfsR80c0TRXShzaC7SIaD-8bWqM_6z7OMA7XuqkGqkX3Osut3xJ1TvGbIC6dMeQUBtCy2ORl6S5kquShZkxDaMe_dkaEinbkiSTWXlM4Lev7_UOKMrdm6AQCV3EmZoqw8zn0TnybFPra4qqbYavAuHva2Oy"
                    />
                  </div>
                  <div className="aspect-video rounded-xl overflow-hidden border border-white/5 bg-white/5">
                    <img 
                      className="w-full h-full object-cover opacity-80" 
                      alt="minimalist workspace" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-xnyrGGZGUHTpig5TsXqypMw5cZ8CfXWPUqzQYMqByRW5Gc53qvceuBNirky7nG-4VqbWO3EFXvtolOFawcSTMZ4RgoOlKJejufAIzzi7f_P3tMi698tN1gtkLYrooibdyQgJI5h67AsD-yOZL85b7YFAJ8iYnd9NDo6obZ5hCauiX9pYYZO-kxoDqeAza_WwbECs3U8O91jsA6YP0ohCc3Sie-NuTr0C1xMgqQYcfoRBzhvL17z66LYd72SVQg0OB_Z6Ak-FQUpo"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-8 pt-4 border-t border-white/5">
                  <button className="flex items-center gap-2 text-stone-500 hover:text-primary transition-colors text-xs font-bold font-mono">
                    <Bolt className="w-4 h-4" /> 1.4k
                  </button>
                  <button className="flex items-center gap-2 text-stone-500 hover:text-primary transition-colors text-xs font-bold font-mono">
                    <Terminal className="w-4 h-4" /> 24
                  </button>
                  <button className="flex items-center gap-2 text-stone-500 hover:text-primary transition-colors ml-auto">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Long-form Suggestion Post */}
              <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">TM</div>
                  <div>
                    <h4 className="font-bold text-white text-sm">TechWhiz_Marcus</h4>
                    <p className="text-[10px] text-stone-500 font-mono tracking-widest uppercase">{t('square.admin')} • {t('square.post_time_2')}</p>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-3 font-headline">{t('square.post_title_2')}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{t('square.post_content_2')}</p>
              </div>

            </div>
          </div>

          {/* Right Sidebar (AI & Market) */}
          <aside className="lg:col-span-3 space-y-6 sticky top-40">
            
            {/* AI Butler Dialogue */}
            <section className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 border border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary text-black p-1.5 rounded-lg">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Concierge_AI</h4>
                  <p className="text-[9px] text-primary font-mono">{t('square.analyzing')}</p>
                </div>
              </div>
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 mb-4">
                <p className="text-xs text-stone-300 italic leading-relaxed">{t('square.butler_msg')}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-white/5 hover:bg-white/10 py-2 rounded text-[10px] font-black text-stone-400 uppercase tracking-tighter transition-all">{t('square.defer')}</button>
                <button className="bg-primary hover:bg-white text-black py-2 rounded text-[10px] font-black uppercase tracking-tighter transition-all">{t('square.initialize')}</button>
              </div>
            </section>

            {/* Market Pulse Widget */}
            <section className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">{t('square.market_pulse')}</h3>
                <BarChart2 className="w-4 h-4 text-stone-500" />
              </div>
              <div className="space-y-5">
                <div className="group cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-white">{t('square.sunglasses')}</span>
                    <span className="text-[10px] font-mono text-primary">85% {t('square.full')}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[85%]"></div>
                  </div>
                  <p className="text-[9px] text-stone-500 mt-2 font-mono uppercase">150 {t('square.remaining')}</p>
                </div>
                <div className="group cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-stone-400">{t('square.seeding')}</span>
                    <span className="text-[10px] font-mono text-stone-600">v.82 {t('square.ready')}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-white/20 h-full w-[100%]"></div>
                  </div>
                </div>
              </div>
              <button className="w-full mt-6 border border-white/10 hover:bg-white/5 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all">{t('square.full_analytics')}</button>
            </section>

            {/* Community Seedings */}
            <section className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 border border-white/5">
              <div className="flex items-center gap-2 mb-6">
                <Rocket className="text-primary w-5 h-5" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">{t('square.active_seeds')}</h3>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="aspect-square bg-primary/30 border border-primary/40 rounded flex items-center justify-center">
                  <span className="text-[8px] font-mono text-white">V1</span>
                </div>
                <div className="aspect-square bg-primary/30 border border-primary/40 rounded flex items-center justify-center">
                  <span className="text-[8px] font-mono text-white">V2</span>
                </div>
                <div className="aspect-square bg-primary/30 border border-primary/40 rounded flex items-center justify-center">
                  <span className="text-[8px] font-mono text-white">V3</span>
                </div>
                <div className="aspect-square bg-white/5 border border-white/10 rounded flex items-center justify-center">
                  <span className="text-[8px] font-mono text-stone-500">+12</span>
                </div>
              </div>
              <p className="text-[10px] text-stone-500 text-center font-mono">{t('square.status_stable')}</p>
            </section>

          </aside>
        </div>
      </main>
      </StreamGuard>
    </div>
  );
}