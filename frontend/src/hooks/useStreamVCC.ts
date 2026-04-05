import { useState, useEffect, useCallback } from 'react';
import { StreamChat } from 'stream-chat';
import axios from 'axios';

const API_KEY = (import.meta as any).env?.VITE_STREAM_API_KEY || '';
const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || '';

export function useStreamVCC(isAuthenticated: boolean, currentUser: any) {
  const [chatClient] = useState(() => StreamChat.getInstance(API_KEY));
  const [isChatReady, setIsChatReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (isChatReady || isConnecting || !API_KEY) return;

    setIsConnecting(true);
    try {
      if (isAuthenticated && currentUser?.id) {
        // Scene A: Authenticated Member
        const res = await axios.post(`${BACKEND_URL}/api/agent/session`, { user_id: currentUser.id });
        const chatToken = res.data.chat_token;

        await chatClient.connectUser(
          {
            id: currentUser.id,
            name: currentUser.name || currentUser.email?.split('@')[0] || 'Member',
            image: currentUser.avatar_url || `https://getstream.io/random_png/?name=${currentUser.id}`
          },
          chatToken
        );
        console.log(`[VCC] Connected as member: ${currentUser.id}`);
      } else {
        // Scene B: Guest Explorer (Lazy registered)
        let guestId = localStorage.getItem('0buck_guest_id');
        if (!guestId) {
          guestId = `0buck_guest_${Math.random().toString(36).substring(2, 11)}`;
          localStorage.setItem('0buck_guest_id', guestId);
        }

        await chatClient.setGuestUser({
          id: guestId,
          name: currentUser?.name || '0Buck Explorer'
        });
        console.log(`[VCC] Connected as guest: ${guestId}`);
      }
      
      // Scene C: Auto-Join Global Channels (v3.4.4)
      const globalChannels = [
        { id: 'global_square', name: 'SQUARE BROADCAST' },
        { id: 'global_lounge', name: 'SOCIAL LOUNGE' },
        { id: 'global_commerce', name: 'COMMERCE HUB' }
      ];

      for (const chan of globalChannels) {
        try {
          const channel = chatClient.channel('messaging', chan.id);
          // If guest, we use watch() which triggers the guest auto-add logic if enabled in Stream Dashboard
          // If member, we join explicitly
          await channel.watch();
          console.log(`[VCC] Auto-joined channel: ${chan.id}`);
        } catch (chanErr) {
          console.warn(`[VCC] Failed to auto-join ${chan.id}:`, chanErr);
        }
      }

      setIsChatReady(true);
    } catch (err) {
      console.error('[VCC] Connection Error:', err);
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
