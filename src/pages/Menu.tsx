import { useState, useEffect } from "react";
import { Search, Clock, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ProductCard } from "../components/ProductCard";
import { ProductModal } from "../components/ProductModal";
import { Cart } from "../components/Cart";
import { CategoryList } from "../components/CategoryList";
import { useCartStore } from "../store/cartStore";
import {
  getRestaurantStatus,
  getTodayHoursLabel,
  normalizeBusinessHours,
} from "../lib/restaurantStatus";

export function Menu() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);

  const [activeCategory, setActiveCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [, setNow] = useState(Date.now());

  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.getTotal());

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const minuteInterval = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => clearInterval(minuteInterval);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("public-menu-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_settings",
        },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: restaurantData } = await supabase
        .from("restaurant_settings")
        .select("*")
        .limit(1)
        .single();

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true);

      setRestaurant({
        ...restaurantData,
        accepting_orders: restaurantData?.accepting_orders ?? true,
        automatic_schedule_enabled:
          restaurantData?.automatic_schedule_enabled ?? false,
        business_hours: normalizeBusinessHours(restaurantData?.business_hours),
      });

      setCategories(categoriesData || []);
      setProducts(productsData || []);

      if (categoriesData?.length) {
        const currentExists = categoriesData.some(
          (category: any) => category.id === activeCategory
        );

        if (!currentExists) {
          setActiveCategory(categoriesData[0].id);
        }
      } else {
        setActiveCategory("");
      }
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchCategory = product.category_id === activeCategory;

    const matchSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return searchQuery ? matchSearch : matchCategory;
  });

  const restaurantStatus = getRestaurantStatus(restaurant);
  const isRestaurantOpen = restaurantStatus.isOpen;
  const todayHoursLabel = getTodayHoursLabel(restaurant?.business_hours);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="relative h-52 bg-emerald-800">
        {restaurant?.banner_url && (
          <img
            src={restaurant.banner_url}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            alt="Banner do restaurante"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

        <div className="absolute bottom-0 p-6 text-white">
          <h1 className="text-3xl font-bold">
            {restaurant?.name || "Restaurante"}
          </h1>

          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-200">
            {restaurant?.opening_hours && (
              <div className="flex items-center gap-1">
                <Clock size={16} />
                {restaurant.opening_hours}
              </div>
            )}

            {!restaurant?.opening_hours && (
              <div className="flex items-center gap-1">
                <Clock size={16} />
                Hoje: {todayHoursLabel}
              </div>
            )}

            {restaurant?.address && (
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                {restaurant.address}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            {isRestaurantOpen ? (
              <span className="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-100 border border-green-300/30">
                🟢 {restaurantStatus.message}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-100 border border-red-300/30">
                🔴 {restaurantStatus.message}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {!isRestaurantOpen && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            No momento o restaurante não está aceitando pedidos.
          </div>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-gray-400" />

          <input
            type="text"
            placeholder="Buscar pratos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded-2xl pl-10 pr-4 py-3"
          />
        </div>

        {!searchQuery && categories.length > 0 && (
          <CategoryList
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        )}

        {loading ? (
          <p className="text-center py-12 text-gray-500">
            Carregando cardápio...
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center">
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-lg flex gap-4"
          >
            Ver carrinho

            <span>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(cartTotal)}
            </span>
          </button>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        isRestaurantOpen={isRestaurantOpen}
      />
    </div>
  );
}