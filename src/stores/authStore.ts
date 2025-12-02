import { create } from "zustand";
import { persist, PersistStorage, StorageValue } from "zustand/middleware";
import { authAPI } from "../services/api"; // ✅ make sure path matches your setup

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  profileImage?: string;
  isVerified: boolean;
  isSuspended: boolean;
  wallet: {
    balance: number;
    transactions: Array<{
      type: 'credit' | 'debit';
      amount: number;
      description: string;
      date: string;
      bookingId?: string;
    }>;
  };
  rating: {
    average: number;
    count: number;
  };
  stats: {
    itemsListed: number;
    itemsBorrowed: number;
    totalEarnings: number;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: User) => void;
  fetchProfile: () => Promise<void>; // ✅ new
  clearAuth: () => void;
}

type PersistedAuthState = Pick<AuthState, "user" | "token" | "isAuthenticated">;

const localStorageAdapter: PersistStorage<PersistedAuthState> = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    return JSON.parse(str) as StorageValue<PersistedAuthState>;
  },
  setItem: (name, value) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      updateUser: (user) => set({ user }),

      fetchProfile: async () => {  // ✅ Fetch latest profile anytime
        try {
          const res = await authAPI.getProfile();
          set({ user: res.data.data.user });
        } catch (err) {
          console.error("Failed to fetch profile:", err);
        }
      },

      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
      storage: localStorageAdapter,
      partialize: (state): PersistedAuthState => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
