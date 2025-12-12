import React, { useRef, useState } from 'react';
import { Purchase, Ingredient, PurchaseItem, Unit } from '../types';
import { Camera, Plus, Save, Loader2, FileText, Trash2, X } from 'lucide-react';
import { parseReceiptImage } from '../services/geminiService';

interface PurchasesProps {
  purchases: Purchase[];
  ingredients: Ingredient[];
  onAddPurchase: (purchase: Purchase) => void;
  onDeletePurchase?: (id: string) => void;
}

export const Purchases: React.FC<PurchasesProps> = ({ purchases, ingredients, onAddPurchase, onDeletePurchase }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for viewing details
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  
  const [newPurchase, setNewPurchase] = useState<Partial<Purchase>>({
    date: new Date().toISOString().split('T')[0],
    total: 0,
    items: []
  });

  // Helper to format YYYY-MM-DD to DD/MM/YYYY without timezone shifts
  const formatDateDisplay = (dateString: string) => {
      if (!dateString) return '';
      const parts = dateString.split('-'); // [YYYY, MM, DD]
      if (parts.length !== 3) return dateString;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setIsAdding(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      
      const result = await parseReceiptImage(base64Data);
      
      if (result) {
        // Map OCR items to existing ingredients if possible, or leave blank
        const mappedItems: PurchaseItem[] = result.items.map((item: any) => {
            // Simple string matching
            const match = ingredients.find(ing => ing.name.toLowerCase().includes(item.name.toLowerCase()));
            return {
                ingredientId: match ? match.id : '', // Empty ID means it's just an expense
                tempName: item.name, // To show user what OCR found
                quantity: item.quantity,
                totalPrice: item.totalPrice
            };
        });

        setNewPurchase({
            date: result.date || new Date().toISOString().split('T')[0],
            total: result.total,
            items: mappedItems
        });
      } else {
          alert("Não foi possível ler o cupom. Tente inserir manualmente.");
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
      // Validate
      if (!newPurchase.date || !newPurchase.items?.length) return;
      
      // We no longer require 'unmapped' items to be fixed. 
      // Items without ingredientId are treated as "General Expenses" (Despesas).

      onAddPurchase({
          id: Date.now().toString(),
          ...newPurchase
      } as Purchase);

      setIsAdding(false);
      setNewPurchase({ date: new Date().toISOString().split('T')[0], total: 0, items: [] });
  };

  const getIngredientName = (id: string, tempName?: string) => {
      const ing = ingredients.find(i => i.id === id);
      return ing ? ing.name : (tempName || 'Despesa/Item Diverso');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Compras & Entrada</h2>
        <div className="flex gap-2">
            <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                className="hidden"
                ref={fileInputRef} 
                onChange={handleFileChange}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800"
                disabled={isProcessing}
            >
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Camera className="mr-2" size={20} />}
                Escanear Nota (IA)
            </button>
            <button 
                onClick={() => { setIsAdding(true); setNewPurchase({ date: new Date().toISOString().split('T')[0], total: 0, items: [] }); }}
                className="bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-600"
            >
                <Plus size={20} className="mr-1" /> Manual
            </button>
        </div>
      </div>

      {/* Add Purchase Modal / Panel */}
      {isAdding && (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-brand-100 animate-fade-in">
              <h3 className="text-lg font-bold mb-4">Registrar Compra</h3>
              <p className="text-sm text-gray-500 mb-4">
                  Confira os itens abaixo. Selecione um <b>Insumo</b> apenas se quiser atualizar o estoque. Caso contrário, deixe como "Apenas Despesa".
              </p>
              <div className="flex justify-between mb-4">
                  <input 
                    type="date" 
                    className="border p-2 rounded-lg"
                    value={newPurchase.date}
                    onChange={e => setNewPurchase({...newPurchase, date: e.target.value})}
                  />
                  <div className="text-xl font-bold text-gray-800">Total: R$ {newPurchase.total?.toFixed(2)}</div>
              </div>

              <div className="space-y-3 mb-6">
                  {newPurchase.items?.map((item: any, idx) => (
                      <div key={idx} className={`flex flex-col md:flex-row gap-2 md:items-center p-3 rounded-lg border ${item.ingredientId ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="md:w-1/3">
                              {item.tempName && <div className="text-xs font-bold text-gray-700 mb-1">{item.tempName}</div>}
                              <select 
                                className="w-full border p-2 rounded-lg bg-white"
                                value={item.ingredientId}
                                onChange={(e) => {
                                    const newItems = [...(newPurchase.items || [])];
                                    newItems[idx].ingredientId = e.target.value;
                                    setNewPurchase({...newPurchase, items: newItems});
                                }}
                              >
                                  <option value="">-- Apenas Despesa (Não controla estoque) --</option>
                                  {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                              </select>
                          </div>
                          <div className="flex gap-2 flex-1 items-end">
                             <div className="flex-1">
                                <label className="text-[10px] text-gray-500">Qtd (Emb)</label>
                                <input 
                                    type="number" placeholder="Qtd" className="w-full border p-2 rounded-lg"
                                    value={item.quantity}
                                    onChange={e => {
                                        const newItems = [...(newPurchase.items || [])];
                                        newItems[idx].quantity = Number(e.target.value);
                                        setNewPurchase({...newPurchase, items: newItems});
                                    }}
                                />
                             </div>
                             <div className="flex-1">
                                <label className="text-[10px] text-gray-500">Total (R$)</label>
                                <input 
                                    type="number" placeholder="Total Item R$" className="w-full border p-2 rounded-lg"
                                    value={item.totalPrice}
                                    onChange={e => {
                                        const newItems = [...(newPurchase.items || [])];
                                        newItems[idx].totalPrice = Number(e.target.value);
                                        // Recalc total
                                        const total = newItems.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
                                        setNewPurchase({...newPurchase, items: newItems, total});
                                    }}
                                />
                             </div>
                          </div>
                          <button 
                             onClick={() => {
                                 const newItems = [...(newPurchase.items || [])];
                                 newItems.splice(idx, 1);
                                 setNewPurchase({...newPurchase, items: newItems});
                             }}
                             className="text-red-500 p-2 hover:bg-red-50 rounded"
                          >
                             X
                          </button>
                      </div>
                  ))}
                  <button 
                    onClick={() => setNewPurchase({...newPurchase, items: [...(newPurchase.items || []), { ingredientId: '', quantity: 0, totalPrice: 0 }]})}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-brand-300 hover:text-brand-500"
                  >
                      + Adicionar Item
                  </button>
              </div>

              <div className="flex justify-end gap-3">
                  <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600">Cancelar</button>
                  <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-lg flex items-center hover:bg-green-700">
                      <Save className="mr-2" size={18} /> Salvar Compra
                  </button>
              </div>
          </div>
      )}

      {/* Detail View Modal */}
      {viewingPurchase && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                  <button 
                    onClick={() => setViewingPurchase(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                      <X size={24} />
                  </button>
                  
                  <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                      <FileText size={20} className="text-brand-500"/> Detalhes da Compra
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                      Data: {formatDateDisplay(viewingPurchase.date)}
                  </p>

                  <div className="max-h-[60vh] overflow-y-auto mb-6 border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500">
                              <tr>
                                  <th className="p-3 font-medium">Item</th>
                                  <th className="p-3 font-medium text-center">Tipo</th>
                                  <th className="p-3 font-medium text-center">Qtd</th>
                                  <th className="p-3 font-medium text-right">Valor</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {viewingPurchase.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                      <td className="p-3">
                                          <div className="font-medium text-gray-800">
                                              {getIngredientName(item.ingredientId, item.tempName)}
                                          </div>
                                          {item.tempName && item.ingredientId && item.tempName !== getIngredientName(item.ingredientId) && (
                                              <div className="text-[10px] text-gray-400">Origem: {item.tempName}</div>
                                          )}
                                      </td>
                                      <td className="p-3 text-center">
                                          {item.ingredientId ? (
                                              <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">Estoque</span>
                                          ) : (
                                              <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-medium">Despesa</span>
                                          )}
                                      </td>
                                      <td className="p-3 text-center">{item.quantity}</td>
                                      <td className="p-3 text-right font-medium">R$ {item.totalPrice.toFixed(2)}</td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                              <tr>
                                  <td colSpan={3} className="p-3 text-right font-bold text-gray-600">Total</td>
                                  <td className="p-3 text-right font-bold text-gray-900 text-lg">
                                      R$ {viewingPurchase.total.toFixed(2)}
                                  </td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>

                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => {
                            if (onDeletePurchase) {
                                onDeletePurchase(viewingPurchase.id);
                                setViewingPurchase(null);
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                          <Trash2 size={18} /> Excluir Registro
                      </button>
                      <button 
                        onClick={() => setViewingPurchase(null)}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                      >
                          Fechar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* List of Purchases */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {purchases.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhuma compra registrada.</div>
          ) : (
              <div className="divide-y divide-gray-100">
                  {purchases.slice().reverse().map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => setViewingPurchase(p)}
                        className="p-4 flex justify-between items-center hover:bg-brand-50 cursor-pointer transition-colors group"
                      >
                          <div>
                              <div className="font-medium text-gray-800 flex items-center gap-2">
                                  {formatDateDisplay(p.date)}
                              </div>
                              <div className="text-sm text-gray-500">
                                  {p.items.length} itens 
                                  <span className="text-xs text-gray-400 ml-1">
                                    ({p.items.filter(i => i.ingredientId).length} Estoque / {p.items.filter(i => !i.ingredientId).length} Despesa)
                                  </span>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="font-bold text-gray-900">R$ {p.total.toFixed(2)}</div>
                              <div className="text-xs text-brand-500 opacity-0 group-hover:opacity-100 font-medium mt-1">
                                  Ver detalhes
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};