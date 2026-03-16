import { Category } from '../types';
import { cn } from '../lib/utils';

interface CategoryListProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryList({ categories, activeCategory, onSelectCategory }: CategoryListProps) {
  return (
    <div className="flex overflow-x-auto hide-scrollbar gap-3 py-4 px-4 sm:px-0 snap-x">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            "whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-colors snap-start",
            activeCategory === category.id
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-600 hover:text-emerald-600"
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
