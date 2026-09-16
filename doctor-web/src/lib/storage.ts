const memory = new Map<string, string>();

export const storage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return memory.get(key) ?? null;
    return window.localStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    memory.set(key, value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  },
  deleteItem(key: string) {
    memory.delete(key);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  },
};
