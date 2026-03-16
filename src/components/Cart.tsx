import { useState } from "react";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useCartStore } from "../store/cartStore";
import { getRestaurantStatus, normalizeBusinessHours } from "../lib/restaurantStatus";

type CartProps = {
  isOpen: boolean;
  onClose: () => void;
  isRestaurantOpen: boolean;
};

export function Cart({ isOpen, onClose, isRestaurantOpen }: CartProps) {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const total = useCartStore((state) => state.getTotal());

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFinishOrder = async () => {
    if (!isRestaurantOpen) {
      alert("No momento o restaurante está fechado para pedidos.");
      return;
    }

    if (items.length === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }

    if (!customerName.trim()) {
      alert("Digite seu nome.");
      return;
    }

    if (!customerPhone.trim()) {
      alert("Digite seu telefone.");
      return;
    }

    if (!customerAddress.trim()) {
      alert("Digite seu endereço.");
      return;
    }

    try {
      setLoading(true);

      const { data: restaurantSettings, error: settingsError } = await supabase
        .from("restaurant_settings")
        .select("accepting_orders, automatic_schedule_enabled, business_hours")
        .limit(1)
        .single();

      if (settingsError) {
        console.error("Erro ao verificar status do restaurante:", settingsError);
        alert("Erro ao verificar se o restaurante está aceitando pedidos.");
        return;
      }

      const currentRestaurantStatus = getRestaurantStatus({
        ...restaurantSettings,
        accepting_orders: restaurantSettings?.accepting_orders ?? true,
        automatic_schedule_enabled:
          restaurantSettings?.automatic_schedule_enabled ?? false,
        business_hours: normalizeBusinessHours(restaurantSettings?.business_hours),
      });

      if (!currentRestaurantStatus.isOpen) {
        alert("No momento o restaurante está fechado para pedidos.");
        return;
      }

      const subtotal = total;
      const orderTotal = total;

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          notes,
          status: "novo",
          subtotal,
          total: orderTotal,
        })
        .select()
        .single();

      if (orderError) {
        console.error("Erro ao criar pedido:", orderError);
        alert("Erro ao criar pedido.");
        return;
      }

      const orderItemsPayload = items.map((item) => {
        const optionsTotal =
          item.selectedOptions?.reduce((sum, option) => sum + option.price, 0) || 0;

        return {
          order_id: orderData.id,
          product_id: item.product.id,
          product_name: item.product.name,
          unit_price: Number(item.product.price) + optionsTotal,
          quantity: item.quantity,
          notes: item.notes || null,
        };
      });

      const { data: insertedItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsPayload)
        .select();

      if (itemsError || !insertedItems) {
        console.error("Erro ao salvar itens do pedido:", itemsError);
        alert("Pedido criado, mas houve erro ao salvar os itens.");
        return;
      }

      const optionsPayload: {
        order_item_id: string;
        option_name: string;
        option_price: number;
      }[] = [];

      insertedItems.forEach((insertedItem, index) => {
        const cartItem = items[index];

        cartItem.selectedOptions?.forEach((option) => {
          optionsPayload.push({
            order_item_id: insertedItem.id,
            option_name: option.name,
            option_price: option.price,
          });
        });
      });

      if (optionsPayload.length > 0) {
        const { error: optionsError } = await supabase
          .from("order_item_options")
          .insert(optionsPayload);

        if (optionsError) {
          console.error("Erro ao salvar adicionais:", optionsError);
          alert("Pedido salvo, mas houve erro ao salvar os adicionais.");
          return;
        }
      }

      alert("Pedido realizado com sucesso!");

      clearCart();
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert("Erro inesperado ao finalizar pedido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Seu carrinho</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isRestaurantOpen && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              No momento o restaurante está fechado para pedidos.
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">
              Seu carrinho está vazio.
            </p>
          ) : (
            <>
              {items.map((item, index) => {
                const optionsTotal =
                  item.selectedOptions?.reduce((sum, option) => sum + option.price, 0) || 0;

                const unitPrice = Number(item.product.price) + optionsTotal;

                return (
                  <div
                    key={`${item.product.id}-${index}`}
                    className="border rounded-2xl p-4"
                  >
                    <div className="flex gap-3">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-20 h-20 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.product.name}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(unitPrice)}
                        </p>

                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.selectedOptions.map((option, optionIndex) => (
                              <p
                                key={`${option.name}-${optionIndex}`}
                                className="text-xs text-gray-500"
                              >
                                + {option.name}
                                {option.price > 0
                                  ? ` (${new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(option.price)})`
                                  : ""}
                              </p>
                            ))}
                          </div>
                        )}

                        {item.notes && (
                          <p className="text-xs text-gray-500 mt-2">
                            Obs: {item.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity - 1)
                              }
                              className="p-1 rounded-lg border hover:bg-gray-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <span className="min-w-6 text-center">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity + 1)
                              }
                              className="p-1 rounded-lg border hover:bg-gray-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="border rounded-2xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Dados para entrega
                </h3>

                <input
                  type="text"
                  placeholder="Seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <input
                  type="text"
                  placeholder="Seu telefone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full border rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <input
                  type="text"
                  placeholder="Seu endereço"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full border rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <textarea
                  placeholder="Observação do pedido (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[90px]"
                />
              </div>
            </>
          )}
        </div>

        <div className="border-t p-4 space-y-4">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(total)}
            </span>
          </div>

          <button
            onClick={handleFinishOrder}
            disabled={loading || items.length === 0 || !isRestaurantOpen}
            className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Enviando pedido..."
              : isRestaurantOpen
              ? "Finalizar pedido"
              : "Pedidos indisponíveis"}
          </button>
        </div>
      </div>
    </div>
  );
}