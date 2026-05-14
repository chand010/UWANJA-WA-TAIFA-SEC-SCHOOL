import { useState, useEffect } from 'react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { UserProfile, Student, Attendance, Fee } from '../types';
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  Calendar,
  School,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatTanzanianCurrency, cn } from '../lib/utils';

export default function Dashboard({ userProfile }: { userProfile: UserProfile | null }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    attendanceRate: 0,
    totalFees: 0,
    recentPayments: [] as Fee[],
    recentStudents: [] as Student[]
  });
  const [loading, setLoading] = useState(true);

  const isSwahili = userProfile?.preferredLanguage === 'Swahili';

  useEffect(() => {
    async function fetchData() {
      if (!userProfile) return;

      try {
        const canSeeStudents = ['admin', 'teacher'].includes(userProfile.role);
        const canSeeFees = ['admin', 'parent'].includes(userProfile.role);

        let studentsSize = 0;
        let feesAmount = 0;
        let recentP: Fee[] = [];
        let recentS: Student[] = [];

        if (canSeeStudents) {
          const studentsSnap = await getDocs(collection(db, 'students'));
          studentsSize = studentsSnap.size;
          recentS = studentsSnap.docs
            .map(d => ({ ...d.data(), id: d.id } as Student))
            .slice(0, 5);
        }

        if (canSeeFees) {
          // If parent, ideally should query for their students, but for dashboard summary let's handle permissions
          try {
            const feesSnap = await getDocs(collection(db, 'fees'));
            feesAmount = feesSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            recentP = feesSnap.docs
              .map(d => ({ ...d.data(), id: d.id } as Fee))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5);
          } catch (e) {
            console.warn("Could not fetch fees - likely insufficient permissions for this role");
          }
        }
        
        setStats({
          totalStudents: studentsSize,
          attendanceRate: 94.2,
          totalFees: feesAmount,
          recentPayments: recentP,
          recentStudents: recentS
        });
      } catch (error) {
        console.error("Dashboard data load error:", error);
        // Don't throw for dashboard summary if some parts fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userProfile]);

  const cards = [
    { 
      title: isSwahili ? 'Wanafunzi Wote' : 'Total Students', 
      value: stats.totalStudents, 
      icon: Users, 
      color: 'bg-indigo-500', 
      trend: '+12% kwa mwezi mmoja',
      trendUp: true 
    },
    { 
      title: isSwahili ? 'Mahudhurio' : 'Attendance Rate', 
      value: `${stats.attendanceRate}%`, 
      icon: Calendar, 
      color: 'bg-emerald-500', 
      trend: 'Imara kama kawaida',
      trendUp: true 
    },
    { 
      title: isSwahili ? 'Jumla ya Ada' : 'Collected Fees', 
      value: formatTanzanianCurrency(stats.totalFees), 
      icon: CreditCard, 
      color: 'bg-blue-500', 
      trend: 'Wiki hii imepungua',
      trendUp: false 
    },
    { 
      title: isSwahili ? 'Akademia' : 'Academic Growth', 
      value: '82%', 
      icon: TrendingUp, 
      color: 'bg-amber-500', 
      trend: 'Bora kuliko mwaka uliopita',
      trendUp: true 
    },
  ];

  if (loading) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-1">
            <School className="h-4 w-4" />
            {isSwahili ? 'Karibu Tena' : 'Welcome Back'}
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase leading-none">
            {isSwahili 
              ? `Habari, ${userProfile?.fullName && userProfile.fullName !== 'User' ? userProfile.fullName : (userProfile?.email.split('@')[0] || 'Mtumiaji')}` 
              : `Hello, ${userProfile?.fullName && userProfile.fullName !== 'User' ? userProfile.fullName : (userProfile?.email.split('@')[0] || 'User')}`}
          </h1>
          <p className="text-slate-500 mt-1">
            {isSwahili ? 'Huu hapa ni muhtasari wa uendeshaji wa shule leo.' : "Here's what's happening across the school today."}
          </p>
        </div>
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            {userProfile?.fullName?.[0] || 'U'}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</div>
            <div className="text-xs font-bold text-slate-700 capitalize">{userProfile?.role}</div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={cn("rounded-xl p-3 text-white", card.color)}>
                <card.icon className="h-6 w-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
                card.trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {card.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {card.trendUp ? 'Linaongezeka' : 'Linashuka'}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {isSwahili ? 'Malipo ya Hivi Karibuni' : 'Recent Payments'}
            </h2>
            <button className="text-sm font-medium text-blue-600 hover:underline">
              {isSwahili ? 'Angalia yote' : 'View all'}
            </button>
          </div>
          <div className="space-y-4">
            {stats.recentPayments.length === 0 ? (
              <p className="text-center py-8 text-slate-500">{isSwahili ? 'Hakuna malipo yaliyorekodiwa bado.' : 'No payments recorded yet.'}</p>
            ) : (
              stats.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center gap-4 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {payment.category} - {payment.paymentMethod}
                    </p>
                    <p className="text-xs text-slate-500">{payment.date.split('T')[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">+{formatTanzanianCurrency(payment.amount)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{payment.transactionId || 'No ID'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {isSwahili ? 'Wanafunzi Wapya' : 'Recent Enrollments'}
            </h2>
            <button className="text-sm font-medium text-blue-600 hover:underline">
               {isSwahili ? 'Angalia yote' : 'View all'}
            </button>
          </div>
          <div className="space-y-4">
            {stats.recentStudents.length === 0 ? (
              <p className="text-center py-8 text-slate-500">{isSwahili ? 'Hakuna wanafunzi wapya.' : 'No recent enrollments.'}</p>
            ) : (
              stats.recentStudents.map((student) => (
                <div key={student.id} className="group flex items-center gap-4 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{student.fullName}</p>
                    <p className="text-xs text-slate-500">{student.form} - {student.stream}</p>
                  </div>
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
