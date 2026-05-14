import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Student, Fee, UserProfile } from '../types';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Receipt,
  Smartphone,
  History,
  TrendingUp,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatTanzanianCurrency, PAYMENT_METHODS, FEE_CATEGORIES, ACADEMIC_TERMS } from '../lib/utils';

export default function FeeManager({ userProfile }: { userProfile: UserProfile | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [newFee, setNewFee] = useState({
    studentId: '',
    amount: 0,
    category: 'Tuition',
    term: 1,
    paymentMethod: 'M-Pesa',
    transactionId: ''
  });
  const [loading, setLoading] = useState(true);

  const isSwahili = userProfile?.preferredLanguage === 'Swahili';
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    async function fetchData() {
      try {
        const studentsSnap = await getDocs(query(collection(db, 'students'), orderBy('fullName')));
        setStudents(studentsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Student)));
        
        const feesSnap = await getDocs(query(collection(db, 'fees'), orderBy('date', 'desc')));
        setFees(feesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Fee)));
      } catch (error) {
        handleFirestoreError(error, 'list' as any, 'fees');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await addDoc(collection(db, 'fees'), {
        ...newFee,
        date: new Date().toISOString(),
        recordedBy: userProfile?.uid
      });
      setShowAddPayment(false);
      // Refresh logic would go here
    } catch (error) {
       console.error("Failed to add payment", error);
    }
  };

  const totalCollected = fees.reduce((acc, f) => acc + f.amount, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isSwahili ? 'Usimamizi wa Ada' : 'Fee Management'}</h1>
          <p className="text-sm text-slate-500">
            {isSwahili ? 'Fuatilia malipo ya ada na michango (Mobile Money Support)' : 'Tracking tuition, uniforms, and other school contributions.'}
          </p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">
            <Download className="h-4 w-4" />
            Report
          </button>
          {isAdmin && (
            <button 
              onClick={() => setShowAddPayment(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
            >
              <Plus className="h-4 w-4" />
              {isSwahili ? 'Sajili Malipo' : 'Record Payment'}
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Collected</span>
          </div>
          <p className="text-sm font-medium text-emerald-700">{isSwahili ? 'Jumla ya Mapato' : 'Total Collected'}</p>
          <h3 className="text-2xl font-bold text-emerald-900">{formatTanzanianCurrency(totalCollected)}</h3>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-blue-50 p-6">
           <div className="flex items-center justify-between mb-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Mobile Money</span>
          </div>
          <p className="text-sm font-medium text-blue-700">{isSwahili ? 'Kupitia Simu' : 'Via Mobile Money'}</p>
          <h3 className="text-2xl font-bold text-blue-900">
            {formatTanzanianCurrency(fees.filter(f => f.paymentMethod !== 'Bank' && f.paymentMethod !== 'Cash').reduce((acc, f) => acc + f.amount, 0))}
          </h3>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
           <div className="flex items-center justify-between mb-2">
            <History className="h-5 w-5 text-slate-600" />
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Transactions</span>
          </div>
          <p className="text-sm font-medium text-slate-700">{isSwahili ? 'Idadi ya Malipo' : 'Record Count'}</p>
          <h3 className="text-2xl font-bold text-slate-900">{fees.length}</h3>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{isSwahili ? 'Historia ya Malipo' : 'Payment History'}</h3>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
             <input 
              type="text" 
              placeholder="Search reference..."
              className="rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
             />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Method</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Ref ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fees.map((fee) => {
                const student = students.find(s => s.id === fee.studentId);
                return (
                  <tr key={fee.id} className="transition hover:bg-slate-50/30">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{student?.fullName || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{student?.form}</p>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{fee.category}</span>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-sm font-bold text-slate-900">{formatTanzanianCurrency(fee.amount)}</p>
                       <p className="text-[10px] text-slate-400">{fee.date.split('T')[0]}</p>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2 text-sm text-slate-600">
                         <span className={cn(
                           "h-2 w-2 rounded-full",
                           fee.paymentMethod.includes('Pesa') ? "bg-emerald-500" : "bg-blue-500"
                         )} />
                         {fee.paymentMethod}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-mono text-xs text-slate-400">{fee.transactionId || '---'}</span>
                    </td>
                  </tr>
                );
              })}
              {fees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                    No fee payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-900">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setShowAddPayment(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-500" />
                {isSwahili ? 'Sajili Malipo ya Mwanafunzi' : 'Record Student Payment'}
              </h2>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mwanafunzi / Student</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder={isSwahili ? "Tafuta mwanafunzi..." : "Search student..."}
                        className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {students
                        .filter(s => s.fullName.toLowerCase().includes(studentSearch.toLowerCase()))
                        .slice(0, 50)
                        .map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setNewFee({...newFee, studentId: s.id!});
                              setStudentSearch(s.fullName);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-blue-50",
                              newFee.studentId === s.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                            )}
                          >
                            <span>{s.fullName} <span className="text-[10px] text-slate-400 uppercase">({s.form})</span></span>
                            {newFee.studentId === s.id && <CreditCard className="h-3 w-3 text-blue-600" />}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{isSwahili ? 'Kiasi (TZS)' : 'Amount (TZS)'}</label>
                    <input 
                      required
                      type="number" 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2"
                      value={newFee.amount}
                      onChange={e => setNewFee({...newFee, amount: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{isSwahili ? 'Muhula' : 'Term'}</label>
                    <select 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2"
                      value={newFee.term}
                      onChange={e => setNewFee({...newFee, term: Number(e.target.value)})}
                    >
                      {ACADEMIC_TERMS.map(t => <option key={t} value={t}>Term {t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Aina / Category</label>
                    <select 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2"
                      value={newFee.category}
                      onChange={e => setNewFee({...newFee, category: e.target.value})}
                    >
                      {FEE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Method</label>
                    <select 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2"
                      value={newFee.paymentMethod}
                      onChange={e => setNewFee({...newFee, paymentMethod: e.target.value})}
                    >
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Transaction Ref ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. PP230427.1234.F56789"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2 font-mono text-sm"
                    value={newFee.transactionId}
                    onChange={e => setNewFee({...newFee, transactionId: e.target.value})}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                   <button 
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                  >
                    Post Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
