import React, { useEffect, useState } from 'react';
import { LayoutDashboard, ChefHat, ShoppingCart, Package, DollarSign, Settings, Menu, X, Shield } from 'lucide-react';
import { Page } from '../types';
import { supabase } from '../services/supabase';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Regra do Dono: Hardcoded email check
        if (user.email === 'cristianospaula1972@gmail.com') {
            setIsAdmin(true);
            return;
        }

        const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
        if (data && data.is_admin) setIsAdmin(true);
    }
  };

  const NavItem = ({ page, icon: Icon, label }: { page: Page; icon: any; label: string }) => {
    const isActive = currentPage === page;
    return (
      <button
        onClick={() => {
          onNavigate(page);
          setIsMobileMenuOpen(false);
        }}
        className={`flex items-center w-full px-4 py-3 mb-1 rounded-xl transition-colors ${
          isActive 
            ? 'bg-brand-500 text-white shadow-md' 
            : 'text-gray-600 hover:bg-brand-50'
        }`}
      >
        <Icon size={20} className="mr-3" />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 flex items-center justify-center border-b border-gray-100">
          <div className="bg-brand-500 text-white p-2 rounded-lg mr-2">
            <ChefHat size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">GestorPro</h1>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <NavItem page="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem page="sales" icon={DollarSign} label="Vendas" />
          <NavItem page="recipes" icon={ChefHat} label="Receitas" />
          <NavItem page="inventory" icon={Package} label="Estoque" />
          <NavItem page="purchases" icon={ShoppingCart} label="Compras" />
          <div className="my-4 border-t border-gray-100"></div>
          {isAdmin && (
              <div className="mb-2">
                <NavItem page="admin" icon={Shield} label="Admin SaaS" />
              </div>
          )}
          <NavItem page="settings" icon={Settings} label="Configurações" />
        </nav>
        <div className="p-4 border-t border-gray-100">
           <button onClick={onLogout} className="w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">Sair do Sistema</button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <main className="flex-1 flex flex-col h-full w-full relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm h-16 flex items-center justify-between px-4 z-20">
          <div className="flex items-center">
             <div className="bg-brand-500 text-white p-1.5 rounded-lg mr-2">
                <ChefHat size={20} />
             </div>
             <span className="font-bold text-lg text-gray-800">GestorPro</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full h-[calc(100%-4rem)] bg-white z-30 p-4 shadow-lg md:hidden overflow-y-auto">
             <nav className="flex flex-col space-y-2">
                <NavItem page="dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem page="sales" icon={DollarSign} label="Vendas" />
                <NavItem page="recipes" icon={ChefHat} label="Receitas" />
                <NavItem page="inventory" icon={Package} label="Estoque" />
                <NavItem page="purchases" icon={ShoppingCart} label="Compras" />
                {isAdmin && <NavItem page="admin" icon={Shield} label="Admin SaaS" />}
                <NavItem page="settings" icon={Settings} label="Configurações" />
                <button onClick={onLogout} className="mt-8 w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium">Sair</button>
             </nav>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
           {children}
        </div>
      </main>
    </div>
  );
};