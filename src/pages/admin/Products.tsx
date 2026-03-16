import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
};

export function Products() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [form, setForm] = useState({
    category_id: "",
    name: "",
    description: "",
    price: "",
    image_url: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("admin_authenticated");

    if (auth !== "true") {
      navigate("/admin");
      return;
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    setCategories(categoriesData || []);
    setProducts(productsData || []);
  };

  const uploadImage = async (file: File) => {
    try {
      setUploadingImage(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        alert("Erro ao subir imagem");
        return;
      }

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setForm((prev) => ({
        ...prev,
        image_url: data.publicUrl,
      }));
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      category_id: form.category_id,
      name: form.name,
      description: form.description,
      price: Number(String(form.price).replace(",", ".")),
      image_url: form.image_url,
      is_active: true,
    };

    if (editingId) {
      await supabase.from("products").update(payload).eq("id", editingId);
      alert("Produto atualizado");
    } else {
      await supabase.from("products").insert(payload);
      alert("Produto criado");
    }

    setEditingId(null);

    setForm({
      category_id: "",
      name: "",
      description: "",
      price: "",
      image_url: "",
    });

    fetchData();
  };

  const editProduct = (product: Product) => {
    setEditingId(product.id);

    setForm({
      category_id: product.category_id,
      name: product.name,
      description: product.description,
      price: String(product.price),
      image_url: product.image_url,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Excluir produto?")) return;

    await supabase.from("products").delete().eq("id", id);
    fetchData();
  };

  const logout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin");
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((cat) => cat.id === categoryId)?.name || "Sem categoria";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Produtos</h1>
            <p className="text-gray-600 mt-1">
              Cadastre, edite e organize os produtos do cardápio
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="px-4 py-2 bg-white border rounded-xl"
            >
              Painel
            </button>

            <button
              onClick={logout}
              className="px-4 py-2 bg-white border rounded-xl"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Editar Produto" : "Novo Produto"}
            </h2>

            <form onSubmit={saveProduct} className="space-y-4">
              <select
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                className="w-full border p-3 rounded-xl"
              >
                <option value="">Categoria</option>

                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Nome"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="w-full border p-3 rounded-xl"
              />

              <textarea
                placeholder="Descrição"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full border p-3 rounded-xl"
              />

              <input
                placeholder="Preço"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                className="w-full border p-3 rounded-xl"
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />

              {uploadingImage && (
                <p className="text-sm text-gray-500">Enviando imagem...</p>
              )}

              {form.image_url && (
                <img
                  src={form.image_url}
                  className="w-40 rounded-xl"
                  referrerPolicy="no-referrer"
                />
              )}

              <button className="w-full bg-emerald-600 text-white py-3 rounded-xl">
                {editingId ? "Atualizar Produto" : "Cadastrar Produto"}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white p-4 rounded-2xl shadow flex gap-4"
              >
                <img
                  src={product.image_url || "https://placehold.co/120x120?text=Sem+Foto"}
                  className="w-24 h-24 object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {product.name}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    {getCategoryName(product.category_id)}
                  </p>

                  <p className="text-gray-500 text-sm mt-2">
                    {product.description}
                  </p>

                  <p className="font-semibold text-emerald-700 mt-2">
                    R$ {Number(product.price).toFixed(2)}
                  </p>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() => editProduct(product)}
                      className="px-3 py-1 bg-gray-100 rounded-lg"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        navigate(`/admin/products/${product.id}/options`)
                      }
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200"
                    >
                      Adicionais
                    </button>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded-lg"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <div className="bg-white p-6 rounded-2xl shadow text-gray-500">
                Nenhum produto cadastrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}