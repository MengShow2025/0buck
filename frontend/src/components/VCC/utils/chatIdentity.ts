type ChatLike = {
  id?: string;
  name?: string;
  isAiButler?: boolean;
} | null | undefined;

export const resolveChatDisplayName = (
  chat: ChatLike,
  butlerName?: string | null,
  defaultButlerName = 'AI Butler'
): string => {
  const customName = String(butlerName || '').trim();
  if (chat?.isAiButler || String(chat?.id || '') === '2') {
    return customName || defaultButlerName;
  }
  return String(chat?.name || '').trim() || defaultButlerName;
};
