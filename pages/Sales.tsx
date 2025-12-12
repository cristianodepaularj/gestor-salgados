import React, { useState } from 'react';
import { Recipe, Sale, SaleItem, PaymentMethod } from '../types';
import { ShoppingCart, Minus, Plus, Trash, CheckCircle } from 'lucide-react';

interface SalesProps {
  recipes: Recipe[];
  onAddSale: (sale: Sale) => void;
  ingredients: any[]; // To check costs when calculating profit
}

export const Sales: React.FC<SalesProps> = ({ recipes, onAddSale, ingredients }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amountGiven, setAmountGiven] = useState<string>('');

  const addToCart = (recipe: Recipe) => {
    const existing = cart.find(item => item.recipeId === recipe.id);
    
    // Calculate current cost dynamically for accurate profit tracking
    let cost = 0;
    recipe.items.forEach(item => {
        // Robust comparison
        const ing = ingredients.find(i => String(i.id) === String(item.ingredientId));
        if(ing) cost += item.quantity * ing.pricePerUnit;
    });
    cost = (cost + recipe.indirectCosts) / recipe.yieldAmount;

    if (existing) {
      setCart(cart.map(item => 
        item.recipeId === recipe.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { 
          recipeId: recipe.id, 
          quantity: 1, 
          unitPrice: recipe.sellingPrice,
          costPrice: cost
      }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.recipeId === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setCart(newCart);
  };

  const total = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const totalCost = cart.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0);
  const estimatedProfit = total - totalCost;

  const handleCheckout = () => {
    onAddSale({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: cart,
      total,
      paymentMethod,
      profit: estimatedProfit
    });
    setCart([]);
    setIsCheckingOut(false);
    setAmountGiven('');
  };

  const change = amountGiven ? Number(amountGiven) - total : 0;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] gap-4">
      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto pr-2">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Nova Venda</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recipes.map(recipe => (
            <button 
              key={recipe.id}
              onClick={() => addToCart(recipe)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-300 hover:shadow-md transition-all text-left flex flex-col justify-between h-32"
            >
              <span className="font-semibold text-gray-800 line-clamp-2">{recipe.name}</span>
              <span className="text-brand-600 font-bold">R$ {recipe.sellingPrice.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full md:w-96 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl flex justify-between items-center">
          <h3 className="font-bold text-gray-700 flex items-center">
            <ShoppingCart size={20} className="mr-2" /> Carrinho
          </h3>
          <span className="text-sm text-gray-500">{cart.length} itens</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">Carrinho vazio</div>
          ) : (
            cart.map(item => {
              const recipe = recipes.find(r => r.id === item.recipeId);
              return (
                <div key={item.recipeId} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{recipe?.name}</div>
                    <div className="text-xs text-gray-500">R$ {item.unitPrice.toFixed(2)} un</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.recipeId, -1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Minus size={14}/></button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.recipeId, 1)} className="p-1 bg-brand-100 text-brand-700 rounded hover:bg-brand-200"><Plus size={14}/></button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">Total</span>
            <span className="text-2xl font-bold text-brand-600">R$ {total.toFixed(2)}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsCheckingOut(true)}
            className="w-full py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-brand-500/20 shadow-lg"
          >
            Finalizar Venda
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckingOut && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-center">Pagamento</h3>
            
            <div className="grid grid-cols-2 gap-2 mb-6">
              {Object.values(PaymentMethod).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-3 rounded-lg text-sm font-medium border transition-colors ${
                    paymentMethod === method 
                      ? 'bg-brand-50 border-brand-500 text-brand-700' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {paymentMethod === PaymentMethod.CASH && (
              <div className="mb-6 bg-gray-50 p-4 rounded-xl">
                <label className="block text-sm text-gray-500 mb-1">Valor Recebido</label>
                <div className="flex items-center gap-2 mb-2">
                   <span className="text-gray-500">R$</span>
                   <input 
                    type="number" 
                    className="flex-1 bg-white border border-gray-300 rounded-lg p-2 text-lg font-bold"
                    placeholder="0.00"
                    value={amountGiven}
                    onChange={(e) => setAmountGiven(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Troco:</span>
                  <span className={`font-bold ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    R$ {change > 0 ? change.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setIsCheckingOut(false)} 
                className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCheckout}
                disabled={paymentMethod === PaymentMethod.CASH && change < 0}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};