import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  RefreshCw,
  X,
  Mail,
} from 'lucide-react';

export const FamilyView: React.FC = () => {
  const { currentHousehold, user } = useAuth();
  const [householdData, setHouseholdData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    role: 'MEMBER',
  });

  const loadHousehold = async () => {
    if (!currentHousehold?.id) return;
    setLoading(true);
    try {
      const res = await api.getHousehold(currentHousehold.id);
      if (res.success && res.data) {
        setHouseholdData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHousehold();
  }, [currentHousehold?.id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHousehold?.id) return;

    try {
      const res = await api.addHouseholdMember(currentHousehold.id, formData);
      if (res.success) {
        setShowAddModal(false);
        setFormData({ email: '', role: 'MEMBER' });
        loadHousehold();
      } else {
        alert(res.error?.message || 'Failed to add household member');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding member');
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    if (!currentHousehold?.id) return;
    try {
      const res = await api.updateMemberRole(currentHousehold.id, memberId, role);
      if (res.success) {
        loadHousehold();
      } else {
        alert(res.error?.message || 'Failed to update member role');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating role');
    }
  };

  const isOwner = currentHousehold?.role === 'OWNER';
  const isAdminOrOwner = currentHousehold?.role === 'OWNER' || currentHousehold?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Family Members & Roles</h2>
          <p className="text-sm text-slate-400">
            Household isolation and role-based permissions for family financial collaboration
          </p>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Family Member</span>
          </button>
        )}
      </div>

      {/* Role Definitions Information Box */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="font-bold text-indigo-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> OWNER
          </span>
          <p className="text-slate-400 text-[11px]">Full access, manage household billing, delete household, change roles.</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="font-bold text-sky-400 flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> ADMIN
          </span>
          <p className="text-slate-400 text-[11px]">Can manage accounts, invite members, view all transactions.</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
            <Users className="w-4 h-4" /> MEMBER
          </span>
          <p className="text-slate-400 text-[11px]">Can record expenses/income in their accounts and shared accounts.</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="font-bold text-slate-400 flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> VIEWER
          </span>
          <p className="text-slate-400 text-[11px]">Read-only visibility into authorized accounts and dashboard.</p>
        </div>
      </div>

      {/* Members List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span>Loading Household Members...</span>
          </div>
        ) : !householdData?.members || householdData.members.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            No household members found.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {householdData.members.map((m: any) => {
              const isSelf = m.user_id === user?.id;
              return (
                <div
                  key={m.id}
                  className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                      alt={m.name}
                      className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{m.name}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">{m.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-slate-500 block">Joined</span>
                      <span className="text-slate-400 text-xs">{formatDate(m.joined_at)}</span>
                    </div>

                    {/* Role Dropdown / Badge */}
                    {isOwner && m.role !== 'OWNER' ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    ) : (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          m.role === 'OWNER'
                            ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                            : m.role === 'ADMIN'
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            : m.role === 'MEMBER'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add Family Member</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">User Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. spouse@gmail.com, sibling@family.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  User must already have registered an account on this PFinanc instance.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Household Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">ADMIN (Full management permissions)</option>
                  <option value="MEMBER">MEMBER (Can record transactions in assigned accounts)</option>
                  <option value="VIEWER">VIEWER (Read-only dashboard access)</option>
                </select>
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
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
