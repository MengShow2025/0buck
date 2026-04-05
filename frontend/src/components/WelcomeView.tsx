import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import BongoCat from './BongoCat';

interface WelcomeViewProps {
  onEnter: () => void;
}

export default function WelcomeView({ onEnter }: WelcomeViewProps) {
  const { t } = useTranslation();
  const slogansData = t('welcome.slogans', { returnObjects: true });
  const slogans = Array.isArray(slogansData) ? slogansData : [
    "20-Phase Milestone Cashback",
    "Supplier Penetration Pricing",
    "Community Powered Growth"
  ];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slogans.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [slogans.length]);

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white font-body overflow-hidden selection:bg-primary/30 antialiased">
      {/* Ambient Background FX */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/15 blur-[150px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-orange-900/10 blur-[120px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(39,24,20,0.1)_0%,rgba(5,5,5,0.98)_100%)] backdrop-blur-[100px]"></div>
      </div>
      
      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center -mt-20">
        <div className="flex flex-col items-center">
          {/* Branding Section */}
          <div className="flex flex-col items-center mb-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="flex items-baseline justify-center"
            >
              <h1 className="font-headline font-[900] text-7xl md:text-8xl lg:text-[10rem] tracking-tighter flex items-center leading-none">
                <motion.span 
                  animate={{ 
                    filter: ["drop-shadow(0 0 10px rgba(255, 92, 0, 0.3))", "drop-shadow(0 0 40px rgba(255, 92, 0, 0.8))", "drop-shadow(0 0 10px rgba(255, 92, 0, 0.3))"],
                    opacity: [0.8, 1, 0.8]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[#FF5C00] mr-[-0.02em]"
                >
                  0
                </motion.span>
                <span className="text-white">Buck</span>
              </h1>
            </motion.div>
          </div>

          {/* Vertical Text Cycler */}
          <div className="h-32 md:h-40 lg:h-56 overflow-hidden relative w-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute text-2xl md:text-4xl lg:text-6xl font-headline font-extralight tracking-tight w-full px-4 leading-tight"
              >
                {slogans[currentIndex]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Evolving into - Moved above AI Butler */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.4, 0.8, 0.4],
              textShadow: [
                "0 0 10px rgba(255, 92, 0, 0)",
                "0 0 30px rgba(255, 92, 0, 0.8)",
                "0 0 10px rgba(255, 92, 0, 0)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-white text-lg md:text-2xl font-headline font-black tracking-[0.6em] mt-12 mb-4 uppercase"
          >
            {t('welcome.evolving')}
          </motion.p>

          {/* AI Butler Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="space-y-6"
          >
            <motion.p 
              animate={{ 
                textShadow: [
                  "0 0 15px rgba(255, 92, 0, 0.2)",
                  "0 0 40px rgba(255, 92, 0, 0.9)",
                  "0 0 15px rgba(255, 92, 0, 0.2)"
                ],
                scale: [1, 1.02, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-4xl md:text-6xl font-headline font-[900] tracking-[0.1em] text-[#FF5C00] uppercase italic"
            >
              {t('welcome.ai_butler')}
            </motion.p>
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <p className="text-xs md:text-sm font-headline font-light tracking-[0.3em] text-white/40 uppercase italic">
                {t('welcome.truly_knows')}
              </p>
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
          </motion.div>
        </div>

        {/* Subtle Visual Flourish */}
        <div className="absolute bottom-40 w-full max-w-6xl grid grid-cols-3 gap-8 opacity-10 hidden md:grid">
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
        </div>

        {/* Footer Action */}
        <div className="fixed bottom-16 left-0 w-full flex flex-col items-center space-y-8">
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 1 }}
            onClick={onEnter}
            className="group flex flex-col items-center focus:outline-none transition-all duration-300"
          >
            <div className="w-20 h-20 bg-white border border-white/20 rounded-full shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-500 mb-5 group-hover:scale-110 group-hover:border-[#FF5C00] group-hover:shadow-[0_0_30px_rgba(255,92,0,0.4)] group-active:scale-95">
              <BongoCat isTyping={true} className="w-[120%] h-[120%] translate-y-1" />
            </div>
            <span className="text-xs md:text-sm font-headline uppercase tracking-[0.5em] text-[#5e5e5e] group-hover:text-white transition-colors">
              {t('welcome.enter')}
            </span>
          </motion.button>

          <nav className="flex items-center space-x-12">
            <button className="text-[10px] md:text-xs font-headline text-zinc-600 hover:text-white transition-colors tracking-[0.3em] uppercase">{t('nav.login')}</button>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>
            <button className="text-[10px] md:text-xs font-headline text-zinc-600 hover:text-white transition-colors tracking-[0.3em] uppercase">{t('nav.help')}</button>
          </nav>
        </div>
      </main>

      {/* Visual Texture Layers */}
      <div className="fixed inset-0 z-20 pointer-events-none mix-blend-soft-light opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      {/* Decorative Corner Accents */}
      <div className="fixed top-12 left-12 z-30 opacity-30">
        <div className="w-16 h-[1px] bg-zinc-600"></div>
        <div className="w-[1px] h-16 bg-zinc-600 mt-[-1px]"></div>
      </div>
      <div className="fixed bottom-12 right-12 z-30 opacity-30 transform rotate-90">
        <div className="w-16 h-[1px] bg-zinc-600 ml-auto"></div>
        <div className="w-[1px] h-16 bg-zinc-600 ml-auto mt-[-1px]"></div>
      </div>
    </div>
  );
}
