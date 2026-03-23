import { Link, useLocation, Navigate } from "react-router-dom";

type SuccessState = {
  orderNumber?: number;
  customerName?: string;
};

export function Success() {
  const location = useLocation();
  const state = (location.state || {}) as SuccessState;

  if (!state.orderNumber) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm border p-8 text-center">
        <div className="text-5xl mb-4">✅</div>

        <h1 className="text-3xl font-bold text-gray-900">
          Pedido realizado com sucesso!
        </h1>

        <p className="text-gray-600 mt-3">
          {state.customerName
            ? `${state.customerName}, seu pedido foi enviado para o restaurante.`
            : "Seu pedido foi enviado para o restaurante."}
        </p>

        <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
          <p className="text-sm text-emerald-700 font-medium">
            Número do seu pedido
          </p>
          <p className="text-4xl font-bold text-emerald-700 mt-2">
            #{state.orderNumber}
          </p>
        </div>

        <p className="text-sm text-gray-500 mt-5">
          Guarde esse número para acompanhar o atendimento.
        </p>

        <Link
          to="/"
          className="inline-flex mt-8 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-semibold"
        >
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  );
}