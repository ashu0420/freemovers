import { randomUUID } from 'crypto';

export type UserType = 'customer' | 'driver';

export type UserRecord = {
  id: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: UserType;
  phone_number: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type MoveRecord = {
  id: number;
  customer_id: number;
  pickup_address: string;
  dropoff_address: string;
  move_date: string;
  items: { name: string; quantity: number }[];
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
};

type Store = {
  users: UserRecord[];
  moves: MoveRecord[];
  nextUserId: number;
  nextMoveId: number;
};

const defaultStore: Store = {
  users: [],
  moves: [],
  nextUserId: 1,
  nextMoveId: 1,
};

const globalForStore = globalThis as unknown as { __freemoversStore?: Store };

export const store: Store = globalForStore.__freemoversStore ?? defaultStore;

if (!globalForStore.__freemoversStore) {
  globalForStore.__freemoversStore = store;
}

export function createTokens(): AuthTokens {
  return {
    access: randomUUID(),
    refresh: randomUUID(),
  };
}
