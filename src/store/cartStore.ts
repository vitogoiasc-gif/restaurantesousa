import { create } from "zustand";
import type { CartItem, Product, CartItemOption } from "../types";

type CartStore = {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    notes?: string,
    selectedOptions?: CartItemOption[]
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
};

const generateCartItemId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product, quantity = 1, notes = "", selectedOptions = []) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: generateCartItemId(),
          product,
          quantity,
          notes,
          selectedOptions,
        },
      ],
    })),

  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    })),

  updateQuantity: (itemId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: quantity < 1 ? 1 : quantity }
          : item
      ),
    })),

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    const { items } = get();

    return items.reduce((total, item) => {
      const optionsTotal =
        item.selectedOptions?.reduce(
          (sum, option) => sum + Number(option.price || 0),
          0
        ) || 0;

      const itemTotal = (Number(item.product.price) + optionsTotal) * item.quantity;

      return total + itemTotal;
    }, 0);
  },
}));