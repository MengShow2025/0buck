import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BongoCat from './BongoCat';
import { usePreferenceContext } from './contexts/PreferenceContext';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const { t, theme } = usePreferenceContext();
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Use context to get current theme, default to dark if not available
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const slogans = [
    t('splash.slogan1'),
    t('splash.slogan2'),
    t('splash.slogan3')
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slogans.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [slogans.length]);

  const handleEnter = () => {
    setIsFadingOut(true);
    setTimeout(onComplete, 800); // Wait for fade out animation
  };

  // Add click handler to the entire screen for quick exit, but don't interfere with buttons
  const handleScreenClick = (e: React.MouseEvent) => {
    // If they clicked the background, not a button
    if (e.target === e.currentTarget) {
      handleEnter();
    }
  };

  return (
    <div 
      onClick={handleScreenClick}
      className={`fixed inset-0 z-[9999] font-body overflow-hidden selection:bg-orange-500/30 antialiased transition-opacity duration-800 ease-in-out ${
        isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#FAFAF9] text-gray-900'
      } ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >

      {/* Ambient Background FX */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] ${isDarkMode ? 'bg-[#af3000]/15' : 'bg-[#E8450A]/8'}`}></div>
        <div className={`absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[120px] ${isDarkMode ? 'bg-orange-900/10' : 'bg-orange-500/10'}`}></div>
        {isDarkMode ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(39,24,20,0.1)_0%,rgba(5,5,5,0.98)_100%)] backdrop-blur-[100px]"></div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,rgba(236,229,221,0.9)_100%)] backdrop-blur-[100px]"></div>
        )}
      </div>
      
      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center -mt-20">
        <div className="flex flex-col items-center">
          {/* Branding Section */}
          <div className="flex flex-col items-center mb-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="ob-wordmark text-[5rem] md:text-[6rem] lg:text-[7rem]"
            >
              <motion.span 
                animate={{ 
                  filter: ["drop-shadow(0 0 12px rgba(232, 69, 10, 0.35))", "drop-shadow(0 0 24px rgba(232, 69, 10, 0.6))", "drop-shadow(0 0 12px rgba(232, 69, 10, 0.35))"],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="ob-zero mr-[0.02em]"
              >
                0
              </motion.span>
              <span className={`ob-buck ${isDarkMode ? "text-white" : "text-gray-900"}`}>Buck</span>
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
                className="absolute text-2xl md:text-4xl lg:text-6xl font-extralight tracking-tight w-full px-4 leading-tight"
              >
                {slogans[currentIndex]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Evolving into */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.4, 0.8, 0.4],
              textShadow: isDarkMode ? [
                "0 0 10px rgba(255, 92, 0, 0)",
                "0 0 30px rgba(255, 92, 0, 0.8)",
                "0 0 10px rgba(255, 92, 0, 0)"
              ] : [
                "0 0 10px rgba(255, 92, 0, 0)",
                "0 0 20px rgba(255, 92, 0, 0.4)",
                "0 0 10px rgba(255, 92, 0, 0)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-lg md:text-2xl font-black tracking-[0.6em] mt-12 mb-4 uppercase`}
          >
            {t('splash.evolving')}
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
              className="text-4xl md:text-6xl font-[900] tracking-[0.1em] text-[#FF5C00] uppercase italic"
            >
              {t('splash.ai_butler')}
            </motion.p>
            <div className="flex items-center justify-center gap-4">
              <div className={`h-[1px] w-16 bg-gradient-to-r from-transparent ${isDarkMode ? 'via-white/20' : 'via-gray-400/50'} to-transparent`}></div>
              <p className={`text-xs md:text-sm font-light tracking-[0.3em] uppercase italic ${isDarkMode ? 'text-white/40' : 'text-gray-500'}`}>
                {t('splash.truly_knows')}
              </p>
              <div className={`h-[1px] w-16 bg-gradient-to-r from-transparent ${isDarkMode ? 'via-white/20' : 'via-gray-400/50'} to-transparent`}></div>
            </div>
          </motion.div>
        </div>

        {/* Footer Action */}
        <div className="absolute bottom-16 left-0 w-full flex flex-col items-center space-y-8">
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 1 }}
            onClick={handleEnter}
            className="group flex flex-col items-center focus:outline-none transition-all duration-300"
          >
            <div className={`w-20 h-20 bg-white border ${isDarkMode ? 'border-white/20' : 'border-gray-200'} rounded-full shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-500 mb-5 group-hover:scale-110 group-hover:border-[#FF5C00] group-hover:shadow-[0_0_30px_rgba(255,92,0,0.4)] group-active:scale-95`}>
              <BongoCat isTyping={true} className="w-[120%] h-[120%] translate-y-1" />
            </div>
            <span className={`text-xs md:text-sm uppercase tracking-[0.5em] transition-colors ${isDarkMode ? 'text-[#5e5e5e] group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'}`}>
              {t('splash.enter')}
            </span>
          </motion.button>

          <nav className="flex items-center space-x-12 relative z-50">
            <button 
              onClick={() => {
                // First close splash screen
                setIsFadingOut(true);
                setTimeout(() => {
                  onComplete();
                  // Then trigger the auth drawer
                  setTimeout(() => {
                    const event = new CustomEvent('open-auth-drawer');
                    window.dispatchEvent(event);
                  }, 100);
                }, 800);
              }}
              className={`text-[13px] md:text-sm font-black tracking-[0.3em] uppercase cursor-pointer transition-colors text-[#FF5C00] hover:text-[#ff8a4c]`}
            >
              {t('splash.signin')}
            </button>
            <span className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-300'}`}></span>
            <button className={`text-[13px] md:text-sm font-black tracking-[0.3em] uppercase transition-colors text-[#FF5C00] hover:text-[#ff8a4c]`}>
              {t('splash.about')}
            </button>
          </nav>
        </div>
      </main>

      {/* Visual Texture Layers */}
      <div className="absolute inset-0 z-20 pointer-events-none mix-blend-soft-light opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      {/* Decorative Corner Accents */}
      <div className={`absolute top-12 left-12 z-30 opacity-30`}>
        <div className={`w-16 h-[1px] ${isDarkMode ? 'bg-zinc-600' : 'bg-gray-400'}`}></div>
        <div className={`w-[1px] h-16 mt-[-1px] ${isDarkMode ? 'bg-zinc-600' : 'bg-gray-400'}`}></div>
      </div>
      <div className={`absolute bottom-12 right-12 z-30 opacity-30 transform rotate-90`}>
        <div className={`w-16 h-[1px] ml-auto ${isDarkMode ? 'bg-zinc-600' : 'bg-gray-400'}`}></div>
        <div className={`w-[1px] h-16 ml-auto mt-[-1px] ${isDarkMode ? 'bg-zinc-600' : 'bg-gray-400'}`}></div>
      </div>
    </div>
  );
};
