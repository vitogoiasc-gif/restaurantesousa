import { useEffect, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import type { Product, ProductOptionGroup, CartItemOption } from '../types';

type ProductModalProps = {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
};

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNotes('');
      setSelectedOptions({});
      fetchOptions();
    }
  }, [isOpen, product.id]);

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);

      const { data: groupsData, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: true });

      if (groupsError) {
        console.error('Erro ao buscar grupos:', groupsError);
        return;
      }

      const groups = groupsData || [];

      if (groups.length === 0) {
        setOptionGroups([]);
        return;
      }

      const groupIds = groups.map((group) => group.id);

      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .in('group_id', groupIds)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (optionsError) {
        console.error('Erro ao buscar opções:', optionsError);
        return;
      }

      const options = optionsData || [];

      const groupsWithOptions = groups.map((group) => ({
        ...group,
        options: options.filter((option) => option.group_id === group.id),
      }));

      setOptionGroups(groupsWithOptions);
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const toggleOption = (
    groupId: string,
    optionId: string,
    maxSelect: number
  ) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      const exists = current.includes(optionId);

      if (exists) {
        return {
          ...prev,
          [groupId]: current.filter((id) => id !== optionId),
        };
      }

      if (maxSelect === 1) {
        return {
          ...prev,
          [groupId]: [optionId],
        };
      }

      if (current.length >= maxSelect) {
        return prev;
      }

      return {
        ...prev,
        [groupId]: [...current, optionId],
      };
    });
  };

  const buildSelectedOptions = (): CartItemOption[] => {
    const selected: CartItemOption[] = [];

    optionGroups.forEach((group) => {
      const selectedIds = selectedOptions[group.id] || [];

      group.options?.forEach((option) => {
        if (selectedIds.includes(option.id)) {
          selected.push({
            name: option.name,
            price: Number(option.price || 0),
          });
        }
      });
    });

    return selected;
  };

  const validateRequiredGroups = () => {
    for (const group of optionGroups) {
      const selectedIds = selectedOptions[group.id] || [];

      if (group.required && selectedIds.length < (group.min_select || 1)) {
        alert(`Selecione pelo menos ${group.min_select || 1} opção(ões) em "${group.name}".`);
        return false;
      }
    }

    return true;
  };

  const getOptionsTotal = () => {
    return buildSelectedOptions().reduce((sum, option) => sum + option.price, 0);
  };

  const handleAddToCart = () => {
    if (!validateRequiredGroups()) return;

    addItem(product, quantity, notes, buildSelectedOptions());
    onClose();
  };

  if (!isOpen) return null;

  const unitTotal = Number(product.price) + getOptionsTotal();
  const finalTotal = unitTotal * quantity;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-2xl h-[95vh] sm:h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="relative shrink-0">
          <img
            src={product.image_url || 'https://placehold.co/800x400?text=Produto'}
            alt={product.name}
            className="w-full h-56 object-cover"
            referrerPolicy="no-referrer"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 rounded-full p-2 shadow"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-gray-600 mt-2">{product.description}</p>
            <p className="text-emerald-700 font-bold text-xl mt-3">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(Number(product.price))}
            </p>
          </div>

          {loadingOptions ? (
            <p className="text-gray-500">Carregando adicionais...</p>
          ) : (
            optionGroups.map((group) => (
              <div key={group.id} className="border rounded-2xl p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-500">
                    {group.required
                      ? `Obrigatório • selecione até ${group.max_select}`
                      : `Opcional • selecione até ${group.max_select}`}
                  </p>
                </div>

                <div className="space-y-2">
                  {group.options?.map((option) => {
                    const checked = (selectedOptions[group.id] || []).includes(option.id);

                    return (
                      <label
                        key={option.id}
                        className="flex items-center justify-between border rounded-xl px-3 py-3 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type={group.max_select === 1 ? 'radio' : 'checkbox'}
                            name={group.id}
                            checked={checked}
                            onChange={() =>
                              toggleOption(group.id, option.id, group.max_select || 1)
                            }
                          />
                          <span className="text-gray-800">{option.name}</span>
                        </div>

                        <span className="text-sm font-medium text-emerald-700">
                          {Number(option.price) > 0
                            ? `+ ${new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(Number(option.price))}`
                            : 'Grátis'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div className="border rounded-2xl p-4">
            <label className="block font-semibold text-gray-900 mb-2">
              Observação
            </label>
            <textarea
              placeholder="Ex.: sem cebola, caprichar no molho..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-xl px-3 py-3 min-h-[90px] outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between border rounded-2xl p-4">
            <span className="font-semibold text-gray-900">Quantidade</span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-xl border flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>

              <span className="min-w-8 text-center font-semibold">{quantity}</span>

              <button
                onClick={() => setQuantity((prev) => prev + 1)}
                className="w-10 h-10 rounded-xl border flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-4" />
        </div>

        <div className="shrink-0 border-t bg-white p-4">
          <button
            onClick={handleAddToCart}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-4 font-semibold"
          >
            Adicionar ao carrinho •{' '}
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(finalTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}