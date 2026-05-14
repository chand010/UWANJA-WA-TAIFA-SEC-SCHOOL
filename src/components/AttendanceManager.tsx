import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Student, Attendance, UserProfile } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Search,
  ChevronLeft, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, FORMS } from '../lib/utils';
import { format } from 'date-fns';

export default function AttendanceManager({ userProfile }: { userProfile: UserProfile | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedForm, setSelectedForm] = useState('Form 1');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);

  const isSwahili = userProfile?.preferredLanguage === 'Swahili';
  const canMark = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

  useEffect(() => {
    async function fetchData() {
      try {
        const studentsSnap = await getDocs(query(collection(db, 'students'), where('form', '==', selectedForm)));
        setStudents(studentsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Student)));
        
        const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('date', '==', selectedDate)));
        const map: Record<string, Attendance> = {};
        attendanceSnap.docs.forEach(d => {
          const data = d.data() as Attendance;
          map[data.studentId] = { ...data, id: d.id };
        });
        setAttendanceMap(map);
      } catch (error) {
        handleFirestoreError(error, 'list' as any, 'attendance');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedForm, selectedDate]);

  const handleMark = async (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    if (!canMark) return;
    try {
      const existing = attendanceMap[studentId];
      if (existing) {
        // Update logic omitted for brevity in MVP, but would involve updateDoc
        console.log("Already marked");
      } else {
        await addDoc(collection(db, 'attendance'), {
          studentId,
          date: selectedDate,
          status,
          term: 1, // Logic for term based on date would be here
          recordedBy: userProfile?.uid
        });
        // Optimistic UI update
        setAttendanceMap(prev => ({
          ...prev,
          [studentId]: { studentId, date: selectedDate, status, term: 1, recordedBy: userProfile?.uid || '' }
        }));
      }
    } catch (error) {
      console.error("Marking failed", error);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isSwahili ? 'Mahudhurio' : 'Attendance'}</h1>
          <p className="text-sm text-slate-500">
            {isSwahili ? `${format(new Date(selectedDate), 'dd MMMM yyyy')}` : `Marking for ${format(new Date(selectedDate), 'MMMM do, yyyy')}`}
          </p>
        </div>
        <div className="flex gap-2">
           <input 
            type="date" 
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <select 
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
          >
            {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{isSwahili ? 'Wapo' : 'Present'}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {Object.values(attendanceMap).filter((a: any) => a.status === 'Present').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{isSwahili ? 'Hawapo' : 'Absent'}</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">
            {Object.values(attendanceMap).filter((a: any) => a.status === 'Absent').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{isSwahili ? 'Wamechelewa' : 'Late'}</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
             {Object.values(attendanceMap).filter((a: any) => a.status === 'Late').length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder={isSwahili ? "Tafuta mwanafunzi..." : "Search student..."}
              className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-xs font-medium text-slate-500">
            {isSwahili ? `Wanafunzi ${students.length}` : `${students.length} Students`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students
                .filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((student) => {
                const att = attendanceMap[student.id!];
                return (
                  <tr key={student.id} className="transition hover:bg-slate-50/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs text-center">
                          {student.fullName[0]}
                        </div>
                        <span className="font-medium text-slate-900">{student.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {att ? (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          att.status === 'Present' ? "bg-emerald-50 text-emerald-700" :
                          att.status === 'Absent' ? "bg-rose-50 text-rose-700" :
                          "bg-amber-50 text-amber-700"
                        )}>
                          {att.status === 'Present' && <CheckCircle2 className="h-3 w-3" />}
                          {att.status === 'Absent' && <XCircle className="h-3 w-3" />}
                          {att.status === 'Late' && <Clock className="h-3 w-3" />}
                          {att.status}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">Unmarked</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button 
                          disabled={!canMark}
                          onClick={() => student.id && handleMark(student.id, 'Present')}
                          className={cn(
                            "rounded-lg p-2 transition",
                            att?.status === 'Present' ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button 
                          disabled={!canMark}
                          onClick={() => student.id && handleMark(student.id, 'Late')}
                          className={cn(
                            "rounded-lg p-2 transition",
                            att?.status === 'Late' ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50"
                          )}
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        <button 
                          disabled={!canMark}
                          onClick={() => student.id && handleMark(student.id, 'Absent')}
                          className={cn(
                            "rounded-lg p-2 transition",
                            att?.status === 'Absent' ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" : "bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                          )}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    No students found in {selectedForm}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
