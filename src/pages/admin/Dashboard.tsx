import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  ClipboardList,
  Package,
  LayoutGrid,
  Settings,
  Store,
  Clock3,
  CheckCircle2,
  Bike,
  XCircle,
  ChefHat,
  BellRing,
  Wallet,
  TrendingUp,
  CalendarDays,
  RefreshCw,
  Phone,
  MapPin,
  Search,
} from "lucide-react";

type OrderItemOption = {
  id: string;
  order_item_id: string;
  option_name: string;
  option_price: number;
  created_at?: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  notes: string | null;
  created_at?: string;
  options?: OrderItemOption[];
};

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  status: string;
  subtotal: number;
  total: number;
  created_at: string;
  items?: OrderItem[];
};

type FilterTab =
  | "todos"
  | "novo"
  | "confirmado"
  | "em preparo"
  | "saiu para entrega"
  | "finalizado"
  | "cancelado";

const statusOptions = [
  "novo",
  "confirmado",
  "em preparo",
  "saiu para entrega",
  "finalizado",
  "cancelado",
];

export function Dashboard() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const knownOrderIdsRef = useRef<string[]>([]);
  const firstLoadRef = useRef(true);
  const alertTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("admin_authenticated");

    if (isAuthenticated !== "true") {
      navigate("/admin");
      return;
    }

    fetchOrders(true);
  }, [navigate]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        () => {
          fetchOrders(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_item_options",
        },
        () => {
          fetchOrders(false);
        }
      )
      .subscribe();

    return () => {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, []);

  const playNewOrderSound = () => {
    try {
      const audioContext = new window.AudioContext();
      const notes = [880, 988, 1046];

      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime + index * 0.18
        );

        gainNode.gain.setValueAtTime(
          0.001,
          audioContext.currentTime + index * 0.18
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.15,
          audioContext.currentTime + index * 0.18 + 0.02
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + index * 0.18 + 0.16
        );

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(audioContext.currentTime + index * 0.18);
        oscillator.stop(audioContext.currentTime + index * 0.18 + 0.18);
      });
    } catch (error) {
      console.error("Erro ao tocar som:", error);
    }
  };

  const fetchOrders = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Erro ao buscar pedidos:", ordersError);
        return;
      }

      const loadedOrders: Order[] = ordersData || [];

      if (loadedOrders.length === 0) {
        setOrders([]);
        knownOrderIdsRef.current = [];
        if (isInitialLoad) setLoading(false);
        return;
      }

      const orderIds = loadedOrders.map((order) => order.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error("Erro ao buscar itens dos pedidos:", itemsError);
        return;
      }

      const loadedItems: OrderItem[] = itemsData || [];

      let loadedOptions: OrderItemOption[] = [];

      if (loadedItems.length > 0) {
        const itemIds = loadedItems.map((item) => item.id);

        const { data: optionsData, error: optionsError } = await supabase
          .from("order_item_options")
          .select("*")
          .in("order_item_id", itemIds)
          .order("created_at", { ascending: true });

        if (optionsError) {
          console.error("Erro ao buscar adicionais dos itens:", optionsError);
          return;
        }

        loadedOptions = optionsData || [];
      }

      const itemsWithOptions: OrderItem[] = loadedItems.map((item) => ({
        ...item,
        options: loadedOptions.filter(
          (option) => option.order_item_id === item.id
        ),
      }));

      const ordersWithItems: Order[] = loadedOrders.map((order) => ({
        ...order,
        items: itemsWithOptions.filter((item) => item.order_id === order.id),
      }));

      const currentOrderIds = ordersWithItems.map((order) => order.id);
      const previousOrderIds = knownOrderIdsRef.current;

      if (!isInitialLoad && !firstLoadRef.current) {
        const newIds = currentOrderIds.filter(
          (id) => !previousOrderIds.includes(id)
        );

        if (newIds.length > 0) {
          playNewOrderSound();
          setNewOrderAlert(true);

          if (alertTimeoutRef.current) {
            window.clearTimeout(alertTimeoutRef.current);
          }

          alertTimeoutRef.current = window.setTimeout(() => {
            setNewOrderAlert(false);
          }, 5000);
        }
      }

      setOrders(ordersWithItems);
      knownOrderIdsRef.current = currentOrderIds;
      firstLoadRef.current = false;
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value || 0));
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const normalizePhoneForWhatsApp = (phone: string) => {
    const digits = (phone || "").replace(/\D/g, "");

    if (!digits) return "";

    if (digits.startsWith("55")) {
      return digits;
    }

    return `55${digits}`;
  };

  const buildWhatsAppMessage = (order: Order) => {
    const itemsText =
      order.items && order.items.length > 0
        ? order.items
            .map((item) => {
              const optionsText =
                item.options && item.options.length > 0
                  ? `\n  Adicionais: ${item.options
                      .map((option) => option.option_name)
                      .join(", ")}`
                  : "";

              const notesText = item.notes ? `\n  Obs: ${item.notes}` : "";

              return `• ${item.quantity}x ${item.product_name}${optionsText}${notesText}`;
            })
            .join("\n")
        : "• Itens não encontrados";

    const orderNotesText = order.notes
      ? `\nObservação do pedido: ${order.notes}`
      : "";

    return `Olá, ${order.customer_name}! Seu pedido #${order.order_number} saiu para entrega e está a caminho. 🚚

Pedido #${order.order_number}
Cliente: ${order.customer_name}
Telefone: ${order.customer_phone}
Endereço: ${order.customer_address}

Itens:
${itemsText}

Total: ${formatCurrency(Number(order.total || 0))}${orderNotesText}

Obrigado por comprar com a gente!`;
  };

  const sendWhatsAppDeliveryMessage = (order: Order) => {
    const phone = normalizePhoneForWhatsApp(order.customer_phone);

    if (!phone) {
      alert("Não foi possível abrir o WhatsApp porque o telefone do cliente está inválido.");
      return;
    }

    const message = buildWhatsAppMessage(order);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, "_blank");
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);

      const order = orders.find((item) => item.id === orderId);

      if (!order) {
        alert("Pedido não encontrado.");
        return;
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Erro ao atualizar status do pedido.");
        return;
      }

      const updatedOrder = { ...order, status: newStatus };

      setOrders((prev) =>
        prev.map((currentOrder) =>
          currentOrder.id === orderId
            ? { ...currentOrder, status: newStatus }
            : currentOrder
        )
      );

      if (newStatus === "saiu para entrega") {
        sendWhatsAppDeliveryMessage(updatedOrder);
      }
    } catch (error) {
      console.error("Erro inesperado ao atualizar status:", error);
      alert("Erro inesperado ao atualizar status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin");
  };

  const isSameDay = (dateString: string) => {
    const orderDate = new Date(dateString);
    const now = new Date();

    return (
      orderDate.getDate() === now.getDate() &&
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getFullYear() === now.getFullYear()
    );
  };

  const todayOrders = useMemo(() => {
    return orders.filter((order) => isSameDay(order.created_at));
  }, [orders]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const todayTotalOrders = todayOrders.length;

    const newOrders = orders.filter((order) => order.status === "novo").length;
    const preparingOrders = orders.filter(
      (order) => order.status === "em preparo"
    ).length;
    const deliveryOrders = orders.filter(
      (order) => order.status === "saiu para entrega"
    ).length;
    const finishedOrders = orders.filter(
      (order) => order.status === "finalizado"
    ).length;
    const canceledOrders = orders.filter(
      (order) => order.status === "cancelado"
    ).length;

    const todayNewOrders = todayOrders.filter(
      (order) => order.status === "novo"
    ).length;

    const todayRevenue = todayOrders
      .filter((order) => order.status !== "cancelado")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const totalRevenue = orders
      .filter((order) => order.status !== "cancelado")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    return {
      totalOrders,
      todayTotalOrders,
      newOrders,
      preparingOrders,
      deliveryOrders,
      finishedOrders,
      canceledOrders,
      todayNewOrders,
      todayRevenue,
      totalRevenue,
      confirmedOrders: orders.filter((order) => order.status === "confirmado")
        .length,
    };
  }, [orders, todayOrders]);

  const tabCounts = useMemo(() => {
    return {
      todos: orders.length,
      novo: orders.filter((order) => order.status === "novo").length,
      confirmado: orders.filter((order) => order.status === "confirmado").length,
      "em preparo": orders.filter((order) => order.status === "em preparo")
        .length,
      "saiu para entrega": orders.filter(
        (order) => order.status === "saiu para entrega"
      ).length,
      finalizado: orders.filter((order) => order.status === "finalizado").length,
      cancelado: orders.filter((order) => order.status === "cancelado").length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (activeTab !== "todos") {
      result = result.filter((order) => order.status === activeTab);
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (normalizedSearch) {
      result = result.filter((order) => {
        const orderNumber = String(order.order_number || "").toLowerCase();
        const customerName = order.customer_name?.toLowerCase() || "";
        const customerPhone = order.customer_phone?.toLowerCase() || "";
        const customerAddress = order.customer_address?.toLowerCase() || "";

        return (
          orderNumber.includes(normalizedSearch) ||
          customerName.includes(normalizedSearch) ||
          customerPhone.includes(normalizedSearch) ||
          customerAddress.includes(normalizedSearch)
        );
      });
    }

    return result;
  }, [orders, activeTab, searchTerm]);

  const recentOrders = filteredOrders.slice(0, 6);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "novo":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "confirmado":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "em preparo":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "saiu para entrega":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "finalizado":
        return "bg-green-50 text-green-700 border-green-200";
      case "cancelado":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "novo", label: "Novos" },
    { key: "confirmado", label: "Confirmados" },
    { key: "em preparo", label: "Em preparo" },
    { key: "saiu para entrega", label: "Entrega" },
    { key: "finalizado", label: "Finalizados" },
    { key: "cancelado", label: "Cancelados" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {newOrderAlert && (
          <div className="bg-emerald-600 text-white rounded-2xl px-5 py-4 shadow-lg flex items-center gap-3 animate-pulse">
            <BellRing className="w-5 h-5" />
            <span className="font-semibold">Novo pedido recebido!</span>
          </div>
        )}

        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-2">
                Painel Administrativo
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Restaurante Sousa
              </h1>
              <p className="text-emerald-50/90 mt-3 max-w-2xl">
                Acompanhe pedidos, resultados do dia e os atalhos principais do
                restaurante em um só lugar.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/")}
                className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-2xl px-4 py-3 font-semibold flex items-center gap-2"
              >
                <Store className="w-4 h-4" />
                Ver cardápio
              </button>

              <button
                onClick={handleLogout}
                className="bg-emerald-800/40 hover:bg-emerald-800/60 border border-white/20 text-white rounded-2xl px-4 py-3 font-semibold"
              >
                Sair do painel
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Pedidos de hoje</span>
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-3">
              {stats.todayTotalOrders}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {stats.todayNewOrders} novo(s) hoje
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Faturamento de hoje</span>
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-3">
              {formatCurrency(stats.todayRevenue)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Pedidos cancelados não entram
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Em preparo</span>
              <ChefHat className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-3">
              {stats.preparingOrders}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Pedidos sendo preparados agora
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Saiu para entrega</span>
              <Bike className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-3">
              {stats.deliveryOrders}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Pedidos em rota de entrega
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white rounded-3xl border shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Resumo operacional
                </h2>
                <p className="text-gray-500 mt-1">
                  Visão rápida da operação atual do restaurante.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total de pedidos</span>
                  <ClipboardList className="w-5 h-5 text-gray-700" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.totalOrders}
                </p>
              </div>

              <div className="rounded-2xl border p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Novos</span>
                  <Clock3 className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.newOrders}
                </p>
              </div>

              <div className="rounded-2xl border p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Confirmados</span>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.confirmedOrders}
                </p>
              </div>

              <div className="rounded-2xl border p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Finalizados</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.finishedOrders}
                </p>
              </div>

              <div className="rounded-2xl border p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Cancelados</span>
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.canceledOrders}
                </p>
              </div>

              <div className="rounded-2xl border p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Faturamento total</span>
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow-sm p-5 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Ações rápidas
            </h2>
            <p className="text-gray-500 mt-1 mb-5">
              Acesse as áreas mais usadas do sistema.
            </p>

            <div className="grid gap-4">
              <button
                onClick={() => navigate("/admin/products")}
                className="bg-gray-50 border rounded-2xl p-4 text-left hover:shadow-sm transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">Produtos</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Cadastre, edite e organize o cardápio.
                </p>
              </button>

              <button
                onClick={() => navigate("/admin/categories")}
                className="bg-gray-50 border rounded-2xl p-4 text-left hover:shadow-sm transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">Categorias</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Organize a ordem e a estrutura do menu.
                </p>
              </button>

              <button
                onClick={() => navigate("/admin/settings")}
                className="bg-gray-50 border rounded-2xl p-4 text-left hover:shadow-sm transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">Configurações</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Logo, banner, horários e dados do restaurante.
                </p>
              </button>

              <button
                onClick={() => navigate("/")}
                className="bg-gray-50 border rounded-2xl p-4 text-left hover:shadow-sm transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-700 flex items-center justify-center mb-3">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">Cardápio público</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Veja como o cliente está vendo a loja.
                </p>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-5 sm:p-6">
          <div className="flex flex-col gap-4 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Pedidos</h2>
                <p className="text-gray-500 mt-1">
                  Filtre por status e busque pedidos rapidamente.
                </p>
              </div>

              <button
                onClick={() => fetchOrders(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl px-4 py-2 font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar lista
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium border transition-all ${
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label} ({tabCounts[tab.key]})
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone, endereço ou número do pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded-2xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="border rounded-2xl p-8 text-center text-gray-500">
              Carregando pedidos...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="border rounded-2xl p-8 text-center text-gray-500">
              Nenhum pedido encontrado com esse filtro.
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-2xl p-4 sm:p-5 bg-gray-50"
                >
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.customer_name}
                        </h3>

                        <span
                          className={`text-xs px-3 py-1 rounded-full border font-medium ${getStatusBadgeClass(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
                        <div className="rounded-2xl bg-white border p-3">
                          <p>
                            <strong>Pedido:</strong> #{order.order_number}
                          </p>
                          <p className="mt-2 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {order.customer_phone}
                          </p>
                          <p className="mt-2 flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span>{order.customer_address}</span>
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white border p-3">
                          <p>
                            <strong>Total:</strong>{" "}
                            {formatCurrency(Number(order.total || 0))}
                          </p>
                          <p className="mt-2">
                            <strong>Criado em:</strong>{" "}
                            {formatDateTime(order.created_at)}
                          </p>
                          {order.notes && (
                            <p className="mt-2">
                              <strong>Observação:</strong> {order.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="bg-white border rounded-2xl p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Itens do pedido
                        </h4>

                        {!order.items || order.items.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            Nenhum item encontrado neste pedido.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="border rounded-xl p-3"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {item.quantity}x {item.product_name}
                                    </p>

                                    <p className="text-sm text-emerald-700 mt-1">
                                      {formatCurrency(Number(item.unit_price || 0))}{" "}
                                      cada
                                    </p>

                                    {item.notes && (
                                      <p className="text-sm text-gray-500 mt-2">
                                        <strong>Obs. do item:</strong> {item.notes}
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-sm font-semibold text-gray-900">
                                    {formatCurrency(
                                      Number(item.unit_price || 0) *
                                        Number(item.quantity || 0)
                                    )}
                                  </div>
                                </div>

                                {item.options && item.options.length > 0 && (
                                  <div className="mt-3 pl-1">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                      Adicionais
                                    </p>

                                    <div className="space-y-1">
                                      {item.options.map((option) => (
                                        <div
                                          key={option.id}
                                          className="text-sm text-gray-600 flex items-center justify-between"
                                        >
                                          <span>+ {option.option_name}</span>
                                          <span>
                                            {formatCurrency(
                                              Number(option.option_price || 0)
                                            )}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-full xl:w-64">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Atualizar status
                      </label>

                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateOrderStatus(order.id, e.target.value)
                        }
                        disabled={updatingId === order.id}
                        className="w-full border rounded-2xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      {updatingId === order.id && (
                        <p className="text-sm text-gray-500 mt-2">
                          Atualizando status...
                        </p>
                      )}

                      <p className="text-xs text-gray-500 mt-3">
                        Ao marcar como <strong>saiu para entrega</strong>, o
                        WhatsApp do cliente será aberto com a mensagem pronta.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}