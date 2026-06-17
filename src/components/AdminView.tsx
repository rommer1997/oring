import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Tenant } from '../types';

interface AdminViewProps {
  onToastMessage: (msg: string) => void;
}

export default function AdminView({ onToastMessage }: AdminViewProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  // Real-time listener for ALL tenants (Only accessible by Administrator role)
  useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(
      collection(db, 'tenants'),
      (snapshot) => {
        const items: Tenant[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as Tenant);
        });
        setTenants(items);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching all tenants for admin panel:", err);
        onToastMessage("⚠️ No tienes permisos de Administrador global para ver esta consola.");
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Update subscription status manually
  const handleUpdateStatus = async (tenantId: string, status: string, extendDays: number = 0) => {
    try {
      const tenantRef = doc(db, 'tenants', tenantId);
      const updates: any = {
        subscriptionStatus: status,
        updatedAt: new Date().toISOString(),
      };

      if (extendDays > 0) {
        const now = new Date();
        const newTrialEnd = new Date(now.getTime() + extendDays * 24 * 60 * 60 * 1000).toISOString();
        updates.trialEndsAt = newTrialEnd;
      }

      await updateDoc(tenantRef, updates);
      onToastMessage(`✓ Estado de salón actualizado a: ${status}`);
    } catch (err) {
      console.error(err);
      onToastMessage('⚠️ Error al actualizar el estado del salón.');
    }
  };

  // Calculations
  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((t) => t.subscriptionStatus === 'active').length;
    const trialing = tenants.filter((t) => t.subscriptionStatus === 'trialing').length;
    const canceled = tenants.filter((t) => t.subscriptionStatus === 'canceled' || !t.subscriptionStatus).length;
    
    // MRR: monthly active is 89€, yearly active is 350€ (calculated as monthly contribution: 350/12 = 29.17€)
    // For simplicity, let's assume active mensal is 89€ and active yearly is 29.17€
    const estimatedMRR = active * 89; 

    return { total, active, trialing, canceled, estimatedMRR };
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchSearch =
        !searchTerm ||
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        filterStatus === 'Todos' ||
        (filterStatus === 'Activos' && t.subscriptionStatus === 'active') ||
        (filterStatus === 'Prueba' && t.subscriptionStatus === 'trialing') ||
        (filterStatus === 'Cancelados' && (t.subscriptionStatus === 'canceled' || !t.subscriptionStatus));

      return matchSearch && matchStatus;
    });
  }, [tenants, searchTerm, filterStatus]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Cargando Consola Global...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-16 font-sans text-primary text-left">
      
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined font-bold">shield_person</span>
          <span>Consola del Sistema</span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-1">Administración Global</h2>
        <p className="text-sm text-on-surface-variant font-medium">Audita salones registrados, estados de suscripción de Stripe y métricas de crecimiento.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-muted rounded-xl p-5 text-left">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Total salones</p>
          <p className="font-serif text-2xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="bg-white border border-muted rounded-xl p-5 text-left">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Suscripción Activa</p>
          <p className="font-serif text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white border border-muted rounded-xl p-5 text-left">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">En período Trial</p>
          <p className="font-serif text-2xl font-bold text-amber-600">{stats.trialing}</p>
        </div>
        <div className="bg-white border border-muted rounded-xl p-5 text-left">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Inactivos / Expirados</p>
          <p className="font-serif text-2xl font-bold text-red-500">{stats.canceled}</p>
        </div>
        <div className="bg-[#4A2C40] text-white rounded-xl p-5 text-left">
          <p className="text-[10px] uppercase font-bold text-[#bfa982] mb-1">MRR Estimado (Teórico)</p>
          <p className="font-serif text-2xl font-bold text-[#fdf6ec]">{stats.estimatedMRR}€/mes</p>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</span>
          <input
            type="text"
            placeholder="Buscar salón, ID, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-full text-xs outline-none focus:border-primary transition-all text-foreground"
          />
        </div>
        <div className="flex gap-2">
          {['Todos', 'Activos', 'Prueba', 'Cancelados'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                filterStatus === tab
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-white text-on-surface-variant border-border hover:border-primary/40'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filteredTenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 bg-white border border-muted rounded-2xl">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">domain</span>
          <p className="text-sm font-semibold text-on-surface-variant">No se encontraron salones registrados para este filtro.</p>
        </div>
      ) : (
        <div className="bg-white border border-muted rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-muted bg-surface-container-lowest text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="text-left px-5 py-3.5">ID del Salón / Nombre</th>
                <th className="text-left px-5 py-3.5">Email de Propietaria</th>
                <th className="text-center px-5 py-3.5">Estado de Pago</th>
                <th className="text-left px-5 py-3.5">Prueba finaliza</th>
                <th className="text-right px-5 py-3.5 w-64">Acciones Administrativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/50 font-medium">
              {filteredTenants.map((t) => {
                const isAct = t.subscriptionStatus === 'active';
                const isTri = t.subscriptionStatus === 'trialing';
                
                // Calculate remaining days
                const daysLeft = t.trialEndsAt 
                  ? Math.ceil((new Date(t.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <tr key={t.id} className="transition-colors hover:bg-surface-container-lowest/40">
                    <td className="px-5 py-4">
                      <div className="font-bold text-primary">{t.name || 'Sin Onboarding'}</div>
                      <div className="text-[10px] text-outline font-semibold uppercase">{t.id}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-on-surface-variant">{t.email || '—'}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        isAct 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : isTri 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {isAct ? 'ACTIVO' : isTri ? 'TRIAL' : 'EXPIRADO / BAJA'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-on-surface-variant">
                      {t.trialEndsAt ? (
                        <div className="space-y-0.5">
                          <div>{new Date(t.trialEndsAt).toLocaleDateString('es-ES')}</div>
                          {isTri && (
                            <div className={`text-[9px] font-bold ${daysLeft > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                              {daysLeft > 0 ? `Quedan ${daysLeft} días` : 'Expirado'}
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Grant subscription */}
                        {!isAct && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'active')}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            title="Aprobar suscripción de cortesía"
                          >
                            Activar
                          </button>
                        )}

                        {/* Extend trial */}
                        {isTri && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'trialing', 7)}
                            className="bg-amber-50 text-amber-700 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            title="Otorgar 7 días adicionales"
                          >
                            +7d Prueba
                          </button>
                        )}

                        {/* Suspend subscription */}
                        {isAct && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'canceled')}
                            className="bg-red-50 text-red-700 hover:bg-red-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            title="Suspender acceso de salón"
                          >
                            Suspender
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
