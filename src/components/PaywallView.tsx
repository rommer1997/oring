import React, { useState } from 'react';
import { Tenant, User } from '../types';
import { apiUrl } from '../lib/api';

interface PaywallViewProps {
  tenant: Tenant | null;
  appUser: User | null;
  onSignOut: () => void;
  onToastMessage: (msg: string) => void;
  getAuthToken?: () => Promise<string | null>;
  isDemoMode?: boolean;
  onClose?: () => void;
}

export default function PaywallView({
  tenant,
  appUser,
  onSignOut,
  onToastMessage,
  getAuthToken,
  isDemoMode = false,
  onClose,
}: PaywallViewProps) {
  const [billingPeriod, setBillingPeriod] = useState<'mensual' | 'anual'>('mensual');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken ? await getAuthToken() : null;
      // In live environment, we call create-checkout-session
      const response = await fetch(apiUrl('/api/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          priceId: billingPeriod === 'mensual' ? 'price_monthly_premium' : 'price_yearly_premium',
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        onToastMessage('⚠️ No se pudo generar la sesión de pago. Revisa la configuración de Stripe.');
      }
    } catch (err) {
      console.error(err);
      onToastMessage('⚠️ Error de red al conectar con Stripe.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#ebdcc9] text-primary">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <div className="max-w-4xl w-full text-center relative z-10 space-y-10">

        {onClose && (
          <button onClick={onClose} className="absolute -top-2 left-0 flex items-center gap-1 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer z-20">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Volver
          </button>
        )}

        {/* Brand Banner */}
        <div className="flex flex-col items-center gap-1.5 animate-fade-in">
          <h1 className="font-display text-4.5xl font-bold tracking-tight text-primary">ElenaOS</h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[#bfa982]">Rescate Inteligente de Clientas</p>
        </div>

        {/* Lock notification card */}
        <div className="bg-white border border-[#bfa982]/25 rounded-3xl p-8 sm:p-10 shadow-[rgba(74,44,64,0.04)_0px_8px_32px] text-center max-w-2xl mx-auto space-y-5 animate-scale-up">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 animate-pulse">
            <span className="material-symbols-outlined text-3xl font-bold">lock_open</span>
          </div>
          
          <h2 className="font-serif text-2.5xl font-bold text-primary">{onClose ? 'Activa tu plan de ElenaOS' : 'Tu período de prueba de 14 días ha expirado'}</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
            {onClose
              ? <>Activa el plan comercial de tu salón <strong>{tenant?.name || 'Mi Salón'}</strong> para asegurar el acceso continuo al rescate de visitas, tu agenda premium y la facturación trimestral.</>
              : <>El trial gratuito de tu salón <strong>{tenant?.name || 'Mi Salón'}</strong> ha finalizado. Para seguir rescatando visitas, accediendo a tu agenda premium y visualizando la facturación trimestral, suscríbete al plan comercial único de ElenaOS.</>}
          </p>
        </div>

        {/* Pricing toggle & Billing options */}
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${billingPeriod === 'mensual' ? 'text-primary font-extrabold' : 'text-on-surface-variant'}`}>Pago Mensual</span>
            <button
              type="button"
              onClick={() => setBillingPeriod(p => p === 'mensual' ? 'anual' : 'mensual')}
              className="relative inline-flex items-center h-6 rounded-full w-11 bg-primary/25 cursor-pointer transition-colors outline-none"
            >
              <span className={`inline-block w-4 h-4 transform bg-primary rounded-full transition-transform ${billingPeriod === 'anual' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${billingPeriod === 'anual' ? 'text-primary font-extrabold' : 'text-on-surface-variant'}`}>
              Pago Anual
              <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Ahorra 2 meses gratis</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Monthly Card */}
            <div className={`bg-white border rounded-3xl p-8 text-left flex flex-col justify-between transition-all duration-300 relative ${billingPeriod === 'mensual' ? 'border-primary shadow-lg ring-1 ring-primary' : 'border-[#bfa982]/20 opacity-70 hover:opacity-90'}`}>
              {billingPeriod === 'mensual' && (
                <span className="absolute -top-3 right-6 bg-[#4A2C40] text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-primary/20">PRECIO DE FUNDADOR</span>
              )}
              <div>
                <h3 className="font-serif text-xl font-bold text-primary mb-1">Plan Mensual Premium</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">Flexibilidad total y sin permanencia para tu salón.</p>
                <div className="my-6">
                  {billingPeriod === 'mensual' ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-on-surface-variant line-through font-medium">89€</span>
                        <span className="font-serif text-4.5xl font-bold text-primary">35€</span>
                        <span className="text-xs text-on-surface-variant font-medium">/ mes</span>
                      </div>
                      <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">★ Promo: Primeros 12 meses, luego 89€/mes</p>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-serif text-4.5xl font-bold text-primary">89€</span>
                      <span className="text-xs text-on-surface-variant font-medium">/ mes</span>
                    </div>
                  )}
                </div>
                <ul className="space-y-3 text-xs text-on-surface-variant font-medium pt-4 border-t border-muted/50">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600 font-bold">done</span> Copiloto IA con 3 tonos ilimitado</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600 font-bold">done</span> CRM con motor de riesgo de abandono</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600 font-bold">done</span> Agenda Interactiva y Scheduler Express</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600 font-bold">done</span> Módulo de Inventario de productos</li>
                </ul>
              </div>
              {billingPeriod === 'mensual' && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSubscribe}
                  className="mt-8 w-full bg-primary text-white py-3 rounded-xl text-xs font-bold hover:opacity-95 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  <span>Suscribirse a ElenaOS</span>
                </button>
              )}
            </div>

            {/* Annual Card */}
            <div className={`bg-white border rounded-3xl p-8 text-left flex flex-col justify-between transition-all duration-300 relative ${billingPeriod === 'anual' ? 'border-primary shadow-lg ring-1 ring-primary' : 'border-[#bfa982]/20 opacity-70 hover:opacity-90'}`}>
              {billingPeriod === 'anual' && (
                <span className="absolute -top-3 right-6 bg-[#bfa982] text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-[#bfa982]/20">MÁXIMO AHORRO</span>
              )}
              <div>
                <h3 className="font-serif text-xl font-bold text-primary mb-1">Plan Anual Premium</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">El mejor precio para salones estables y decididos.</p>
                <div className="my-6">
                  {billingPeriod === 'anual' ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-on-surface-variant line-through font-medium">1.068€</span>
                        <span className="font-serif text-4.5xl font-bold text-primary">350€</span>
                        <span className="text-xs text-on-surface-variant font-medium">/ año</span>
                      </div>
                      <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">★ Equivale a 29,17€/mes · 2 meses gratis</p>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-serif text-4.5xl font-bold text-primary">350€</span>
                      <span className="text-xs text-on-surface-variant font-medium">/ año</span>
                    </div>
                  )}
                </div>
                <ul className="space-y-3 text-xs text-on-surface-variant font-medium pt-4 border-t border-muted/50">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600 font-bold">done</span> Todo lo incluido en el plan mensual</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600 font-bold">done</span> Soporte preferente 24/7</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600 font-bold">done</span> Acceso prioritario a WhatsApp Auto-envío</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600 font-bold">done</span> Auditoría trimestral de retención</li>
                </ul>
              </div>
              {billingPeriod === 'anual' && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSubscribe}
                  className="mt-8 w-full bg-primary text-white py-3 rounded-xl text-xs font-bold hover:opacity-95 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  <span>Suscribirse a ElenaOS (Anual)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions (Sign out) */}
        <div className="flex gap-4 items-center justify-center pt-8 border-t border-outline-variant/30 max-w-md mx-auto">
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs font-semibold hover:text-red-600 hover:underline transition-all cursor-pointer flex items-center gap-1 text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Salir de mi cuenta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
