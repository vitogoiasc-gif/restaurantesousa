import { Product } from '../types';
import { formatCurrency } from '../lib/utils';

interface ProductCardProps {
  key?: string | number;
  product: Product;
  onClick: (product: Product) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div
      onClick={() => onClick(product)}
      className="flex flex-row items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer gap-4"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-medium text-gray-900 truncate">{product.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
        <p className="text-base font-semibold text-emerald-600 mt-2">
          {formatCurrency(product.price)}
        </p>
      </div>
      {product.image_url && (
        <div className="shrink-0">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-24 h-24 object-cover rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
