import React, { useState } from 'react';
import { Tenant, StaffMember, AppConfig } from '../types';

interface StaffTenantViewProps {
  tenants: Tenant[];
  staff: StaffMember[];
  selectedTenantId: string;
  config: AppConfig;
  onAddTenant: (newTenant: Tenant) => void;
  onAddStaff: (newStaff: StaffMember) => void;
  onUpdateStaff?: (staffId: string, updated: Partial<StaffMember>) => void;
  onSelectTenant: (tenantId: string) => void;
  onUpdateConfig: (updated: Partial<AppConfig>) => void;
  onToastMessage: (msg: string) => void;
}

export default function StaffTenantView({
  tenants,
  staff,
  selectedTenantId,
  config,
  onAddTenant,
  onAddStaff,
  onUpdateStaff,
  onSelectTenant,
  onUpdateConfig,
  onToastMessage
}: StaffTenantViewProps) {
  const [activeTab, setActiveTab] = useState<'perfil' | 'salones' | 'equipo'>('perfil');

  // Multi-tenant Creator form
  const [isAddTenantOpen, setIsAddTenantOpen] = useState<boolean>(false);
  const [tName, setTName] = useState<string>('');
  const [tAddress, setTAddress] = useState<string>('');
  const [tPhone, setTPhone] = useState<string>('');
  const [tCity, setTCity] = useState<string>('Madrid');

  // Staff Creator form
  const [isAddStaffOpen, setIsAddStaffOpen] = useState<boolean>(false);
  const [sName, setSName] = useState<string>('');
  const [sRole, setSRole] = useState<StaffMember['role']>('Estilista de autor');
  const [sEmail, setSEmail] = useState<string>('');
  const [sPhone, setSPhone] = useState<string>('');
  const [sSpecialty, setSSpecialty] = useState<string>('');
  const [sTenantId, setSTenantId] = useState<string>(selectedTenantId);
  const [sVisibleToClient, setSVisibleToClient] = useState<boolean>(true);

  const activeTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];

  const handleAddTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim()) return;

    const newTenantID = tName.toLowerCase().replace(/\s+/g, '-');
    const newTenant: Tenant = {
      id: newTenantID,
      name: tName,
      address: tAddress,
      phone: tPhone,
      city: tCity
    };

    onAddTenant(newTenant);
    setIsAddTenantOpen(false);
    onSelectTenant(newTenantID);
    onToastMessage(`🏢 Sucursal "${tName}" creada e iniciada como activa.`);
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      name: sName,
      role: sRole,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      email: sEmail,
      phone: sPhone,
      specialty: sSpecialty,
      tenantId: sTenantId,
      visibleToClient: sVisibleToClient
    };

    onAddStaff(newStaff);
    setIsAddStaffOpen(false);
    onToastMessage(`👤 Profesional de autor "${sName}" añadido al equipo.`);
  };

  const handleRoleChange = (role: AppConfig['activeStaffRole']) => {
    onUpdateConfig({ activeStaffRole: role });
    onToastMessage(`Rol activo cambiado a: ${role}.`);
  };

  return (
    <div className="flex-1 pb-16">
      
      {/* Title description bar */}
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-semibold text-primary">Salón y equipo</h2>
        <p className="text-sm text-on-surface-variant font-medium">
          Gestiona los datos comerciales, sucursales y profesionales que aparecen en agenda.
        </p>
      </div>

      {/* Internal Nav Tabs */}
      <div className="flex border-b border-outline-variant/30 mb-8 max-w-md">
        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-all cursor-pointer ${
            activeTab === 'perfil' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant/70 hover:text-primary'
          }`}
        >
          Perfil
        </button>
        <button
          onClick={() => setActiveTab('salones')}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-all cursor-pointer ${
            activeTab === 'salones' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant/70 hover:text-primary'
          }`}
        >
          Sucursales
        </button>
        <button
          onClick={() => setActiveTab('equipo')}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-all cursor-pointer ${
            activeTab === 'equipo' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant/70 hover:text-primary'
          }`}
        >
          Equipo / Staff
        </button>
      </div>

      {/* TABS CONTAINER */}
      
      {/* Tab 1: Autenticación */}
      {activeTab === 'perfil' && (
        <div className="space-y-6 max-w-2xl bg-surface-container-lowest p-8 rounded-2xl border border-surface-container shadow-sm">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            <h3>Perfil operativo</h3>
          </div>
          
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Estos datos definen cómo trabaja tu equipo dentro de <strong>{activeTenant?.name || 'tu salón'}</strong>.
          </p>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-outline mb-0.5">Usuario Activo</p>
              <h4 className="font-serif text-lg font-bold text-primary">{staff[0]?.name || 'Propietaria'}</h4>
              <p className="text-xs text-on-surface-variant font-medium">Asignada como {config.activeStaffRole} de la Suite</p>
            </div>
            
            <span className="bg-[#bfa982] text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-full tracking-wider">
              {config.activeStaffRole} ACTIVO
            </span>
          </div>

          <h4 className="text-xs uppercase font-bold tracking-wider text-outline mb-2">Rol activo:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { role: 'Propietaria', desc: 'Acceso total, reportes, campañas e inventario.' },
              { role: 'Estilista Principal', desc: 'Registro de fórmulas de color y citas.' },
              { role: 'Recepcionista', desc: 'Recepción presencial y agenda diaria.' }
            ].map(r => {
              const isActive = config.activeStaffRole === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => handleRoleChange(r.role as any)}
                  type="button"
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive 
                      ? 'border-primary ring-1 ring-primary bg-primary-fixed/5' 
                      : 'border-outline-variant/40 hover:bg-surface-container-low'
                  }`}
                >
                  <p className="font-bold text-xs text-primary mb-1">{r.role}</p>
                  <p className="text-[10.5px] text-on-surface-variant/80 font-medium leading-normal">{r.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="pt-6 border-t border-outline-variant/20 flex justify-between text-[11px] text-outline">
            <span>Cuenta privada del salón</span>
            <span className="text-emerald-700 font-bold">• Sesión segura</span>
          </div>
        </div>
      )}

      {/* Tab 2: Sucursales/Tenants */}
      {activeTab === 'salones' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm mr-auto w-full">
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">Sucursales del salón</h3>
              <p className="text-xs text-on-surface-variant font-medium">
                Actualmente visualizas los datos de la sucursal: <strong className="text-primary">{activeTenant?.name}</strong>.
              </p>
            </div>

            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-full select-none flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">lock</span> Datos privados del tenant activo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tenants.map(t => {
              const isSelected = t.id === selectedTenantId;
              const staffCount = staff.filter(s => s.tenantId === t.id).length;

              return (
                <div 
                  key={t.id}
                  className={`bg-surface-container-lowest p-6 rounded-2xl border transition-all ${
                    isSelected ? 'border-primary ring-1 ring-primary' : 'border-surface-container'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-primary">{t.name}</h4>
                      <p className="text-xs text-outline font-semibold uppercase tracking-wider">{t.city}</p>
                    </div>

                    <span className="text-xs font-bold bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 rounded-full">
                      {staffCount} profesionales
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant font-medium mb-1">📍 Dirección: {t.address}</p>
                  <p className="text-xs text-on-surface-variant font-medium">📞 Contacto: {t.phone}</p>

                  <div className="pt-4 border-t border-outline-variant/20 mt-6 flex justify-between items-center">
                    {isSelected ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm font-bold">check_circle</span> Sucursal Activa
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectTenant(t.id);
                          onToastMessage(`🏢 Sucursal cambiada a: ${t.name}`);
                        }}
                        className="text-xs text-primary hover:text-[#4a2c40]/80 font-bold cursor-pointer"
                      >
                        Establecer como activa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Equipo / Staff */}
      {activeTab === 'equipo' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm w-full">
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">Equipo de Estilistas & Especialistas</h3>
              <p className="text-xs text-on-surface-variant font-medium">
                Personal de autor disponible en tu salón asignado en agenda de forma orgánica.
              </p>
            </div>

            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-full select-none flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">lock</span> Gestión real del equipo
            </span>
          </div>

          {/* List of personnel */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map(member => {
              const matchedTenant = tenants.find(t => t.id === member.tenantId);
              const isVisible = member.visibleToClient !== false;

              return (
                <div 
                  key={member.id}
                  className={`bg-surface-container-lowest p-5 rounded-2xl border transition-all flex gap-4 items-start ${
                    isVisible ? 'border-surface-container' : 'border-dashed border-outline-variant/50 opacity-80 bg-zinc-50'
                  }`}
                >
                  <div className="relative">
                    <img 
                      src={member.avatar} 
                      alt={member.name}
                      className={`w-12 h-12 rounded-full object-cover border shadow-sm transition-all ${
                        isVisible ? 'border-primary/15' : 'border-outline-variant grayscale'
                      }`}
                    />
                    <span 
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold text-white ${
                        isVisible ? 'bg-emerald-600' : 'bg-rose-500'
                      }`}
                      title={isVisible ? 'Visible para clientes' : 'No visible para clientes'}
                    >
                      <span className="material-symbols-outlined text-[8px] font-bold">
                        {isVisible ? 'visibility' : 'visibility_off'}
                      </span>
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="font-serif text-base font-bold text-primary leading-tight truncate">{member.name}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isVisible ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {isVisible ? 'Visible' : 'Privado'}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-outline block mb-2">{member.role}</span>
                    
                    <p className="text-xs font-semibold text-on-surface-variant/80 mb-1">💇 Especialidad: {member.specialty}</p>
                    <p className="text-xs font-semibold text-on-surface-variant/80 mb-3">🏢 Ubicación: {matchedTenant?.name.split('-')[1] || 'Sindicación'}</p>

                    <div className="text-[10px] text-outline font-medium mb-4">
                      <p className="truncate">{member.email}</p>
                      <p>{member.phone}</p>
                    </div>

                    {/* Visibilidad de cara al cliente */}
                    <div className="flex items-center gap-2 pt-3 border-t border-outline-variant/15 mt-3">
                      <input 
                        type="checkbox"
                        id={`visible-${member.id}`}
                        checked={isVisible}
                        onChange={(e) => {
                          if (onUpdateStaff) {
                            onUpdateStaff(member.id, { visibleToClient: e.target.checked });
                            onToastMessage(`👁️ Visibilidad de ${member.name} cambiada a: ${e.target.checked ? 'Visible' : 'No visible'} para clientes`);
                          }
                        }}
                        className="rounded border-outline-variant/80 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer accent-primary"
                      />
                      <label 
                        htmlFor={`visible-${member.id}`} 
                        className="text-[10px] font-bold uppercase tracking-wider text-outline cursor-pointer select-none hover:text-primary transition-colors"
                      >
                        Visible para Clientes
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD TENANT */}
      {isAddTenantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setIsAddTenantOpen(false)}></div>
          <form 
            onSubmit={handleAddTenantSubmit}
            className="bg-surface max-w-sm w-full rounded-2xl p-6 relative z-10 border border-surface-container-high shadow-xl animate-scale-up"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl font-bold text-primary">Nueva Sucursal Premium</h3>
              <button 
                type="button" 
                onClick={() => setIsAddTenantOpen(false)}
                className="text-outline hover:text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="Ej. Elena de Autor - Madrid Salamanca"
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Ciudad</label>
                <input 
                  type="text" 
                  value={tCity}
                  onChange={(e) => setTCity(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Dirección Física</label>
                <input 
                  type="text" 
                  value={tAddress}
                  onChange={(e) => setTAddress(e.target.value)}
                  placeholder="Ej. Calle Serrano 11, Duplicado"
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Teléfono Central</label>
                <input 
                  type="text" 
                  value={tPhone}
                  onChange={(e) => setTPhone(e.target.value)}
                  placeholder="Ej. +34 910 111 222"
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs outline-none focus:border-primary transition-all font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/20 mt-6">
              <button
                type="button"
                onClick={() => setIsAddTenantOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-outline-variant hover:text-primary cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition-all cursor-pointer"
              >
                Añadir Sucursal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: ADD STAFF */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setIsAddStaffOpen(false)}></div>
          <form 
            onSubmit={handleAddStaffSubmit}
            className="bg-surface max-w-sm w-full rounded-2xl p-6 relative z-10 border border-surface-container-high shadow-xl animate-scale-up"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl font-bold text-primary">Inscribir Profesional</h3>
              <button 
                type="button" 
                onClick={() => setIsAddStaffOpen(false)}
                className="text-outline hover:text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="Ej. Laura Gómez"
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Rol / Cargo</label>
                <input 
                  type="text"
                  value={sRole}
                  onChange={(e) => setSRole(e.target.value)}
                  placeholder="Ej. Estilista de autor, Colorista, Técnico..."
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Especialidad de Autor</label>
                <input 
                  type="text" 
                  value={sSpecialty}
                  onChange={(e) => setSSpecialty(e.target.value)}
                  placeholder="Ej. Mechas Balayage, Tratamientos de Vapor"
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs outline-none focus:border-primary transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Destinar a Sucursal</label>
                <select
                  value={sTenantId}
                  onChange={(e) => setSTenantId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-semibold"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Móvil</label>
                  <input 
                    type="text" 
                    value={sPhone}
                    onChange={(e) => setSPhone(e.target.value)}
                    placeholder="+34 600..."
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs outline-none focus:border-primary transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Email corporativo</label>
                  <input 
                    type="email" 
                    value={sEmail}
                    onChange={(e) => setSEmail(e.target.value)}
                    placeholder="laura@elenaos.es"
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs outline-none focus:border-primary transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Visibilidad de cara al cliente checkbox */}
              <div className="flex items-center gap-2.5 p-3.5 bg-primary/5 border border-primary/10 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="add-s-visible"
                  checked={sVisibleToClient}
                  onChange={(e) => setSVisibleToClient(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary"
                />
                <div>
                  <label htmlFor="add-s-visible" className="text-xs font-bold text-primary block cursor-pointer select-none">
                    Visible para Clientes
                  </label>
                  <p className="text-[10px] text-on-surface-variant font-medium">Permitir que este especialista reciba reservas de clientes online.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/20 mt-6">
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-outline-variant hover:text-primary cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition-all cursor-pointer"
              >
                Añadir Especialista
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
