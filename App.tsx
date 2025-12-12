import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Recipes } from './pages/Recipes';
import { Inventory } from './pages/Inventory';
import { Purchases } from './pages/Purchases';
import { Sales } from './pages/Sales';
import { AdminPanel } from './pages/AdminPanel'; // New Page
import { Page, Ingredient, Recipe, Sale, Purchase, UserProfile } from './types';
import { storageService } from './services/storageService';
import { ChefHat, Loader2, Lock, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  
  // App State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  
  // Login/Register State
  const [isRegistering, setIsRegistering] = useState(false); // Toggle Login/Register Mode
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Novo campo
  const [phone, setPhone] = useState('');       // Novo campo
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState<any>(null);
  
  // Subscription State
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // 1. Gerenciar Sessão de Usuário
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        checkSubscriptionAndLoad(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
          setUser(session.user);
          checkSubscriptionAndLoad(session.user);
      } else {
          setUser(null);
          setProfile(null);
          setCurrentPage('login');
          setIngredients([]);
          setRecipes([]);
          setSales([]);
          setPurchases([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Verifica Assinatura antes de carregar dados
  const checkSubscriptionAndLoad = async (currentUser: any) => {
      setIsDataLoading(true);
      
      // REGRA DO DONO: Acesso Total Imediato
      const isOwner = currentUser.email === 'cristianospaula1972@gmail.com';

      // Fetch Profile
      let { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      // AUTO-SYNC: Se o perfil existe mas não tem nome/telefone, tenta pegar do Auth Metadata
      if (profileData && (!profileData.full_name || !profileData.phone)) {
          const metaName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.user_metadata?.display_name;
          const metaPhone = currentUser.user_metadata?.phone;

          if (metaName || metaPhone) {
              const updates: any = {};
              if (!profileData.full_name && metaName) updates.full_name = metaName;
              if (!profileData.phone && metaPhone) updates.phone = metaPhone;

              const { data: updatedProfile } = await supabase
                  .from('profiles')
                  .update(updates)
                  .eq('id', currentUser.id)
                  .select()
                  .single();
              
              if (updatedProfile) profileData = updatedProfile;
          }
      }
      
      if (profileData) {
          // Se for o dono, forçamos is_admin = true localmente para garantir acesso
          const userProfile = isOwner 
            ? { ...profileData, is_admin: true, subscription_status: 'active' } 
            : profileData;

          setProfile(userProfile as UserProfile);
          
          const isExpired = userProfile.subscription_expires_at 
            ? new Date(userProfile.subscription_expires_at) < new Date() 
            : false;
          
          // Se não for admin (e não for o dono), verifica bloqueio
          if (!userProfile.is_admin && (userProfile.subscription_status === 'blocked' || isExpired)) {
              setIsDataLoading(false);
              return; // Stop loading data (Blocked)
          }
          
          // Load Data
          setCurrentPage('dashboard');
          fetchData(currentUser.id);
      } else {
          // Fallback se perfil não existir (ex: erro no trigger, ou primeira vez)
          // Tenta criar perfil na hora se não existir (failsafe)
          const metaName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
          const metaPhone = currentUser.user_metadata?.phone || '';
          
          if (isOwner) {
            setProfile({ 
                id: currentUser.id, 
                email: currentUser.email, 
                full_name: metaName,
                phone: metaPhone,
                is_admin: true, 
                subscription_status: 'active', 
                subscription_expires_at: '' 
            } as any);
          }
          fetchData(currentUser.id); 
          setCurrentPage('dashboard');
      }
  };

  const fetchData = async (userId: string) => {
      // (Mantém a lógica de fetch existente)
      try {
          // --- INGREDIENTES ---
          const { data: ingData } = await supabase.from('ingredients').select('*');
          if (ingData) {
              setIngredients(ingData.map((i: any) => ({
                  id: String(i.id),
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

          // --- RECEITAS ---
          const { data: recData } = await supabase.from('recipes').select('*');
          if (recData) {
              setRecipes(recData.map((r: any) => ({
                  id: String(r.id),
                  name: r.name,
                  items: r.items || [], 
                  yieldAmount: Number(r.yield_amount || 0),
                  yieldUnit: r.yield_unit || 'unidades',
                  sellingPrice: Number(r.selling_price || 0),
                  indirectCosts: Number(r.indirect_costs || 0),
                  preparationTimeMinutes: Number(r.preparation_time_minutes || 0)
              })));
          }

          // --- VENDAS ---
          const { data: saleData } = await supabase.from('sales').select('*');
          if (saleData) {
              setSales(saleData.map((s: any) => ({
                  id: String(s.id),
                  date: s.date,
                  items: s.items || [],
                  total: Number(s.total || 0),
                  paymentMethod: s.payment_method || 'Dinheiro',
                  profit: Number(s.profit || 0)
              })));
          }

          // --- COMPRAS ---
          const { data: purchData } = await supabase.from('purchases').select('*');
          if (purchData) {
              setPurchases(purchData.map((p: any) => ({
                  id: String(p.id),
                  date: p.date,
                  items: p.items || [],
                  total: Number(p.total || 0),
                  notes: p.notes
              })));
          }

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

  const handleSignUp = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validação Básica
      if(!fullName.trim()) { setAuthError('O Nome é obrigatório.'); return; }
      if(!phone.trim()) { setAuthError('O Telefone é obrigatório.'); return; }
      if(!email.trim()) { setAuthError('O E-mail é obrigatório.'); return; }
      if(password.length < 6) { setAuthError('Senha deve ter no mínimo 6 dígitos.'); return; }

      setIsLoading(true);
      setAuthError('');

      // 1. Criar usuário na Auth
      const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
              data: {
                  full_name: fullName,
                  phone: phone,
                  display_name: fullName // Sync with standard supabase field
              }
          } 
      });

      if (error) {
          setAuthError('Erro ao criar: ' + error.message);
          setIsLoading(false);
          return;
      }

      // 2. Atualizar tabela de Profiles com dados extras (Garantia)
      if (data.user) {
         // Pequeno delay para garantir que o trigger de criação do profile rodou (se houver)
         setTimeout(async () => {
             const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: fullName, phone: phone })
                .eq('id', data.user!.id);
                
             if(profileError) {
                 // Se falhar update (ex: row não existe), tenta insert manual se trigger falhou
                 console.warn("Update falhou, tentando insert manual se necessário...");
             }
         }, 1000);
         
         alert('Conta criada com sucesso! Verifique seu e-mail para confirmar.');
         setIsRegistering(false); // Volta para login
      }
      
      setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Data Handlers (CRUD) ---
  // (Mantém todos os handlers existentes: handleAddIngredient, handleUpdateIngredient, etc.)
  
  // INGREDIENTES
  const handleAddIngredient = async (ing: Ingredient) => {
    if (!user) return;
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
    const { data, error } = await supabase.from('ingredients').insert(payload).select().single();
    if (!error && data) setIngredients([...ingredients, { ...ing, id: String(data.id) }]);
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
    if (!error) setIngredients(ingredients.map(i => i.id === ing.id ? ing : i));
  };

  const handleDeleteIngredient = async (id: string) => {
    if (window.confirm("Tem certeza?")) {
        const { error } = await supabase.from('ingredients').delete().eq('id', id);
        if (!error) setIngredients(ingredients.filter(i => i.id !== id));
    }
  };

  // RECEITAS
  const handleAddRecipe = async (recipe: Recipe) => {
    if (!user) return;
    const payload = {
        user_id: user.id,
        name: recipe.name,
        items: recipe.items,
        yield_amount: recipe.yieldAmount,
        yield_unit: recipe.yieldUnit,
        selling_price: recipe.sellingPrice,
        indirect_costs: recipe.indirectCosts,
        preparation_time_minutes: recipe.preparationTimeMinutes
    };
    const { data, error } = await supabase.from('recipes').insert(payload).select().single();
    if (!error && data) setRecipes([...recipes, { ...recipe, id: String(data.id) }]);
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

  // PRODUÇÃO
  const handleProduceRecipe = async (recipe: Recipe, batch: number) => {
      const result = storageService.deductStockForProduction(recipe, batch, ingredients);
      if (result.success) {
          const updates = result.ingredients.filter(newIng => {
              const oldIng = ingredients.find(i => i.id === newIng.id);
              return oldIng && oldIng.currentStock !== newIng.currentStock;
          });
          for (const ing of updates) {
              await supabase.from('ingredients').update({ 
                  current_stock: ing.currentStock,
                  updated_at: new Date().toISOString()
              }).eq('id', ing.id);
          }
          setIngredients(result.ingredients);
          alert(`Produção registrada! Estoque atualizado.`);
      } else {
          alert("Erro: Estoque insuficiente.");
      }
  };

  // COMPRAS
  const handleAddPurchase = async (purchase: Purchase) => {
    if (!user) return;
    const payload = { 
        user_id: user.id,
        date: purchase.date,
        total: purchase.total,
        items: purchase.items,
        notes: purchase.notes
    };
    const { data: purchaseData, error } = await supabase.from('purchases').insert(payload).select().single();
    if (purchaseData && !error) {
        setPurchases([...purchases, { ...purchase, id: String(purchaseData.id) }]);
        const updatedIngredients = storageService.processPurchase(purchase, ingredients);
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
    if (window.confirm("Excluir compra?")) {
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
          setSales([...sales, { ...sale, id: String(data.id) }]); 
          alert("Venda registrada na nuvem!");
      }
  };

  // --- SUBSCRIPTION CHECK RENDER ---
  const isExpired = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) < new Date() : false;

  // Bloqueio apenas se NÃO for admin e estiver vencido/bloqueado
  if (user && profile && !profile.is_admin && (profile.subscription_status === 'blocked' || isExpired)) {
      return (
          <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border-4 border-red-100">
                  <div className="flex justify-center mb-6">
                      <div className="bg-red-100 p-6 rounded-full text-red-600 animate-pulse">
                          <Lock size={64} />
                      </div>
                  </div>
                  <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Acesso Bloqueado</h1>
                  <p className="text-gray-500 mb-6 font-medium">
                      Sua assinatura mensal (R$ 10,99) venceu ou está pendente.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-xl text-left text-sm text-gray-600 mb-6 border border-gray-100">
                      <p className="flex items-start gap-2 mb-2">
                          <AlertTriangle className="text-orange-500 shrink-0" size={16} />
                          <span>Seus dados (receitas, vendas) estão <b>seguros</b>, mas você não pode acessá-los até regularizar.</span>
                      </p>
                      <p className="font-bold text-gray-800 mt-3">Para liberar:</p>
                      <p>1. Faça o Pix de R$ 10,99</p>
                      <p>2. Envie o comprovante para o suporte.</p>
                  </div>

                  <button 
                    onClick={handleLogout} 
                    className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                  >
                      Sair / Trocar Conta
                  </button>
              </div>
          </div>
      );
  }

  // --- Render Login / Register ---
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
          <p className="text-center text-gray-500 mb-8">
              {isRegistering ? 'Criar Nova Conta' : 'Login Nuvem (SaaS)'}
          </p>
          
          <form onSubmit={isRegistering ? handleSignUp : handleLogin} className="space-y-4">
            
            {isRegistering && (
                <>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo (Display Name)</label>
                    <input 
                        type="text" required
                        className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        value={fullName} onChange={e => setFullName(e.target.value)}
                        placeholder="Ex: Ana Salgados"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (Whatsapp)</label>
                    <input 
                        type="tel" required
                        className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        value={phone} onChange={e => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                    />
                    </div>
                </>
            )}

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
              {isLoading ? <Loader2 className="animate-spin" /> : (isRegistering ? 'Confirmar Cadastro' : 'Entrar')}
            </button>
            
            <div className="pt-2">
                {isRegistering ? (
                    <button 
                        type="button" 
                        onClick={() => { setIsRegistering(false); setAuthError(''); }}
                        className="w-full flex items-center justify-center text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                        <ArrowLeft size={16} className="mr-1"/> Voltar ao Login
                    </button>
                ) : (
                    <button 
                        type="button" 
                        onClick={() => { setIsRegistering(true); setAuthError(''); }}
                        className="w-full bg-white text-brand-600 border border-brand-200 py-3 rounded-lg font-bold hover:bg-brand-50 transition-colors"
                    >
                    Criar Conta Nova
                    </button>
                )}
            </div>
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
      
      {currentPage === 'admin' && <AdminPanel />}

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
              <div className="space-y-4 text-gray-600">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="font-bold text-blue-800 text-sm uppercase mb-1">Status da Assinatura</p>
                    <p className="flex items-center gap-2">
                        {profile?.subscription_status === 'active' 
                         ? <span className="text-green-600 font-bold flex items-center"><CheckCircle className="mr-1" size={16}/> Ativa</span> 
                         : <span className="text-red-500 font-bold">Bloqueada</span>}
                    </p>
                    <p className="text-sm mt-1">Vence em: {profile?.subscription_expires_at ? new Date(profile.subscription_expires_at).toLocaleDateString() : 'Indefinido'}</p>
                </div>

                <div>
                    <p><span className="font-bold">Nome:</span> {profile?.full_name || 'Não informado'}</p>
                    <p><span className="font-bold">E-mail:</span> {user?.email}</p>
                    <p><span className="font-bold">Telefone:</span> {profile?.phone || 'Não informado'}</p>
                    <p className="mt-2"><span className="font-bold">ID do Cliente:</span> <span className="text-xs bg-gray-100 p-1 rounded font-mono">{user?.id}</span></p>
                    {profile?.is_admin && <p className="text-xs text-brand-600 font-bold mt-1">⭐ Acesso Owner/Admin</p>}
                </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default App;