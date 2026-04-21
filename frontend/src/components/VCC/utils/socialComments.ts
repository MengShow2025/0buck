export type SocialCommentView = {
  id: string;
  user: string;
  content: string;
  timestamp: string;
  canDelete: boolean;
  isAuthor: boolean;
  parentCommentId: string;
  replies: SocialCommentView[];
};

const mapSocialCommentNode = (item: any): SocialCommentView => ({
  id: String(item?.id || ''),
  user: String(item?.user || 'User'),
  content: String(item?.content || ''),
  timestamp: String(item?.timestamp || ''),
  canDelete: Boolean(item?.can_delete),
  isAuthor: Boolean(item?.is_author),
  parentCommentId: String(item?.parent_comment_id || ''),
  replies: Array.isArray(item?.replies) ? item.replies.map(mapSocialCommentNode) : [],
});

export const mapSocialComments = (items: any[] | undefined | null): SocialCommentView[] => {
  if (!Array.isArray(items)) return [];
  return items.map(mapSocialCommentNode);
};
