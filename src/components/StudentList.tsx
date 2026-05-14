import React, { useState, useEffect } from 'react';
import { collection, addDoc, setDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, handleFirestoreError, auth, firebaseConfigExport } from '../lib/firebase';
import { Student, UserProfile } from '../types';
import { 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  UserPlus, 
  Trash2, 
  Search, 
  Download, 
  Upload, 
  Filter,
  MoreVertical,
  ChevronDown,
  TrendingUp,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, FORMS, GENDERS } from '../lib/utils';

export default function StudentList({ userProfile }: { userProfile: UserProfile | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedForm, setSelectedForm] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({
    fullName: '',
    gender: 'Male',
    dob: '',
    form: 'Form 1',
    stream: 'A',
    nectaRegNumber: '',
    studentUid: '',
    status: 'Active'
  });
  const [createAccount, setCreateAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSwahili = userProfile?.preferredLanguage === 'Swahili';
  const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'teacher';

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('fullName'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Student)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, 'students');
    });
    return () => unsubscribe();
  }, []);

  const navigate = useNavigate();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalStudentUid = editingStudent ? editingStudent.studentUid : newStudent.studentUid;

      // Handle account creation if requested
      if (createAccount && accountEmail && accountPassword) {
        // Use a secondary app instance to create user without logging out the current admin
        const secondaryApp = initializeApp(firebaseConfigExport, "SecondaryAccountCreator");
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, accountEmail, accountPassword);
        finalStudentUid = userCredential.user.uid;
        
        // Cleanup secondary app to avoid instance leaks
        await deleteApp(secondaryApp);
        
        // Auto-create profile for the new user
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          fullName: editingStudent ? editingStudent.fullName : newStudent.fullName,
          email: accountEmail,
          role: 'student',
          preferredLanguage: isSwahili ? 'Swahili' : 'English',
          createdAt: new Date().toISOString()
        });
      }

      if (editingStudent) {
        const { id, ...data } = editingStudent;
        await setDoc(doc(db, 'students', id), {
          ...data,
          studentUid: finalStudentUid
        });
      } else {
        await addDoc(collection(db, 'students'), {
          ...newStudent,
          studentUid: finalStudentUid,
          enrolledAt: new Date().toISOString()
        });
      }
      setShowAddModal(false);
      setEditingStudent(null);
      setCreateAccount(false);
      setAccountEmail('');
      setAccountPassword('');
      setNewStudent({
        fullName: '',
        gender: 'Male',
        dob: '',
        form: 'Form 1',
        stream: 'A',
        nectaRegNumber: '',
        studentUid: '',
        status: 'Active'
      });
    } catch (error: any) {
      console.error("Failed to save student", error);
      if (error.code === 'auth/operation-not-allowed') {
        alert(isSwahili 
          ? "KOSA: Email/Password sign-in haijawezeshwa kwenye Firebase Console yako. Tafadhali iwezeshe." 
          : "ERROR: Email/Password sign-in is not enabled in your Firebase Console. Please enable it under Authentication > Sign-in method.");
      } else if (error.code === 'auth/email-already-in-use') {
        alert(isSwahili ? "Email hii tayari inatumika." : "This email is already in use by another account.");
      } else {
        alert(isSwahili ? `Imeshindwa kuhifadhi: ${error.message}` : `Failed to save: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (confirm(isSwahili ? `Una uhakika unataka kumfuta ${student.fullName}?` : `Are you sure you want to delete ${student.fullName}?`)) {
      try {
        if (student.id) {
          await deleteDoc(doc(db, 'students', student.id));
        }
        // If there's a linked user account, delete it too
        if (student.studentUid) {
          await deleteDoc(doc(db, 'users', student.studentUid));
        }
        alert(isSwahili ? "Mwanafunzi na akaunti vimefutwa kwa mafanikio!" : "Student and linked account deleted successfully!");
      } catch (error: any) {
        console.error("Delete failed", error);
        alert(isSwahili ? `Ufutaji umeshindwa: ${error.message}` : `Delete operation failed: ${error.message}`);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (userProfile?.role !== 'admin') return;
    
    const confirmMessage = isSwahili 
      ? `ONYO KALI: Je, una uhakika unataka KUFUTA WANAFUNZI WOTE ${students.length}? Vitendo hivi haviwezi kubadilishwa.` 
      : `CRITICAL WARNING: Are you sure you want to DELETE ALL ${students.length} STUDENTS? This action is irreversible.`;

    if (confirm(confirmMessage)) {
      const doubleConfirm = prompt(isSwahili ? "Andika 'FUTA' ili kuthibitisha:" : "Type 'DELETE' to confirm:");
      if (doubleConfirm !== (isSwahili ? 'FUTA' : 'DELETE')) return;

      setIsSubmitting(true);
      try {
        const deletePromises = students.map(async (student) => {
          if (student.id) await deleteDoc(doc(db, 'students', student.id));
          if (student.studentUid) await deleteDoc(doc(db, 'users', student.studentUid));
        });
        await Promise.all(deletePromises);
        alert(isSwahili ? "Wanafunzi wote wamefutwa." : "All students have been deleted.");
      } catch (error: any) {
        console.error("Bulk delete failed", error);
        alert(error.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePromoteStudents = async () => {
    const activeStudents = students.filter(s => s.status === 'Active');
    
    if (activeStudents.length === 0) {
      alert(isSwahili ? 'Hakuna wanafunzi hai wa kupandishwa.' : 'No active students to promote.');
      return;
    }

    if (!confirm(isSwahili 
      ? `Je, una uhakika unataka kuwapandisha wanafunzi ${activeStudents.length} kwenda kidato kinachofuata?\n\n- Form 1 -> Form 2\n- Form 2 -> Form 3\n- Form 3 -> Form 4\n- Form 5 -> Form 6\n- Form 4/6 -> Graduated` 
      : `Are you sure you want to promote ${activeStudents.length} active students to the next form?\n\n- Form 1 -> Form 2\n- Form 2 -> Form 3\n- Form 3 -> Form 4\n- Form 5 -> Form 6\n- Form 4/6 -> Graduated`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      let promotedCount = 0;
      const promotionPromises = activeStudents.map(student => {
        const currentFormIndex = FORMS.indexOf(student.form);
        const nextForm = FORMS[currentFormIndex + 1];
        
        const updates: Partial<Student> = {};
        
        if (nextForm) {
          // Normal promotion
          updates.form = nextForm;
        } else {
          // Last form reached (Form 4 or Form 6)
          updates.status = 'Graduated';
        }
        
        if (Object.keys(updates).length > 0) {
          promotedCount++;
          return setDoc(doc(db, 'students', student.id!), { 
            ...student, 
            ...updates 
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promotionPromises);
      alert(isSwahili 
        ? `Mafanikio! Wanafunzi ${promotedCount} wamepandishwa darasa.` 
        : `Success! ${promotedCount} students have been promoted.`);
    } catch (error: any) {
      console.error("Promotion failed", error);
      alert(isSwahili ? 'Imeshindwa kupandisha darasa: ' + error.message : 'Promotion failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.nectaRegNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesForm = selectedForm === 'All' || s.form === selectedForm;
    return matchesSearch && matchesForm;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isSwahili ? 'Wanafunzi' : 'Students'}</h1>
          <p className="text-sm text-slate-500">{isSwahili ? `Jumla: ${students.length} Wanafunzi` : `Showcasing all ${students.length} students enrolled.`}</p>
        </div>
        <div className="flex gap-2">
          {userProfile?.role === 'admin' && (
            <button 
              onClick={handleDeleteAll}
              disabled={isSubmitting || students.length === 0}
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              title={isSwahili ? 'Futa Wote' : 'Delete All'}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{isSwahili ? 'Futa Wote' : 'Delete All'}</span>
            </button>
          )}
          {userProfile?.role === 'admin' && (
            <button 
              onClick={handlePromoteStudents}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">{isSwahili ? 'Pandisha' : 'Promote'}</span>
            </button>
          )}
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {canEdit && (
            <button 
              onClick={() => {
                setEditingStudent(null);
                setNewStudent({
                  fullName: '',
                  gender: 'Male',
                  dob: '',
                  form: 'Form 1',
                  stream: 'A',
                  nectaRegNumber: '',
                  studentUid: '',
                  status: 'Active'
                });
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              {isSwahili ? 'Ongeza Mwanafunzi' : 'Add Student'}
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={isSwahili ? "Tafuta kwa jina au namba ya NECTA..." : "Search by name or NECTA ID..."}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <Filter className="h-4 w-4" />
          {isSwahili ? 'Chuja' : 'Filter'}
        </button>
      </div>

      <div className="bg-white p-2 rounded-2xl border border-slate-200 flex flex-wrap gap-2 shadow-sm">
        {['All', ...FORMS].map(form => (
          <button
            key={form}
            onClick={() => setSelectedForm(form)}
            className={cn(
              "flex-1 min-w-[70px] px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1",
              selectedForm === form 
                ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50 hover:border-blue-200"
            )}
          >
            <span className="text-[9px] opacity-70 uppercase tracking-widest">{form === 'All' ? '' : (isSwahili ? 'Darasa' : 'Form')}</span>
            <span className="text-xs">{form === 'All' ? (isSwahili ? 'Wote' : 'All') : form}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{isSwahili ? 'Jina Kamili' : 'Full Name'}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{isSwahili ? 'Jinsia' : 'Gender'}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{isSwahili ? 'Darasa' : 'Form'}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">NECTA ID</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">{isSwahili ? 'Akaunti' : 'Account'}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="group transition hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                        {s.fullName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{s.fullName}</p>
                        <p className="text-xs text-slate-500">DOB: {s.dob}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      s.gender === 'Male' ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"
                    )}>
                      {s.gender}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{s.form} - {s.stream}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">{s.nectaRegNumber || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      s.status === 'Active' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {s.studentUid ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-600" title={s.studentUid}>
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-[9px] font-bold uppercase">{isSwahili ? 'Imeungwa' : 'Linked'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-300">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[9px] font-bold uppercase">{isSwahili ? 'Bado' : 'No Account'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <button 
                          onClick={() => navigate(`/students/${s.id}`)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                          title={isSwahili ? 'Wasifu' : 'Profile'}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button 
                          onClick={() => {
                            setEditingStudent(s);
                            setShowAddModal(true);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          title={isSwahili ? 'Hariri' : 'Edit'}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button 
                          onClick={() => navigate(`/grades?studentId=${s.id}`)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                          title={isSwahili ? 'Weka Alama' : 'Add Marks'}
                        >
                          <Award className="h-4 w-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button 
                          onClick={() => handleDelete(s)}
                          className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title={isSwahili ? 'Futa' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                {editingStudent 
                  ? (isSwahili ? 'Hariri Mwanafunzi' : 'Edit Student') 
                  : (isSwahili ? 'Ongeza Mwanafunzi Mpya' : 'Add New Student')}
              </h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    {isSwahili ? 'Jina Kamili' : 'Full Name'}
                  </label>
                  <input 
                    required
                    type="text" 
                    className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    value={editingStudent ? editingStudent.fullName : newStudent.fullName}
                    onChange={e => editingStudent 
                      ? setEditingStudent({...editingStudent, fullName: e.target.value})
                      : setNewStudent({...newStudent, fullName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {isSwahili ? 'Jinsia' : 'Gender'}
                    </label>
                    <select 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                      value={editingStudent ? editingStudent.gender : newStudent.gender}
                      onChange={e => editingStudent
                        ? setEditingStudent({...editingStudent, gender: e.target.value as any})
                        : setNewStudent({...newStudent, gender: e.target.value as any})}
                    >
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {isSwahili ? 'Tarehe ya Kuzaliwa' : 'Date of Birth'}
                    </label>
                    <input 
                      required
                      type="date" 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                      value={editingStudent ? editingStudent.dob : newStudent.dob}
                      onChange={e => editingStudent
                        ? setEditingStudent({...editingStudent, dob: e.target.value})
                        : setNewStudent({...newStudent, dob: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {isSwahili ? 'Kidato' : 'Form'}
                    </label>
                    <select 
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                      value={editingStudent ? editingStudent.form : newStudent.form}
                      onChange={e => editingStudent
                        ? setEditingStudent({...editingStudent, form: e.target.value})
                        : setNewStudent({...newStudent, form: e.target.value})}
                    >
                      {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Stream
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. A"
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                      value={editingStudent ? editingStudent.stream : newStudent.stream}
                      onChange={e => editingStudent
                        ? setEditingStudent({...editingStudent, stream: e.target.value})
                        : setNewStudent({...newStudent, stream: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    NECTA Registration Number
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. S0123/0001/2023"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    value={editingStudent ? editingStudent.nectaRegNumber : newStudent.nectaRegNumber}
                    onChange={e => editingStudent
                      ? setEditingStudent({...editingStudent, nectaRegNumber: e.target.value})
                      : setNewStudent({...newStudent, nectaRegNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Student User UID (Linking)
                  </label>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="User UID from Firebase Auth"
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                      value={editingStudent ? (editingStudent.studentUid || '') : newStudent.studentUid}
                      onChange={e => editingStudent
                        ? setEditingStudent({...editingStudent, studentUid: e.target.value})
                        : setNewStudent({...newStudent, studentUid: e.target.value})}
                      disabled={createAccount}
                    />
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <input 
                        type="checkbox" 
                        id="createAccount"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={createAccount}
                        onChange={e => setCreateAccount(e.target.checked)}
                      />
                      <label htmlFor="createAccount" className="text-xs font-bold text-blue-700 cursor-pointer">
                        {isSwahili ? 'Tengeneza Akaunti ya Kuingia (Email/Password)' : 'Create Login Account (Email/Password)'}
                      </label>
                    </div>

                    {createAccount && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <input 
                          required={createAccount}
                          type="email" 
                          placeholder="Student Email (e.g. selemani@school.com)"
                          className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          value={accountEmail}
                          onChange={e => setAccountEmail(e.target.value)}
                        />
                        <input 
                          required={createAccount}
                          type="password" 
                          placeholder="Login Password"
                          className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          value={accountPassword}
                          onChange={e => setAccountPassword(e.target.value)}
                        />
                        <p className="text-[10px] text-blue-500">
                          {isSwahili 
                            ? 'Mpe mwanafunzi email na password hii baada ya kuhifadhi.' 
                            : 'Give this email and password to the student after saving.'}
                        </p>
                      </motion.div>
                    )}

                    {!createAccount && (
                      <p className="text-[10px] text-slate-500 italic">
                        {isSwahili 
                          ? 'Link hii inamfanya mwanafunzi kuweza kuona matokeo yake mwenyewe.' 
                          : 'Linking this UID allows the student to view their own results.'}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select 
                    className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    value={editingStudent ? editingStudent.status : newStudent.status}
                    onChange={e => editingStudent
                      ? setEditingStudent({...editingStudent, status: e.target.value})
                      : setNewStudent({...newStudent, status: e.target.value})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingStudent(null);
                    }}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? (isSwahili ? 'Inahifadhi...' : 'Saving...') : (editingStudent ? (isSwahili ? 'Hifadhi Mabadiliko' : 'Update Student') : (isSwahili ? 'Hifadhi Mwanafunzi' : 'Save Student'))}
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
