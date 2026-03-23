import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export function Login() {
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  const handleEnter = (e: FormEvent) => {
    e.preventDefault();

    if (!adminPassword) {
      setErrorMessage("Senha do painel não configurada no arquivo .env");
      return;
    }

    if (password === adminPassword) {
      localStorage.setItem("admin_authenticated", "true");
      navigate("/admin/dashboard");
      return;
    }

    setErrorMessage("Senha incorreta.");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Painel do Restaurante
          </h1>
          <p className="text-gray-500 mt-2">
            Digite a senha para entrar no modo administrador
          </p>
        </div>

        <form onSubmit={handleEnter} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              placeholder="Digite a senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage("");
              }}
              className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {errorMessage && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3 font-semibold transition-colors"
          >
            Entrar no painel
          </button>
        </form>
      </div>
    </div>
  );
}