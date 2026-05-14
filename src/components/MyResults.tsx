import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student, Grade, UserProfile } from '../types';
import { 
  Award, 
  Calendar, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { ACADEMIC_TERMS, cn } from '../lib/utils';

export default function MyResults({ userProfile }: { userProfile: UserProfile | null }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const isSwahili = userProfile?.preferredLanguage === 'Swahili';

  useEffect(() => {
    async function fetchMyData() {
      if (!userProfile?.uid) return;
      
      try {
        setLoading(true);
        // Find the student record associated with this user (either as parent or student)
        const qField = userProfile.role === 'student' ? 'studentUid' : 'parentUid';
        const studentSnap = await getDocs(query(
          collection(db, 'students'), 
          where(qField, '==', userProfile.uid)
        ));

        if (!studentSnap.empty) {
          const studentDoc = { ...studentSnap.docs[0].data(), id: studentSnap.docs[0].id } as Student;
          setStudent(studentDoc);

          // Fetch grades for this student
          const gradesSnap = await getDocs(query(
            collection(db, 'grades'),
            where('studentId', '==', studentDoc.id),
            where('term', '==', selectedTerm),
            where('year', '==', selectedYear),
            orderBy('score', 'desc')
          ));
          setGrades(gradesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Grade)));
        }
      } catch (error) {
        console.error("Failed to fetch results", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyData();
  }, [userProfile, selectedTerm, selectedYear]);

  const getGradeInfo = (score: number, max: number) => {
    const p = (score/max) * 100;
    if (p >= 81) return { letter: 'A', points: 5, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (p >= 61) return { letter: 'B', points: 4, color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (p >= 41) return { letter: 'C', points: 3, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (p >= 21) return { letter: 'D', points: 2, color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { letter: 'F', points: 0, color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const groupGradesBySubject = () => {
    const grouped: Record<string, { subject: string; test?: Grade; midterm?: Grade; final?: Grade }> = {};
    
    grades.forEach(grade => {
      if (!grouped[grade.subject]) {
        grouped[grade.subject] = { subject: grade.subject };
      }
      if (grade.category === 'Test') grouped[grade.subject].test = grade;
      else if (grade.category === 'Mid-Term') grouped[grade.subject].midterm = grade;
      else if (grade.category === 'Final') grouped[grade.subject].final = grade;
    });
    
    return Object.values(grouped).sort((a, b) => a.subject.localeCompare(b.subject));
  };

  const subjectsWithGrades = groupGradesBySubject();

  const getScoreDisplay = (grade?: Grade) => {
    if (!grade) return '-';
    return grade.score;
  };

  const calculateResults = () => {
    if (grades.length === 0) return { avg: 0, gpa: 0 };
    
    let totalPerc = 0;
    let totalPoints = 0;
    
    grades.forEach(g => {
      const info = getGradeInfo(g.score, g.maxScore);
      totalPerc += (g.score / g.maxScore) * 100;
      totalPoints += info.points;
    });
    
    return {
      avg: totalPerc / grades.length,
      gpa: totalPoints / grades.length
    };
  };

  const { avg, gpa } = calculateResults();

  if (!student && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center ring-1 ring-slate-200 rounded-3xl bg-white shadow-xl max-w-2xl mx-auto my-8">
        <div className="rounded-full bg-rose-50 p-6 mb-6">
          <BookOpen className="h-10 w-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          {isSwahili ? 'Samahani, Rekodi Yako Haijapatikana' : 'No Academic Record Found'}
        </h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          {isSwahili 
            ? 'Akaunti yako bado haijaunganishwa na mfumo wa matokeo. Ili kuona alama zako, tafadhali nakili namba yako ya utambulisho (UID) hapa chini na mpe Mwalimu Mkuu au Admin.' 
            : 'Your login account is not yet linked to our academic records system. To view your grades, please copy your unique ID (UID) below and give it to the Headmaster or Administrator.'}
        </p>
        
        <div className="w-full p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 group">
          <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest flex items-center justify-center gap-2">
            <CheckCircle2 className="h-3 w-3" />
            Your Private UID / Namba Yako ya Siri
          </p>
          <div className="flex items-center justify-between gap-4">
            <code className="text-sm font-mono font-bold text-blue-600 break-all select-all flex-1 text-left px-3 py-2 bg-white rounded border border-slate-200">
              {userProfile?.uid}
            </code>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50/50 rounded-xl text-left border border-blue-100 italic">
          <p className="text-xs text-blue-700 leading-normal">
            {isSwahili 
              ? 'Kidokezo: Baada ya Admin kuweka namba hii kwenye mfumo, utaweza kuona alama zako zote za mitihani papo hapo.' 
              : 'Tip: Once the Admin adds this number to the system, you will be able to see all your exam results instantly.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isSwahili ? 'Matokeo Yangu' : 'My Academic Results'}
          </h1>
          {student && (
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <span className="font-medium text-slate-700">{student.fullName}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              <span>{student.form} - {student.stream}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          <select 
            className="rounded-lg border-none bg-transparent px-3 py-2 text-sm font-medium focus:ring-0"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="w-px bg-slate-200 my-1"></div>
          {ACADEMIC_TERMS.map(term => (
            <button
              key={term}
              onClick={() => setSelectedTerm(term)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                selectedTerm === term 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {isSwahili ? `Muhula ${term}` : `Term ${term}`}
            </button>
          ))}
        </div>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-emerald-100 p-3">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GPA / Wastani</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {gpa.toFixed(1)} / {avg.toFixed(0)}%
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {isSwahili ? 'Maendeleo ya kitaaluma muhula huu' : 'Academic progress for current term'}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-blue-100 p-3">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subjects / Masomo</p>
              <h3 className="text-2xl font-bold text-slate-900">{subjectsWithGrades.length}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {isSwahili ? 'Idadi ya masomo yaliyofanyiwa mtihani' : 'Number of subjects examined'}
          </p>
        </div>

        <div className="rounded-2xl bg-blue-600 p-6 shadow-lg shadow-blue-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-white/20 p-3">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Status / Hali</p>
              <h3 className="text-xl font-bold text-white">
                {student?.status === 'active' ? (isSwahili ? 'Anasoma' : 'Enrolled') : student?.status}
              </h3>
            </div>
          </div>
          <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white w-full"></div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            {isSwahili ? 'Mchanganuo wa Alama' : 'Detailed Grade Breakdown'}
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            Loading results...
          </div>
        ) : grades.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {isSwahili ? 'Hakuna alama zilizowekwa bado.' : 'No grades recorded yet for this term.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{isSwahili ? 'Somo' : 'Subject'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Test</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Mid-Term</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Final</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{isSwahili ? 'Wastani' : 'Average'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjectsWithGrades.map((item) => {
                  const subjectGrades = [item.test, item.midterm, item.final].filter(Boolean) as Grade[];
                  const totalPerc = subjectGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0);
                  const subjectAvg = subjectGrades.length > 0 ? totalPerc / subjectGrades.length : 0;
                  const info = getGradeInfo(subjectAvg, 100);
                  
                  return (
                    <motion.tr 
                      key={item.subject}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold text-xs",
                            info.color
                          )}>
                            {item.subject.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900">{item.subject}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-medium text-slate-600">
                        {item.test ? `${item.test.score}/${item.test.maxScore}` : '-'}
                      </td>
                      <td className="px-6 py-5 text-center font-medium text-slate-600">
                        {item.midterm ? `${item.midterm.score}/${item.midterm.maxScore}` : '-'}
                      </td>
                      <td className="px-6 py-5 text-center font-medium text-slate-600">
                        {item.final ? `${item.final.score}/${item.final.maxScore}` : '-'}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-sm font-bold text-slate-900">{subjectAvg.toFixed(0)}%</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-lg border font-bold text-xs mx-auto",
                          info.color
                        )}>
                          {info.letter}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


