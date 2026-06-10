import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogIn,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Sparkles,
  AlertOctagon,
  LogOut,
  Sliders
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, limit, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, checkIfAdmin, db } from './firebase';
import SurveyForm from './components/SurveyForm';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Choose screen if Admin (options to visit survey or visit dashboard)
  const [adminChoice, setAdminChoice] = useState<'survey' | 'admin' | null>(null);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthChecking(true);
      setAuthError(null);

      if (currentUser) {
        const email = currentUser.email || '';
        const isBU = email.toLowerCase().endsWith('@bu.ac.th');

        if (!isBU) {
          // Log out instantly if not @bu.ac.th
          setAuthError("ระบบปฏิเสธการเข้าถึง: อนุญาตให้เข้าสู่ระบบสำหรับบัญชีสังกัดอีเมลมหาวิทยาลัยกรุงเทพ @bu.ac.th เท่านั้น เพื่อความเป็นส่วนตัวและความมั่นคงปลอดภัย");
          await signOut(auth);
          setUser(null);
          setIsAdmin(false);
          setAuthChecking(false);
          return;
        }

        // Valid BU Account
        // Check if Admin (Check fixed list first, then dynamic admins in Firestore)
        let adminStatus = checkIfAdmin(email);
        if (!adminStatus) {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', email.toLowerCase()));
            if (adminDoc.exists()) {
              adminStatus = true;
            }
          } catch (err) {
            console.error("Error verifying dynamic admin permission:", err);
          }
        }

        setIsAdmin(adminStatus);

        if (adminStatus) {
          setUser(currentUser);
          // "บันทึกข้อมูลโปรไฟล์ลง Firestore เฉพาะผู้ที่เป็น Admin เท่านั้น เพื่อความเป็นส่วนตัวของผู้ใช้ทั่วไป"
          try {
            const adminDocRef = doc(db, 'admins', email.toLowerCase());
            await setDoc(adminDocRef, {
              email: email.toLowerCase(),
              name: currentUser.displayName || "BU Administrator",
              lastLogin: serverTimestamp()
            }, { merge: true });
          } catch (err) {
            console.error("Failed to persist Admin Profile to Firestore:", err);
          }
          // Direct admin to choosing page
          setAdminChoice('admin');
        } else {
          // Not an Administrator. Let's check if the instructors list contains accounts. 
          // If instructors list is empty, we allow access by default to avoid lockout.
          try {
            const instCol = collection(db, 'instructors');
            const instSnap = await getDocs(query(instCol, limit(1)));
            
            if (!instSnap.empty) {
              // The permitted list has records, so we MUST check if this student/teacher is listed
              const instDoc = await getDoc(doc(db, 'instructors', email.toLowerCase()));
              if (!instDoc.exists()) {
                setAuthError(`บัญชีของคุณ (${email}) ยังไม่ได้รับอนุญาตให้เข้าทำแบบสำรวจนี้ กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อเพิ่มรายชื่อผู้มีสิทธิ์เข้าระบบ`);
                await signOut(auth);
                setUser(null);
                setIsAdmin(false);
                setAuthChecking(false);
                return;
              }
            }
          } catch (err) {
            console.error("Error verifying instructor permission limit:", err);
          }

          setUser(currentUser);
          setAdminChoice(null);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setAdminChoice(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(`การเข้าสู่ระบบผิดพลาด: ${err.message}`);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAdminChoice(null);
      setAuthError(null);
    } catch (err: any) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <div id="survey-app-container" className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-slate-900 selection:text-white">
      
      {/* Decorative top accent line */}
      <div className="h-1 w-full bg-slate-900 shrink-0" />

      {/* Header Navigation shown only if authenticated */}
      {user && (
        <header className="flex items-center justify-between px-6 sm:px-8 h-16 bg-white border-b border-slate-200 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
              <GraduationCap className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight uppercase text-slate-800 font-display">BU Research Feedback</h1>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none mt-0.5">Institutional Analytics</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full absolute"></div>
              <span className="text-[11px] font-semibold text-slate-600 font-display">@bu.ac.th Authorized</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-tight text-slate-800">{user.displayName || user.email?.split('@')[0]}</p>
                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{isAdmin ? "Administrator" : "Faculty Member"}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-900 flex items-center justify-center text-xs font-bold text-white uppercase select-none shadow-sm">
                {user.displayName ? user.displayName.substring(0, 2) : "BU"}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-rose-650 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all cursor-pointer"
              title="ออกจากระบบ (Sign Out)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col justify-center py-6">
        {authChecking ? (
          <div id="loading-spinner" className="flex flex-col items-center justify-center space-y-3.5 py-12">
            <svg className="animate-spin h-7 w-7 text-slate-900" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-slate-400 font-bold tracking-wider">กำลังตรวจสอบความถูกต้องสิทธิ์เข้าระบบ...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* 1. Landing login screen (Not authenticated) */}
            {!user ? (
              <div className="flex items-center justify-center p-4 my-auto">
                <motion.div
                  key="login-page"
                  initial={{ opacity: 0, scale: 0.98, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-md bg-white border border-slate-200 p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-100/50 space-y-8 text-center"
                >
                  {/* Visual Branding */}
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 bg-slate-900 border border-slate-800 text-white rounded-xl flex items-center justify-center shadow-md">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full uppercase tracking-wider font-display">
                        สำนักมาตรฐานคุณภาพการศึกษา
                      </span>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug font-display pt-1">
                        แบบฟอร์มขอรับข้อคิดเห็น <br />
                        ต่อผลการสำรวจข้อมูลงานวิจัยสถาบัน
                      </h1>
                      <p className="text-[11px] text-slate-400 font-medium">
                        เพื่อการบริหารจัดการภายในของคณะ/หลักสูตร มหาวิทยาลัยกรุงเทพ
                      </p>
                    </div>
                  </div>

                  {/* Error Banner */}
                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-medium text-left flex items-start space-x-2"
                    >
                      <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                      <span>{authError}</span>
                    </motion.div>
                  )}

                  {/* Access CTA Buttons */}
                  <div id="login-actions" className="space-y-4 pt-2">
                    <button
                      id="sign-in-bu-btn"
                      onClick={handleSignIn}
                      className="w-full flex items-center justify-center space-x-3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer text-sm font-display tracking-wide"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>ลงชื่อเข้าใช้งานด้วย BU Google Account</span>
                    </button>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      * จำกัดสิทธิเฉพาะบัญชีสังกัดมหาวิทยาลัยกรุงเทพ <strong className="text-slate-650 font-semibold">@bu.ac.th</strong> เท่านั้น เพื่อความเป็นส่วนตัวและความมั่นคงปลอดภัย
                    </p>
                  </div>
                </motion.div>
              </div>
            ) : (
              
              /* 2. Authenticated user logic container */
              <div className="w-full">
                {isAdmin && adminChoice === 'admin' ? (
                  /* Admin Panel selected view */
                  <AdminPanel
                    onBack={() => setAdminChoice('survey')}
                  />
                ) : (
                  /* Standard Professor Survey Wizard Form */
                  <div className="space-y-6">
                    {isAdmin && (
                      <div className="w-full max-w-4xl mx-auto px-4">
                        <div className="bg-slate-900 border border-slate-850 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-md">
                          <div className="flex items-center space-x-2.5">
                            <ShieldCheck className="w-4.5 h-4.5 text-emerald-450 shrink-0" />
                            <p className="font-semibold text-slate-200 font-display">คุณเข้าระบบด้วยสิทธิ์ แดชบอร์ดแอดมิน (Administrator)</p>
                          </div>
                          <button
                            onClick={() => setAdminChoice('admin')}
                            className="bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-sm font-display"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>สลับไปยังหน้าจัดการ Admin Dashboard</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <SurveyForm
                      userEmail={user.email || ''}
                      userName={user.displayName || ''}
                      onLogout={handleSignOut}
                    />
                  </div>
                )}
              </div>
            )}
            
          </AnimatePresence>
        )}
      </main>

      {/* Footer Status Bar representing Professional Polish theme perfectly */}
      <footer className="px-6 sm:px-8 h-10 bg-slate-900 text-white flex items-center justify-between text-[10px] font-medium shrink-0">
        <div className="flex items-center gap-4">
          <span className="opacity-60 hidden sm:inline">Firebase Firestore Core Storage</span>
          <span className="opacity-40">สำนักมาตรฐานคุณภาพการศึกษา</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-slate-350">Synchronized with Firestore Database</span>
          </span>
          <span className="opacity-40">&copy; {new Date().getFullYear()} Bangkok University</span>
        </div>
      </footer>
    </div>
  );
}
