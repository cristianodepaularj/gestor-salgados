import React, { useMemo, useState, useEffect } from 'react';
import { Sale, Recipe, Purchase, CashSession } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Package, Calendar, Download, Printer, Lock, Unlock, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storageService';

interface DashboardProps {
  sales: Sale[];
  purchases: Purchase[];
  recipes: Recipe[];
}

export const Dashboard: React.FC<DashboardProps> = ({ sales, purchases, recipes }) => {
  // Date State
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);

  // Cashier State
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashAction, setCashAction] = useState<'open' | 'close'>('open');
  const [cashAmount, setCashAmount] = useState('');

  useEffect(() => {
      setCashSessions(storageService.getCashSessions());
  }, []);

  const currentSession = useMemo(() => 
    cashSessions.find(s => s.status === 'open'), 
  [cashSessions]);

  const stats = useMemo(() => {
    // Filter by Date Range
    const rangeSales = sales.filter(s => {
        const d = s.date.split('T')[0];
        return d >= startDate && d <= endDate;
    });

    const rangePurchases = purchases.filter(p => {
        const d = p.date.split('T')[0];
        return d >= startDate && d <= endDate;
    });

    const totalSales = rangeSales.reduce((acc, curr) => acc + curr.total, 0);
    const totalCost = rangePurchases.reduce((acc, curr) => acc + curr.total, 0);
    const totalProfit = rangeSales.reduce((acc, curr) => acc + curr.profit, 0);

    // Top Products
    const productCount: Record<string, number> = {};
    rangeSales.forEach(sale => {
      sale.items.forEach(item => {
        const rName = recipes.find(r => r.id === item.recipeId)?.name || 'Desconhecido';
        productCount[rName] = (productCount[rName] || 0) + item.quantity;
      });
    });

    const topProducts = Object.entries(productCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSales,
      totalCost,
      totalProfit,
      topProducts,
      rangeSales
    };
  }, [sales, purchases, recipes, startDate, endDate]);

  const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fff7ed'];

  // --- Handlers ---

  const handleCashierAction = () => {
    const amount = Number(cashAmount);
    if (isNaN(amount)) return;

    if (cashAction === 'open') {
        const newSession: CashSession = {
            id: Date.now().toString(),
            openedAt: new Date().toISOString(),
            status: 'open',
            initialBalance: amount,
            salesTotal: 0
        };
        const updated = [...cashSessions, newSession];
        setCashSessions(updated);
        storageService.saveCashSessions(updated);
    } else {
        if (!currentSession) return;
        // Calculate sales since openedAt
        const salesSinceOpen = sales
            .filter(s => new Date(s.date).getTime() >= new Date(currentSession.openedAt).getTime())
            .reduce((acc, curr) => acc + curr.total, 0);

        const closedSession: CashSession = {
            ...currentSession,
            closedAt: new Date().toISOString(),
            status: 'closed',
            salesTotal: salesSinceOpen,
            finalBalance: amount // User inputs what is physically in drawer
        };
        const updated = cashSessions.map(s => s.id === currentSession.id ? closedSession : s);
        setCashSessions(updated);
        storageService.saveCashSessions(updated);
    }
    setIsCashModalOpen(false);
    setCashAmount('');
  };

  const handleExportXLS = () => {
      // Build an HTML Table string which Excel opens perfectly (CSV with semicolons is messy)
      let table = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body>
        <table border="1">
            <thead>
                <tr style="background-color: #f97316; color: white;">
                    <th>ID Venda</th>
                    <th>Data</th>
                    <th>Itens</th>
                    <th>Total (R$)</th>
                    <th>Lucro (R$)</th>
                    <th>Método Pagamento</th>
                </tr>
            </thead>
            <tbody>
      `;

      stats.rangeSales.forEach(s => {
          const itemsStr = s.items.map(i => {
              const r = recipes.find(r => r.id === i.recipeId);
              return `${i.quantity}x ${r?.name || 'Item'}`;
          }).join('; ');
          
          table += `
            <tr>
                <td>${s.id}</td>
                <td>${new Date(s.date).toLocaleString()}</td>
                <td>${itemsStr}</td>
                <td>${s.total.toFixed(2).replace('.', ',')}</td>
                <td>${s.profit.toFixed(2).replace('.', ',')}</td>
                <td>${s.paymentMethod}</td>
            </tr>
          `;
      });

      table += `</tbody></table></body></html>`;

      const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_vendas_${startDate}_${endDate}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handlePrint = () => {
      window.print();
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between print:border print:shadow-none print:break-inside-avoid">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-full ${color} print:hidden`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Top Toolbar: Filters & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
         <div className="flex flex-col gap-2 w-full md:w-auto">
             <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                 <Calendar size={16}/> Período de Análise
             </label>
             <div className="flex gap-2 items-center">
                 <input 
                    type="date" 
                    className="border p-2 rounded-lg text-sm"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                 />
                 <span className="text-gray-400">até</span>
                 <input 
                    type="date" 
                    className="border p-2 rounded-lg text-sm"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                 />
             </div>
         </div>

         <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
             {/* Cashier Button */}
             <button 
                onClick={() => {
                    setCashAction(currentSession ? 'close' : 'open');
                    setIsCashModalOpen(true);
                }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium whitespace-nowrap ${
                    currentSession 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                }`}
             >
                {currentSession ? <Unlock size={18} /> : <Lock size={18} />}
                {currentSession ? 'Caixa Aberto' : 'Caixa Fechado'}
             </button>

             {/* Export Buttons */}
             <button onClick={handleExportXLS} className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg flex items-center gap-2 font-medium border border-gray-200 whitespace-nowrap">
                 <Download size={18} /> Excel (.xls)
             </button>
             <button onClick={handlePrint} className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg flex items-center gap-2 font-medium whitespace-nowrap">
                 <Printer size={18} /> Relatório PDF
             </button>
         </div>
      </div>

      {/* Cashier Status Banner (Only if open) */}
      {currentSession && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center text-green-800 print:hidden">
              <div className="flex items-center gap-3">
                  <div className="bg-green-500 text-white p-2 rounded-full"><Unlock size={20} /></div>
                  <div>
                      <div className="font-bold">Caixa Aberto</div>
                      <div className="text-xs opacity-80">Início: {new Date(currentSession.openedAt).toLocaleString()}</div>
                  </div>
              </div>
              <div className="mt-2 md:mt-0 text-right">
                  <div className="text-sm">Saldo Inicial</div>
                  <div className="font-bold text-lg">R$ {currentSession.initialBalance.toFixed(2)}</div>
              </div>
          </div>
      )}

      {/* Stats Grid */}
      <h2 className="text-2xl font-bold text-gray-800 print:mb-4">
          Resumo {startDate === endDate ? 'do Dia' : 'do Período'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Vendas Totais" 
          value={`R$ ${stats.totalSales.toFixed(2)}`} 
          icon={TrendingUp} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Custos Totais" 
          value={`R$ ${stats.totalCost.toFixed(2)}`} 
          icon={ShoppingBag} 
          color="bg-red-500" 
        />
        <StatCard 
          title="Lucro Líquido" 
          value={`R$ ${stats.totalProfit.toFixed(2)}`} 
          icon={Package} 
          color="bg-brand-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:border-gray-300 print:mb-6 print:shadow-none">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Produtos Vendidos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:border-gray-300 print:shadow-none">
           <h3 className="text-lg font-bold text-gray-800 mb-4">Distribuição de Vendas</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topProducts}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {stats.topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block text-center text-xs text-gray-400 mt-8">
          Relatório gerado em {new Date().toLocaleString()} - GestorPro
      </div>

      {/* Cashier Modal */}
      {isCashModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in">
                <h3 className="text-xl font-bold mb-4 text-gray-800">
                    {cashAction === 'open' ? 'Abertura de Caixa' : 'Fechamento de Caixa'}
                </h3>
                
                {cashAction === 'close' && currentSession && (
                    <div className="mb-4 bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Saldo Inicial:</span>
                            <span className="font-bold">R$ {currentSession.initialBalance.toFixed(2)}</span>
                        </div>
                        
                        {/* Logic to show sales since open */}
                        <div className="flex justify-between text-green-600">
                             <span className="opacity-80">Vendas (Sessão Atual):</span>
                             {(() => {
                                 const salesSince = sales
                                    .filter(s => new Date(s.date).getTime() >= new Date(currentSession.openedAt).getTime())
                                    .reduce((acc, curr) => acc + curr.total, 0);
                                 return <span className="font-bold">+ R$ {salesSince.toFixed(2)}</span>;
                             })()}
                        </div>
                        
                        {/* Helper to show TOTAL sales today in case user opened cash register late */}
                        <div className="flex justify-between text-gray-400 text-xs py-1 border-b border-gray-200">
                            <span>Vendas Totais do Dia:</span>
                             {(() => {
                                 const todayStr = new Date().toISOString().split('T')[0];
                                 const salesToday = sales
                                    .filter(s => s.date.startsWith(todayStr))
                                    .reduce((acc, curr) => acc + curr.total, 0);
                                 return <span>R$ {salesToday.toFixed(2)}</span>;
                             })()}
                        </div>
                        {(() => {
                            const salesSince = sales
                                .filter(s => new Date(s.date).getTime() >= new Date(currentSession.openedAt).getTime())
                                .reduce((acc, curr) => acc + curr.total, 0);
                            
                             if (salesSince === 0) {
                                return (
                                    <div className="flex items-start gap-1 text-[10px] text-orange-600 bg-orange-50 p-1 rounded mt-1">
                                        <AlertCircle size={12} className="mt-0.5" />
                                        <span>Se as vendas aparecem zeradas aqui, é porque foram feitas antes de você clicar em "Abrir Caixa". Confira "Vendas Totais do Dia" acima.</span>
                                    </div>
                                )
                             }
                             return null;
                        })()}

                        <div className="pt-2 flex justify-between">
                            <span>Esperado em Caixa:</span>
                            <span className="font-bold text-gray-800">
                                R$ {(() => {
                                     const salesSince = sales
                                        .filter(s => new Date(s.date).getTime() >= new Date(currentSession.openedAt).getTime())
                                        .reduce((acc, curr) => acc + curr.total, 0);
                                     return (currentSession.initialBalance + salesSince).toFixed(2);
                                })()}
                            </span>
                        </div>
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        {cashAction === 'open' ? 'Saldo em Dinheiro na Gaveta (Inicial)' : 'Saldo em Dinheiro na Gaveta (Final)'}
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">R$</span>
                        <input 
                            type="number" 
                            autoFocus
                            className="w-full border p-2 pl-10 rounded-lg text-lg font-bold text-gray-800"
                            placeholder="0.00"
                            value={cashAmount}
                            onChange={e => setCashAmount(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => { setIsCashModalOpen(false); setCashAmount(''); }} 
                        className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleCashierAction}
                        className={`flex-1 py-2 text-white rounded-lg font-bold ${
                            cashAction === 'open' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {cashAction === 'open' ? 'Abrir Caixa' : 'Fechar Caixa'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};