import { useState, useEffect, useCallback } from 'react';
import { StreamChat } from 'stream-chat';
import axios from 'axios';

const API_KEY = (import.meta as any).env?.VITE_STREAM_API_KEY || '';
const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || '';

export function useStreamVCC(isAuthenticated: boolean, currentUser: any) {
  const [chatClient] = useState(() => {
    console.log('[VCC] Initializing StreamChat with Key:', API_KEY ? 'Present' : 'MISSING');
    return StreamChat.getInstance(API_KEY);
  });
  const [isChatReady, setIsChatReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (isChatReady || isConnecting || !API_KEY) {
      if (!API_KEY) console.error('[VCC] Cannot connect: VITE_STREAM_API_KEY is missing');
      return;
    }

    console.log('[VCC] Starting connection process...', { isAuthenticated, userId: currentUser?.id });
    setIsConnecting(true);
    try {
      if (isAuthenticated && currentUser?.id) {
        // Scene A: Authenticated Member
        console.log('[VCC] Requesting session token from backend...');
        const res = await axios.post(`${BACKEND_URL}/api/v1/agent/session`, 
          { user_id: currentUser.id },
          { timeout: 10000 }
        );
        const chatToken = res.data.chat_token;
        console.log('[VCC] Token received, connecting user...');

        await chatClient.connectUser(
          {
            id: currentUser.id,
            name: currentUser.name || currentUser.email?.split('@')[0] || 'Member',
            image: currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`
          },
          chatToken
        );
        console.log(`[VCC] Connected as member: ${currentUser.id}`);
      } else {
        // Scene B: Guest Explorer
        let guestId = localStorage.getItem('0buck_guest_id');
        if (!guestId) {
          guestId = `0buck_guest_${Math.random().toString(36).substring(2, 11)}`;
          localStorage.setItem('0buck_guest_id', guestId);
        }
        console.log('[VCC] Connecting as guest...', guestId);

        // Fallback: If setGuestUser fails, it might be disabled in dashboard. 
        // We'll try it but catch specifically.
        try {
          await chatClient.setGuestUser({
            id: guestId,
            name: '0Buck Explorer'
          });
        } catch (guestErr) {
          console.warn('[VCC] Guest login failed, dashboard might not support it. Trying anonymous...', guestErr);
          await chatClient.connectUser({ id: guestId, name: 'Guest' }, chatClient.devToken(guestId));
        }
        console.log(`[VCC] Connected as guest: ${guestId}`);
      }
      
      // Scene C: Auto-Join Global Channels
      const globalChannels = [
        { id: 'global_square', name: 'SQUARE BROADCAST' },
        { id: 'global_lounge', name: 'SOCIAL LOUNGE' },
        { id: 'global_commerce', name: 'COMMERCE HUB' }
      ];

      for (const chan of globalChannels) {
        try {
          console.log(`[VCC] Joining ${chan.id}...`);
          const channel = chatClient.channel('messaging', chan.id, {
            name: chan.name,
            platform_role: 'global'
          });
          await channel.watch();
        } catch (chanErr) {
          console.warn(`[VCC] Failed to join ${chan.id}:`, chanErr);
        }
      }

      setIsChatReady(true);
    } catch (err) {
      console.error('[VCC] Final Connection Error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [isAuthenticated, currentUser, isChatReady, isConnecting, chatClient]);

  const disconnect = useCallback(async () => {
    if (chatClient.userID) {
      await chatClient.disconnectUser();
      setIsChatReady(false);
      console.log('[VCC] Disconnected');
    }
  }, [chatClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // We don't necessarily want to disconnect on every re-render, 
      // but the app level cleanup is handled in App.tsx
    };
  }, []);

  return { chatClient, isChatReady, isConnecting, connect, disconnect };
}
