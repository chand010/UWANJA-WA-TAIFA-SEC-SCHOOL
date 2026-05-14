import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut, 
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  Wallet, 
  FileText,
  LogOut, 
  Menu, 
  X,
  School,
  Globe,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceManager from './components/AttendanceManager';
import GradeManager from './components/GradeManager';
import FeeManager from './components/FeeManager';
import MyResults from './components/MyResults';
import PermissionManager from './components/PermissionManager';
import StudentProfile from './components/StudentProfile';
import MyProfile from './components/MyProfile';
import { cn } from './lib/utils';
import { UserProfile } from './types';

function Sidebar({ userProfile, isOpen, toggle }: { userProfile: UserProfile | null, isOpen: boolean, toggle: () => void }) {
  const location = useLocation();
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'teacher', 'parent', 'student'], labelSw: 'Dashboard' },
    { name: 'Students', path: '/students', icon: Users, roles: ['admin', 'teacher'], labelSw: 'Wanafunzi' },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['admin', 'teacher'], labelSw: 'Mahudhurio' },
    { name: 'Academic', path: '/grades', icon: GraduationCap, roles: ['admin', 'teacher'], labelSw: 'Akademia' },
    { name: 'Results', path: '/results', icon: GraduationCap, roles: ['parent', 'student'], labelSw: 'Matokeo' },
    { name: 'Permissions', path: '/permissions', icon: FileText, roles: ['admin', 'student'], labelSw: 'Ruhusa' },
    { name: 'Fees', path: '/fees', icon: Wallet, roles: ['admin', 'parent'], labelSw: 'Ada na Malipo' },
    { name: 'Profile', path: '/profile', icon: UserIcon, roles: ['admin', 'teacher', 'parent', 'student'], labelSw: 'Wasifu' },
  ];

  const filteredItems = menuItems.filter(item => userProfile && item.roles.includes(userProfile.role));
  const isSwahili = userProfile?.preferredLanguage === 'Swahili';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white shadow-2xl lg:relative lg:translate-x-0"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-600 p-2">
                    <School className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-tight">ElimuPro</span>
                </div>
                <button onClick={toggle} className="lg:hidden">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 px-4 py-4">
                {filteredItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 transition-all",
                        isActive 
                          ? "bg-blue-600/10 text-blue-400 font-medium" 
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {isSwahili ? item.labelSw : item.name}
                      {isActive && (
                        <motion.div 
                          layoutId="active-pill"
                          className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-slate-800 p-4">
                <div className="mb-4 flex items-center gap-3 px-2">
                  <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-blue-400">
                    {userProfile?.fullName?.[0]}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-white">{userProfile?.fullName}</p>
                    <p className="truncate text-xs text-slate-500 capitalize">{userProfile?.role}</p>
                  </div>
                </div>
                <button 
                  onClick={() => signOut(auth)}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  {isSwahili ? 'Ondoka' : 'Sign Out'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={toggle}
        />
      )}
    </>
  );
}

function ProtectedRoute({ children, userProfile, allowedRoles }: { children: React.ReactNode, userProfile: UserProfile | null, allowedRoles: string[] }) {
  if (!userProfile) return null;
  if (!allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError("Tafadhali weka barua pepe kwanza. / Please enter your email first.");
      return;
    }
    setResetMessage(null);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Check your email for password reset link. / Angalia barua pepe yako kwa kiungo cha kubadilisha neno siri.");
    } catch (error: any) {
      setAuthError("Failed to send reset email. Verify your email address.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        
        let profileData: UserProfile;
        
        if (docSnap.exists()) {
          profileData = docSnap.data() as UserProfile;
          
          let needsUpdate = false;
          // CRITICAL: Force sync name if it's "User" but we have a better one
          if ((!profileData.fullName || profileData.fullName === 'User') && u.displayName) {
            profileData.fullName = u.displayName;
            needsUpdate = true;
          }

          // CRITICAL: Force admin role for the owner email
          if (u.email === 'abdulibrahimu01@gmail.com' && profileData.role !== 'admin') {
            profileData.role = 'admin';
            needsUpdate = true;
          }

          if (needsUpdate) {
            await setDoc(docRef, profileData, { merge: true });
          }
        } else {
          // New user registration
          profileData = {
            uid: u.uid,
            fullName: u.displayName || fullName || 'User',
            email: u.email || '',
            role: (u.email === 'abdulibrahimu01@gmail.com') ? 'admin' : 'student',
            preferredLanguage: 'Swahili',
            createdAt: new Date().toISOString()
          };
          await setDoc(docRef, profileData);
        }
        
        setUserProfile(profileData);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: fullName
        });
        // The useEffect onAuthStateChanged will handle the Firestore doc creation
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth failed", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError("Invalid email or password.");
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError("This email is already registered.");
      } else if (error.code === 'auth/weak-password') {
        setAuthError("Password should be at least 6 characters.");
      } else {
        setAuthError("An error occurred. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-blue-600 p-4 shadow-xl shadow-blue-500/20">
              <School className="h-10 w-10 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">ElimuPro SMS</h1>
              <p className="mt-2 text-slate-400">Tanzania's Modern School Management</p>
            </div>
          </div>
          
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <h2 className="mb-6 text-center text-lg font-semibold text-white">
              {isSignUp ? 'Jisajili / Sign Up' : 'Ingia / Login'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Full Name / Jina Kamili</label>
                  <input 
                    type="text" 
                    required
                    placeholder="John Doe"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@school.tz"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              {authError && (
                <div className="rounded-lg bg-red-500/10 p-3 text-center text-xs font-medium text-red-500 border border-red-500/20">
                  {authError}
                </div>
              )}

              {resetMessage && (
                <div className="rounded-lg bg-emerald-500/10 p-3 text-center text-xs font-medium text-emerald-500 border border-emerald-500/20">
                  {resetMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/20"
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>

              {!isSignUp && (
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    Forgot Password? / Umesahau Neno Siri?
                  </button>
                </div>
              )}
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {isSignUp 
                  ? 'Already have an account? Sign In' 
                  : "Don't have an account? Create one"}
              </button>
            </div>
            
            <p className="mt-8 text-center text-xs text-slate-500 leading-relaxed">
              Default admin: abdulibrahimu01@gmail.com<br/>
              Teachers must register or be added by admin.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar 
          userProfile={userProfile} 
          isOpen={sidebarOpen} 
          toggle={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <main className="flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-4 ml-auto">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-slate-900 border-b-2 border-blue-600 leading-none pb-0.5">
                  {userProfile?.fullName && userProfile.fullName !== 'User' ? userProfile.fullName : userProfile?.email.split('@')[0]}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {userProfile?.role}
                </span>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {userProfile?.fullName?.[0]}
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<Dashboard userProfile={userProfile} />} />
              <Route path="/students" element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['admin', 'teacher']}>
                  <StudentList userProfile={userProfile} />
                </ProtectedRoute>
              } />
              <Route path="/attendance" element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['admin', 'teacher']}>
                  <AttendanceManager userProfile={userProfile} />
                </ProtectedRoute>
              } />
              <Route path="/grades" element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['admin', 'teacher']}>
                  <GradeManager userProfile={userProfile} />
                </ProtectedRoute>
              } />
              <Route path="/results" element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['parent', 'student']}>
                  <MyResults userProfile={userProfile} />
                </ProtectedRoute>
              } />
              <Route path="/students/:id" element={<StudentProfile userProfile={userProfile} />} />
              <Route path="/permissions" element={<PermissionManager userProfile={userProfile} />} />
              <Route path="/profile" element={<MyProfile userProfile={userProfile} />} />
              <Route path="/fees" element={
                <ProtectedRoute userProfile={userProfile} allowedRoles={['admin', 'parent']}>
                  <FeeManager userProfile={userProfile} />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
