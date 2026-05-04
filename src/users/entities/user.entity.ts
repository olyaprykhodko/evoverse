export class User {
  id: number;
  username: string | null;
  email: string | null;
  role: number;
  isBanned: boolean;
  createdAt: Date | null;
}

export class UserPublicProfile {
  username: string | null;
  rating: number;
  level: number;
  country: string | null;
  createdAt: Date | null;
}
