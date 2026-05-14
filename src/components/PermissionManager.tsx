import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  doc, 
  OrderByDirection,
  orderBy
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { PermissionRequest, UserProfile, Student } from '../types';
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Info,
  Calendar,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function PermissionManager({ userProfile }: { userProfile: UserProfile | null }) {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkedStudent, setLinkedStudent] = useState<Student | null>(null);

  const isSwahili = userProfile?.preferredLanguage === 'Swahili';
  const isAdmin = userProfile?.role === 'admin';
  const isStudent = userProfile?.role === 'student';

  const [newRequest, setNewRequest] = useState({
    type: 'Sick' as const,
    reason: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (!userProfile) return;

    let unsubscribe: () => void = () => {};

    if (isAdmin) {
      // Auto-delete old requests (older than 1 week)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const oldReqQuery = query(
        collection(db, 'permission_requests'), 
        where('requestedAt', '<', oneWeekAgo.toISOString())
      );
      
      const cleanup = async () => {
        try {
          const snap = await getDocs(oldReqQuery);
          const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
        } catch (error) {
          console.error("Cleanup failed", error);
        }
      };
      cleanup();

      const q = query(collection(db, 'permission_requests'), orderBy('requestedAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermissionRequest)));
        setLoading(false);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'permission_requests'));
    } else if (isStudent) {
      const studentQuery = query(collection(db, 'students'), where('studentUid', '==', userProfile.uid));
      const unsubStudent = onSnapshot(studentQuery, (snap) => {
        if (!snap.empty) {
          const s = { id: snap.docs[0].id, ...snap.docs[0].data() } as Student;
          setLinkedStudent(s);
          
          const reqQuery = query(
            collection(db, 'permission_requests'), 
            where('studentUid', '==', userProfile.uid),
            orderBy('requestedAt', 'desc')
          );
          const unsubReq = onSnapshot(reqQuery, (reqSnap) => {
            setRequests(reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermissionRequest)));
            setLoading(false);
          }, (err) => handleFirestoreError(err, OperationType.GET, 'permission_requests'));

          // We need a way to combine these unsubscribes
          const oldUnsub = unsubscribe;
          unsubscribe = () => {
            oldUnsub();
            unsubReq();
            unsubStudent();
          };
        } else {
          setLoading(false);
        }
      });
      unsubscribe = unsubStudent;
    } else {
       setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile, isAdmin, isStudent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedStudent && !isAdmin) return;

    setIsSubmitting(true);
    try {
      const payload: Omit<PermissionRequest, 'id'> = {
        studentId: linkedStudent?.id || '',
        studentUid: linkedStudent?.studentUid || auth.currentUser?.uid || '',
        studentName: linkedStudent?.fullName || '',
        type: newRequest.type,
        reason: newRequest.reason,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        status: 'Pending',
        requestedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'permission_requests'), payload);
      setShowAddModal(false);
      setNewRequest({
        type: 'Sick',
        reason: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'permission_requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (requestId: string, status: 'Approved' | 'Rejected', comment: string) => {
    try {
      await updateDoc(doc(db, 'permission_requests', requestId), {
        status,
        adminComment: comment,
        reviewedBy: userProfile?.fullName,
        reviewedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'permission_requests');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'Rejected': return <XCircle className="h-5 w-5 text-rose-500" />;
      default: return <Clock className="h-5 w-5 text-amber-500" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  if (isStudent && !linkedStudent && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center bg-white rounded-3xl border border-slate-200">
        <div className="rounded-full bg-slate-100 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isSwahili ? 'Akaunti Haijunganishwa' : 'Account Not Linked'}
        </h2>
        <p className="text-slate-500 max-w-md">
          {isSwahili 
            ? 'Tafadhali wasiliana na utawala ili kuunganisha akaunti yako na rekodi ya mwanafunzi kabla ya kuomba ruhusa.' 
            : 'Please contact administration to link your account to a student record before requesting permissions.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isSwahili ? 'Maombi ya Ruhusa' : 'Permission Requests'}
          </h1>
          <p className="text-sm text-slate-500">
            {isSwahili ? 'Dhibiti maombi ya ruhusa kwa wanafunzi' : 'Manage student leave and emergency requests'}
          </p>
        </div>
        {isStudent && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="h-5 w-5" />
            {isSwahili ? 'Omba Ruhusa' : 'Request Leave'}
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6">
          {requests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {isSwahili ? 'Hakuna Maombi' : 'No Requests Yet'}
              </h3>
              <p className="text-slate-500">
                {isSwahili ? 'Maombi yako ya ruhusa yataonekana hapa.' : 'Your permission requests will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {requests.map((request) => (
                <motion.div 
                  key={request.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      request.type === 'Sick' ? 'bg-rose-50 text-rose-600' : 
                      request.type === 'Emergency' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                    )}>
                      {request.type === 'Sick' ? <AlertCircle className="h-5 w-5" /> : 
                       request.type === 'Emergency' ? <Info className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border",
                      getStatusBg(request.status)
                    )}>
                      {getStatusIcon(request.status)}
                      {request.status}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {isAdmin ? 'Student Name' : 'Type'}
                      </div>
                      <h3 className="font-bold text-slate-900">
                        {isAdmin ? request.studentName : (isSwahili ? (request.type === 'Sick' ? 'Ugonjwa' : request.type === 'Emergency' ? 'Dharura' : 'Nyingine') : request.type)}
                      </h3>
                      {isAdmin && (
                         <div className="flex items-center gap-2 mt-1 px-2 py-0.5 bg-slate-100 rounded-full w-fit">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">{request.type}</span>
                         </div>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">From</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(request.startDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">To</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(request.endDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reason</div>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {request.reason}
                      </p>
                    </div>

                    {request.adminComment && (
                      <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-3 w-3 text-blue-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Response</span>
                        </div>
                        <p className="text-xs text-slate-600 italic">"{request.adminComment}"</p>
                        <div className="mt-2 text-[9px] text-slate-400">Reviewed by {request.reviewedBy}</div>
                      </div>
                    )}

                    {isAdmin && request.status === 'Pending' && (
                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => {
                            const comment = prompt(isSwahili ? 'Toa maoni yako (hiari):' : 'Add a comment (optional):');
                            handleReview(request.id!, 'Approved', comment || '');
                          }}
                          className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            >
              <div className="p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {isSwahili ? 'Omba Ruhusa Mpya' : 'New Leave Request'}
                  </h2>
                  <button onClick={() => setShowAddModal(false)} className="rounded-full p-2 hover:bg-slate-100 transition-colors">
                    <XCircle className="h-6 w-6 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Request Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Sick', 'Emergency', 'Other'].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewRequest({...newRequest, type: type as any})}
                            className={cn(
                              "px-4 py-3 rounded-xl text-xs font-bold border transition-all",
                              newRequest.type === type 
                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                      <input 
                        required
                        type="date"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none"
                        value={newRequest.startDate}
                        onChange={e => setNewRequest({...newRequest, startDate: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                      <input 
                        required
                        type="date"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none"
                        value={newRequest.endDate}
                        onChange={e => setNewRequest({...newRequest, endDate: e.target.value})}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reason / Details</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder={isSwahili ? 'Elezea kwa nini unahitaji ruhusa...' : 'Describe why you need leave...'}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none resize-none"
                        value={newRequest.reason}
                        onChange={e => setNewRequest({...newRequest, reason: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white shadow-xl shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting 
                      ? (isSwahili ? 'Inatuma...' : 'Submitting...') 
                      : (isSwahili ? 'Tuma Ombi' : 'Submit Request')}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
