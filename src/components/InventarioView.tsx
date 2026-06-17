import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface InventarioViewProps {
  items: InventoryItem[];
  onAdd: (item: InventoryItem) => void;
  onUpdate: (id: string, fields: Partial<InventoryItem>) => void;
  onDelete: (id: string) => void;
  onToastMessage: (msg: string) => void;
}

const CATEGORIES: InventoryItem['category'][] = [
  'Coloración', 'Tratamiento', 'Uñas', 'Facial', 'Limpieza', 'Herramientas', 'Otro'
];

const categoryColors: Record<string, string> = {
  'Coloración': 'bg-purple-100 text-purple-800',
  'Tratamiento': 'bg-blue-100 text-blue-800',
  'Uñas': 'bg-pink-100 text-pink-800',
  'Facial': 'bg-amber-100 text-amber-800',
  'Limpieza': 'bg-green-100 text-green-800',
  'Herramientas': 'bg-slate-100 text-slate-800',
  'Otro': 'bg-surface-container text-on-surface-variant',
};

const EMPTY_FORM: Omit<InventoryItem, 'id' | 'tenantId' | 'updatedAt'> = {
  name: '', brand: '', category: 'Tratamiento', unit: 'unidades',
  currentStock: 0, minStock: 5, costPrice: 0, supplier: '', notes: '',
};

export default function InventarioView({ items, onAdd, onUpdate, onDelete, onToastMessage }: InventarioViewProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const lowStockItems = useMemo(() => items.filter(i => i.currentStock <= i.minStock), [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchCat = filterCategory === 'Todos' || i.category === filterCategory;
      const matchSearch = !searchTerm || i.name.toLowerCase().includes(searchTerm.toLowerCase()) || (i.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [items, filterCategory, searchTerm]);

  const handleOpenAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setForm({
      name: item.name, brand: item.brand || '', category: item.category,
      unit: item.unit, currentStock: item.currentStock, minStock: item.minStock,
      costPrice: item.costPrice, supplier: item.supplier || '', notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { onToastMessage('El nombre del producto es obligatorio.'); return; }
    setIsSaving(true);
    try {
      if (editingId) {
        onUpdate(editingId, { ...form, updatedAt: new Date().toISOString() });
        onToastMessage(`✓ "${form.name}" actualizado.`);
      } else {
        const newItem: InventoryItem = {
          id: `inv-${Date.now()}`,
          ...form,
          tenantId: '',
          updatedAt: new Date().toISOString(),
        };
        onAdd(newItem);
        onToastMessage(`✓ "${form.name}" añadido al inventario.`);
      }
      setShowForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const totalValue = useMemo(() => items.reduce((sum, i) => sum + i.currentStock * i.costPrice, 0), [items]);

  return (
    <div className="flex-1 pb-16">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-primary">Inventario</h2>
          <p className="text-sm text-on-surface-variant font-medium">Control de stock de productos del salón.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Añadir producto
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 mt-0.5">inventory_2</span>
          <div>
            <p className="text-sm font-bold text-amber-800">
              {lowStockItems.length} {lowStockItems.length === 1 ? 'producto necesita' : 'productos necesitan'} reposición
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {lowStockItems.map(i => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-muted rounded-xl p-5 text-left">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Total referencias</p>
          <p className="font-serif text-2xl font-bold text-primary">{items.length}</p>
        </div>
        <div className="bg-white border border-muted rounded-xl p-5 text-left">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Stock bajo</p>
          <p className="font-serif text-2xl font-bold text-amber-600">{lowStockItems.length}</p>
        </div>
        <div className="bg-white border border-muted rounded-xl p-5 text-left">
          <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Valor stock (coste)</p>
          <p className="font-serif text-2xl font-bold text-primary">{totalValue.toFixed(2)}€</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-full text-sm outline-none focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Todos', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-white text-on-surface-variant border-border hover:border-primary/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">inventory_2</span>
          <p className="text-sm font-semibold text-on-surface-variant">
            {items.length === 0 ? 'Aún no hay productos en el inventario.' : 'Sin resultados para este filtro.'}
          </p>
          {items.length === 0 && (
            <button onClick={handleOpenAdd} className="mt-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-xl cursor-pointer">
              Añadir primer producto
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-muted rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-muted bg-surface-container-lowest">
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Producto</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden md:table-cell">Categoría</th>
                <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Stock</th>
                <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden sm:table-cell">Mínimo</th>
                <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hidden sm:table-cell">Coste/u</th>
                <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/50">
              {filtered.map(item => {
                const isLow = item.currentStock <= item.minStock;
                return (
                  <tr key={item.id} className={`transition-colors hover:bg-surface-container-lowest/50 ${isLow ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-primary text-sm">{item.name}</div>
                      {item.brand && <div className="text-xs text-on-surface-variant">{item.brand}</div>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${categoryColors[item.category]}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isLow && <span className="material-symbols-outlined text-amber-500 text-base">warning</span>}
                        <span className={`font-bold text-base ${isLow ? 'text-amber-600' : 'text-primary'}`}>
                          {item.currentStock}
                        </span>
                        <span className="text-xs text-on-surface-variant">{item.unit}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center hidden sm:table-cell text-on-surface-variant text-xs font-medium">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="px-5 py-4 text-right hidden sm:table-cell font-semibold text-on-surface-variant">
                      {item.costPrice.toFixed(2)}€
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-600 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/30 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-outline-variant/20 z-10 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-primary">
                {editingId ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-primary cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Nombre del producto *</label>
                  <input
                    type="text" required value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary"
                    placeholder="Ej: Champú hidratante keratina"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Marca</label>
                  <input
                    type="text" value={form.brand}
                    onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary"
                    placeholder="Ej: L'Oréal"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value as InventoryItem['category'] }))}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Stock actual</label>
                  <input
                    type="number" min="0" value={form.currentStock}
                    onChange={e => setForm(p => ({ ...p, currentStock: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Stock mínimo</label>
                  <input
                    type="number" min="0" value={form.minStock}
                    onChange={e => setForm(p => ({ ...p, minStock: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Unidad de medida</label>
                  <input
                    type="text" value={form.unit}
                    onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary"
                    placeholder="unidades, ml, kg..."
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Precio coste (€/unidad)</label>
                  <input
                    type="number" min="0" step="0.01" value={form.costPrice}
                    onChange={e => setForm(p => ({ ...p, costPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Proveedor</label>
                  <input
                    type="text" value={form.supplier}
                    onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary"
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Notas</label>
                  <textarea
                    rows={2} value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary resize-none"
                    placeholder="Instrucciones de uso, caducidad..."
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-outline-variant/30">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary cursor-pointer">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-xl hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {editingId ? 'Guardar cambios' : 'Añadir al inventario'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar producto"
        message="¿Estás segura de que deseas eliminar este producto del inventario? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (confirmDelete) {
            onDelete(confirmDelete);
            onToastMessage('Producto eliminado del inventario.');
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
