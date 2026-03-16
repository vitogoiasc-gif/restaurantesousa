import { create } from 'zustand';
import type { CartItem, Product, CartItemOption } from '../types';

type CartStore = {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    notes?: string,
    selectedOptions?: CartItemOption[]
  ) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product, quantity = 1, notes = '', selectedOptions = []) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          product,
          quantity,
          notes,
          selectedOptions,
        },
      ],
    })),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: quantity < 1 ? 1 : quantity }
            : item
        ),
    })),

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    const { items } = get();

    return items.reduce((total, item) => {
      const optionsTotal =
        item.selectedOptions?.reduce((sum, option) => sum + option.price, 0) || 0;

      const itemTotal = (item.product.price + optionsTotal) * item.quantity;

      return total + itemTotal;
    }, 0);
  },
}));