export interface ChatAuthor {
  id: number;
  username: string | null;
  avatar: string | null;
}

export interface ChatMessageView {
  id: string;
  room: string;
  content: string;
  createdAt: string;
  user: ChatAuthor;
}
