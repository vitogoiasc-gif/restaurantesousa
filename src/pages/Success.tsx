import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Utensils } from 'lucide-react';

export function Success() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { orderNumber?: number; customerName?: string } | null;

  if (!state || !state.orderNumber) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-xl p-8 text-center animate-in zoom-in duration-500">
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-100 p-4 rounded-full">
            <CheckCircle className="w-16 h-16 text-emerald-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pedido Confirmado!</h1>
        <p className="text-gray-600 mb-8">
          Obrigado pela preferência, <span className="font-semibold">{state.customerName}</span>. 
          Seu pedido já foi recebido pelo restaurante e logo começará a ser preparado.
        </p>

        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
          <p className="text-sm text-gray-500 uppercase tracking-wider font-medium mb-1">
            Número do Pedido
          </p>
          <p className="text-5xl font-black text-emerald-600">
            #{state.orderNumber}
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para o Cardápio
        </button>
      </div>
    </div>
  );
}
