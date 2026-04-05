import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShoppingCart,
  User,
  Bot,
  Send,
  TrendingUp,
  Package,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Zap,
  Bell,
  MoreVertical,
  Activity,
  PlusCircle,
  Image as ImageIcon,
  Mic,
  Check,
  Shield,
  ChevronDown,
  Plus,
  Loader2,
  Search as SearchIcon,
  Trash2,
  X,
  Mail,
  UserPlus,
  Hash,
  Clock,
  MessageSquare,
  Users,
  LayoutGrid,
  Sofa,
  Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import ChatInput from './ChatInput';
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
import BAPAttachmentRenderer from './BAPAttachmentRenderer';
import StreamGuard from './StreamGuard';

interface LoungeViewProps {
  onRequireAuth?: (action: () => void) => void;
  onProductClick?: (product: any) => void;
  chatClient?: any;
  isChatReady?: boolean;
  isConnecting?: boolean;
  BAPCustomAttachment?: any;
  currentUser?: any;
  onRetry?: () => void;
}

const ALL_MEMBERS = Array.from({ length: 50 }, (_, i) => ({
  name: `Lounge Group_${i + 1}`,
  lastMsg: ['Just saw the new drop!', 'Anyone in for a group buy?', 'Butler is recommending...', 'Floor price alert!'][Math.floor(Math.random() * 4)],
  time: `${10 + Math.floor(Math.random() * 10)}:${10 + Math.floor(Math.random() * 40)}`,
  unread: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0,
  image: `https://api.dicebear.com/7.x/avataaars/svg?seed=Member${i}`
}));

const ALL_FRIENDS = Array.from({ length: 50 }, (_, i) => ({
  name: `Friend_${i + 1}`,
  lastMsg: ['See you in the lounge', 'Check this out', 'Nice asset!', 'Done.'][Math.floor(Math.random() * 4)],
  time: `${10 + Math.floor(Math.random() * 10)}:${10 + Math.floor(Math.random() * 40)}`,
  unread: Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0,
  image: `https://api.dicebear.com/7.x/avataaars/svg?seed=Friend${i}`
}));

const MOCK_MOMENTS = [
  {
    id: 'm1',
    user: 'Sarah_Design',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    content: 'Just received my custom mechanical keyboard from the last Wishing Well! The quality is amazing. #0Buck #C2M',
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAFxyy3mwdo9fR04YVeWHLJnExub4QAzJhQvBl3Jnze1mNvYdK5uhIMkRUz_57K2e2MCCzTaZn3OPoYGDkQ5bFAmpd05IEQjnUzo6503OR_omm5-BEcbcfsR80c0TRXShzaC7SIaD-8bWqM_6z7OMA7XuqkGqkX3Osut3xJ1TvGbIC6dMeQUBtCy2ORl6S5kquShZkxDaMe_dkaEinbkiSTWXlM4Lev7_UOKMrdm6AQCV3EmZoqw8zn0TnybFPra4qqbYavAuHva2Oy'],
    likes: 24,
    comments: 5,
    timestamp: '2h ago'
  },
  {
    id: 'm2',
    user: 'Tech_Julian',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Julian',
    content: 'Exploring the new Vortex Matrix. Found some hidden gems today.',
    images: [],
    likes: 12,
    comments: 2,
    timestamp: '5h ago'
  }
];

const MOCK_NOTES = [
  {
    id: 'n1',
    title: 'The Ultimate Guide to Node Procurement',
    user: 'Admin_Marcus',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAYVYZbcKz7Fv3tvXPIlPCnd4nxjEjAIp8EaRd5w3A9Vf7pkmREF6INf6b_YYGbPlshXy1DFf7WayPvl_K3NVdZQJKy5IJrjK2ibQb-pPl462OUI_FnzC-Vfb3_BUSTkyf8xl9TJsvMJUsFZa2SwQDvcyMpaVR65zwqdbxDTlWl-xNckuTbNAd8ABguuI0t57yU6IdrlK_WH_GwnGb9skcFGrp6NFAfP6chflxUHfh7p_yZL2ruw21C04gZi-bl9MnJL4E6dPskN7rO',
    likes: 156,
    views: '2.4k',
    timestamp: 'Yesterday'
  },
  {
    id: 'n2',
    title: 'Top 5 Cyberpunk Assets for Your Desk Setup',
    user: 'Neon_Vibes',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neon',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-xnyrGGZGUHTpig5TsXqypMw5cZ8CfXWPUqzQYMqByRW5Gc53qvceuBNirky7nG-4VqbWO3EFXvtolOFawcSTMZ4RgoOlKJejufAIzzi7f_P3tMi698tN1gtkLYrooibdyQgJI5h67AsD-yOZL85b7YFAJ8iYnd9NDo6obZ5hCauiX9pYYZO-kxoDqeAza_WwbECs3U8O91jsA6YP0ohCc3Sie-NuTr0C1xMgqQYcfoRBzhvL17z66LYd72SVQg0OB_Z6Ak-FQUpo',
    likes: 89,
    views: '1.1k',
    timestamp: '2 days ago'
  }
];

export default function LoungeView({ 
  onRequireAuth, 
  onProductClick,
  chatClient,
  isChatReady,
  isConnecting,
  BAPCustomAttachment,
  currentUser,
  onRetry
}: LoungeViewProps) {
  const { t } = useTranslation();
  const [isAlertExpanded, setIsAlertExpanded] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string>('Lounge Group_1');
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'moments' | 'notes'>('chats');
  const [chatInputValue, setChatInputValue] = useState('');

  const [moments, setMoments] = useState<any[]>(() => {
    const saved = localStorage.getItem('lounge_moments');
    return saved ? JSON.parse(saved) : MOCK_MOMENTS;
  });
  const [notes, setNotes] = useState<any[]>(() => {
    const saved = localStorage.getItem('lounge_notes');
    return saved ? JSON.parse(saved) : MOCK_NOTES;
  });
  const [newMomentContent, setNewMomentContent] = useState('');
  const [showMomentInput, setShowMomentInput] = useState(false);

  // Persist Social Data
  useEffect(() => {
    localStorage.setItem('lounge_moments', JSON.stringify(moments));
  }, [moments]);

  useEffect(() => {
    localStorage.setItem('lounge_notes', JSON.stringify(notes));
  }, [notes]);

  const handlePostMoment = () => {
    if (!newMomentContent.trim()) return;
    const newMoment = {
      id: `m_${Date.now()}`,
      user: currentUser?.name || 'You',
      avatar: currentUser?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
      content: newMomentContent,
      images: [],
      likes: 0,
      comments: 0,
      timestamp: 'Just now'
    };
    setMoments([newMoment, ...moments]);
    setNewMomentContent('');
    setShowMomentInput(false);
  };

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', cover: '' });

  const handlePostNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;
    const note = {
      id: `n_${Date.now()}`,
      title: newNote.title,
      user: currentUser?.name || 'You',
      avatar: currentUser?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
      cover: newNote.cover || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&h=1000&fit=crop',
      likes: 0,
      views: '0',
      timestamp: 'Just now'
    };
    setNotes([note, ...notes]);
    setNewNote({ title: '', content: '', cover: '' });
    setIsNoteModalOpen(false);
  };

  const handleLikeMoment = (id: string) => {
    setMoments(prev => prev.map(m => m.id === id ? { ...m, likes: m.likes + 1 } : m));
  };

  const handleCommentMoment = (id: string, comment: string) => {
    if (!comment.trim()) return;
    setMoments(prev => prev.map(m => m.id === id ? { 
      ...m, 
      comments: m.comments + 1,
      commentList: [...(m.commentList || []), { user: currentUser?.name || 'You', text: comment }]
    } : m));
  };

  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');

  const handlePostComment = (id: string) => {
    handleCommentMoment(id, commentInput);
    setCommentInput('');
    setActiveCommentId(null);
  };

  const handleLikeNote = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, likes: n.likes + 1 } : n));
  };

  const channelFilter = useMemo(() => ({
    type: 'messaging',
    members: { $in: [chatClient?.userID || ''] }
  }), [chatClient?.userID]);

  const handleChannelSelect = (channel: any) => {
    setActiveChannel(channel);
    setActiveTab('chats');
  };

  // Sync activeChannel from Stream Chat context if needed
  // But since we are using multiple Chat providers, it's better to handle it via onSelect
  
  // Custom Channel Preview to handle selection
  const CustomChannelPreview = (props: any) => {
    const { channel, setActiveChannel: setStreamActiveChannel } = props;
    // Custom Empty State for Channel List
  const CustomEmptyState = () => (
    <div className="p-6 text-center space-y-4">
      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
        <MessageSquare size={20} className="text-zinc-600" />
      </div>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
        {t('lounge.no_channels_found')}
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="text-[9px] text-primary font-black uppercase tracking-widest hover:underline"
      >
        Retry Neural Uplink
      </button>
    </div>
  );

  return (
      <div 
        onClick={() => {
          setStreamActiveChannel(channel);
          handleChannelSelect(channel);
        }}
        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-all ${
          activeChannel?.id === channel.id ? 'bg-white/10' : ''
        }`}
      >
        <img src={channel.data?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${channel.data?.name}`} className="w-10 h-10 rounded-xl border border-white/10" alt="" />
        <div className="flex-1 min-w-0 hidden lg:block">
          <p className="text-sm text-white font-bold truncate">{channel.data?.name || 'Channel'}</p>
          <p className="text-[10px] text-zinc-500 truncate">{channel.state.messages[channel.state.messages.length - 1]?.text || 'No messages'}</p>
        </div>
      </div>
    );
  };

  // Friends Management State
  const [allFriends, setAllFriends] = useState(ALL_FRIENDS);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [visibleFriendsCount, setVisibleFriendsCount] = useState(10);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  // Add Friend Modal State
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Friend Requests State
  const [friendRequests, setFriendRequests] = useState<any[]>([
    { id: 'req_1', name: 'Zack_Rider', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zack', timestamp: new Date(Date.now() - 3600000 * 24) }, // 24h ago
    { id: 'req_2', name: 'Luna_Eclipse', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna', timestamp: new Date(Date.now() - 3600000 * 47) } // 47h ago
  ]);

  // Members Infinite Scroll States
  const [visibleMembers, setVisibleMembers] = useState(ALL_MEMBERS.slice(0, 10));
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const memberSentinelRef = useRef<HTMLDivElement>(null);
  const friendSentinelRef = useRef<HTMLDivElement>(null);

  // Filtered Friends based on search
  const filteredFriends = allFriends.filter(f => 
    f.name.toLowerCase().includes(friendSearchQuery.toLowerCase())
  );
  const visibleFriends = filteredFriends.slice(0, visibleFriendsCount);

  useEffect(() => {
    const memberObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMembers && visibleMembers.length < ALL_MEMBERS.length) {
        setLoadingMembers(true);
        setTimeout(() => {
          setVisibleMembers(prev => [
            ...prev,
            ...ALL_MEMBERS.slice(prev.length, prev.length + 10)
          ]);
          setLoadingMembers(false);
        }, 800);
      }
    }, { threshold: 0.1 });

    const friendObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingFriends && visibleFriendsCount < filteredFriends.length) {
        setLoadingFriends(true);
        setTimeout(() => {
          setVisibleFriendsCount(prev => prev + 10);
          setLoadingFriends(false);
        }, 800);
      }
    }, { threshold: 0.1 });

    if (memberSentinelRef.current) memberObserver.observe(memberSentinelRef.current);
    if (friendSentinelRef.current) friendObserver.observe(friendSentinelRef.current);

    return () => {
      memberObserver.disconnect();
      friendObserver.disconnect();
    };
  }, [visibleMembers, filteredFriends.length, visibleFriendsCount, loadingMembers, loadingFriends]);

  // Actions for Friends
  const handleSearchFriend = () => {
    if (!addFriendQuery.trim()) return;
    setIsSearching(true);
    // Simulate API search
    setTimeout(() => {
      const found = {
        name: `User_${Math.floor(Math.random() * 1000)}`,
        id: addFriendQuery,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${addFriendQuery}`
      };
      setSearchResult(found);
      setIsSearching(false);
    }, 1000);
  };

  const handleConfirmAddFriend = () => {
    if (searchResult) {
      const newFriend = {
        name: searchResult.name,
        lastMsg: 'Added as friend',
        time: 'Just now',
        unread: 0,
        image: searchResult.image
      };
      setAllFriends([newFriend, ...allFriends]);
      setIsAddFriendModalOpen(false);
      setAddFriendQuery('');
      setSearchResult(null);
    }
  };

  const handleAcceptRequest = (request: any) => {
    const newFriend = {
      name: request.name,
      lastMsg: 'We are now friends!',
      time: 'Just now',
      unread: 0,
      image: request.image
    };
    setAllFriends([newFriend, ...allFriends]);
    setFriendRequests(friendRequests.filter(r => r.id !== request.id));
  };

  const handleRejectRequest = (id: string) => {
    setFriendRequests(friendRequests.filter(r => r.id !== id));
  };

  const isRequestExpired = (timestamp: Date) => {
    const hours = (Date.now() - timestamp.getTime()) / 3600000;
    return hours >= 48;
  };

  // Clean up expired requests on mount and when modal opens
  useEffect(() => {
    setFriendRequests(prev => prev.filter(req => !isRequestExpired(req.timestamp)));
  }, [isAddFriendModalOpen]);

  const handleDeleteFriend = (name: string) => {
    if (window.confirm(`Delete ${name} from friends?`)) {
      setAllFriends(allFriends.filter(f => f.name !== name));
    }
  };

  const handleClearChat = () => {
    if (window.confirm(t('lounge.clear_history_confirm'))) {
      // Logic for butler clear
    }
  };

  const scrollerProducts = [
    { id: 'lp1', name: 'Phantom V2', price: '0̸.85', description: 'Advanced tactical eyewear with integrated HUD.', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfgMqxz1NhBDiOE75fQ-_EIf-xGsen3HkcFuY_R4_QcTIQ7qvhP8F_pZ97RzVU74MJkiXWSYcTO737pyG-WzqI_EvtM1eVebckIR7dl2h_k8wjbpcOr67xsABwhYv6LpAM5MHy19keelxRQ-Xqk8jnYz7ehVXIRyOBvVPIRCAvKKqS2uTYQJuwWoxbrnX4GnoGKatjVEIGWu9GVs_TaIrS8ODJpE1Vq91O0aKzqd_soMGPb7ZwNIBJ5KWSYuaENhHGgurppZa6Ryg7' },
    { id: 'lp2', name: 'Chronos 0', price: '1.20', description: 'Precision timekeeper with decentralized sync.', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDX8h1mJwwXcnkOPmduygfaBXHXfFsyYpwuKf0SsWcbmqrRINLsnM1JXPqUMH2_pgGil3vDnRY_XdSbTfD6SbuCentsvXsRQbBJhMR6_1y7KY60Gd1g53vUuP0zo-SSDTp_FKqw969KB_hiLVTkSgWbYd0EIyQQnDvQcubsYYQVzESQtr1FJFErKo2OtEe3vDaZ_Rg_NQKLRarC436UQo4enrTP8dRnrMw-5xoTRRxPV3zjN-GPefwuIf4B2k_K1et3SHzzyBqTNRp' },
    { id: 'lp3', name: 'Void Essence', price: '0̸.42', description: 'Rare synthetic material for high-grade crafting.', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvitwev4hF_Hjt4V40YVROYNcQ92L0bMHWbde4sVkORapUTopLZQBJ_0CZmPt8rtUuleOPiTyAEMo8CDdXVW863wYGyH_yvU8NDh4js_3J272YCPuPwKmXHPBOSH7Mf0Fp8lf_qaU-l426mCaPsCX-RHr1Apu2b-MpAFdsolKrrgEDU70dOlz11MiPUiW_vch-dvhyR7UX3BKd3LRqj67vGrvH1RDrBfgJ5k9ZQybCBvmzNSKeJ2SqcgRLYXr9sBuqJqIUjGnzNhIG' },
    { id: 'lp4', name: 'Sonic Link', price: '0̸.98', description: 'High-fidelity audio transceiver for secure comms.', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5Th5Uf8rhQ4sTXrq37T6giHm9qjEYhwkGElj0oOkSEGX3wSRICqVgfUr5ohw-LmunwZmIz2VjP3-ytzRbY54xgLRdxKPotyV_WJK1PBm4IMTwGBDuZoyaBWBf2d7sgC0UST5KGT1rcvSmvkZyXJ6c5Oagm12oBFb95gYAoGFU9gy-zhh0HmMMS1zWBhi1CDAa3V9BOdTVJgm48GUcQ1L2vfqBd9A77HIB9OTB4IX87sNB51Bxk_irxx7BZuPGCF9rrnoYoanlTedD' }
  ];

  const [messages] = useState([
    {
      id: '1',
      type: 'incoming',
      user: 'Vance_0x',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAbiMq-6aei61q4FiMCWXOnDOhKQFT6xO9GbWySEcId6-FltIuu3qSMqLPLZlc5mHi3eG3OZ3zhEbZDsPkHRkAXyFhtHOLV4IN-faLSSvjieiRj3gMFNso42ezVGaU1Q8Bf8hYKCx2u5VBsVrPBoWOvynEsLjC43dPLb_xq9vKgbBkYNWO2pmUhSn1yU6Z6TMw__-Obqo1GhKvkFVbCB43_fjQt4dMFuR_3p4Floi9LiZXQR_2zD2F6UF7wRCDSPM4H-0O83dmi4_h',
      content: 'Just grabbed the new Phantom V2s. The texture on the carbon fiber is insane. Definitely worth the 0̸.85.',
      time: '14:02',
      product: {
        id: 'lp1-msg',
        name: 'Phantom V2 "Obsidian"',
        category: 'Footwear • 0Buck Prime',
        price: '0̸.85',
        description: 'Elite-grade tactical footwear with adaptive cushioning and carbon-fiber reinforcement.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVckktB3RgPkfHBr-SiciQvgQTr-OedbY_GjDvV7VdvKtT0bwv6CzYAIl5fYjDCdv5KyuA9HhAoLQJj_Rmuk1FoytDXDpqmqaVjvX66D2d4GKxmDTKWvXzcp-Hu8lKadMIcAvJhS17mDDB8zgIUgNZzedPMYcv-45LPlxvyUjU6yNj3kUI3ka20frOZbIneB4Ox8Xkg2efH0sTXu4HEqzb10f88Aa2JsUWXdb-M8qGQ2RFX3TeEwLsQn_CJRJZYJklWqHUNPsX8V-G'
      }
    },
    {
      id: '2',
      type: 'outgoing',
      user: 'You',
      content: "Looks clean. Thinking about picking up the Sonic Link headset to match. AI Butler, what's the current floor price?",
      time: '14:05'
    },
    {
      id: '3',
      type: 'butler',
      user: 'Butler Intelligence',
      content: 'Floor price for Sonic Link is currently 0̸.98. High velocity interest detected in Lounge 4 (+14% in 30m). Shall I initiate a secure hold for your wallet?',
      time: 'Active Now'
    },
    {
      id: '4',
      type: 'butler',
      user: 'Butler Intelligence',
      content: 'I have analyzed the current lounge sentiment. Here are the most trending assets among members right now:',
      time: 'Active Now',
      isProductScroller: true,
      scrollerProducts: scrollerProducts
    }
  ]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-10 relative overflow-hidden bg-black h-screen">
      <StreamGuard 
        isReady={isChatReady || false} 
        isConnecting={isConnecting || false}
        onRetry={onRetry}
      >
        <style>{`
        .glass-panel { background: rgba(10, 10, 10, 0.7); backdrop-filter: blur(80px); -webkit-backdrop-filter: blur(80px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Background Neural Network Simulation */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      {/* Main Content Terminal View */}
      <main className="w-full max-w-6xl h-full flex flex-row bg-zinc-950/40 border border-zinc-800/60 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] glass-panel relative z-10">
        
        {/* Left Sidebar: Navigation Tabs */}
        <aside className="w-20 lg:w-64 border-r border-white/5 bg-black/20 flex flex-col overflow-hidden">
          <div className="p-6 h-16 flex items-center border-b border-white/5">
            <h2 className="text-white font-black text-sm uppercase tracking-widest hidden lg:block">{t('nav.lounge')}</h2>
            <Sofa className="w-5 h-5 text-primary lg:hidden" />
          </div>
          
          <nav className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {[
              { id: 'chats', label: t('lounge.tab_messages'), icon: MessageSquare },
              { id: 'friends', label: t('lounge.tab_friends'), icon: Users },
              { id: 'moments', label: t('lounge.tab_moments'), icon: Activity },
              { id: 'notes', label: t('lounge.tab_notes'), icon: LayoutGrid }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                    isActive ? 'bg-primary text-black font-bold shadow-lg' : 'text-zinc-500 hover:bg-white/5'
                  }`}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="text-sm uppercase tracking-widest hidden lg:block">{tab.label}</span>
                </button>
              );
            })}

            <div className="pt-6 border-t border-white/5 mt-4">
              <p className="px-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 hidden lg:block">Recent Groups</p>
              {chatClient && isChatReady ? (
                <div className="bg-black/20 rounded-xl overflow-hidden">
                  <Chat client={chatClient} theme="str-chat__theme-dark">
                    <ChannelList 
                      filters={channelFilter} 
                      sort={{ last_message_at: -1 }} 
                      Preview={CustomChannelPreview}
                      EmptyStateIndicator={CustomEmptyState}
                    />
                  </Chat>
                </div>
              ) : (
                <div className="px-3 space-y-4">
                  {visibleMembers.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex items-center gap-3 opacity-50">
                      <img src={m.image} className="w-8 h-8 rounded-lg" alt="" />
                      <span className="text-xs text-zinc-400 hidden lg:block">{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/70 backdrop-blur-[80px] flex items-center justify-between px-8 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-primary font-black text-xs uppercase tracking-widest">{activeTab}</span>
              {activeTab === 'chats' && activeChannel && (
                <span className="text-white/40 text-xs uppercase">/ {activeChannel.data?.name}</span>
              )}
            </div>
            
            {activeTab === 'moments' && (
              <button 
                onClick={() => setShowMomentInput(!showMomentInput)}
                className="bg-primary text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
              >
                {t('lounge.post_moment')}
              </button>
            )}

            {activeTab === 'notes' && (
              <button 
                onClick={() => setIsNoteModalOpen(true)}
                className="bg-primary text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
              >
                {t('lounge.post_note')}
              </button>
            )}
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-black/10">
            <AnimatePresence mode="wait">
              {activeTab === 'chats' ? (
                <motion.div 
                  key="chats"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  {chatClient && isChatReady && activeChannel ? (
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
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4">
                      <MessageSquare size={48} className="opacity-20" />
                      <p className="text-xs uppercase tracking-[0.3em] font-black">{t('lounge.select_group')}</p>
                    </div>
                  )}
                </motion.div>
              ) : activeTab === 'friends' ? (
                <motion.div 
                  key="friends"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="p-8 max-w-4xl mx-auto space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Friends List */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">{t('lounge.my_friends')}</h3>
                        <button 
                          onClick={() => setIsAddFriendModalOpen(true)}
                          className="text-primary hover:text-white transition-colors"
                        >
                          <UserPlus size={20} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {visibleFriends.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-primary/20 transition-all group">
                            <div className="flex items-center gap-4">
                              <img src={f.image} className="w-12 h-12 rounded-xl" alt="" />
                              <div>
                                <p className="text-white font-bold text-sm">{f.name}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{f.lastMsg}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteFriend(f.name)}
                              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <div ref={friendSentinelRef} className="h-10 flex items-center justify-center">
                          {loadingFriends && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                        </div>
                      </div>
                    </div>

                    {/* Requests & notifications */}
                    <div className="space-y-6">
                      <h3 className="text-white font-black text-sm uppercase tracking-widest">{t('lounge.notifications')}</h3>
                      {friendRequests.length > 0 ? (
                        <div className="space-y-4">
                          {friendRequests.map(req => (
                            <div key={req.id} className="bg-primary/10 border border-primary/20 p-4 rounded-2xl space-y-4 shadow-xl">
                              <div className="flex items-center gap-3">
                                <img src={req.image} className="w-10 h-10 rounded-lg" alt="" />
                                <div>
                                  <p className="text-white text-xs font-bold">{req.name} wants to connect</p>
                                  <p className="text-[9px] text-primary font-black uppercase">{Math.floor((Date.now() - req.timestamp.getTime()) / 3600000)}h ago</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleAcceptRequest(req)}
                                  className="flex-1 bg-primary text-black py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => handleRejectRequest(req.id)}
                                  className="px-4 bg-white/5 text-zinc-500 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10 opacity-30">
                          <Bell size={32} className="mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest">{t('lounge.no_requests')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'moments' ? (
                <motion.div 
                  key="moments"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 max-w-2xl mx-auto space-y-8"
                >
                  {showMomentInput && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
                      <textarea 
                        value={newMomentContent}
                        onChange={(e) => setNewMomentContent(e.target.value)}
                        placeholder="What's happening in your node?"
                        className="w-full bg-transparent border-none text-zinc-200 text-sm focus:ring-0 resize-none min-h-[100px] no-scrollbar"
                      />
                      <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <button className="text-zinc-500 hover:text-primary transition-colors">
                          <ImageIcon size={20} />
                        </button>
                        <button 
                          onClick={handlePostMoment}
                          className="bg-primary text-black px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest"
                        >
                          {t('lounge.send_uplink')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-8">
                    {moments.map(m => (
                      <div key={m.id} className="bg-zinc-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                          <img src={m.avatar} className="w-12 h-12 rounded-2xl border border-white/10" alt="" />
                          <div>
                            <h4 className="text-white font-black text-sm uppercase tracking-tight">{m.user}</h4>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{m.timestamp}</p>
                          </div>
                        </div>
                        <p className="text-zinc-300 text-sm leading-relaxed">{m.content}</p>
                        {m.images.length > 0 && (
                          <div className="rounded-2xl overflow-hidden border border-white/5">
                            <img src={m.images[0]} className="w-full aspect-video object-cover" alt="" />
                          </div>
                        )}
                        <div className="flex items-center gap-8 pt-4 border-t border-white/5">
                          <button 
                            onClick={() => handleLikeMoment(m.id)}
                            className="flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-xs font-bold"
                          >
                            <Zap size={16} /> {m.likes}
                          </button>
                          <button 
                            onClick={() => setActiveCommentId(activeCommentId === m.id ? null : m.id)}
                            className="flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-xs font-bold"
                          >
                            <MessageSquare size={16} /> {m.comments}
                          </button>
                          <button className="ml-auto text-zinc-500 hover:text-white transition-colors">
                            <Share2 size={16} />
                          </button>
                        </div>

                        {/* Comment Section (WeChat style) */}
                        {(m.commentList && m.commentList.length > 0) || activeCommentId === m.id ? (
                          <div className="mt-4 bg-black/30 rounded-xl p-4 space-y-3">
                            {m.commentList?.map((c: any, i: number) => (
                              <div key={i} className="text-xs">
                                <span className="text-primary font-black uppercase mr-2">{c.user}:</span>
                                <span className="text-zinc-400">{c.text}</span>
                              </div>
                            ))}
                            {activeCommentId === m.id && (
                              <div className="flex gap-2 pt-2 border-t border-white/5">
                                <input 
                                  autoFocus
                                  value={commentInput}
                                  onChange={(e) => setCommentInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handlePostComment(m.id)}
                                  placeholder="Comment..."
                                  className="flex-1 bg-transparent border-none text-xs text-zinc-200 focus:ring-0 p-0"
                                />
                                <button 
                                  onClick={() => handlePostComment(m.id)}
                                  className="text-primary font-black text-[10px] uppercase tracking-widest"
                                >
                                  Post
                                </button>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="notes"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-8 max-w-6xl mx-auto"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.map(n => (
                      <div key={n.id} className="group bg-zinc-900/50 rounded-3xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all shadow-xl">
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img src={n.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                          <div className="absolute bottom-0 p-6 space-y-2">
                            <h4 className="text-white font-black text-sm uppercase tracking-tight line-clamp-2 leading-snug">{n.title}</h4>
                            <div className="flex items-center gap-3">
                              <img src={n.avatar} className="w-6 h-6 rounded-full border border-white/20" alt="" />
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{n.user}</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 flex justify-between items-center border-t border-white/5">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => handleLikeNote(n.id)}
                              className="flex items-center gap-1.5 text-zinc-500 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest"
                            >
                              <Zap size={14} /> {n.likes}
                            </button>
                            <span className="flex items-center gap-1.5 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                              <Activity size={14} /> {n.views}
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">{n.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
      {/* Add Friend Modal */}
      <AnimatePresence>
        {isAddFriendModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddFriendModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">{t('lounge.add_friend')}</h3>
                <button 
                  onClick={() => setIsAddFriendModalOpen(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">Email or User ID</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                      type="text"
                      placeholder="e.g. user@example.com or 0B-8829"
                      value={addFriendQuery}
                      onChange={(e) => setAddFriendQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchFriend()}
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>

                {/* Search Results Area */}
                <div className="min-h-[100px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-black/20 p-4">
                  {isSearching ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Searching Network...</p>
                    </div>
                  ) : searchResult ? (
                    <div className="w-full flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3">
                        <img src={searchResult.image} className="w-10 h-10 rounded-lg border border-white/10" alt="" />
                        <div>
                          <p className="text-sm text-white font-bold">{searchResult.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">ID: {searchResult.id}</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleConfirmAddFriend}
                        className="bg-primary text-white p-2 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-[11px] text-zinc-600 font-medium">Enter details above to find users on the 0Buck network.</p>
                      <button 
                        onClick={handleSearchFriend}
                        className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline"
                      >
                        Start Search
                      </button>
                    </div>
                  )}
                </div>

                {/* Pending Requests Section */}
                {friendRequests.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('lounge.friend_request')}</h4>
                      <span className="text-[9px] text-zinc-600 font-bold">Expires in 48h</span>
                    </div>
                    <div className="space-y-2">
                      {friendRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <img src={req.image} className="w-9 h-9 rounded-lg border border-white/10" alt="" />
                            <div>
                              <p className="text-xs text-white font-bold">{req.name}</p>
                              <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-medium">
                                <Clock className="w-2.5 h-2.5" />
                                {Math.floor((Date.now() - req.timestamp.getTime()) / 3600000)}h ago
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleAcceptRequest(req)}
                              className="bg-primary text-white p-1.5 rounded-lg hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleRejectRequest(req.id)}
                              className="bg-white/5 text-zinc-500 p-1.5 rounded-lg hover:bg-white/10 transition-all border border-white/5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-black/20 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setIsAddFriendModalOpen(false)}
                  className="px-6 py-2 text-[11px] text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">{t('lounge.post_note')}</h3>
                <button onClick={() => setIsNoteModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">Note Title</label>
                  <input 
                    type="text"
                    placeholder="Enter a catchy title..."
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">Cover Image URL</label>
                  <input 
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={newNote.cover}
                    onChange={(e) => setNewNote({ ...newNote, cover: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">Content</label>
                  <textarea 
                    placeholder="Share your selection insights or node procurement experience..."
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700 min-h-[200px] resize-none no-scrollbar"
                  />
                </div>
              </div>

              <div className="p-6 bg-black/20 border-t border-white/5 flex justify-end gap-4">
                <button onClick={() => setIsNoteModalOpen(false)} className="px-6 py-2 text-[11px] text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handlePostNote}
                  className="bg-primary text-black px-8 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all"
                >
                  Publish Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </StreamGuard>
    </div>
  );
}

