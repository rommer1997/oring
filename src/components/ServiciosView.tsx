import React, { useState } from 'react';
import { Service } from '../types';

interface ServiciosViewProps {
  services: Service[];
  onAddService: (newService: Service) => void;
  onEditService: (updated: Service) => void;
  onDeleteService: (id: string) => void;
  onToastMessage: (msg: string) => void;
}

export default function ServiciosView({
  services,
  onAddService,
  onEditService,
  onDeleteService,
  onToastMessage
}: ServiciosViewProps) {
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<'Cabello' | 'Uñas' | 'Facial' | 'Masaje'>('Cabello');
  const [price, setPrice] = useState<number>(50);
  const [duration, setDuration] = useState<number>(60);

  const handleOpenAdd = () => {
    setName('');
    setCategory('Cabello');
    setPrice(50);
    setDuration(60);
    setEditingServiceId(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (s: Service) => {
    setName(s.name);
    setCategory(s.category);
    setPrice(s.price);
    setDuration(s.durationMinutes);
    setEditingServiceId(s.id);
    setIsAddOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onToastMessage('Ingresa un nombre para el servicio.');
      return;
    }

    if (editingServiceId) {
      // Editing
      onEditService({
        id: editingServiceId,
        name,
        category,
        price,
        durationMinutes: duration
      });
      onToastMessage(`Servicio "${name}" actualizado.`);
    } else {
      // Creating new
      const newService: Service = {
        id: `serv-${Date.now()}`,
        name,
        category,
        price,
        durationMinutes: duration
      };
      onAddService(newService);
      onToastMessage(`Tratamiento "${name}" registrado correctamente.`);
    }
    setIsAddOpen(false);
  };

  return (
    <div className="flex-1 pb-16">
      
      {/* Top section overview summary */}
      <div className="flex justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-primary">Catálogo de Servicios</h2>
          <p className="text-sm text-on-surface-variant font-medium">
            Define la lista de experiencias, tratamientos faciales, cortes de autor y tiempos de lavado de tu centro.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-primary text-on-primary font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#4a2c40]/90 transition-all cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Añadir Servicio</span>
        </button>
      </div>

      {/* Grid of beauty services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => {
          // Icon mapping by category
          const categoryIcon = {
            Cabello: 'brush',
            Uñas: 'spa',
            Facial: 'face',
            Masaje: 'relax'
          }[s.category] || 'spa';

          return (
            <div 
              key={s.id}
              className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-primary/5 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-primary/10">
                    {s.category}
                  </span>
                  
                  <span className="font-serif text-2xl font-bold text-primary">{s.price}€</span>
                </div>

                <h3 className="font-serif text-lg font-bold text-primary leading-snug mb-2">{s.name}</h3>
                
                <p className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5 opacity-80">
                  <span className="material-symbols-outlined text-sm font-bold text-[#bfa982]">schedule</span>
                  <span>Duración estimada: {s.durationMinutes} minutos</span>
                </p>
              </div>

              {/* Edit actions bottom */}
              <div className="pt-5 border-t border-outline-variant/20 flex justify-end gap-2 mt-6">
                <button
                  onClick={() => handleOpenEdit(s)}
                  className="p-1.5 text-xs text-primary font-bold hover:bg-primary/5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Estás seguro de eliminar el servicio "${s.name}"?`)) {
                      onDeleteService(s.id);
                      onToastMessage(`Servicio "${s.name}" eliminado.`);
                    }
                  }}
                  className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal slider Form */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setIsAddOpen(false)}></div>
          <form 
            onSubmit={handleSubmit}
            className="bg-surface max-w-sm w-full rounded-2xl p-6 relative z-10 border border-surface-container-high shadow-xl animate-scale-up"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl font-bold text-primary">
                {editingServiceId ? 'Editar Servicio' : 'Nuevo Servicio Premium'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddOpen(false)}
                className="text-outline hover:text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Nombre del Tratamiento</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Hidratación Ácido Hialurónico"
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-semibold"
                >
                  <option value="Cabello">Cabello</option>
                  <option value="Uñas">Uñas</option>
                  <option value="Facial">Facial</option>
                  <option value="Masaje">Masaje</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Precio (€)</label>
                  <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-bold text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Duración (m)</label>
                  <input 
                    type="number" 
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary transition-all font-semibold text-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/20 mt-6 animate-fade-in">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-outline-variant hover:text-primary cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition-all cursor-pointer"
              >
                {editingServiceId ? 'Guardar Cambios' : 'Añadir al catálogo'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
