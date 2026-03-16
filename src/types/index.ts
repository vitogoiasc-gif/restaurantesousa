export type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

export type ProductOption = {
  id: string;
  group_id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at?: string;
};

export type ProductOptionGroup = {
  id: string;
  product_id: string;
  name: string;
  required: boolean;
  min_select: number;
  max_select: number;
  created_at?: string;
  options?: ProductOption[];
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
  created_at?: string;
  option_groups?: ProductOptionGroup[];
};

export type CartItemOption = {
  name: string;
  price: number;
};

export type CartItem = {
  product: Product;
  quantity: number;
  notes?: string;
  selectedOptions?: CartItemOption[];
};

export type OrderStatus =
  | 'novo'
  | 'confirmado'
  | 'em preparo'
  | 'saiu para entrega'
  | 'finalizado'
  | 'cancelado';