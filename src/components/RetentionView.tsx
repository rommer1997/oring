import React, { useState } from 'react';
import { AppView, ClientProfile } from '../types';
import { getTodayISO, buildNewClient } from '../utils/riskEngine';

interface RetentionViewProps {
  clients: ClientProfile[];
  onNavigate: (view: AppView) => void;
  selectedClientId: string;
  selectedTenantId: string;
  onSelectClient: (clientId: string) => void;
  onToastMessage: (msg: string) => void;
  onAddClient?: (client: ClientProfile) => void;
  onUpdateClient?: (clientId: string, fields: Partial<ClientProfile>) => void;
  initialSearchTerm?: string;
}

export default function RetentionView({
  clients,
  onNavigate,
  selectedClientId,
  selectedTenantId,
  onSelectClient,
  onToastMessage,
  onAddClient,
  onUpdateClient,
  initialSearchTerm = ''
}: RetentionViewProps) {
  const [activeTab, setActiveTab] = useState<'Todas' | 'Crítico' | 'Alto' | 'Medio' | 'Bajo'>('Todas');
  const [searchTerm, setSearchTerm] = useState<string>(initialSearchTerm);
  const [vipFilter, setVipFilter] = useState<'Todos' | 'VIP' | 'No-VIP'>('Todos');
  const [sortBy, setSortBy] = useState<'days' | 'ltv' | 'name'>('days');

  // Client registration form states
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBirthdate, setNewBirthdate] = useState('');
  const [newVip, setNewVip] = useState(false);
  const [newContactConsent, setNewContactConsent] = useState(false);
  const [newRiskLevel, setNewRiskLevel] = useState<'Crítico' | 'Alto' | 'Medio' | 'Bajo'>('Bajo');

  // Filter list by active criteria
  const filteredClients = clients
    .filter((client) => {
      // 1. Search filter: name, phone, or email
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const nameMatch = client.name?.toLowerCase().includes(query);
        const emailMatch = client.email?.toLowerCase().includes(query);
        const phoneMatch = client.phoneNumber?.includes(query);
        if (!nameMatch && !emailMatch && !phoneMatch) return false;
      }

      // 2. Tab Risk Level filter
      if (activeTab !== 'Todas' && client.riskLevel !== activeTab) {
        return false;
      }

      // 3. VIP filter
      if (vipFilter === 'VIP' && !client.isVip) return false;
      if (vipFilter === 'No-VIP' && client.isVip) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'days') {
        return (b.riskDays || 0) - (a.riskDays || 0); // Most inactive first
      }
      if (sortBy === 'ltv') {
        return (b.spendingLtv || 0) - (a.spendingLtv || 0); // Highest spending first
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || ''); // A-Z
      }
      return 0;
    });
  
  // Find current active preview object
  const currentClient = filteredClients.find(c => c.id === selectedClientId) || filteredClients[0];

  const handleReviewMessageClick = (client: ClientProfile) => {
    onSelectClient(client.id);
    onNavigate('message-editor');
    onToastMessage(`Abriendo editor para ${client.name}`);
  };

  const handleViewProfileClick = (client: ClientProfile) => {
    onSelectClient(client.id);
    onNavigate('client-profile');
    onToastMessage(`Abriendo ficha detallada de ${client.name}`);
  };

  const handleAddNewClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      onToastMessage('Nombre y teléfono son obligatorios.');
      return;
    }

    const cleanClient = buildNewClient({
      id: `cli-${Date.now()}`,
      name: newName,
      phoneNumber: newPhone,
      tenantId: selectedTenantId,
      email: newEmail.trim(),
      lastVisitService: 'Consulta de Autor',
      favoriteServices: [{ name: 'Consulta de Autor', count: 1, pricePerVisit: 0, icon: 'spa' }],
      aiReason: 'Ficha creada recientemente. Añade historial de citas para mejorar el análisis de retención.',
      isVip: newVip,
      riskLevel: newRiskLevel,
      riskDays: newRiskLevel === 'Crítico' ? 110 : newRiskLevel === 'Alto' ? 62 : newRiskLevel === 'Medio' ? 35 : 10,
      birthdate: newBirthdate.trim(),
      contactConsent: newContactConsent,
      contactConsentAt: newContactConsent ? new Date().toISOString() : undefined,
    } as Parameters<typeof buildNewClient>[0]);

    if (onAddClient) {
      onAddClient(cleanClient);
    }
    onSelectClient(cleanClient.id);
    onToastMessage(`Ficha de ${newName} añadida con éxito.`);

    // Reset fields & close drawer
    setIsAddingNew(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewBirthdate('');
    setNewVip(false);
    setNewContactConsent(false);
  };

  return (
    <div className="flex-1 pb-16">
      
      {/* Top Header Row */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 font-sans">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-1.5">Clientes de Autor</h2>
          <p className="text-sm text-on-surface-variant font-medium">Gobernanza de fichas estéticas, búsqueda integral y alertas inteligentes de retención.</p>
        </div>
        
        {/* Registration toggle button */}
        <button 
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="shrink-0 bg-primary text-on-primary hover:bg-primary-container px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm font-bold">
            {isAddingNew ? 'person_search' : 'person_add'}
          </span>
          <span>{isAddingNew ? 'Volver al Listado' : 'Registrar Clienta'}</span>
        </button>
      </div>

      {/* Dynamic Churn Risk Engine - Executive Dashboard */}
      {!isAddingNew && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-surface-container-low/60 border border-outline-variant/35 p-6 rounded-3xl mb-8 font-sans">
          
          {/* Key Risk Metrics */}
          <div className="md:col-span-5 space-y-4 border-r border-outline-variant/20 pr-0 md:pr-6">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm text-primary">analytics</span>
              <h3>Monitor de Mimo (Métricas de Cuidado)</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-container-lowest p-3 border border-outline-variant/20 rounded-2xl text-center">
                <p className="text-[9px] text-[#8c6d7a] uppercase font-bold tracking-wider mb-1">Riesgo Crítico</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  <span className="font-serif text-lg font-bold text-red-700">
                    {clients.filter(c => c.riskLevel === 'Crítico').length}
                  </span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-3 border border-outline-variant/20 rounded-2xl text-center">
                <p className="text-[9px] text-[#8c6d7a] uppercase font-bold tracking-wider mb-1">Ausencia Med.</p>
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="font-serif text-lg font-bold text-primary">
                    {Math.round(clients.reduce((acc, curr) => acc + (curr.riskDays || 0), 0) / (clients.length || 1))}
                  </span>
                  <span className="text-[8px] text-outline font-semibold">días</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-3 border border-outline-variant/20 rounded-2xl text-center">
                <p className="text-[9px] text-[#8c6d7a] uppercase font-bold tracking-wider mb-1">Fidelización</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="font-serif text-lg font-bold text-emerald-700">
                    {Math.round((clients.filter(c => c.riskLevel === 'Bajo').length / (clients.length || 1)) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-outline leading-relaxed bg-surface-container-low p-3 rounded-xl border border-outline-variant/10 text-left">
              💡 Nuestro sistema cruza el intervalo de días ausentes del salón con la frecuencia de visita promedio calculada de cada clienta para alertar de desviaciones de conducta.
            </div>
          </div>

          {/* Simple Actionable Recommendations Section */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-primary font-bold text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">lightbulb</span>
                <h3>Recomendaciones Simples de Recuperación</h3>
              </div>
              <span className="text-[9px] bg-red-50 border border-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest leading-none">Acción Urgente</span>
            </div>

            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
              {clients
                .filter(c => c.riskLevel === 'Crítico' || c.riskLevel === 'Alto')
                .slice(0, 3)
                .map((client) => {
                  const faveService = client.favoriteServices && client.favoriteServices.length > 0
                    ? client.favoriteServices[0].name
                    : client.lastVisitService || 'Servicio de Autor';
                  return (
                    <div 
                      key={client.id}
                      className="p-2.5 bg-surface-container-lowest border border-[#dfced5]/40 rounded-xl flex items-center justify-between hover:border-[#dfced5] transition-all"
                    >
                      <div className="flex items-center gap-2.5 text-left flex-1 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${client.riskLevel === 'Crítico' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-primary truncate">{client.name}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">
                            Ausente {client.riskDays} d. (Promedio: {client.averageFrequencyDays} d.) • <strong className="font-semibold text-primary">{faveService}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] bg-primary/5 text-primary-fixed border border-primary-fixed/25 font-bold uppercase py-0.5 px-2 rounded-full hidden sm:inline-block">
                          {client.riskLevel === 'Crítico' ? 'Rescate' : 'Oferta'}
                        </span>
                        <button
                          onClick={() => {
                            onSelectClient(client.id);
                            onNavigate('message-editor');
                            onToastMessage(`Abriendo recuperador para ${client.name}`);
                          }}
                          className="px-2.5 py-1 text-[10px] bg-primary text-on-primary rounded-lg font-bold hover:bg-primary-container transition-all cursor-pointer shadow-sm text-center"
                        >
                          Mensaje
                        </button>
                      </div>
                    </div>
                  );
                })}
              {clients.filter(c => c.riskLevel === 'Crítico' || c.riskLevel === 'Alto').length === 0 && (
                <div className="text-center py-6 text-xs text-outline italic">
                  🎉 ¡Excelente! No hay clientas con riesgo crítico o alto en este momento.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Add new client drawer panel */}
      {isAddingNew && (
        <div className="bg-surface-container-lowest border-2 border-primary/20 p-8 rounded-3xl mb-8 shadow-sm max-w-2xl animate-fadeIn text-left font-sans">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-3xl text-primary font-bold">person_add</span>
            <div>
              <h3 className="font-serif text-xl font-bold text-primary">Registrar nueva clienta</h3>
              <p className="text-xs text-on-surface-variant">Configure la información demográfica básica y los indicadores iniciales.</p>
            </div>
          </div>

          <form onSubmit={handleAddNewClientSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary uppercase block">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Carmen Ruiz"
                  className="w-full h-11 p-3 bg-white border border-border rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary uppercase block">Teléfono de Contacto *</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ej. +34 600 123 456"
                  className="w-full h-11 p-3 bg-white border border-border rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary uppercase block">Correo Electrónico</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Ej. carmen.ruiz@email.com"
                  className="w-full h-11 p-3 bg-white border border-border rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary uppercase block">Cumpleaños / Edad</label>
                <input
                  type="text"
                  value={newBirthdate}
                  onChange={(e) => setNewBirthdate(e.target.value)}
                  placeholder="Ej. 15 de Mar (34 años)"
                  className="w-full h-11 p-3 bg-white border border-border rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-primary uppercase block">Clasificación de Riesgo Inicial</label>
                <select
                  value={newRiskLevel}
                  onChange={(e) => setNewRiskLevel(e.target.value as any)}
                  className="w-full h-11 p-3 bg-white border border-border rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-semibold cursor-pointer"
                >
                  <option value="Bajo">🟢 Riesgo Bajo (Visitó recientemente)</option>
                  <option value="Medio">🟡 Riesgo Medio (Desviación estacional)</option>
                  <option value="Alto">🟠 Riesgo Alto (Desviación prolongada)</option>
                  <option value="Crítico">🔴 Riesgo Crítico (Inactividad severa)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6 font-sans">
                <input
                  type="checkbox"
                  id="newVipBtn"
                  checked={newVip}
                  onChange={(e) => setNewVip(e.target.checked)}
                  className="w-4 h-4 text-primary bg-[#faf8f4] border border-outline-variant/30 rounded cursor-pointer animate-none"
                />
                <label htmlFor="newVipBtn" className="text-xs font-bold text-primary select-none cursor-pointer">
                  🌟 Es Clienta VIP Distinguida
                </label>
              </div>
              <div className="md:col-span-2 flex items-start gap-2 pt-2 font-sans">
                <input
                  type="checkbox"
                  id="newContactConsent"
                  checked={newContactConsent}
                  onChange={(e) => setNewContactConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary"
                />
                <label htmlFor="newContactConsent" className="text-xs font-semibold text-primary leading-relaxed cursor-pointer">
                  La clienta acepta recibir comunicaciones de citas y seguimiento comercial por WhatsApp/email.
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-primary/5 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/95 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
              >
                Guardar Ficha
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Búsqueda y Filtros de Clientas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 font-sans">
        {/* Search input field */}
        <div className="md:col-span-5 relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono..."
            className="w-full h-11 pl-10 pr-10 bg-white border border-border rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-medium placeholder-muted-foreground/50 shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-all p-0.5"
            >
              <span className="material-symbols-outlined text-sm font-bold">close</span>
            </button>
          )}
        </div>

        {/* VIP Filter selector */}
        <div className="md:col-span-3 font-sans">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
              star
            </span>
            <select
              value={vipFilter}
              onChange={(e) => setVipFilter(e.target.value as any)}
              className="w-full h-11 pl-9 pr-8 bg-white border border-border rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-semibold shadow-sm appearance-none cursor-pointer"
            >
              <option value="Todos">Todas las Etiquetas</option>
              <option value="VIP">🌟 Clientes VIP</option>
              <option value="No-VIP">Estándar (No VIP)</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
              keyboard_arrow_down
            </span>
          </div>
        </div>

        {/* Sorting criterion selector */}
        <div className="md:col-span-4 font-sans">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
              sort
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-11 pl-9 pr-8 bg-white border border-border rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground font-semibold shadow-sm appearance-none cursor-pointer"
            >
              <option value="days">Ordenar por: Mayor Inactividad</option>
              <option value="ltv">Ordenar por: Gasto Total (€)</option>
              <option value="name">Ordenar por: Nombre (A-Z)</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
              keyboard_arrow_down
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Risk Filter Tabs */}
      <div className="flex border-b border-outline-variant/30 mb-8 w-full overflow-x-auto scrollbar-none font-sans">
        {([ 'Todas', 'Crítico', 'Alto', 'Medio', 'Bajo'] as const).map((level) => {
          const isActive = activeTab === level;
          const count = level === 'Todas' ? clients.length : clients.filter(c => c.riskLevel === level).length;
          const label = level === 'Todas' ? 'Todas' : level === 'Bajo' ? 'Mimo Bajo' : level === 'Medio' ? 'Mimo Medio' : level === 'Alto' ? 'Mimo Alto' : 'Mimo Crítico';
          
          return (
            <button
              key={level}
              onClick={() => {
                setActiveTab(level);
                const levelList = level === 'Todas' ? clients : clients.filter(c => c.riskLevel === level);
                if (levelList.length > 0) {
                  onSelectClient(levelList[0].id);
                }
              }}
              className={`flex-1 min-w-[100px] py-3.5 text-xs md:text-sm font-semibold text-center transition-all duration-300 relative cursor-pointer ${
                isActive 
                  ? 'text-primary border-b-2 border-primary font-bold' 
                  : 'text-on-surface-variant/70 hover:text-primary'
              }`}
            >
              {label} <span className="opacity-60 text-xs font-sans">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Responsive 2-Column Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - List of Clients */}
        <div className="lg:col-span-7 space-y-4">
          {filteredClients.length === 0 ? (
            <div className="bg-surface-container-lowest p-12 text-center rounded-2xl border border-surface-container font-sans">
              <span className="material-symbols-outlined text-4xl text-outline mb-3 block">group_off</span>
              <p className="text-sm font-medium text-on-surface-variant">No se encontraron clientas con los filtros aplicados.</p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setVipFilter('Todos');
                  setActiveTab('Todas');
                }}
                className="mt-3 text-xs font-bold text-primary underline hover:opacity-80"
              >
                Limpiar todos los filtros
              </button>
            </div>
          ) : (
            filteredClients.map((client) => {
              const isSelected = client.id === selectedClientId;
              return (
                <div 
                  key={client.id}
                  onClick={() => onSelectClient(client.id)}
                  className={`bg-white p-6 rounded-xl border transition-all duration-200 cursor-pointer flex justify-between items-start gap-4 hover:shadow-md ${
                    isSelected 
                      ? 'border-primary ring-1 ring-primary shadow-sm bg-secondary/5' 
                      : 'border-muted'
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <img 
                      alt={client.name} 
                      className="w-14 h-14 rounded-full object-cover shadow-inner shrink-0 border border-muted" 
                      src={client.avatar}
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1 text-left">
                        <h3 className="font-serif text-lg font-bold text-primary leading-tight truncate">{client.name}</h3>
                        {client.isVip && (
                          <span className="bg-[#bfa982]/15 text-[#735c00] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 animate-none">
                            VIP
                          </span>
                        )}
                        <span className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                          client.riskLevel === 'Crítico' 
                            ? 'bg-red-100 text-red-800 border-red-200' 
                            : client.riskLevel === 'Alto' 
                            ? 'bg-orange-100 text-orange-850 border-orange-200' 
                            : client.riskLevel === 'Medio' 
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                            : 'bg-green-100 text-green-800 border-green-200'
                        }`}>
                          {client.riskLevel} • {client.riskDays} d. sin cita
                        </span>
                      </div>
                      
                      <p className="text-xs font-medium text-on-surface-variant mb-3 font-sans text-left">
                        Último servicio: <strong className="font-semibold text-primary">{client.lastVisitService}</strong> ({client.lastVisitDate}) • Frecuencia: <strong className="font-bold text-primary">{client.averageFrequencyDays} días</strong>
                      </p>
                      
                      {/* IA Suggestion snippet */}
                      {client.aiReason && (
                        <div className="bg-surface-container-low/60 border border-outline-variant/10 rounded-xl p-3 text-xs text-on-surface-variant shadow-sm leading-relaxed italic font-sans text-left">
                          <span className="font-bold text-primary not-italic text-[9.5px] block mb-0.5 uppercase tracking-wider">CÓMO TRAERLA DE VUELTA</span>
                          {client.aiReason}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors self-center">
                    chevron_right
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column - Client Side Preview Suite */}
        <div className="lg:col-span-5">
          {currentClient ? (
            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 border border-surface-container sticky top-28 ambient-shadow space-y-6">
              
              {/* Header Profile Info in panel */}
              <div className="flex flex-col items-center text-center pb-6 border-b border-outline-variant/30">
                <img 
                  alt={currentClient.name} 
                  className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-primary/10 shadow-md animate-fadeIn" 
                  src={currentClient.avatar}
                  referrerPolicy="no-referrer"
                />
                
                <div className="flex items-center gap-2 justify-center mb-1">
                  <h3 className="font-serif text-2xl font-bold text-primary">{currentClient.name}</h3>
                  {currentClient.isVip && (
                    <span className="bg-tertiary-container text-on-tertiary-container text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                      VIP
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-on-surface-variant font-semibold mb-4">{currentClient.email || 'Sin email registrado'} • {currentClient.phoneNumber}</p>
                
                <div className="flex gap-4 justify-center w-full font-sans">
                  <div className="flex-1 bg-surface-container-low py-2.5 px-4 rounded-xl text-center border border-surface-container">
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Días ausente</p>
                    <p className="font-serif text-xl font-bold text-error">{currentClient.riskDays || 0}</p>
                  </div>
                  <div className="flex-1 bg-surface-container-low py-2.5 px-4 rounded-xl text-center border border-surface-container">
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Total Facturado</p>
                    <p className="font-serif text-xl font-bold text-primary">{currentClient.spendingLtv || 0}€</p>
                  </div>
                </div>
              </div>

              {/* Offer Details */}
              {currentClient.suggestedOfferTitle && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    <h4>Oferta sugerida por IA</h4>
                  </div>
                  
                  <div className="bg-primary shadow-inner rounded-xl p-5 text-on-primary text-xs leading-relaxed">
                    <p className="font-serif text-base font-bold text-tertiary-fixed mb-1">{currentClient.suggestedOfferTitle}</p>
                    <p className="text-primary-fixed-dim font-medium">{currentClient.suggestedOfferDesc}</p>
                  </div>
                </div>
              )}

              {/* Behavior Analysis */}
              {currentClient.aiReason && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Análisis de Alerta</h4>
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed bg-surface-container-low p-4 rounded-xl border border-surface-container/40">
                    {currentClient.aiReason}
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-4 border-t border-outline-variant/30 flex flex-col gap-3 font-sans">
                <button
                  id="btn-preview-review-msg" 
                  onClick={() => handleReviewMessageClick(currentClient)}
                  className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:bg-primary-container transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm font-bold">mail</span>
                  <span>Enviar Invitación</span>
                </button>
                
                <button
                  id="btn-preview-view-profile" 
                  onClick={() => handleViewProfileClick(currentClient)}
                  className="w-full bg-surface hover:bg-surface-container-high border border-outline py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-primary transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span>Ver Perfil Completo</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-surface-container text-center text-outline text-xs">
              Selecciona una clienta en la lista para ver el análisis de retención.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
