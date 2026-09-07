import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  FolderTree,
  Plus,
  Tag,
  RefreshCw,
  X,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE',
    parent_category_id: '',
    color: '#6366f1',
    icon: 'Tag',
  });

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createCategory({
        ...formData,
        parent_category_id: formData.parent_category_id || null,
      });
      if (res.success) {
        setShowAddModal(false);
        setFormData({
          name: '',
          type: 'EXPENSE',
          parent_category_id: '',
          color: '#6366f1',
          icon: 'Tag',
        });
        loadCategories();
      } else {
        alert(res.error?.message || 'Failed to create category');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating category');
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH');
  const incomeCategories = categories.filter((c) => c.type === 'INCOME');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Category Hierarchy</h2>
          <p className="text-sm text-slate-400">System default categories and custom family classifications</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Category</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
          <span>Loading Categories...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Categories */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <TrendingDown className="w-4 h-4" />
              <span>Expense Categories</span>
            </div>

            <div className="space-y-3">
              {expenseCategories.map((parent) => (
                <div key={parent.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: parent.color || '#f43f5e' }}
                      ></span>
                      <span className="font-bold text-slate-200 text-xs">{parent.name}</span>
                    </div>
                    {parent.is_system && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        System Default
                      </span>
                    )}
                  </div>

                  {/* Subcategories */}
                  {parent.children && parent.children.length > 0 && (
                    <div className="pl-5 pt-1.5 space-y-1.5 border-l-2 border-slate-800/80">
                      {parent.children.map((child: any) => (
                        <div key={child.id} className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                            {child.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Income Categories */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Income Categories</span>
            </div>

            <div className="space-y-3">
              {incomeCategories.map((parent) => (
                <div key={parent.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: parent.color || '#10b981' }}
                      ></span>
                      <span className="font-bold text-slate-200 text-xs">{parent.name}</span>
                    </div>
                    {parent.is_system && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        System Default
                      </span>
                    )}
                  </div>

                  {/* Subcategories */}
                  {parent.children && parent.children.length > 0 && (
                    <div className="pl-5 pt-1.5 space-y-1.5 border-l-2 border-slate-800/80">
                      {parent.children.map((child: any) => (
                        <div key={child.id} className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                            {child.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add Custom Category</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Care, Solar Maintenance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Parent Category</label>
                  <select
                    value={formData.parent_category_id}
                    onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">None (Top Level Category)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Badge Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-8 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-500/20"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
