import React, { createContext, useContext, useState, useMemo } from 'react';

interface AIContextType {
  aiInput: string;
  setAiInput: (text: string) => void;
  aiPersona: 'professional' | 'friendly' | 'creative' | 'concise' | 'casual' | 'expert' | 'loli' | 'tsundere' | 'butler' | 'mentor';
  setAiPersona: (v: 'professional' | 'friendly' | 'creative' | 'concise' | 'casual' | 'expert' | 'loli' | 'tsundere' | 'butler' | 'mentor') => void;
  aiCustomInstructions: string;
  setAiCustomInstructions: (v: string) => void;
  aiMemoryTags: string[];
  setAiMemoryTags: (v: string[]) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aiInput, setAiInput] = useState('');
  const [aiPersona, setAiPersona] = useState<'professional' | 'friendly' | 'creative' | 'concise' | 'casual' | 'expert' | 'loli' | 'tsundere' | 'butler' | 'mentor'>('professional');
  const [aiCustomInstructions, setAiCustomInstructions] = useState('');
  const [aiMemoryTags, setAiMemoryTags] = useState<string[]>([]);

  const value = useMemo(() => ({
    aiInput, setAiInput,
    aiPersona, setAiPersona,
    aiCustomInstructions, setAiCustomInstructions,
    aiMemoryTags, setAiMemoryTags
  }), [aiInput, aiPersona, aiCustomInstructions, aiMemoryTags]);

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};

export const useAIContext = () => {
  const context = useContext(AIContext);
  if (!context) throw new Error('useAIContext must be used within AIProvider');
  return context;
};
