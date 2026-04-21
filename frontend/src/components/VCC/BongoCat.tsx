import { motion } from "framer-motion";

interface BongoCatProps {
  isTyping?: boolean;
  className?: string;
}

export default function BongoCat({ isTyping = false, className = "" }: BongoCatProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background / Container matching the screenshot */}
        <rect x="0" y="0" width="200" height="200" rx="40" fill="white" />

        {/* Cat Body Outline */}
        <path
          d="M 10 130 C 50 80, 150 90, 190 140 L 190 200 L 10 200 Z"
          fill="white"
        />
        <path
          d="M 5 150 C 50 90, 150 100, 190 160"
          stroke="black"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Left Ear */}
        <path
          d="M 50 95 L 60 50 L 95 85"
          fill="white"
          stroke="black"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Right Ear */}
        <path
          d="M 140 85 L 175 60 L 180 110"
          fill="white"
          stroke="black"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Left Eye */}
        <circle cx="50" cy="140" r="7" fill="black" />

        {/* Right Eye */}
        <circle cx="110" cy="150" r="7" fill="black" />

        {/* Mouth (The classic 'w') */}
        <path
          d="M 65 145 Q 72 155 80 145 Q 88 155 95 145"
          fill="none"
          stroke="black"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Animated Heart */}
        <motion.g
          animate={isTyping ? {
            scale: [1, 1.2, 1],
            rotate: [-10, 10, -10],
          } : { scale: 1, rotate: 0 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <path
            d="M 110 50 C 110 40, 125 40, 125 50 C 125 40, 140 40, 140 50 C 140 60, 125 70, 125 70 C 125 70, 110 60, 110 50 Z"
            fill="#FF4B6E"
            stroke="black"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </motion.g>

        {/* Animated Swish Line */}
        <motion.path
          d="M 80 85 C 75 70, 85 50, 100 45"
          fill="none"
          stroke="black"
          strokeWidth="4"
          strokeLinecap="round"
          animate={isTyping ? {
            pathLength: [0, 1, 0],
            opacity: [0, 1, 0]
          } : { pathLength: 0, opacity: 0 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

      </svg>
    </div>
  );
}