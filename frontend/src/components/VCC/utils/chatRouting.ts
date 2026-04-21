export const shouldUseButlerBackend = (chat?: { id?: string; isAiButler?: boolean } | null): boolean => {
  if (!chat) return false;
  if (chat.isAiButler) return true;
  // Backward compatibility: Lounge AI chat was historically fixed as id "2".
  return String(chat.id || '') === '2';
};
