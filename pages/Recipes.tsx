import React, { useState } from 'react';
import { Recipe, Ingredient, Unit, RecipeItem } from '../types';
import { Plus, Trash2, Calculator, Info, Edit2, Check } from 'lucide-react';

interface RecipesProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  onAddRecipe: (recipe: Recipe) => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
  onProduce: (recipe: Recipe, amount: number) => void;
}

const RecipeCard: React.FC<{
  recipe: Recipe;
  ingredients: Ingredient[];
  onEdit: (r: Recipe) => void;
  onDelete: (id: string) => void;
  onProduce: (r: Recipe, amount: number) => void;
}> = ({ recipe, ingredients, onEdit, onDelete, onProduce }) => {
  const [batchAmount, setBatchAmount] = useState(1);
  const [justProduced, setJustProduced] = useState(false);

  const calculateCosts = () => {
    let directCost = 0;
    recipe.items?.forEach(item => {
      const ing = ingredients.find(i => i.id === item.ingredientId);
      if (ing) {
        directCost += item.quantity * ing.pricePerUnit;
      }
    });
    const totalCost = directCost + (recipe.indirectCosts || 0);
    const costPerUnit = recipe.yieldAmount && recipe.yieldAmount > 0 ? totalCost / recipe.yieldAmount : 0;
    return { totalCost, costPerUnit };
  };

  const { totalCost, costPerUnit } = calculateCosts();
  const profit = (recipe.sellingPrice || 0) - costPerUnit;
  const margin = recipe.sellingPrice ? (profit / recipe.sellingPrice) * 100 : 0;

  const handleProduceClick = () => {
     if (batchAmount <= 0) return;
     onProduce(recipe, batchAmount);
     setJustProduced(true);
     setTimeout(() => setJustProduced(false), 2000);
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col h-full">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-800 group-hover:text-brand-600 transition-colors">{recipe.name}</h3>
          <p className="text-sm text-gray-500">Rende: {recipe.yieldAmount} {recipe.yieldUnit}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(recipe)} className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
            <Edit2 size={18} />
          </button>
          <button onClick={() => onDelete(recipe.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 mb-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-gray-50 p-2 rounded-md text-center">
                <span className="text-xs text-gray-500 block">Custo Unit</span>
                <span className="font-bold text-gray-800">R$ {costPerUnit.toFixed(2)}</span>
            </div>
            <div className="bg-green-50 p-2 rounded-md text-center">
                <span className="text-xs text-green-600 block">Venda</span>
                <span className="font-bold text-green-700">R$ {recipe.sellingPrice.toFixed(2)}</span>
            </div>
             <div className="bg-brand-50 p-2 rounded-md text-center">
                <span className="text-xs text-brand-600 block">Lucro</span>
                <span className={`font-bold ${profit > 0 ? 'text-brand-700' : 'text-red-500'}`}>R$ {profit.toFixed(2)}</span>
            </div>
        </div>
      </div>

      <div className="border-t pt-3 mt-auto">
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center bg-gray-50 rounded-lg p-1">
                <span className="text-xs text-gray-500 px-2 font-medium">Qtd:</span>
                <input 
                    type="number" 
                    min="1"
                    className="w-12 bg-white border border-gray-200 rounded text-center text-sm py-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    value={batchAmount}
                    onChange={(e) => setBatchAmount(Number(e.target.value))}
                />
            </div>
            <button 
                onClick={handleProduceClick}
                className={`flex-1 text-sm px-3 py-2 rounded-lg flex items-center justify-center font-medium transition-all ${
                    justProduced 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
            >
                {justProduced ? (
                    <><Check size={16} className="mr-1.5" /> Produzido!</>
                ) : (
                    <><Calculator size={16} className="mr-1.5" /> Produzir</>
                )}
            </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
            Baixa automática de estoque: {batchAmount} batelada(s)
        </p>
      </div>
    </div>
  );
};

export const Recipes: React.FC<RecipesProps> = ({ recipes, ingredients, onAddRecipe, onUpdateRecipe, onDeleteRecipe, onProduce }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
    name: '',
    yieldAmount: 1,
    yieldUnit: 'unidades',
    items: [],
    indirectCosts: 0,
    sellingPrice: 0,
    preparationTimeMinutes: 30
  });

  // Helper to calculate costs live (for the modal)
  const calculateModalCosts = (recipe: Partial<Recipe>) => {
    let directCost = 0;
    recipe.items?.forEach(item => {
      const ing = ingredients.find(i => i.id === item.ingredientId);
      if (ing) {
        directCost += item.quantity * ing.pricePerUnit;
      }
    });
    const totalCost = directCost + (recipe.indirectCosts || 0);
    const costPerUnit = recipe.yieldAmount && recipe.yieldAmount > 0 ? totalCost / recipe.yieldAmount : 0;
    return { totalCost, costPerUnit };
  };

  const handleAddItem = () => {
    if (!ingredients.length) return alert("Cadastre insumos no Estoque primeiro!");
    setNewRecipe({
      ...newRecipe,
      items: [...(newRecipe.items || []), { ingredientId: ingredients[0].id, quantity: 0 }]
    });
  };

  const updateItem = (index: number, field: keyof RecipeItem, value: any) => {
    const newItems = [...(newRecipe.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setNewRecipe({ ...newRecipe, items: newItems });
  };

  const handleEdit = (recipe: Recipe) => {
    setNewRecipe(JSON.parse(JSON.stringify(recipe))); // Deep copy
    setEditingId(recipe.id);
    setIsModalOpen(true);
  };

  const saveRecipe = () => {
    if (!newRecipe.name || !newRecipe.items?.length) return;
    
    if (editingId) {
       onUpdateRecipe({
           ...newRecipe,
           id: editingId,
       } as Recipe);
    } else {
       onAddRecipe({
           ...newRecipe,
           id: Date.now().toString(),
       } as Recipe);
    }
    
    setIsModalOpen(false);
    setEditingId(null);
    setNewRecipe({ name: '', yieldAmount: 1, yieldUnit: 'unidades', items: [], indirectCosts: 0, sellingPrice: 0, preparationTimeMinutes: 30 });
  };

  const { totalCost, costPerUnit } = calculateModalCosts(newRecipe);
  const profit = (newRecipe.sellingPrice || 0) - costPerUnit;
  const margin = newRecipe.sellingPrice ? (profit / newRecipe.sellingPrice) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Receitas & Custos</h2>
        <button 
          onClick={() => {
              setEditingId(null);
              setNewRecipe({ name: '', yieldAmount: 1, yieldUnit: 'unidades', items: [], indirectCosts: 0, sellingPrice: 0, preparationTimeMinutes: 30 });
              setIsModalOpen(true);
          }}
          className="bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-600"
        >
          <Plus size={18} className="mr-2" /> Nova Receita
        </button>
      </div>

      {isModalOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-brand-100 animate-fade-in relative">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Receita' : 'Cadastrar Nova Receita'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Receita</label>
              <input 
                type="text" 
                className="w-full border p-2 rounded-lg"
                value={newRecipe.name}
                onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rendimento</label>
                    <input 
                        type="number" 
                        className="w-full border p-2 rounded-lg"
                        value={newRecipe.yieldAmount}
                        onChange={(e) => setNewRecipe({...newRecipe, yieldAmount: Number(e.target.value)})}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                    <select 
                        className="w-full border p-2 rounded-lg"
                        value={newRecipe.yieldUnit}
                        onChange={(e) => setNewRecipe({...newRecipe, yieldUnit: e.target.value})}
                    >
                        <option value="unidades">Unidades</option>
                        <option value="kg">Kg</option>
                        <option value="porcoes">Porções</option>
                    </select>
                </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Ingredientes</label>
              <button onClick={handleAddItem} className="text-sm text-brand-600 font-medium">+ Adicionar Insumo</button>
            </div>
            
            {/* Header Row Updated to match request */}
            <div className="grid grid-cols-12 gap-2 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">
                <div className="col-span-4 md:col-span-4">Insumo</div>
                <div className="col-span-4 md:col-span-4 text-center">Valor Compra | Peso Compra</div>
                <div className="col-span-2 text-center">Qte Utilizada</div>
                <div className="col-span-2 text-right">Custo Real</div>
            </div>

            <div className="space-y-2">
                {newRecipe.items?.map((item, idx) => {
                    const selectedIng = ingredients.find(i => i.id === item.ingredientId);
                    const lineCost = selectedIng ? (selectedIng.pricePerUnit * item.quantity) : 0;
                    
                    return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg text-sm group">
                        {/* 1. Insumo Name */}
                        <div className="col-span-4 md:col-span-4">
                            <select 
                            className="w-full border-none bg-transparent p-0 focus:ring-0 font-medium text-gray-800 text-sm truncate"
                            value={item.ingredientId}
                            onChange={(e) => updateItem(idx, 'ingredientId', e.target.value)}
                            >
                            {ingredients.map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.name}</option>
                            ))}
                            </select>
                        </div>

                        {/* 2. Purchase Info (Read Only) */}
                        <div className="col-span-4 md:col-span-4 text-xs text-brand-700 bg-brand-50 rounded py-1 px-2 text-center flex flex-col md:flex-row justify-center items-center md:gap-1">
                            {selectedIng ? (
                                selectedIng.lastPackagePrice && selectedIng.lastPackageSize ? (
                                    <>
                                        <span className="font-bold">R$ {selectedIng.lastPackagePrice.toFixed(2)}</span>
                                        <span className="text-gray-400 hidden md:inline">|</span>
                                        <span>{selectedIng.lastPackageSize} {selectedIng.unit}</span>
                                    </>
                                ) : (
                                   <span>(Cadastre a emb. no estoque)</span>
                                )
                            ) : <span>-</span>}
                        </div>

                        {/* 3. Quantity Input */}
                        <div className="col-span-2 flex items-center justify-center relative">
                            <input 
                            type="number" 
                            className="w-full border border-gray-300 rounded px-1 py-1 text-center bg-white focus:border-brand-500 focus:outline-none"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                            step="0.001"
                            />
                            <div className="absolute right-0 top-0 h-full flex items-center pr-1 pointer-events-none">
                                <span className="text-[10px] text-gray-400">{selectedIng?.unit}</span>
                            </div>
                        </div>

                        {/* 4. Real Cost (Calculated) */}
                        <div className="col-span-2 text-right font-bold text-gray-800 flex justify-end items-center gap-1">
                             <span>R$ {lineCost.toFixed(2)}</span>
                             <button 
                                onClick={() => {
                                    const newItems = [...(newRecipe.items || [])];
                                    newItems.splice(idx, 1);
                                    setNewRecipe({...newRecipe, items: newItems});
                                }}
                                className="text-gray-300 hover:text-red-500 ml-1"
                             >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                )})}
            </div>
            {newRecipe.items?.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    Nenhum ingrediente adicionado.
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-brand-50 p-6 rounded-xl border border-brand-100">
             <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Custos Indiretos (Gás/Luz/Emb)</label>
                    <input 
                        type="number" 
                        className="w-full border p-2 rounded-lg"
                        value={newRecipe.indirectCosts}
                        onChange={(e) => setNewRecipe({...newRecipe, indirectCosts: Number(e.target.value)})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Venda (Un)</label>
                    <input 
                        type="number" 
                        className="w-full border p-2 rounded-lg border-brand-200 bg-white font-bold text-green-700"
                        value={newRecipe.sellingPrice}
                        onChange={(e) => setNewRecipe({...newRecipe, sellingPrice: Number(e.target.value)})}
                    />
                 </div>
             </div>

             <div className="flex flex-col justify-center space-y-2 bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Custo Total da Batelada:</span>
                    <span className="font-bold text-gray-800">R$ {totalCost.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-gray-200 my-1"></div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Custo Unitário:</span>
                    <span className="font-bold text-gray-800">R$ {costPerUnit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Lucro Unitário:</span>
                    <span className={`font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {profit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Margem:</span>
                    <span className={`font-bold ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>{margin.toFixed(1)}%</span>
                </div>
             </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={saveRecipe} className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-bold shadow-md shadow-brand-200">
                {editingId ? 'Atualizar Receita' : 'Salvar Receita'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recipes.map(recipe => (
          <RecipeCard 
            key={recipe.id} 
            recipe={recipe} 
            ingredients={ingredients}
            onEdit={handleEdit}
            onDelete={onDeleteRecipe}
            onProduce={onProduce}
          />
        ))}
      </div>
    </div>
  );
};