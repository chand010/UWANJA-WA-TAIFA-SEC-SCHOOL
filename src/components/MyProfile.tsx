import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  Shield, 
  Save,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

export default function MyProfile({ userProfile }: { userProfile: UserProfile | null }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: userProfile?.fullName || '',
    phone: userProfile?.phone || '',
    preferredLanguage: userProfile?.preferredLanguage || 'Swahili'
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!userProfile) return null;

  const isSwahili = formData.preferredLanguage === 'Swahili';

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        fullName: formData.fullName,
        phone: formData.phone,
        preferredLanguage: formData.preferredLanguage
      });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{isSwahili ? 'Wasifu Wangu' : 'My Profile'}</h1>
        <p className="text-sm text-slate-500">{isSwahili ? 'Dhibiti maelezo yako ya kibinafsi na mapendeleo' : 'Manage your personal information and preferences'}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-hidden text-center">
            <div className="relative mb-6 flex justify-center">
              <div className="h-32 w-32 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-blue-500/20 ring-4 ring-white">
                {userProfile.fullName?.[0] || userProfile.email[0].toUpperCase()}
              </div>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight px-4 italic uppercase">
              {userProfile.fullName && userProfile.fullName !== 'User' ? userProfile.fullName : userProfile.email.split('@')[0]}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="px-4 py-1.5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
                {userProfile.role}
              </span>
            </div>
            <div className="mt-4 px-4 py-1.5 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 inline-block border border-slate-100">
              Joined {new Date(userProfile.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Account Security</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-emerald-500" />
                <div className="text-xs font-medium text-slate-700">Verified Account</div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <div className="text-xs text-slate-500 truncate">{userProfile.email}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-6 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{isSwahili ? 'Maelezo ya Kibinafsi' : 'Personal Details'}</h3>
              <button 
                onClick={() => setEditing(!editing)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {editing ? (isSwahili ? 'Ghairi' : 'Cancel') : (isSwahili ? 'Hariri' : 'Edit')}
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isSwahili ? 'Jina Kamili' : 'Full Name'}</label>
                  {editing ? (
                    <input 
                      type="text" 
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700">{userProfile.fullName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isSwahili ? 'Namba ya Simu' : 'Phone Number'}</label>
                  {editing ? (
                    <input 
                      type="text" 
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700">{userProfile.phone || (isSwahili ? 'Haijawekwa' : 'Not Provided')}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isSwahili ? 'Lugha' : 'Preferred Language'}</label>
                  {editing ? (
                    <select 
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none"
                      value={formData.preferredLanguage}
                      onChange={(e) => setFormData({...formData, preferredLanguage: e.target.value as any})}
                    >
                      <option value="Swahili">Kiswahili</option>
                      <option value="English">English</option>
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-slate-700">{userProfile.preferredLanguage}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                  <p className="text-sm font-medium text-slate-500 italic">{userProfile.email} (Primary)</p>
                </div>
              </div>

              {editing && (
                <div className="pt-4 flex items-center gap-4">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
                    {isSwahili ? 'Hifadhi Mabadiliko' : 'Save Changes'}
                  </button>
                </div>
              )}

              {saved && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-emerald-600 font-bold text-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isSwahili ? 'Mafanikio! Wasifu umehifadhiwa.' : 'Success! Profile updated.'}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
