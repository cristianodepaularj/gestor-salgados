import React, { useState } from 'react';
import { Ingredient, Unit } from '../types';
import { Plus, AlertTriangle, Edit2, Search, Trash2 } from 'lucide-react';

interface InventoryProps {
  ingredients: Ingredient[];
  onAddIngredient: (ing: Ingredient) => void;
  onUpdateIngredient: (ing: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ ingredients, onAddIngredient, onUpdateIngredient, onDeleteIngredient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [form, setForm] = useState<Partial<Ingredient>>({
      name: '',
      unit: Unit.KG,
      currentStock: 0,
      minStockAlert: 1,
      lastPackagePrice: 0,
      lastPackageSize: 1
  });

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Calculate unit price live based on package input
  const calculatedUnitPrice = (form.lastPackagePrice && form.lastPackageSize) 
    ? form.lastPackagePrice / form.lastPackageSize 
    : 0;

  const handleSubmit = () => {
      if(!form.name || !form.lastPackageSize || !form.lastPackagePrice) return;
      
      const ing: Ingredient = {
          id: editingId || Date.now().toString(),
          name: form.name,
          unit: form.unit || Unit.KG,
          // Calculate normalized price automatically
          pricePerUnit: calculatedUnitPrice,
          lastPackagePrice: Number(form.lastPackagePrice),
          lastPackageSize: Number(form.lastPackageSize),
          currentStock: Number(form.currentStock),
          minStockAlert: Number(form.minStockAlert),
          updatedAt: new Date().toISOString()
      };

      if (editingId) {
          onUpdateIngredient(ing);
      } else {
          onAddIngredient(ing);
      }
      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', unit: Unit.KG, currentStock: 0, minStockAlert: 1, lastPackagePrice: 0, lastPackageSize: 1 });
  }

  const openEdit = (ing: Ingredient) => {
      setForm(ing);
      setEditingId(ing.id);
      setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Controle de Estoque</h2>
          <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar insumo..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-xl"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <button 
                onClick={() => { setEditingId(null); resetForm(); setIsModalOpen(true); }}
                className="bg-brand-500 text-white px-4 py-2 rounded-xl hover:bg-brand-600 flex items-center justify-center min-w-fit"
             >
                <Plus size={20} />
             </button>
          </div>
       </div>

       {isModalOpen && (
           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
                   <h3 className="text-xl font-bold mb-4">{editingId ? 'Editar Insumo' : 'Novo Insumo'}</h3>
                   <div className="space-y-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Insumo</label>
                           <input type="text" className="w-full border p-2 rounded-lg" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                       </div>
                       
                       <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                           <h4 className="text-sm font-bold text-brand-800 mb-2 uppercase">Dados da Compra (Embalagem)</h4>
                           <div className="grid grid-cols-2 gap-3 mb-2">
                               <div>
                                   <label className="block text-xs font-medium text-gray-600 mb-1">Preço Pago (R$)</label>
                                   <input 
                                     type="number" 
                                     placeholder="Ex: 18.99" 
                                     className="w-full border p-2 rounded-lg bg-white" 
                                     value={form.lastPackagePrice || ''} 
                                     onChange={e => setForm({...form, lastPackagePrice: Number(e.target.value)})} 
                                   />
                               </div>
                               <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tamanho da Emb.</label>
                                    <input 
                                        type="number" 
                                        placeholder="Ex: 500" 
                                        className="w-full border p-2 rounded-lg bg-white" 
                                        value={form.lastPackageSize || ''} 
                                        onChange={e => setForm({...form, lastPackageSize: Number(e.target.value)})} 
                                    />
                               </div>
                           </div>
                           <div className="mb-2">
                               <label className="block text-xs font-medium text-gray-600 mb-1">Unidade de Medida</label>
                               <select className="w-full border p-2 rounded-lg bg-white" value={form.unit} onChange={e => setForm({...form, unit: e.target.value as Unit})}>
                                   <option value={Unit.KG}>Quilogramas (kg)</option>
                                   <option value={Unit.G}>Gramas (g)</option>
                                   <option value={Unit.L}>Litros (l)</option>
                                   <option value={Unit.ML}>Mililitros (ml)</option>
                                   <option value={Unit.UN}>Unidades (un)</option>
                               </select>
                           </div>
                           <div className="text-right text-xs text-brand-700 font-medium">
                               Custo calculado: R$ {calculatedUnitPrice > 0 ? calculatedUnitPrice.toFixed(4) : '0.00'} / {form.unit}
                           </div>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Atual</label>
                                <input type="number" className="w-full border p-2 rounded-lg" value={form.currentStock} onChange={e => setForm({...form, currentStock: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alerta Mínimo</label>
                                <input type="number" className="w-full border p-2 rounded-lg" value={form.minStockAlert} onChange={e => setForm({...form, minStockAlert: Number(e.target.value)})} />
                            </div>
                       </div>
                   </div>
                   <div className="mt-6 flex justify-end gap-3">
                       <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600">Cancelar</button>
                       <button onClick={handleSubmit} className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600">Salvar</button>
                   </div>
               </div>
           </div>
       )}

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
           <table className="w-full text-left">
               <thead className="bg-gray-50 text-gray-500 text-sm">
                   <tr>
                       <th className="p-4 font-medium">Nome</th>
                       <th className="p-4 font-medium text-center">Emb. Referência</th>
                       <th className="p-4 font-medium text-right">Custo Calc.</th>
                       <th className="p-4 font-medium text-right">Estoque</th>
                       <th className="p-4 font-medium text-center">Ação</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                   {filtered.map(ing => (
                       <tr key={ing.id} className="hover:bg-gray-50">
                           <td className="p-4 font-medium text-gray-800">{ing.name}</td>
                           <td className="p-4 text-center text-sm text-gray-500">
                               {ing.lastPackageSize ? (
                                   <span>{ing.lastPackageSize} {ing.unit} = R$ {ing.lastPackagePrice?.toFixed(2)}</span>
                               ) : (
                                   <span>-</span>
                               )}
                           </td>
                           <td className="p-4 text-right">R$ {ing.pricePerUnit.toFixed(4)} / {ing.unit}</td>
                           <td className="p-4 text-right">
                               <div className="flex flex-col items-end">
                                   <span className={`font-bold ${ing.currentStock <= ing.minStockAlert ? 'text-red-500' : 'text-gray-800'}`}>
                                       {ing.currentStock.toFixed(2)} {ing.unit}
                                   </span>
                                   {ing.currentStock <= ing.minStockAlert && (
                                       <span className="flex items-center text-xs text-red-500">
                                           <AlertTriangle size={12} className="mr-1" /> Baixo
                                       </span>
                                   )}
                               </div>
                           </td>
                           <td className="p-4 text-center">
                               <div className="flex items-center justify-center gap-2">
                                   <button onClick={() => openEdit(ing)} className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                                       <Edit2 size={18} />
                                   </button>
                                   <button onClick={() => onDeleteIngredient(ing.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                       <Trash2 size={18} />
                                   </button>
                               </div>
                           </td>
                       </tr>
                   ))}
               </tbody>
           </table>
           {filtered.length === 0 && <div className="p-8 text-center text-gray-500">Nenhum insumo encontrado.</div>}
       </div>
    </div>
  );
};