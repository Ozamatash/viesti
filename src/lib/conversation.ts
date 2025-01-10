export const generateConversationId = (userId1: string, userId2: string): string => {
  // Sort IDs to ensure consistent conversation IDs regardless of order
  const [smallerId, largerId] = [userId1, userId2].sort();
  return `${smallerId}-${largerId}`;
};

export const parseConversationId = (conversationId: string): { userId1: string; userId2: string } => {
  const [userId1, userId2] = conversationId.split('-');
  return { userId1: userId1 || '', userId2: userId2 || '' };
}; 