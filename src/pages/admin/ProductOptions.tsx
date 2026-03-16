import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type Product = {
  id: string;
  name: string;
};

type OptionGroup = {
  id: string;
  product_id: string;
  name: string;
  required: boolean;
  min_select: number;
  max_select: number;
  created_at?: string;
};

type ProductOption = {
  id: string;
  group_id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at?: string;
};

type GroupWithOptions = OptionGroup & {
  options: ProductOption[];
};

export function ProductOptions() {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [product, setProduct] = useState<Product | null>(null);
  const [groups, setGroups] = useState<GroupWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingOption, setSavingOption] = useState(false);

  const [groupForm, setGroupForm] = useState({
    name: '',
    required: false,
    min_select: '0',
    max_select: '1',
  });

  const [optionForm, setOptionForm] = useState({
    group_id: '',
    name: '',
    price: '',
  });

  useEffect(() => {
    const auth = localStorage.getItem('admin_authenticated');

    if (auth !== 'true') {
      navigate('/admin');
      return;
    }

    if (!productId) {
      navigate('/admin/products');
      return;
    }

    fetchData();
  }, [navigate, productId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', productId)
        .single();

      if (productError || !productData) {
        console.error('Erro ao buscar produto:', productError);
        alert('Produto não encontrado.');
        navigate('/admin/products');
        return;
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (groupsError) {
        console.error('Erro ao buscar grupos:', groupsError);
        alert('Erro ao buscar grupos de adicionais.');
        return;
      }

      const loadedGroups = groupsData || [];

      let loadedOptions: ProductOption[] = [];

      if (loadedGroups.length > 0) {
        const groupIds = loadedGroups.map((group) => group.id);

        const { data: optionsData, error: optionsError } = await supabase
          .from('product_options')
          .select('*')
          .in('group_id', groupIds)
          .order('created_at', { ascending: true });

        if (optionsError) {
          console.error('Erro ao buscar opções:', optionsError);
          alert('Erro ao buscar opções.');
          return;
        }

        loadedOptions = optionsData || [];
      }

      const groupsWithOptions: GroupWithOptions[] = loadedGroups.map((group) => ({
        ...group,
        options: loadedOptions.filter((option) => option.group_id === group.id),
      }));

      setProduct(productData);
      setGroups(groupsWithOptions);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const resetGroupForm = () => {
    setGroupForm({
      name: '',
      required: false,
      min_select: '0',
      max_select: '1',
    });
  };

  const resetOptionForm = () => {
    setOptionForm({
      group_id: '',
      name: '',
      price: '',
    });
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) return;

    if (!groupForm.name.trim()) {
      alert('Digite o nome do grupo.');
      return;
    }

    const minSelect = Number(groupForm.min_select);
    const maxSelect = Number(groupForm.max_select);

    if (Number.isNaN(minSelect) || Number.isNaN(maxSelect)) {
      alert('Mínimo e máximo inválidos.');
      return;
    }

    if (minSelect > maxSelect) {
      alert('O mínimo não pode ser maior que o máximo.');
      return;
    }

    try {
      setSavingGroup(true);

      const { error } = await supabase
        .from('product_option_groups')
        .insert({
          product_id: productId,
          name: groupForm.name.trim(),
          required: groupForm.required,
          min_select: minSelect,
          max_select: maxSelect,
        });

      if (error) {
        console.error('Erro ao criar grupo:', error);
        alert('Erro ao criar grupo.');
        return;
      }

      alert('Grupo criado com sucesso.');
      resetGroupForm();
      fetchData();
    } catch (error) {
      console.error('Erro inesperado ao criar grupo:', error);
      alert('Erro inesperado ao criar grupo.');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!optionForm.group_id) {
      alert('Selecione um grupo.');
      return;
    }

    if (!optionForm.name.trim()) {
      alert('Digite o nome da opção.');
      return;
    }

    const parsedPrice = Number((optionForm.price || '0').replace(',', '.'));

    if (Number.isNaN(parsedPrice)) {
      alert('Preço inválido.');
      return;
    }

    try {
      setSavingOption(true);

      const { error } = await supabase
        .from('product_options')
        .insert({
          group_id: optionForm.group_id,
          name: optionForm.name.trim(),
          price: parsedPrice,
          is_active: true,
        });

      if (error) {
        console.error('Erro ao criar opção:', error);
        alert('Erro ao criar opção.');
        return;
      }

      alert('Opção criada com sucesso.');
      resetOptionForm();
      fetchData();
    } catch (error) {
      console.error('Erro inesperado ao criar opção:', error);
      alert('Erro inesperado ao criar opção.');
    } finally {
      setSavingOption(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const confirmed = window.confirm(
      'Deseja realmente excluir este grupo e todas as opções dele?'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('product_option_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('Erro ao excluir grupo:', error);
        alert('Erro ao excluir grupo.');
        return;
      }

      alert('Grupo excluído com sucesso.');
      fetchData();
    } catch (error) {
      console.error('Erro inesperado ao excluir grupo:', error);
      alert('Erro inesperado ao excluir grupo.');
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    const confirmed = window.confirm('Deseja realmente excluir esta opção?');

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('product_options')
        .delete()
        .eq('id', optionId);

      if (error) {
        console.error('Erro ao excluir opção:', error);
        alert('Erro ao excluir opção.');
        return;
      }

      alert('Opção excluída com sucesso.');
      fetchData();
    } catch (error) {
      console.error('Erro inesperado ao excluir opção:', error);
      alert('Erro inesperado ao excluir opção.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Adicionais do Produto
            </h1>
            <p className="text-gray-600 mt-2">
              {product ? `Produto: ${product.name}` : 'Carregando produto...'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/products')}
              className="bg-white border hover:bg-gray-100 text-gray-800 rounded-2xl px-4 py-3 font-medium"
            >
              Voltar para produtos
            </button>

            <button
              onClick={handleLogout}
              className="bg-white border hover:bg-gray-100 text-gray-800 rounded-2xl px-4 py-3 font-medium"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Novo grupo de adicionais
            </h2>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do grupo
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex.: Escolha seus adicionais"
                  className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="required-group"
                  type="checkbox"
                  checked={groupForm.required}
                  onChange={(e) =>
                    setGroupForm((prev) => ({
                      ...prev,
                      required: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="required-group" className="text-sm text-gray-700">
                  Grupo obrigatório
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={groupForm.min_select}
                    onChange={(e) =>
                      setGroupForm((prev) => ({
                        ...prev,
                        min_select: e.target.value,
                      }))
                    }
                    className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={groupForm.max_select}
                    onChange={(e) =>
                      setGroupForm((prev) => ({
                        ...prev,
                        max_select: e.target.value,
                      }))
                    }
                    className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingGroup}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3 font-semibold disabled:opacity-50"
              >
                {savingGroup ? 'Salvando grupo...' : 'Criar grupo'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Nova opção
            </h2>

            <form onSubmit={handleCreateOption} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grupo
                </label>
                <select
                  value={optionForm.group_id}
                  onChange={(e) =>
                    setOptionForm((prev) => ({
                      ...prev,
                      group_id: e.target.value,
                    }))
                  }
                  className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione um grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da opção
                </label>
                <input
                  type="text"
                  value={optionForm.name}
                  onChange={(e) =>
                    setOptionForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex.: Bacon"
                  className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço adicional
                </label>
                <input
                  type="text"
                  value={optionForm.price}
                  onChange={(e) =>
                    setOptionForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="Ex.: 3.50"
                  className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingOption}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3 font-semibold disabled:opacity-50"
              >
                {savingOption ? 'Salvando opção...' : 'Criar opção'}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Grupos e opções cadastrados
          </h2>

          {loading ? (
            <p className="text-gray-500">Carregando adicionais...</p>
          ) : groups.length === 0 ? (
            <p className="text-gray-500">Nenhum grupo cadastrado para este produto.</p>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group.id} className="border rounded-2xl p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.name}
                      </h3>
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <p>Obrigatório: {group.required ? 'Sim' : 'Não'}</p>
                        <p>Mínimo: {group.min_select}</p>
                        <p>Máximo: {group.max_select}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-2xl px-4 py-2 font-medium"
                    >
                      Excluir grupo
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {group.options.length === 0 ? (
                      <p className="text-sm text-gray-500">Nenhuma opção neste grupo.</p>
                    ) : (
                      group.options.map((option) => (
                        <div
                          key={option.id}
                          className="border rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{option.name}</p>
                            <p className="text-sm text-emerald-700">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(Number(option.price))}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDeleteOption(option.id)}
                            className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-xl px-3 py-2 text-sm font-medium"
                          >
                            Excluir opção
                          </button>
                        </div>
                      ))
                    )}
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