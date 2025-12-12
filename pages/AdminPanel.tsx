import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { UserProfile } from '../types';
import { Shield, Search, CheckCircle, XCircle, Save, Loader2, Plus, UserPlus, X } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit State
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('active');

  // Manual Add State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualData, setManualData] = useState({ id: '', email: '', full_name: '', phone: '' });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao buscar perfis:", error);
    }

    if (data) {
      setProfiles(data as any);
    }
    setLoading(false);
  };

  const handleEdit = (profile: UserProfile) => {
      setEditingId(profile.id);
      const date = profile.subscription_expires_at ? new Date(profile.subscription_expires_at).toISOString().split('T')[0] : '';
      setEditDate(date);
      setEditStatus(profile.subscription_status || 'active');
  };

  const handleSave = async (id: string) => {
      const { error } = await supabase.from('profiles').update({
          subscription_status: editStatus,
          subscription_expires_at: editDate ? new Date(editDate).toISOString() : null
      }).eq('id', id);

      if (!error) {
          setProfiles(profiles.map(p => p.id === id ? { ...p, subscription_status: editStatus as any, subscription_expires_at: editDate } : p));
          setEditingId(null);
      } else {
          alert('Erro ao atualizar: ' + error.message);
      }
  };

  const handleManualAdd = async () => {
      if (!manualData.id || !manualData.email) return alert("ID (UID) e Email são obrigatórios!");
      
      setIsSubmittingManual(true);

      const payload = {
          id: manualData.id.trim(),
          email: manualData.email.trim(),
          full_name: manualData.full_name,
          phone: manualData.phone,
          subscription_status: 'active',
          is_admin: false,
          subscription_expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString()
      };

      // Upsert: Cria se não existir, atualiza se existir (evita erro de duplicidade)
      const { data, error } = await supabase.from('profiles').upsert(payload).select();

      setIsSubmittingManual(false);

      if (error) {
          console.error("Erro Supabase:", error);
          alert(`Erro ao salvar perfil: ${error.message}\n\nDica: Verifique se você rodou os comandos SQL de permissão (Policies) no painel do Supabase.`);
      } else {
          alert("Perfil salvo com sucesso!");
          setIsManualModalOpen(false);
          setManualData({ id: '', email: '', full_name: '', phone: '' });
          fetchProfiles();
      }
  };

  const addMonth = () => {
      const current = editDate ? new Date(editDate) : new Date();
      current.setDate(current.getDate() + 30);
      setEditDate(current.toISOString().split('T')[0]);
      setEditStatus('active');
  };

  const filtered = profiles.filter(p => 
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpired = (dateString: string) => {
      if (!dateString) return false;
      return new Date(dateString) < new Date();
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2"/> Carregando clientes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="text-brand-600" /> Painel Admin (SaaS)
        </h2>
        <button 
            onClick={() => setIsManualModalOpen(true)}
            className="bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-600 shadow-sm"
        >
            <UserPlus size={18} className="mr-2" /> Incluir Manualmente
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Buscar cliente por nome ou e-mail..." 
                className="w-full pl-10 pr-4 py-2 border rounded-xl text-gray-800"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                      <tr>
                          <th className="p-3">Cliente</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Vencimento</th>
                          <th className="p-3 text-right">Ação</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filtered.length === 0 ? (
                          <tr>
                              <td colSpan={4} className="p-8 text-center text-gray-400">
                                  Nenhum perfil encontrado. Verifique se o cadastro foi concluído ou adicione manualmente.
                              </td>
                          </tr>
                      ) : filtered.map(profile => (
                          <tr key={profile.id} className="hover:bg-gray-50">
                              <td className="p-3">
                                  <div className="font-bold text-gray-800 text-base">{profile.full_name || 'Sem Nome'}</div>
                                  <div className="text-xs text-gray-500">{profile.email}</div>
                                  <div className="text-xs text-gray-400">{profile.phone}</div>
                                  {profile.is_admin && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded mt-1 inline-block">Admin</span>}
                              </td>
                              
                              {editingId === profile.id ? (
                                  <>
                                      <td className="p-3 text-center">
                                          <select 
                                            className="border p-1 rounded bg-white text-gray-800"
                                            value={editStatus}
                                            onChange={e => setEditStatus(e.target.value)}
                                          >
                                              <option value="active">Ativo</option>
                                              <option value="blocked">Bloqueado</option>
                                          </select>
                                      </td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-2 justify-center">
                                              <input 
                                                type="date" 
                                                className="border p-1 rounded w-32 bg-white text-gray-800"
                                                value={editDate}
                                                onChange={e => setEditDate(e.target.value)}
                                              />
                                              <button 
                                                onClick={addMonth}
                                                className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                                                title="Adicionar 30 dias"
                                              >
                                                +30d
                                              </button>
                                          </div>
                                      </td>
                                      <td className="p-3 text-right">
                                          <button onClick={() => handleSave(profile.id)} className="bg-brand-500 text-white p-2 rounded hover:bg-brand-600">
                                              <Save size={16} />
                                          </button>
                                          <button onClick={() => setEditingId(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                                              Cancelar
                                          </button>
                                      </td>
                                  </>
                              ) : (
                                  <>
                                      <td className="p-3 text-center">
                                          {profile.subscription_status === 'active' && !isExpired(profile.subscription_expires_at) ? (
                                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold inline-flex items-center">
                                                  <CheckCircle size={12} className="mr-1"/> Ativo
                                              </span>
                                          ) : (
                                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold inline-flex items-center">
                                                  <XCircle size={12} className="mr-1"/> 
                                                  {profile.subscription_status === 'blocked' ? 'Bloqueado' : 'Vencido'}
                                              </span>
                                          )}
                                      </td>
                                      <td className="p-3 text-center font-mono">
                                          {profile.subscription_expires_at ? new Date(profile.subscription_expires_at).toLocaleDateString() : '-'}
                                      </td>
                                      <td className="p-3 text-right">
                                          <button 
                                            onClick={() => handleEdit(profile)}
                                            className="text-brand-600 hover:bg-brand-50 px-3 py-1 rounded text-xs font-bold border border-brand-200"
                                          >
                                              Gerenciar
                                          </button>
                                      </td>
                                  </>
                              )}
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Manual Add Modal */}
      {isManualModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-fade-in">
                  <button onClick={() => setIsManualModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <X size={24} />
                  </button>
                  
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Incluir Perfil Manualmente</h3>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-4 border border-blue-100">
                      <strong>Atenção:</strong> Copie o <code>UID</code> (User ID) da aba "Authentication" do Supabase e cole abaixo para vincular o perfil corretamente.
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">UID (Do Supabase) *</label>
                          <input 
                            type="text" 
                            className="w-full border p-2 rounded-lg font-mono text-xs text-gray-900 bg-white"
                            placeholder="ex: b35a7dee-9af5..."
                            value={manualData.id}
                            onChange={e => setManualData({...manualData, id: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                          <input 
                            type="email" 
                            className="w-full border p-2 rounded-lg text-gray-900 bg-white"
                            value={manualData.email}
                            onChange={e => setManualData({...manualData, email: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                          <input 
                            type="text" 
                            className="w-full border p-2 rounded-lg text-gray-900 bg-white"
                            value={manualData.full_name}
                            onChange={e => setManualData({...manualData, full_name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                          <input 
                            type="text" 
                            className="w-full border p-2 rounded-lg text-gray-900 bg-white"
                            value={manualData.phone}
                            onChange={e => setManualData({...manualData, phone: e.target.value})}
                          />
                      </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                      <button 
                        onClick={() => setIsManualModalOpen(false)} 
                        className="px-4 py-2 text-gray-600 font-medium"
                        disabled={isSubmittingManual}
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleManualAdd} 
                        disabled={isSubmittingManual}
                        className="px-6 py-2 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 flex items-center gap-2"
                      >
                          {isSubmittingManual ? <Loader2 className="animate-spin" size={18} /> : null}
                          {isSubmittingManual ? 'Salvando...' : 'Salvar Perfil'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
