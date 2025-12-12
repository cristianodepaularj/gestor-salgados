import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Recipes } from './pages/Recipes';
import { Inventory } from './pages/Inventory';
import { Purchases } from './pages/Purchases';
import { Sales } from './pages/Sales';
import { Page, Ingredient, Recipe, Sale, Purchase } from './types';
import { storageService } from './services/storageService';
import { ChefHat, Loader2 } from 'lucide-react';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  
  // App State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState<any>(null);

  // 1. Gerenciar Sessão de Usuário
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setCurrentPage('dashboard');
        fetchData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
          setUser(session.user);
          setCurrentPage('dashboard');
          fetchData(session.user.id);
      } else {
          setUser(null);
          setCurrentPage('login');
          // Limpar dados locais ao deslogar
          setIngredients([]);
          setRecipes([]);
          setSales([]);
          setPurchases([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Função para Carregar Dados do Banco (SELECT) com Mapeamento snake_case -> camelCase
  const fetchData = async (userId: string) => {
      setIsDataLoading(true);
      try {
          // Ingredientes
          const { data: ingData, error: ingError } = await supabase.from('ingredients').select('*');
          if (ingError) console.error("Erro ao carregar estoque:", ingError);
          if (ingData) {
              setIngredients(ingData.map((i: any) => ({
                  id: i.id,
                  name: i.name || 'Sem Nome',
                  unit: i.unit || 'un',
                  pricePerUnit: Number(i.price_per_unit || 0),
                  lastPackagePrice: Number(i.last_package_price || 0),
                  lastPackageSize: Number(i.last_package_size || 1),
                  currentStock: Number(i.current_stock || 0),
                  minStockAlert: Number(i.min_stock_alert || 0),
                  updatedAt: i.updated_at
              })));
          }

          // Receitas
          const { data: recData } = await supabase.from('recipes').select('*');
          if (recData) {
              setRecipes(recData.map((r: any) => ({
                  id: r.id,
                  name: r.name,
                  items: r.items || [], // JSONB array usually stays as is
                  yieldAmount: Number(r.yield_amount || 0),
                  yieldUnit: r.yield_unit,
                  sellingPrice: Number(r.selling_price || 0),
                  indirectCosts: Number(r.indirect_costs || 0),
                  preparationTimeMinutes: Number(r.preparation_time_minutes || 0)
              })));
          }

          // Vendas
          const { data: saleData } = await supabase.from('sales').select('*');
          if (saleData) {
              setSales(saleData.map((s: any) => ({
                  id: s.id,
                  date: s.date,
                  items: s.items || [],
                  total: Number(s.total || 0),
                  paymentMethod: s.payment_method,
                  profit: Number(s.profit || 0)
              })));
          }

          // Compras
          const { data: purchData } = await supabase.from('purchases').select('*');
          if (purchData) setPurchases(purchData); 

      } catch (error) {
          console.error("Erro geral ao baixar dados:", error);
      } finally {
          setIsDataLoading(false);
      }
  };

  // --- Auth Handlers ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        setAuthError('Erro ao entrar. Verifique credenciais.');
        setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
      setIsLoading(true);
      setAuthError('');
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError('Erro ao criar: ' + error.message);
      else alert('Conta criada! Verifique seu e-mail ou tente entrar.');
      setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Data Handlers (CRUD com Supabase e Mapeamento) ---

  // INGREDIENTES
  const handleAddIngredient = async (ing: Ingredient) => {
    if (!user) return;
    
    // Mapeamento Frontend -> DB (camelCase -> snake_case)
    const payload = {
        user_id: user.id,
        name: ing.name,
        unit: ing.unit,
        price_per_unit: ing.pricePerUnit,
        last_package_price: ing.lastPackagePrice,
        last_package_size: ing.lastPackageSize,
        current_stock: ing.currentStock,
        min_stock_alert: ing.minStockAlert,
        updated_at: new Date().toISOString()
    };
    
    // O Supabase retorna os dados como snake_case
    const { data, error } = await supabase.from('ingredients').insert(payload).select().single();
    
    if (error) {
        alert('Erro ao salvar no banco (Verifique se as colunas name/current_stock existem): ' + error.message);
        console.error(error);
    } else if (data) {
        // Mapear de volta para o estado local
        const newIng: Ingredient = {
            id: data.id,
            name: data.name,
            unit: data.unit,
            pricePerUnit: data.price_per_unit,
            lastPackagePrice: data.last_package_price,
            lastPackageSize: data.last_package_size,
            currentStock: data.current_stock,
            minStockAlert: data.min_stock_alert,
            updatedAt: data.updated_at
        };
        setIngredients([...ingredients, newIng]);
    }
  };

  const handleUpdateIngredient = async (ing: Ingredient) => {
    const payload = {
        name: ing.name,
        unit: ing.unit,
        price_per_unit: ing.pricePerUnit,
        last_package_price: ing.lastPackagePrice,
        last_package_size: ing.lastPackageSize,
        current_stock: ing.currentStock,
        min_stock_alert: ing.minStockAlert,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('ingredients').update(payload).eq('id', ing.id);
    if (!error) {
        setIngredients(ingredients.map(i => i.id === ing.id ? ing : i));
    } else {
        alert("Erro ao atualizar: " + error.message);
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (window.confirm("Tem certeza?")) {
        const { error } = await supabase.from('ingredients').delete().eq('id', id);
        if (!error) {
            setIngredients(ingredients.filter(i => i.id !== id));
        } else {
            alert("Erro ao deletar: " + error.message);
        }
    }
  };

  // RECEITAS
  const handleAddRecipe = async (recipe: Recipe) => {
    if (!user) return;
    
    const payload = {
        user_id: user.id,
        name: recipe.name,
        items: recipe.items, // JSONB
        yield_amount: recipe.yieldAmount,
        yield_unit: recipe.yieldUnit,
        selling_price: recipe.sellingPrice,
        indirect_costs: recipe.indirectCosts,
        preparation_time_minutes: recipe.preparationTimeMinutes
    };

    const { data, error } = await supabase.from('recipes').insert(payload).select().single();
    
    if (!error && data) {
        const newRecipe: Recipe = {
            id: data.id,
            name: data.name,
            items: data.items,
            yieldAmount: data.yield_amount,
            yieldUnit: data.yield_unit,
            sellingPrice: data.selling_price,
            indirectCosts: data.indirect_costs,
            preparationTimeMinutes: data.preparation_time_minutes
        };
        setRecipes([...recipes, newRecipe]);
    } else if (error) {
        alert("Erro ao salvar receita: " + error.message);
    }
  };

  const handleUpdateRecipe = async (recipe: Recipe) => {
    const payload = {
        name: recipe.name,
        items: recipe.items,
        yield_amount: recipe.yieldAmount,
        yield_unit: recipe.yieldUnit,
        selling_price: recipe.sellingPrice,
        indirect_costs: recipe.indirectCosts,
        preparation_time_minutes: recipe.preparationTimeMinutes
    };

    const { error } = await supabase.from('recipes').update(payload).eq('id', recipe.id);
    if (!error) setRecipes(recipes.map(r => r.id === recipe.id ? recipe : r));
  };

  const handleDeleteRecipe = async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) setRecipes(recipes.filter(r => r.id !== id));
  };

  const handleProduceRecipe = async (recipe: Recipe, batch: number) => {
      const result = storageService.deductStockForProduction(recipe, batch, ingredients);
      
      if (result.success) {
          const updates = result.ingredients.filter(newIng => {
              const oldIng = ingredients.find(i => i.id === newIng.id);
              return oldIng && oldIng.currentStock !== newIng.currentStock;
          });

          let hasError = false;
          for (const ing of updates) {
              const { error } = await supabase.from('ingredients').update({ 
                  current_stock: ing.currentStock 
              }).eq('id', ing.id);
              
              if (error) {
                  console.error(error);
                  hasError = true;
              }
          }

          if (!hasError) {
              setIngredients(result.ingredients);
              alert(`Produção registrada! Estoque atualizado.`);
          } else {
              alert('Erro ao sincronizar estoque na nuvem.');
          }
      } else {
          alert("Erro: Estoque insuficiente.");
      }
  };

  // COMPRAS
  const handleAddPurchase = async (purchase: Purchase) => {
    if (!user) return;
    
    const payload = { ...purchase, user_id: user.id };
    const { data: purchaseData, error } = await supabase.from('purchases').insert(payload).select().single();
    
    if (error) {
        alert('Erro ao salvar compra: ' + error.message);
        return;
    }

    if (purchaseData) {
        setPurchases([...purchases, purchaseData]);

        const updatedIngredients = storageService.processPurchase(purchaseData, ingredients);
        
        const changedIngredients = updatedIngredients.filter(newIng => {
             const oldIng = ingredients.find(i => i.id === newIng.id);
             return oldIng && (oldIng.currentStock !== newIng.currentStock || oldIng.pricePerUnit !== newIng.pricePerUnit);
        });

        for (const ing of changedIngredients) {
             await supabase.from('ingredients').update({
                 current_stock: ing.currentStock,
                 price_per_unit: ing.pricePerUnit, 
                 last_package_price: ing.lastPackagePrice,
                 last_package_size: ing.lastPackageSize,
                 updated_at: new Date().toISOString()
             }).eq('id', ing.id);
        }
        
        setIngredients(updatedIngredients);
        alert("Compra salva e estoque atualizado na nuvem!");
    }
  };

  const handleDeletePurchase = async (id: string) => {
    if (window.confirm("Excluir compra? (O estoque não será revertido automaticamente)")) {
        const { error } = await supabase.from('purchases').delete().eq('id', id);
        if (!error) setPurchases(purchases.filter(p => p.id !== id));
    }
  };

  // VENDAS
  const handleAddSale = async (sale: Sale) => {
      if (!user) return;
      const payload = { 
          user_id: user.id,
          date: sale.date,
          items: sale.items,
          total: sale.total,
          payment_method: sale.paymentMethod, 
          profit: sale.profit
      };

      const { data, error } = await supabase.from('sales').insert(payload).select().single();
      
      if (!error && data) {
          setSales([...sales, { ...sale, id: data.id }]); 
          alert("Venda registrada na nuvem!");
      } else {
          alert("Erro ao salvar venda: " + (error?.message || ''));
      }
  };

  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex justify-center mb-6 text-brand-500">
            <div className="bg-brand-100 p-4 rounded-full">
               <ChefHat size={48} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Gestor Salgados & Doces</h1>
          <p className="text-center text-gray-500 mb-8">Login Nuvem (SaaS)</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input 
                type="email" required
                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input 
                type="password" required
                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            
            {authError && <div className="text-red-500 text-sm text-center">{authError}</div>}

            <button type="submit" disabled={isLoading} className="w-full bg-brand-500 text-white py-3 rounded-lg font-bold hover:bg-brand-600 transition-colors flex justify-center">
              {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}
            </button>
            
            <button type="button" onClick={handleSignUp} disabled={isLoading} className="w-full bg-white text-brand-600 border border-brand-200 py-3 rounded-lg font-bold hover:bg-brand-50 transition-colors">
              Criar Conta Nova
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage} onLogout={handleLogout}>
      {isDataLoading && (
          <div className="fixed top-0 left-0 w-full h-1 bg-brand-100 z-50">
              <div className="h-full bg-brand-500 animate-pulse w-1/3"></div>
          </div>
      )}
      
      {currentPage === 'dashboard' && <Dashboard sales={sales} purchases={purchases} recipes={recipes} />}
      
      {currentPage === 'recipes' && (
        <Recipes 
            recipes={recipes} 
            ingredients={ingredients} 
            onAddRecipe={handleAddRecipe} 
            onUpdateRecipe={handleUpdateRecipe}
            onDeleteRecipe={handleDeleteRecipe} 
            onProduce={handleProduceRecipe}
        />
      )}
      
      {currentPage === 'inventory' && (
        <Inventory 
            ingredients={ingredients} 
            onAddIngredient={handleAddIngredient}
            onUpdateIngredient={handleUpdateIngredient}
            onDeleteIngredient={handleDeleteIngredient}
        />
      )}
      
      {currentPage === 'purchases' && (
        <Purchases 
            purchases={purchases} 
            ingredients={ingredients}
            onAddPurchase={handleAddPurchase}
            onDeletePurchase={handleDeletePurchase}
        />
      )}
      
      {currentPage === 'sales' && (
          <Sales 
            recipes={recipes} 
            onAddSale={handleAddSale}
            ingredients={ingredients}
          />
      )}
      
      {currentPage === 'settings' && (
          <div className="p-8 max-w-lg mx-auto bg-white rounded-xl shadow-sm mt-8">
              <h2 className="text-xl font-bold mb-4">Minha Conta</h2>
              <div className="space-y-2 text-gray-600">
                <p><span className="font-bold">Usuário:</span> {user?.email}</p>
                <p><span className="font-bold">ID do Cliente:</span> <span className="text-xs bg-gray-100 p-1 rounded font-mono">{user?.id}</span></p>
                <p className="text-sm text-green-600 mt-2 bg-green-50 p-2 rounded">
                    ✓ Seus dados estão seguros na nuvem e isolados de outros usuários.
                </p>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default App;