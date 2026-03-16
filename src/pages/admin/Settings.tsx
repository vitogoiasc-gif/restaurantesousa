import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  defaultBusinessHours,
  normalizeBusinessHours,
  weekDays,
} from "../../lib/restaurantStatus";

export function Settings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("admin_authenticated");

    if (auth !== "true") {
      navigate("/admin");
      return;
    }

    fetchSettings();
  }, [navigate]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("restaurant_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      alert("Erro ao carregar configurações");
      setLoading(false);
      return;
    }

    setSettings({
      ...data,
      accepting_orders: data?.accepting_orders ?? true,
      automatic_schedule_enabled: data?.automatic_schedule_enabled ?? false,
      business_hours: normalizeBusinessHours(data?.business_hours),
    });

    setLoading(false);
  };

  const uploadImage = async (file: File, field: string) => {
    const fileName = Date.now() + "-" + file.name;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);

    if (error) {
      alert("Erro ao enviar imagem");
      return;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    setSettings((prev: any) => ({
      ...prev,
      [field]: data.publicUrl,
    }));
  };

  const updateBusinessHour = (
    dayKey: number,
    field: "enabled" | "open" | "close",
    value: boolean | string
  ) => {
    setSettings((prev: any) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [dayKey]: {
          ...prev.business_hours[dayKey],
          [field]: value,
        },
      },
    }));
  };

  const resetDefaultHours = () => {
    setSettings((prev: any) => ({
      ...prev,
      business_hours: defaultBusinessHours,
    }));
  };

  const saveSettings = async () => {
    const payload = {
      ...settings,
      accepting_orders: settings.accepting_orders ?? true,
      automatic_schedule_enabled: settings.automatic_schedule_enabled ?? false,
      business_hours: settings.business_hours ?? defaultBusinessHours,
    };

    const { error } = await supabase
      .from("restaurant_settings")
      .update(payload)
      .eq("id", settings.id);

    if (error) {
      alert("Erro ao salvar configurações");
      return;
    }

    alert("Configurações atualizadas!");
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-6">
          Configurações do Restaurante
        </h1>

        <div className="space-y-4">
          <input
            value={settings.name || ""}
            onChange={(e) =>
              setSettings({ ...settings, name: e.target.value })
            }
            placeholder="Nome do restaurante"
            className="w-full border p-3 rounded-xl"
          />

          <input
            value={settings.phone || ""}
            onChange={(e) =>
              setSettings({ ...settings, phone: e.target.value })
            }
            placeholder="Telefone"
            className="w-full border p-3 rounded-xl"
          />

          <input
            value={settings.address || ""}
            onChange={(e) =>
              setSettings({ ...settings, address: e.target.value })
            }
            placeholder="Endereço"
            className="w-full border p-3 rounded-xl"
          />

          <input
            value={settings.opening_hours || ""}
            onChange={(e) =>
              setSettings({ ...settings, opening_hours: e.target.value })
            }
            placeholder="Texto do horário (ex: Seg a Dom • 18h às 23h)"
            className="w-full border p-3 rounded-xl"
          />

          <div className="border rounded-xl p-4 bg-gray-50">
            <p className="font-semibold mb-2">Controle manual</p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.accepting_orders ?? true}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    accepting_orders: e.target.checked,
                  })
                }
                className="w-5 h-5"
              />
              <span>
                {settings.accepting_orders
                  ? "Aceitando pedidos manualmente"
                  : "Fechado manualmente"}
              </span>
            </label>

            <p className="text-sm text-gray-500 mt-2">
              Mesmo com horário automático ligado, se esse campo estiver desmarcado,
              o restaurante ficará fechado.
            </p>
          </div>

          <div className="border rounded-xl p-4 bg-gray-50">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="font-semibold">Horário automático</p>
                <p className="text-sm text-gray-500">
                  O sistema abre e fecha sozinho com base nos dias e horários.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.automatic_schedule_enabled ?? false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      automatic_schedule_enabled: e.target.checked,
                    })
                  }
                  className="w-5 h-5"
                />
                <span>
                  {settings.automatic_schedule_enabled ? "Ligado" : "Desligado"}
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={resetDefaultHours}
              className="mb-4 px-4 py-2 rounded-xl border"
            >
              Restaurar horários padrão
            </button>

            <div className="space-y-3">
              {weekDays.map((day) => {
                const dayConfig = settings.business_hours?.[day.key];

                return (
                  <div
                    key={day.key}
                    className="border rounded-xl p-4 bg-white"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="w-full md:w-48 font-medium">
                        {day.label}
                      </div>

                      <label className="flex items-center gap-2 min-w-[110px]">
                        <input
                          type="checkbox"
                          checked={dayConfig?.enabled ?? false}
                          onChange={(e) =>
                            updateBusinessHour(day.key, "enabled", e.target.checked)
                          }
                        />
                        <span>Aberto</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Abre</span>
                        <input
                          type="time"
                          value={dayConfig?.open || "18:00"}
                          onChange={(e) =>
                            updateBusinessHour(day.key, "open", e.target.value)
                          }
                          className="border rounded-xl px-3 py-2"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Fecha</span>
                        <input
                          type="time"
                          value={dayConfig?.close || "23:00"}
                          onChange={(e) =>
                            updateBusinessHour(day.key, "close", e.target.value)
                          }
                          className="border rounded-xl px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Logo</p>

            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file, "logo_url");
              }}
            />

            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo do restaurante"
                className="w-32 mt-3"
              />
            )}
          </div>

          <div>
            <p className="font-semibold mb-2">Banner</p>

            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file, "banner_url");
              }}
            />

            {settings.banner_url && (
              <img
                src={settings.banner_url}
                alt="Banner do restaurante"
                className="w-full mt-3 rounded-xl"
              />
            )}
          </div>

          <button
            onClick={saveSettings}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl"
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}