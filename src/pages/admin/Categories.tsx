import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export function Categories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    sort_order: "",
    is_active: true,
  });

  useEffect(() => {
    const auth = localStorage.getItem("admin_authenticated");

    if (auth !== "true") {
      navigate("/admin");
      return;
    }

    fetchCategories();
  }, [navigate]);

  const fetchCategories = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar categorias:", error);
        alert("Erro ao buscar categorias.");
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Erro inesperado ao buscar categorias:", error);
      alert("Erro inesperado ao buscar categorias.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      sort_order: "",
      is_active: true,
    });
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name || "",
      sort_order: String(category.sort_order ?? ""),
      is_active: category.is_active,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (categoryId: string) => {
    const confirmed = window.confirm(
      "Deseja realmente excluir esta categoria?"
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) {
        console.error("Erro ao excluir categoria:", error);
        alert("Erro ao excluir categoria. Verifique se ela está ligada a produtos.");
        return;
      }

      alert("Categoria excluída com sucesso.");
      fetchCategories();
    } catch (error) {
      console.error("Erro inesperado ao excluir categoria:", error);
      alert("Erro inesperado ao excluir categoria.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Digite o nome da categoria.");
      return;
    }

    const parsedSortOrder =
      form.sort_order.trim() === "" ? 0 : Number(form.sort_order);

    if (Number.isNaN(parsedSortOrder)) {
      alert("A ordem deve ser um número.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        sort_order: parsedSortOrder,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          console.error("Erro ao atualizar categoria:", error);
          alert("Erro ao atualizar categoria.");
          return;
        }

        alert("Categoria atualizada com sucesso.");
      } else {
        const { error } = await supabase.from("categories").insert(payload);

        if (error) {
          console.error("Erro ao criar categoria:", error);
          alert("Erro ao criar categoria.");
          return;
        }

        alert("Categoria criada com sucesso.");
      }

      resetForm();
      fetchCategories();
    } catch (error) {
      console.error("Erro inesperado ao salvar categoria:", error);
      alert("Erro inesperado ao salvar categoria.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Categorias</h1>
            <p className="text-gray-600 mt-1">
              Cadastre, edite e organize as categorias do cardápio
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
              onClick={handleLogout}
              className="px-4 py-2 bg-white border rounded-xl"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Editar Categoria" : "Nova Categoria"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nome da categoria"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full border p-3 rounded-xl"
              />

              <input
                type="number"
                placeholder="Ordem de exibição"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sort_order: e.target.value }))
                }
                className="w-full border p-3 rounded-xl"
              />

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                Categoria ativa
              </label>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-xl disabled:opacity-50"
                >
                  {saving
                    ? "Salvando..."
                    : editingId
                    ? "Atualizar Categoria"
                    : "Cadastrar Categoria"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-3 bg-white border rounded-xl"
                >
                  Limpar
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-white p-6 rounded-2xl shadow text-gray-500">
                Carregando categorias...
              </div>
            ) : categories.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl shadow text-gray-500">
                Nenhuma categoria cadastrada.
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white p-4 rounded-2xl shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{category.name}</h3>

                      <p className="text-sm text-gray-500 mt-1">
                        Ordem: {category.sort_order ?? 0}
                      </p>

                      <p className="text-sm mt-2">
                        Status:{" "}
                        <span
                          className={
                            category.is_active
                              ? "text-emerald-700 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {category.is_active ? "Ativa" : "Inativa"}
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => handleEdit(category)}
                        className="px-3 py-1 bg-gray-100 rounded-lg"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => handleDelete(category.id)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}