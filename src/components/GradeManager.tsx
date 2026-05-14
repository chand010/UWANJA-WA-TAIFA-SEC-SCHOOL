import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, setDoc, doc, getDoc, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db, handleFirestoreError } from '../lib/firebase';
import { Student, Grade, UserProfile } from '../types';
import { 
  BarChart, 
  Plus, 
  Search, 
  CheckCircle2,
  Award,
  BookOpen,
  LayoutGrid,
  Trash2,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, FORMS, ACADEMIC_TERMS } from '../lib/utils';

export default function GradeManager({ userProfile }: { userProfile: UserProfile | null }) {
  const [searchParams] = useSearchParams();
  const preSelectedId = searchParams.get('studentId');

  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedForm, setSelectedForm] = useState('Form 1');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddGrade, setShowAddGrade] = useState(!!preSelectedId);
  const [newGrade, setNewGrade] = useState({
    studentId: preSelectedId || '',
    subject: 'Mathematics',
    score: 0,
    maxScore: 100,
    term: 1,
    year: new Date().getFullYear(),
    category: 'Test'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; subject: string; studentName: string } | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSwahili = userProfile?.preferredLanguage === 'Swahili';
  const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'teacher' || userProfile?.email === 'abdulibrahimu01@gmail.com';

  const SUBJECTS = [
    'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 
    'Physics', 'Geography', 'History', 'Civics', 'Commerce', 'Book-keeping'
  ];

  useEffect(() => {
    async function fetchStudents() {
      try {
        // Fetch ALL students for the search/selection if we want global search, 
        // but let's stick to the form filter for performance unless searching.
        const studentsSnap = await getDocs(query(collection(db, 'students'), orderBy('fullName')));
        setStudents(studentsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Student)));
      } catch (error) {
        console.error("Failed to fetch students", error);
      }
    }
    fetchStudents();
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'grades'), 
      where('term', '==', selectedTerm),
      where('year', '==', selectedYear)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGrades(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Grade)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, 'grades');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedTerm, selectedYear]);

  const filteredByForm = students.filter(s => s.form === selectedForm);
  const filteredForSelect = students.filter(s => 
    s.fullName.toLowerCase().includes(studentSearch.toLowerCase())
  ).slice(0, 50);

  const groupedGrades = grades.reduce((acc, grade) => {
    if (!acc[grade.studentId]) acc[grade.studentId] = [];
    acc[grade.studentId].push(grade);
    return acc;
  }, {} as Record<string, Grade[]>);

  const getGradeLetter = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 75) return { letter: 'A', color: 'text-emerald-600 bg-emerald-50' };
    if (percentage >= 65) return { letter: 'B', color: 'text-blue-600 bg-blue-50' };
    if (percentage >= 45) return { letter: 'C', color: 'text-amber-600 bg-amber-50' };
    if (percentage >= 30) return { letter: 'D', color: 'text-orange-600 bg-orange-50' };
    return { letter: 'F', color: 'text-rose-600 bg-rose-50' };
  };

  const closeModal = () => {
    setShowAddGrade(false);
    setEditingId(null);
    setStudentSearch('');
    setNewGrade({
      studentId: preSelectedId || '',
      subject: 'Mathematics',
      score: 0,
      maxScore: 100,
      term: selectedTerm,
      year: selectedYear,
      category: 'Test'
    });
  };

  const startEditing = (grade: Grade) => {
    setEditingId(grade.id || null);
    setNewGrade({
      studentId: grade.studentId,
      subject: grade.subject,
      score: grade.score,
      maxScore: grade.maxScore,
      term: grade.term,
      year: grade.year,
      category: grade.category
    });
    const s = students.find(st => st.id === grade.studentId);
    setStudentSearch(s?.fullName || '');
    setShowAddGrade(true);
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || isSubmitting) return;
    setFormError(null);
    setIsSubmitting(true);

    if (!newGrade.studentId) {
      setFormError(isSwahili ? 'Tafadhali chagua mwanafunzi' : 'Please select a student');
      setIsSubmitting(false);
      return;
    }

    // Force term and year to match what we are currently viewing/filtering
    const finalYear = selectedYear;
    const finalTerm = selectedTerm;

    // Deterministic ID: studentId_subject_term_year_category
    // We sanitize to ensure consistent IDs
    const normalize = (s: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, '_');
    const gradeId = `${normalize(newGrade.studentId)}_${normalize(newGrade.subject)}_${finalTerm}_${finalYear}_${normalize(newGrade.category)}`;
    const docRef = doc(db, 'grades', gradeId);

    try {
      // If we are editing and the ID changed, or we are adding new
      if (!editingId || (editingId && editingId !== gradeId)) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormError(isSwahili 
            ? 'Alama hizi tayari zimeshaingizwa kwa mwanafunzi huyu katika kipengele hiki!' 
            : 'This grade has already been recorded for this student in this category!');
          setIsSubmitting(false);
          return;
        }
      }

      const gradeData = {
        ...newGrade,
        subject: newGrade.subject.trim(),
        category: newGrade.category.trim() as any,
        term: finalTerm,
        year: finalYear,
        recordedBy: userProfile?.uid
      };

      await setDoc(docRef, gradeData);
      
      // If ID changed during edit, cleanup the old document
      if (editingId && editingId !== gradeId) {
        try {
          await deleteDoc(doc(db, 'grades', editingId));
        } catch (err) {
          console.error("Failed to delete old record during ID change", err);
        }
      }
      
      closeModal();
    } catch (error: any) {
      console.error("Failed to add grade", error);
      handleFirestoreError(error, 'write' as any, `grades/${gradeId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGrade = (id: string, subject: string, studentName: string) => {
    if (!canEdit) {
      alert(isSwahili ? 'Huna ruhusa ya kufuta.' : 'You do not have permission to delete.');
      return;
    }
    setDeleteConfirm({ id, subject, studentName });
  };

  const executeDelete = async () => {
    if (!deleteConfirm || isLoadingState) return;
    
    const { id } = deleteConfirm;
    setIsLoadingState(true);
    try {
      const docRef = doc(db, 'grades', id);
      await deleteDoc(docRef);
      
      // Immediate local feedback
      setGrades(prev => prev.filter(g => g.id !== id));
      
      setSuccessMessage(isSwahili ? 'Alama zimefutwa kikamilifu!' : 'Grades deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error("Delete failed for ID:", id, error);
      const isPermissionError = error.message?.includes('permission-denied') || error.code === 'permission-denied';
      
      alert(isSwahili 
        ? (isPermissionError ? 'Huna ruhusa ya kufuta rekodi hii. Labda ilirekodiwa na mwalimu mwingine.' : 'Imeshindwa kufuta. Jaribu tena baadae.')
        : (isPermissionError ? 'You do not have permission to delete this record. It might have been recorded by another teacher.' : 'Failed to delete. Please try again later.'));
    } finally {
      setIsLoadingState(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isSwahili ? 'Matokeo ya Kitaaluma' : 'Academic Performance'}</h1>
          <p className="text-sm text-slate-500">
            {isSwahili ? 'Usimamizi wa alama na viwango vya ufaulu (NECTA Standards)' : 'Managing scores and grading according to NECTA benchmarks.'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-2"
            >
              <Award className="h-3 w-3" />
              {successMessage}
            </motion.div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <select 
                className="bg-transparent px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="w-[1px] bg-slate-200 mx-1" />
              <select 
                className="bg-transparent px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(Number(e.target.value))}
              >
                {ACADEMIC_TERMS.map(t => <option key={t} value={t}>{isSwahili ? `Muhula ya ${t}` : `Term ${t}`}</option>)}
              </select>
            </div>
            {canEdit && (
              <button 
                onClick={() => {
                  setEditingId(null);
                  setShowAddGrade(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
              >
                <Plus className="h-4 w-4" />
                {isSwahili ? 'Weka Alama' : 'Enter Grades'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Form Tabs Selection */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 flex flex-wrap gap-2 shadow-sm">
        {FORMS.map(form => (
          <button
            key={form}
            onClick={() => setSelectedForm(form)}
            className={cn(
              "flex-1 min-w-[90px] px-3 py-3 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1",
              selectedForm === form 
                ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50 hover:border-blue-200"
            )}
          >
            <span className="text-[9px] opacity-70 uppercase tracking-widest">{isSwahili ? 'Darasa' : 'Form'}</span>
            <span className="text-xs">{form}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder={isSwahili ? "Tafuta Jina..." : "Search Student..."}
              className="w-full rounded-2xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>
          
           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
            <h3 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <LayoutGrid className="h-3 w-3" />
              {isSwahili ? 'Viwango vya NECTA' : 'NECTA Grading Scale'}
            </h3>
            <div className="space-y-3">
              {[
                { range: '75 - 100', grade: 'A', label: 'Bora Sanas (Excellent)' },
                { range: '65 - 74', grade: 'B', label: 'Vizuri Sanas (Very Good)' },
                { range: '45 - 64', grade: 'C', label: 'Vizuri (Good)' },
                { range: '30 - 44', grade: 'D', label: 'Wastani (Average)' },
                { range: '0 - 29', grade: 'F', label: 'Dhaifu (Fail)' },
              ].map((item) => (
                <div key={item.grade} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className={cn("inline-flex h-6 w-8 items-center justify-center rounded text-xs font-bold", getGradeLetter(Number(item.range.split(' - ')[0]), 100).color)}>
                       {item.grade}
                     </span>
                     <span className="text-xs text-slate-600 truncate max-w-[120px]">{item.label}</span>
                   </div>
                   <span className="text-xs font-mono text-slate-400">{item.range}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm h-fit">
          <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              {isSwahili ? `${selectedForm} - Orodha ya Wanafunzi` : `${selectedForm} - Student List`}
            </h2>
            <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
              {filteredByForm.filter(s => s.fullName.toLowerCase().includes(studentSearch.toLowerCase())).length} {isSwahili ? 'Wanafunzi' : 'Students'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{isSwahili ? 'Jina la Mwanafunzi' : 'Student Name'}</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Subjects</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredByForm
                  .filter(s => s.fullName.toLowerCase().includes(studentSearch.toLowerCase()))
                  .map((student) => {
                  const studentGrades = groupedGrades[student.id!] || [];
                  return (
                    <React.Fragment key={student.id}>
                      <tr className="group transition hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shadow-sm">
                              {student.fullName[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{student.fullName}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{student.stream} • {student.gender}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {studentGrades.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {studentGrades.map(g => {
                                const res = getGradeLetter(g.score, g.maxScore);
                                return (
                                  <div 
                                    key={g.id}
                                    title={`${g.subject}: ${g.score}/${g.maxScore} (${g.category})`}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border cursor-help",
                                      res.color,
                                      "border-transparent hover:border-current transition-colors"
                                    )}
                                  >
                                    <span className="opacity-70">{g.subject.substring(0, 3)}</span>
                                    <span>{g.score}</span>
                                    <span className="opacity-50">•</span>
                                    <span>{res.letter}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[10px] italic text-slate-400">{isSwahili ? 'Hakuna alama' : 'No records'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             {canEdit && (
                              <button 
                                onClick={() => {
                                  setNewGrade(prev => ({ ...prev, studentId: student.id! }));
                                  setStudentSearch(student.fullName);
                                  setShowAddGrade(true);
                                }}
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100"
                              >
                                <Plus className="h-3 w-3" />
                                {isSwahili ? 'Weka' : 'Add'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {studentGrades.length > 0 && (
                        <tr>
                          <td colSpan={3} className="px-14 pb-4 pt-0">
                            <div className="bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                              {studentGrades.map(grade => {
                                const result = getGradeLetter(grade.score, grade.maxScore);
                                return (
                                  <div key={grade.id} className="flex items-center justify-between px-4 py-2 hover:bg-white transition-colors">
                                    <div className="flex items-center gap-4">
                                      <span className="text-[11px] font-bold text-slate-700 min-w-[100px]">{grade.subject}</span>
                                      <span className="text-[10px] text-slate-400 italic px-2 py-0.5 bg-white rounded border border-slate-100">{grade.category}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                      <span className="text-xs font-bold text-slate-900">{grade.score}/{grade.maxScore}</span>
                                      <span className={cn("inline-flex items-center justify-center rounded-lg h-6 w-6 text-[10px] font-bold", result.color)}>
                                        {result.letter}
                                      </span>
                                      {canEdit && (
                                        <div className="flex items-center gap-1 border-l border-slate-200 pl-4 ml-2">
                                          <button 
                                            onClick={() => startEditing(grade)}
                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button 
                                            onClick={() => grade.id && handleDeleteGrade(grade.id, grade.subject, student.fullName)}
                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredByForm.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                      {isSwahili ? `Hakuna wanafunzi waliopatikana kwa ${selectedForm}` : `No students found for ${selectedForm}`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddGrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-900">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                {editingId 
                  ? (isSwahili ? 'Sahihisha Alama za Masomo' : 'Edit Academic Record')
                  : (isSwahili ? 'Sajili Alama za Masomo' : 'Enter Academic Records')}
              </h2>
              <form onSubmit={handleAddGrade} className="space-y-4">
                {formError && (
                  <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-600 border border-rose-100">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mwanafunzi / Student</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder={isSwahili ? "Tafuta mwanafunzi (e.g. Selemani)..." : "Search student (e.g. Selemani)..."}
                        className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {filteredForSelect.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {filteredForSelect.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setNewGrade({...newGrade, studentId: s.id!});
                                setStudentSearch(s.fullName);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-blue-50",
                                newGrade.studentId === s.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                              )}
                            >
                              <div>
                                <p className="font-bold text-slate-900">{s.fullName}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.form} • {s.stream}</p>
                              </div>
                              {newGrade.studentId === s.id && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          {studentSearch ? (isSwahili ? 'Hakuna mwanafunzi aliyepatikana' : 'No students found') : (isSwahili ? 'Anza kutafuta...' : 'Start typing to search...')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Somo / Subject</label>
                    <select 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2"
                      value={newGrade.subject}
                      onChange={e => setNewGrade({...newGrade, subject: e.target.value})}
                    >
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Aina / Category</label>
                    <select 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2"
                      value={newGrade.category}
                      onChange={e => setNewGrade({...newGrade, category: e.target.value as any})}
                    >
                      <option value="Test">Test</option>
                      <option value="Mid-Term">Mid-Term</option>
                      <option value="Final">Final</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Alama / Score</label>
                    <input 
                      type="number" 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2"
                      value={newGrade.score}
                      onChange={e => setNewGrade({...newGrade, score: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Jumla / Max</label>
                    <input 
                      type="number" 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2"
                      value={newGrade.maxScore}
                      onChange={e => setNewGrade({...newGrade, maxScore: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                   <button 
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1 rounded-lg px-4 py-2 font-semibold text-white transition-all",
                      isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    {isSubmitting 
                      ? (isSwahili ? 'Inasajili...' : 'Saving...') 
                      : (editingId 
                          ? (isSwahili ? 'Hifadhi Marekebisho' : 'Save Changes')
                          : (isSwahili ? 'Hifadhi Alama' : 'Save Grade'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-900">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => !isLoadingState && setDeleteConfirm(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-rose-50 p-3 text-rose-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {isSwahili ? 'Thibitisha Futa' : 'Confirm Deletion'}
                </h3>
                <p className="mb-6 text-sm text-slate-500">
                  {isSwahili 
                    ? `Je, una uhakika unataka kufuta alama za ${deleteConfirm.subject} kwa ${deleteConfirm.studentName}?`
                    : `Are you sure you want to delete ${deleteConfirm.subject} marks for ${deleteConfirm.studentName}?`}
                  <br />
                  <span className="mt-2 block font-medium text-rose-600">
                    {isSwahili ? 'Kitendo hiki hakiwezi kutenguliwa.' : 'This action cannot be undone.'}
                  </span>
                </p>
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    disabled={isLoadingState}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isSwahili ? 'Ghairi' : 'Cancel'}
                  </button>
                  <button 
                    onClick={executeDelete}
                    disabled={isLoadingState}
                    className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 shadow-lg shadow-rose-500/20 disabled:opacity-50"
                  >
                    {isLoadingState ? (isSwahili ? 'Inafuta...' : 'Deleting...') : (isSwahili ? 'Futa' : 'Delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
