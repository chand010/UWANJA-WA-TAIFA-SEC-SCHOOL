import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Student, 
  Grade, 
  Attendance, 
  Fee, 
  UserProfile 
} from '../types';
import { 
  User, 
  Calendar, 
  Award, 
  Wallet, 
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  BookOpen,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function StudentProfile({ userProfile }: { userProfile: UserProfile | null }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'attendance' | 'fees'>('overview');

  const isSwahili = userProfile?.preferredLanguage === 'Swahili';

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const studentDoc = await getDoc(doc(db, 'students', id));
        if (studentDoc.exists()) {
          setStudent({ id: studentDoc.id, ...studentDoc.data() } as Student);
        } else {
          setLoading(false);
          return;
        }

        // Real-time listeners for updates
        const gradesQuery = query(collection(db, 'grades'), where('studentId', '==', id), orderBy('year', 'desc'), orderBy('term', 'desc'));
        const attQuery = query(collection(db, 'attendance'), where('studentId', '==', id), orderBy('date', 'desc'));
        const feesQuery = query(collection(db, 'fees'), where('studentId', '==', id), orderBy('date', 'desc'));

        const unsubGrades = onSnapshot(gradesQuery, (snap) => {
          setGrades(snap.docs.map(d => ({ id: d.id, ...d.data() } as Grade)));
        });

        const unsubAtt = onSnapshot(attQuery, (snap) => {
          setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
        });

        const unsubFees = onSnapshot(feesQuery, (snap) => {
          setFees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fee)));
          setLoading(false);
        });

        return () => {
          unsubGrades();
          unsubAtt();
          unsubFees();
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'student-profile');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center p-12">
        <h2 className="text-2xl font-bold text-slate-900">{isSwahili ? 'Mwanafunzi hajapatikana' : 'Student not found'}</h2>
        <button onClick={() => navigate('/students')} className="mt-4 text-blue-600 hover:underline">
          {isSwahili ? 'Rudi kwenye orodha' : 'Back to list'}
        </button>
      </div>
    );
  }

  const attendanceStats = {
    present: attendance.filter(a => a.status === 'Present').length,
    absent: attendance.filter(a => a.status === 'Absent').length,
    late: attendance.filter(a => a.status === 'Late').length,
    total: attendance.length,
    percentage: attendance.length > 0 
      ? Math.round((attendance.filter(a => a.status === 'Present' || a.status === 'Late').length / attendance.length) * 100) 
      : 100
  };

  const academicStats = {
    average: grades.length > 0 
      ? Math.round(grades.reduce((acc, g) => acc + g.score, 0) / grades.length) 
      : 0,
    totalExams: grades.length
  };

  const feeStats = {
    totalPaid: fees.reduce((acc, f) => acc + f.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/students')}
          className="rounded-xl bg-white p-2 text-slate-400 shadow-sm border border-slate-200 hover:text-slate-600 transition-all hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {isSwahili ? 'Wasifu wa Mwanafunzi' : 'Student Profile'}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="space-y-6 lg:col-span-1">
          <div className="overflow-hidden rounded-[2.5rem] bg-white border border-slate-200 shadow-sm">
            <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 p-6" />
            <div className="-mt-16 px-6 pb-6">
              <div className="relative mb-4 flex justify-center">
                <div className="h-32 w-32 rounded-[2rem] bg-white p-1 shadow-xl">
                  <div className="flex h-full w-full items-center justify-center rounded-[1.75rem] bg-slate-100 text-4xl font-extrabold text-blue-600">
                    {student.fullName[0]}
                  </div>
                </div>
                <div className={cn(
                  "absolute -bottom-2 right-1/2 translate-x-16 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white border-4 border-white shadow-lg",
                  student.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'
                )}>
                  {student.status}
                </div>
              </div>

              <div className="text-center px-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight italic uppercase">
                  {student.fullName}
                </h2>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                    {student.form} - {student.stream}
                  </span>
                </div>
                <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  REG: {student.nectaRegNumber || 'UNREGISTERED'}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 border-t border-slate-100 pt-6">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Gender</div>
                  <div className="text-xs font-bold text-slate-700">{student.gender}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Birthday</div>
                  <div className="text-xs font-bold text-slate-700">{student.dob}</div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 px-4">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Parent Linked via UID:</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-400">{student.parentUid?.slice(0, 8) || 'None'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-3">
            <div className="group rounded-3xl bg-emerald-50 p-5 border border-emerald-100 transition-all hover:bg-emerald-100/50">
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="text-2xl font-black text-emerald-600">{attendanceStats.percentage}%</span>
              </div>
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest">{isSwahili ? 'Mahudhurio' : 'Attendance'}</div>
              <div className="mt-1 text-[10px] text-emerald-600/70">{attendanceStats.present} {isSwahili ? 'Siku za kuwepo' : 'Days present'}</div>
            </div>

            <div className="group rounded-3xl bg-blue-50 p-5 border border-blue-100 transition-all hover:bg-blue-100/50">
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-2xl font-black text-blue-600">{academicStats.average}%</span>
              </div>
              <div className="text-xs font-bold text-blue-700 uppercase tracking-widest">{isSwahili ? 'Wastani' : 'Average Score'}</div>
              <div className="mt-1 text-[10px] text-blue-600/70">{academicStats.totalExams} {isSwahili ? 'Mitihani iliyofanywa' : 'Exams taken'}</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            {[
              { id: 'overview', icon: LayoutDashboard, label: isSwahili ? 'Muhtasari' : 'Overview' },
              { id: 'academic', icon: Award, label: isSwahili ? 'Akademia' : 'Academic' },
              { id: 'attendance', icon: Calendar, label: isSwahili ? 'Mahudhurio' : 'Attendance' },
              { id: 'fees', icon: Wallet, label: isSwahili ? 'Malipo' : 'Fees' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-slate-900 text-white shadow-lg" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Attendance Summary */}
                  <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">{isSwahili ? 'Rekodi za Karibuni za Mahudhurio' : 'Recent Attendance'}</h3>
                    <div className="space-y-3">
                      {attendance.slice(0, 5).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              record.status === 'Present' ? 'bg-emerald-500' : record.status === 'Late' ? 'bg-amber-500' : 'bg-rose-500'
                            )} />
                            <span className="text-xs font-bold text-slate-700">{format(new Date(record.date), 'MMM d, yyyy')}</span>
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider",
                            record.status === 'Present' ? 'text-emerald-600' : record.status === 'Late' ? 'text-amber-600' : 'text-rose-600'
                          )}>
                            {record.status}
                          </span>
                        </div>
                      ))}
                      {attendance.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-400 italic">No attendance records yet</div>
                      )}
                    </div>
                  </div>

                  {/* Fee Summary */}
                  <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">{isSwahili ? 'Malipo ya Karibuni' : 'Recent Payments'}</h3>
                    <div className="space-y-3">
                      {fees.slice(0, 5).map((fee) => (
                        <div key={fee.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <div>
                            <div className="text-xs font-bold text-slate-700">{fee.category}</div>
                            <div className="text-[10px] text-slate-400">{format(new Date(fee.date), 'MMM d, yyyy')}</div>
                          </div>
                          <div className="text-xs font-black text-blue-600">
                            {fee.amount.toLocaleString()} TZS
                          </div>
                        </div>
                      ))}
                      {fees.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-400 italic">No fee records yet</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Academic Chart */}
                <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-6">{isSwahili ? 'Mwenendo wa Kitaaluma' : 'Academic Performance Trend'}</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...grades].reverse()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="recordedAt" 
                          hide 
                        />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#2563eb" 
                          strokeWidth={4} 
                          dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} 
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'academic' && (
              <motion.div
                key="academic"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm"
              >
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Score</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Term</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grades.map((grade) => (
                      <tr key={grade.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-900">{grade.subject}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">{grade.category}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center rounded-xl px-3 py-1 text-xs font-black",
                            grade.score >= 80 ? "bg-emerald-50 text-emerald-600" :
                            grade.score >= 50 ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {grade.score} / {grade.maxScore || 100}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700">Term {grade.term}</td>
                        <td className="px-6 py-4 text-right text-xs text-slate-400">
                          {format(new Date(grade.year, 0, 1), 'yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {activeTab === 'attendance' && (
              <motion.div
                key="attendance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-3xl bg-emerald-50 p-6 border border-emerald-100 text-center">
                    <div className="text-2xl font-black text-emerald-600">{attendanceStats.present}</div>
                    <div className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest uppercase">Present</div>
                  </div>
                  <div className="rounded-3xl bg-rose-50 p-6 border border-rose-100 text-center">
                    <div className="text-2xl font-black text-rose-600">{attendanceStats.absent}</div>
                    <div className="text-[10px] font-bold text-rose-600/60 uppercase tracking-widest uppercase">Absent</div>
                  </div>
                  <div className="rounded-3xl bg-amber-50 p-6 border border-amber-100 text-center">
                    <div className="text-2xl font-black text-amber-600">{attendanceStats.late}</div>
                    <div className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest uppercase">Late</div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason / Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendance.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-slate-700">
                            {format(new Date(record.date), 'EEEE, MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                              record.status === 'Present' ? "bg-emerald-50 text-emerald-600" :
                              record.status === 'Late' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {record.status === 'Present' ? <CheckCircle2 className="h-3 w-3" /> : 
                               record.status === 'Late' ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 italic">
                            {record.reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'fees' && (
              <motion.div
                key="fees"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/20">
                  <div className="flex items-center justify-between mb-8">
                    <Wallet className="h-8 w-8 text-blue-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">School Fees Wallet</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{isSwahili ? 'Jumla Iliyolipwa' : 'Total Paid Amount'}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white">{feeStats.totalPaid.toLocaleString()}</span>
                      <span className="text-lg font-bold text-blue-400">TZS</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fees.map((fee) => (
                        <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-slate-700">
                            {format(new Date(fee.date), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-900">{fee.category}</span>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Term {fee.term}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Wallet className="h-3 w-3 text-slate-400" />
                              </div>
                              <span className="text-xs font-medium text-slate-600">{fee.paymentMethod}</span>
                            </div>
                            <div className="text-[9px] font-mono text-slate-400 mt-0.5">{fee.transactionId}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-black text-slate-900">{fee.amount.toLocaleString()}</div>
                            <div className="text-[9px] font-bold text-slate-400">TZS</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
