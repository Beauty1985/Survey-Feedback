import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  FileCheck,
  AlertCircle,
  Clock,
  Send,
  User,
  LogOut,
  Sparkles
} from 'lucide-react';
import { collection, doc, getDoc, setDoc, serverTimestamp, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import FacultySelector, { BU_FACULTIES } from './FacultySelector';
import RatingInput from './RatingInput';
import { Answers, SurveyResponse, Question } from '../types';

interface SurveyFormProps {
  userEmail: string;
  userName: string;
  onLogout: () => void;
}

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "part1",
    section: 1,
    title: "ส่วนที่ 1 งานวิจัย “ภาวการณ์มีงานทำของบัณฑิต”",
    targetText: "ค่าเป้าหมายระดับสถาบัน : ร้อยละการตอบกลับแบบสอบถาม ไม่ต่ำกว่า 70%",
    q1_text: "1. ค่าเป้าหมายระดับสถาบัน : ร้อยละการตอบกลับแบบสอบถาม ไม่ต่ำกว่า 70%",
    q2_text: "2. ความคาดหวังในการนำข้อมูลไปใช้ประโยชน์",
    q3_text: "3. ข้อเสนอแนะ/ข้อคิดเห็น",
    createdAt: null,
    updatedAt: null
  },
  {
    id: "part2",
    section: 2,
    title: "ส่วนที่ 2 งานวิจัย “ความคิดเห็นของผู้บังคับบัญชา”",
    targetText: "ค่าเป้าหมายระดับสถาบัน : ร้อยละการตอบกลับแบบสอบถาม ไม่ต่ำกว่า 20%",
    q1_text: "1. ค่าเป้าหมายระดับสถาบัน : ร้อยละการตอบกลับแบบสอบถาม ไม่ต่ำกว่า 20%",
    q2_text: "2. ความคาดหวังในการนำข้อมูลไปใช้ประโยชน์",
    q3_text: "3. ข้อเสนอแนะ/ข้อคิดเห็น",
    createdAt: null,
    updatedAt: null
  }
];

export default function SurveyForm({ userEmail, userName, onLogout }: SurveyFormProps) {
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [respondentId, setRespondentId] = useState<string>('');
  const [respondentName, setRespondentName] = useState<string>(userName || '');
  const [respondentPosition, setRespondentPosition] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [respondentEmail, setRespondentEmail] = useState<string>(userEmail || '');
  const [respondentPhone, setRespondentPhone] = useState<string>('');
  
  // Custom Survey Round states
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  
  // Answers state
  const [answers, setAnswers] = useState<Answers>({
    part1_q1: '',
    part1_q2: '',
    part1_q3: '',
    part2_q1: '',
    part2_q2: '',
    part2_q3: '',
    part3_satisfaction: {
      content: 0,
      communication: 0,
      utilization: 0,
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProfileSynced, setIsProfileSynced] = useState<boolean>(false);

  // Fetch permitted user (instructor) profile if available
  useEffect(() => {
    async function fetchUserProfile() {
      if (!userEmail) return;
      try {
        const emailLower = userEmail.toLowerCase().trim();
        const profileRef = doc(db, 'instructors', emailLower);
        const snapshot = await getDoc(profileRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.staffId) setRespondentId(data.staffId);
          if (data.name) setRespondentName(data.name);
          if (data.position && data.position !== '-') setRespondentPosition(data.position);
          if (data.faculty && data.faculty !== 'หน่วยงานทั่วไป') setSelectedFaculty(data.faculty);
          if (data.email) setRespondentEmail(data.email);
          if (data.internalPhone && data.internalPhone !== '-') setRespondentPhone(data.internalPhone);
          setIsProfileSynced(true);
        }
      } catch (err) {
        console.warn("Could not load instructor profile from database list:", err);
      }
    }
    fetchUserProfile();
  }, [userEmail]);

  // Fetch dynamic questions if they exist in firestore
  useEffect(() => {
    async function loadQuestions() {
      try {
        const qRef = collection(db, 'questions');
        const qQuery = query(qRef, orderBy('section', 'asc'));
        const qsDocs = await getDocs(qQuery);
        if (!qsDocs.empty) {
          const loadedQuestions: Question[] = [];
          qsDocs.forEach(docSnap => {
            loadedQuestions.push(docSnap.data() as Question);
          });
          setQuestions(loadedQuestions);
        }
      } catch (err) {
        console.warn("Could not load dynamic questions (using defaults):", err);
      }
    }
    loadQuestions();
  }, []);

  // Validation function for current step
  const validateStep = (): boolean => {
    setValidationError(null);
    
    // Step index mappings:
    // 0: Introduction
    // 1: Respondent Profile Info (previously step 4)
    // 2: Select Survey Round (ครั้งที่ 1, ครั้งที่ 2, ครั้งที่ 3)
    // 3: Part 1 (previously step 1)
    // 4: Part 2 (previously step 2)
    // 5: Part 3 (satisfaction) (previously step 3)
    // 6: Submission / Review
    
    if (currentStep === 1) {
      if (!respondentId.trim()) {
        setValidationError('กรุณากรอกรหัสบุคลากร');
        return false;
      }
      if (!respondentName.trim()) {
        setValidationError('กรุณากรอกชื่อ - นามสกุล ของผู้ทำแบบสอบถาม');
        return false;
      }
      if (!respondentPosition.trim()) {
        setValidationError('กรุณากรอกตำแหน่งบุคลากรของท่าน');
        return false;
      }
      if (!selectedFaculty) {
        setValidationError('กรุณาเลือกคณะวิชาหรือหน่วยงานที่สังกัด');
        return false;
      }
      if (!respondentEmail.trim()) {
        setValidationError('กรุณากรอกอีเมลของท่าน');
        return false;
      }
      if (!respondentPhone.trim()) {
        setValidationError('กรุณากรอกเบอร์โทรภายในของท่าน');
        return false;
      }
    }

    if (currentStep === 2) {
      if (selectedRound === null) {
        setValidationError('กรุณาเลือกครั้งที่ทำแบบสอบถามก่อนไปขั้นตอนถัดไป');
        return false;
      }
      // Condition 1: Must take Round 1 before Round 2
      if (selectedRound === 2 && !completedRounds.includes(1)) {
        setValidationError('ท่านต้องดำเนินการทำแบบสอบถามครั้งที่ 1 ให้เสร็จสิ้นก่อนจึงจะสามารถเลือกทำครั้งที่ 2 ได้');
        return false;
      }
      // Condition 2: Must take Round 2 before Round 3
      if (selectedRound === 3 && !completedRounds.includes(2)) {
        setValidationError('ท่านต้องดำเนินการทำแบบสอบถามครั้งที่ 2 ให้เสร็จสิ้นก่อนจึงจะสามารถเลือกทำครั้งที่ 3 ได้');
        return false;
      }
      // Prevent taking a round that's already completed
      if (completedRounds.includes(selectedRound)) {
        setValidationError(`ท่านได้บันทึกข้อมูลแบบสอบถามสำหรับ ครั้งที่ ${selectedRound} เรียบร้อยแล้ว ไม่สามารถเลือกทำซ้ำได้`);
        return false;
      }
    }

    if (currentStep === 3) {
      if (!answers.part1_q1) {
        setValidationError('กรุณาเลือกประเด็นการจัดส่งข้อมูลก่อนไปขั้นตอนถัดไป');
        return false;
      }
      if (answers.part1_q1 === 'has_suggestions') {
        if (!answers.part1_q2?.trim()) {
          setValidationError('กรุณากรอกความคาดหวังในการนำข้อมูลไปใช้ประโยชน์');
          return false;
        }
      }
    }

    if (currentStep === 4) {
      if (!answers.part2_q1) {
        setValidationError('กรุณาเลือกประเด็นการจัดส่งข้อมูลก่อนไปขั้นตอนถัดไป');
        return false;
      }
      if (answers.part2_q1 === 'has_suggestions') {
        if (!answers.part2_q2?.trim()) {
          setValidationError('กรุณากรอกความคาดหวังในการนำข้อมูลไปใช้ประโยชน์');
          return false;
        }
      }
    }

    if (currentStep === 5) {
      const { content, communication, utilization } = answers.part3_satisfaction;
      if (content === 0 || communication === 0 || utilization === 0) {
        setValidationError('กรุณาประเมินระดับความพึงพอใจให้ครบทุกหัวข้อ');
        return false;
      }
    }

    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep()) return;
      setIsVerifying(true);
      setValidationError(null);
      try {
        const responsesRef = collection(db, 'responses');
        const q = query(responsesRef, where('respondentId', '==', respondentId.trim()));
        const querySnapshot = await getDocs(q);
        const completed: number[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.round) {
            completed.push(Number(data.round));
          } else {
            completed.push(1);
          }
        });
        setCompletedRounds(completed);

        // Auto-select first available round
        if (!completed.includes(1)) {
          setSelectedRound(1);
        } else if (!completed.includes(2)) {
          setSelectedRound(2);
        } else if (!completed.includes(3)) {
          setSelectedRound(3);
        } else {
          setSelectedRound(null);
        }

        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err: any) {
        try {
          handleFirestoreError(err, OperationType.LIST, 'responses');
        } catch (adaptedError: any) {
          setValidationError(`เกิดข้อผิดพลาดในการตรวจสอบประวัติการทำแบบสอบถาม: ${adaptedError.message}`);
        }
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    setValidationError(null);

    const docId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payload: SurveyResponse = {
      id: docId,
      respondentId: respondentId.trim(),
      respondentName: respondentName.trim(),
      respondentPosition: respondentPosition.trim(),
      faculty: selectedFaculty,
      respondentEmail: respondentEmail.trim(),
      respondentPhone: respondentPhone.trim(),
      answers,
      round: selectedRound || 1,
      timestamp: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'responses', docId), payload);
      setSubmitSuccess(true);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `responses/${docId}`);
      } catch (adaptedError: any) {
        setValidationError(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${adaptedError.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find dynamic parts
  const part1 = questions.find(q => q.section === 1) || DEFAULT_QUESTIONS[0];
  const part2 = questions.find(q => q.section === 2) || DEFAULT_QUESTIONS[1];

  const stepsCount = 7;
  const progressPercent = (currentStep / (stepsCount - 1)) * 100;

  return (
    <div id="survey-wizard-root" className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6">
      
      {/* Progress Bar */}
      {!submitSuccess && (
        <div id="survey-progress-wrapper" className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 font-bold mb-2">
            <span className="font-display uppercase tracking-wider">ความคืบหน้าการตอบการสำรวจ</span>
            <span className="text-slate-500 font-mono">หน้า {currentStep + 1} จาก {stepsCount}</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              id="progress-indicator"
              className="h-full bg-slate-900 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Main Wizard Card */}
      <div id="survey-wizard-card" className="bg-white border border-slate-200/90 shadow-xl shadow-slate-100/40 rounded-3xl overflow-hidden min-h-[420px] flex flex-col justify-between p-6 sm:p-10 transition-all">
        
        {/* Error Notification */}
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-rose-50 border border-slate-200 rounded-xl flex items-start space-x-3 text-rose-800"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="text-sm font-semibold">{validationError}</div>
          </motion.div>
        )}

        {/* Dynamic Screens */}
        <AnimatePresence mode="wait">
          {!submitSuccess ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1"
            >
              {/* PAGE 1: Introductory Guide */}
              {currentStep === 0 && (
                <div id="step-intro" className="space-y-6">
                  <div className="text-center max-w-2xl mx-auto space-y-4 py-4">
                    <div className="inline-flex p-3.5 bg-slate-900 text-white rounded-2xl mb-2">
                      <FileCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl leading-snug font-display">
                      แบบฟอร์มขอรับข้อคิดเห็นต่อผลการสำรวจข้อมูลงานวิจัยสถาบัน <br className="hidden sm:inline"/>
                      ปีการศึกษา 2568
                    </h2>
                    <div className="h-0.5 w-16 bg-slate-200 mx-auto rounded-full" />
                  </div>

                  <div className="bg-slate-50/80 p-6 sm:p-8 rounded-2xl border border-slate-200/90 space-y-4">
                    <h3 className="text-base font-bold text-slate-850 font-display">คำชี้แจงและแนวทางสถาบัน</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-sans font-medium">
                      ตามที่สำนักมาตรฐานคุณภาพการศึกษาได้จัดส่งข้อมูลผลการสำรวจงานวิจัยสถาบัน (การสำรวจข้อมูลเบื้องต้น รอบที่ 1) เพื่อการบริหารจัดการภายในของคณะ/หลักสูตรเท่านั้น ขอความกรุณาจากท่านในการพิจารณาและให้ความคิดเห็นในประเด็นดังต่อไปนี้
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-slate-705 font-bold bg-slate-200/50 p-2.5 rounded-lg w-fit border border-slate-200/80 font-mono">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <span>ใช้เวลาตอบโดยประมาณ 3 - 5 นาทีเท่านั้น</span>
                    </div>
                  </div>

                  <div className="flex justify-center pt-6">
                    <button
                      id="start-survey-btn"
                      type="button"
                      onClick={handleNext}
                      className="flex items-center space-x-2 text-white bg-slate-900 hover:bg-slate-800 font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer font-display"
                    >
                      <span>เริ่มทำแบบสอบถาม</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* PAGE 2: General Information */}
              {currentStep === 1 && (
                <div id="step-part-4" className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="text-[10px] bg-slate-900 border border-slate-900 text-white font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider font-display">
                      ข้อมูลทั่วไปผู้ตอบ
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-2 font-display">
                      ข้อมูลทั่วไปของผู้ตอบ
                    </h3>
                  </div>

                  <div className="space-y-5 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800 font-display">
                          1. รหัสบุคลากร
                        </label>
                        <input
                          type="text"
                          placeholder="รหัสบุคลากร (ดึงจากฐานข้อมูลสิทธิ์)"
                          value={respondentId}
                          disabled
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none text-slate-500 font-medium bg-slate-50/85 cursor-not-allowed select-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800 font-display">
                          2. ชื่อ - นามสกุล
                        </label>
                        <input
                          type="text"
                          placeholder="ชื่อ-นามสกุล (ดึงจากฐานข้อมูลสิทธิ์)"
                          value={respondentName}
                          disabled
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none text-slate-500 font-medium bg-slate-50/85 cursor-not-allowed select-none"
                        />
                      </div>

                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="block text-sm font-bold text-slate-800 font-display">
                          3. ตำแหน่งบุคลากร
                        </label>
                        <input
                          type="text"
                          placeholder="ตำแหน่งบุคลากร (ดึงจากฐานข้อมูลสิทธิ์)"
                          value={respondentPosition}
                          disabled
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none text-slate-500 font-medium bg-slate-50/85 cursor-not-allowed select-none"
                        />
                      </div>

                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="block text-sm font-bold text-slate-800 font-display">
                          4. คณะวิชาหรือหน่วยงานที่สังกัด
                        </label>
                        <input
                          type="text"
                          placeholder="คณะวิชาหรือหน่วยงานที่สังกัด (ดึงจากฐานข้อมูลสิทธิ์)"
                          value={selectedFaculty}
                          disabled
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none text-slate-500 font-medium bg-slate-50/85 cursor-not-allowed select-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800 font-display">
                          5. อีเมลบุคลากร
                        </label>
                        <input
                          type="email"
                          placeholder="อีเมลบุคลากร (ดึงจากฐานข้อมูลสิทธิ์)"
                          value={respondentEmail}
                          disabled
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none text-slate-500 font-medium bg-slate-50/85 cursor-not-allowed select-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800 font-display">
                          6. เบอร์โทรภายใน
                        </label>
                        <input
                          type="text"
                          placeholder="เบอร์โทรภายใน (ดึงจากฐานข้อมูลสิทธิ์)"
                          value={respondentPhone}
                          disabled
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none text-slate-500 font-medium bg-slate-50/85 cursor-not-allowed select-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 3: Select Survey Round */}
              {currentStep === 2 && (
                <div id="step-select-round" className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="text-[10px] bg-slate-900 border border-slate-900 text-white font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider font-display">
                      ความถี่การประเมิน
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-2 font-display">
                      เลือกครั้งที่ประเมินแบบสอบถาม
                    </h3>
                  </div>

                  <div className="space-y-4 pt-2">
                    <p className="text-sm font-medium text-slate-600 leading-normal">
                      ระบบตรวจพบประวัติการทำแบบสอบถามของท่านโดยรหัสบุคลากร <strong className="text-slate-900 font-bold">{respondentId}</strong> กรุณาเลือกครั้งที่ต้องการตอบตามเงื่อนไขลำดับขั้นตอนด้านล่าง:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* Round 1 */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!completedRounds.includes(1)) {
                            setSelectedRound(1);
                            setValidationError(null);
                          }
                        }}
                        className={`text-left p-5 border rounded-2xl transition duration-200 shadow-sm relative flex flex-col justify-between h-44 cursor-pointer group ${
                          completedRounds.includes(1)
                            ? 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed select-none'
                            : selectedRound === 1
                              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900 ring-offset-2'
                              : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-350'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full font-display border ${
                              completedRounds.includes(1)
                                ? 'bg-emerald-100 border-emerald-100 text-emerald-800'
                                : selectedRound === 1
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-slate-100 border-slate-100 text-slate-700'
                            }`}>
                              {completedRounds.includes(1) ? 'เสร็จสิ้น' : 'เปิดให้ตอบ'}
                            </span>
                          </div>
                          <h4 className="text-base font-black mt-3 font-display">ครั้งที่ 1</h4>
                          <p className={`text-xs font-medium mt-1 leading-normal ${
                            selectedRound === 1 ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            การสำรวจข้อมูลวิจัยรอบที่ 1 ถัดไปสำหรับคณะและสาขาวิชา
                          </p>
                        </div>
                        <div className="text-[11px] font-bold font-display mt-2">
                          {completedRounds.includes(1) ? (
                            <span className="text-emerald-600 font-extrabold flex items-center space-x-1">
                              <span>✓ ตอบสิทธิ์เรียบร้อย</span>
                            </span>
                          ) : selectedRound === 1 ? (
                            <span className="text-white bg-slate-850 px-2.5 py-0.5 rounded-full">เลือกครั้งนี้</span>
                          ) : (
                            <span className="text-slate-400">คลิกเพื่อเลือก</span>
                          )}
                        </div>
                      </button>

                      {/* Round 2 */}
                      {(() => {
                        const isLocked = !completedRounds.includes(1);
                        const isCompleted = completedRounds.includes(2);
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isLocked && !isCompleted) {
                                setSelectedRound(2);
                                setValidationError(null);
                              }
                            }}
                            className={`text-left p-5 border rounded-2xl transition duration-200 shadow-sm relative flex flex-col justify-between h-44 cursor-pointer group ${
                              isCompleted
                                ? 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed select-none'
                                : isLocked
                                  ? 'bg-slate-50/70 border-slate-200/60 opacity-60 cursor-not-allowed select-none'
                                  : selectedRound === 2
                                    ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900 ring-offset-2'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-350'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full font-display border ${
                                  isCompleted
                                    ? 'bg-emerald-100 border-emerald-100 text-emerald-800'
                                    : isLocked
                                      ? 'bg-slate-100 border-slate-100 text-slate-400'
                                      : selectedRound === 2
                                        ? 'bg-slate-800 border-slate-700 text-white'
                                        : 'bg-slate-100 border-slate-100 text-slate-700'
                                }`}>
                                  {isCompleted ? 'เสร็จสิ้น' : isLocked ? 'ปิดล็อก' : 'เปิดให้ตอบ'}
                                </span>
                              </div>
                              <h4 className="text-base font-black mt-3 font-display">ครั้งที่ 2</h4>
                              <p className={`text-xs font-medium mt-1 leading-normal ${
                                selectedRound === 2 ? 'text-slate-300' : 'text-slate-500'
                              }`}>
                                การสำรวจข้อมูลประเมินและทบทวนรอบที่ 2 สถาบัน
                              </p>
                            </div>
                            <div className="text-[11px] font-bold font-display mt-2">
                              {isCompleted ? (
                                <span className="text-emerald-600 font-extrabold">✓ ตอบสิทธิ์เรียบร้อย</span>
                              ) : isLocked ? (
                                <span className="text-slate-400 font-medium">🔒 กรุณาทำครั้งที่ 1 ก่อน</span>
                              ) : selectedRound === 2 ? (
                                <span className="text-white bg-slate-850 px-2.5 py-0.5 rounded-full">เลือกครั้งนี้</span>
                              ) : (
                                <span className="text-slate-400">คลิกเพื่อเลือก</span>
                              )}
                            </div>
                          </button>
                        );
                      })()}

                      {/* Round 3 */}
                      {(() => {
                        const isLocked = !completedRounds.includes(2);
                        const isCompleted = completedRounds.includes(3);
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isLocked && !isCompleted) {
                                setSelectedRound(3);
                                setValidationError(null);
                              }
                            }}
                            className={`text-left p-5 border rounded-2xl transition duration-200 shadow-sm relative flex flex-col justify-between h-44 cursor-pointer group ${
                              isCompleted
                                ? 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed select-none'
                                : isLocked
                                  ? 'bg-slate-50/70 border-slate-200/60 opacity-60 cursor-not-allowed select-none'
                                  : selectedRound === 3
                                    ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900 ring-offset-2'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-350'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full font-display border ${
                                  isCompleted
                                    ? 'bg-emerald-100 border-emerald-100 text-emerald-800'
                                    : isLocked
                                      ? 'bg-slate-100 border-slate-100 text-slate-400'
                                      : selectedRound === 3
                                        ? 'bg-slate-800 border-slate-700 text-white'
                                        : 'bg-slate-100 border-slate-100 text-slate-700'
                                }`}>
                                  {isCompleted ? 'เสร็จสิ้น' : isLocked ? 'ปิดล็อก' : 'เปิดให้ตอบ'}
                                </span>
                              </div>
                              <h4 className="text-base font-black mt-3 font-display">ครั้งที่ 3</h4>
                              <p className={`text-xs font-medium mt-1 leading-normal ${
                                selectedRound === 3 ? 'text-slate-300' : 'text-slate-500'
                              }`}>
                                สรุปประเด็นงานวิจัยสถาบันหลังเสร็จสิ้นรอบที่ 3
                              </p>
                            </div>
                            <div className="text-[11px] font-bold font-display mt-2">
                              {isCompleted ? (
                                <span className="text-emerald-600 font-extrabold">✓ ตอบสิทธิ์เรียบร้อย</span>
                              ) : isLocked ? (
                                <span className="text-slate-400 font-medium">🔒 กรุณาทำครั้งที่ 2 ก่อน</span>
                              ) : selectedRound === 3 ? (
                                <span className="text-white bg-slate-850 px-2.5 py-0.5 rounded-full">เลือกครั้งนี้</span>
                              ) : (
                                <span className="text-slate-400">คลิกเพื่อเลือก</span>
                              )}
                            </div>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 4: Part 1 */}
              {currentStep === 3 && (
                <div id="step-part-1" className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="text-[10px] bg-slate-900 border border-slate-900 text-white font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider font-display">
                      ส่วนที่ 1
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-3 font-display">
                      {part1.title}
                    </h3>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/90 p-4.5 rounded-xl text-sm text-slate-700 font-medium leading-relaxed shadow-sm">
                    📂 <strong className="text-slate-950 font-display">เป้าหมายสถิติ:</strong> {part1.targetText}
                  </div>

                  <div className="space-y-4 pt-2">
                    <label className="block text-sm font-bold text-slate-800 font-display">
                      {part1.q1_text} <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, part1_q1: 'no_suggestions' }))}
                        className={`flex items-center text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          answers.part1_q1 === 'no_suggestions'
                            ? 'border-slate-900 bg-slate-50 text-slate-950 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 ${
                          answers.part1_q1 === 'no_suggestions' ? 'border-slate-900 bg-slate-900' : 'border-slate-305'
                        }`}>
                          {answers.part1_q1 === 'no_suggestions' && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-semibold">รับทราบและไม่มีข้อเสนอแนะเพิ่มเติม</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, part1_q1: 'has_suggestions' }))}
                        className={`flex items-center text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          answers.part1_q1 === 'has_suggestions'
                            ? 'border-slate-900 bg-slate-50 text-slate-950 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 ${
                          answers.part1_q1 === 'has_suggestions' ? 'border-slate-900 bg-slate-900' : 'border-slate-305'
                        }`}>
                          {answers.part1_q1 === 'has_suggestions' && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-semibold">รับทราบและมีข้อเสนอแนะเพิ่มเติม</span>
                      </button>
                    </div>
                  </div>

                  {answers.part1_q1 === 'has_suggestions' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-3 border-t border-slate-200/60"
                    >
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800">
                          {part1.q2_text} <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          placeholder="กรุณากรอกข้อมูลความคาดหวังของท่าน..."
                          value={answers.part1_q2 || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, part1_q2: e.target.value }))}
                          rows={3}
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800 font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800">
                          {part1.q3_text} <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                        </label>
                        <textarea
                          placeholder="มีข้อคิดเห็นอื่นๆ หรือไม่..."
                          value={answers.part1_q3 || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, part1_q3: e.target.value }))}
                          rows={3}
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800 font-medium"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* PAGE 5: Part 2 */}
              {currentStep === 4 && (
                <div id="step-part-2" className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="text-[10px] bg-slate-900 border border-slate-900 text-white font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider font-display">
                      ส่วนที่ 2
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-3 font-display">
                      {part2.title}
                    </h3>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/90 p-4.5 rounded-xl text-sm text-slate-700 font-medium leading-relaxed shadow-sm">
                    📂 <strong className="text-slate-950 font-display">เป้าหมายสถิติ:</strong> {part2.targetText}
                  </div>

                  <div className="space-y-4 pt-2">
                    <label className="block text-sm font-bold text-slate-800 font-display">
                      {part2.q1_text} <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, part2_q1: 'no_suggestions' }))}
                        className={`flex items-center text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          answers.part2_q1 === 'no_suggestions'
                            ? 'border-slate-900 bg-slate-50 text-slate-950 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 ${
                          answers.part2_q1 === 'no_suggestions' ? 'border-slate-900 bg-slate-900' : 'border-slate-305'
                        }`}>
                          {answers.part2_q1 === 'no_suggestions' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-semibold">รับทราบและไม่มีข้อเสนอแนะเพิ่มเติม</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, part2_q1: 'has_suggestions' }))}
                        className={`flex items-center text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          answers.part2_q1 === 'has_suggestions'
                            ? 'border-slate-900 bg-slate-50 text-slate-950 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 ${
                          answers.part2_q1 === 'has_suggestions' ? 'border-slate-900 bg-slate-900' : 'border-slate-305'
                        }`}>
                          {answers.part2_q1 === 'has_suggestions' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-semibold">รับทราบและมีข้อเสนอแนะเพิ่มเติม</span>
                      </button>
                    </div>
                  </div>

                  {answers.part2_q1 === 'has_suggestions' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-3 border-t border-slate-200/60"
                    >
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800">
                          {part2.q2_text} <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          placeholder="กรุณากรอกข้อมูลความคาดหวังของท่าน..."
                          value={answers.part2_q2 || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, part2_q2: e.target.value }))}
                          rows={3}
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800 font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800">
                          {part2.q3_text} <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                        </label>
                        <textarea
                          placeholder="มีข้อคิดเห็นอื่นๆ หรือไม่..."
                          value={answers.part2_q3 || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, part2_q3: e.target.value }))}
                          rows={3}
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800 font-medium"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* PAGE 6: Satisfaction Rating */}
              {currentStep === 5 && (
                <div id="step-part-3" className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="text-[10px] bg-slate-900 border border-slate-900 text-white font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider font-display">
                      ส่วนที่ 3
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-3 font-display">
                      การประเมินความพึงพอใจต่อการจัดส่งข้อมูลผลการสำรวจงานวิจัยสถาบัน
                    </h3>
                  </div>

                  <div className="space-y-6 pt-2">
                    <RatingInput
                      label="1. ด้านเนื้อหาและคุณภาพข้อมูล"
                      description="ข้อมูลมีความน่าเชื่อถือ เป็นปัจจุบัน มีการสรุปผลอย่างชัดเจน และตรงตามความต้องการของหน่วยคณะวิชาหรือหลักสูตร"
                      value={answers.part3_satisfaction.content}
                      onChange={(val) => setAnswers(prev => ({
                        ...prev,
                        part3_satisfaction: { ...prev.part3_satisfaction, content: val }
                      }))}
                    />

                    <RatingInput
                      label="2. ด้านการสื่อสารและการส่งข้อมูล"
                      description="รูปแบบในการนำเสนอผลงานวิจัย ระยะเวลาความถี่ในการจัดส่งมีความเหมาะสม และช่องทางการส่งข้อมูลสะดวกปลอดภัย ง่ายต่อการเข้าถึง"
                      value={answers.part3_satisfaction.communication}
                      onChange={(val) => setAnswers(prev => ({
                        ...prev,
                        part3_satisfaction: { ...prev.part3_satisfaction, communication: val }
                      }))}
                    />

                    <RatingInput
                      label="3. ด้านการนำไปใช้ประโยชน์"
                      description="ข้อมูลการวิจัยเหล่านี้ช่วยชี้แนะให้มองเห็นภาพรวมขององค์กรคณะวิชาได้อย่างชัดเจน และเหมาะสมที่จะนำไปใช้วางแผนปรับปรุงพัฒนาส่วนคุณภาพการศึกษาได้จริง"
                      value={answers.part3_satisfaction.utilization}
                      onChange={(val) => setAnswers(prev => ({
                        ...prev,
                        part3_satisfaction: { ...prev.part3_satisfaction, utilization: val }
                      }))}
                    />
                  </div>
                </div>
              )}

              {/* PAGE 7: Review & Finalize Submission */}
              {currentStep === 6 && (
                <div id="step-summary" className="space-y-6">
                  <div className="border-b border-slate-100 pb-4 text-center">
                    <span className="text-[10px] bg-slate-900 border border-slate-900 text-white font-bold px-4 py-1.5 rounded-full inline-block uppercase tracking-wider font-display">
                      ตรวจสอบข้อมูลก่อนส่งแบบฟอร์ม
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-3 font-display">
                      สรุปผลการตอบแบบสำรวจของท่าน
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-150 space-y-4 max-h-[360px] overflow-y-auto pr-2 font-display">
                    {/* Survey Round info in summary */}
                    <div className="py-3 text-sm">
                      <span className="text-slate-400 font-bold block uppercase tracking-wide text-[10px] font-display">ครั้งที่ประเมินแบบสอบถาม:</span>
                      <p className="font-extrabold text-slate-900 mt-1">
                        - ครั้งที่ {selectedRound}
                      </p>
                    </div>

                    <div className="py-3 text-sm">
                      <span className="text-slate-400 font-bold block uppercase tracking-wide text-[10px] font-display">{part1.title}:</span>
                      <p className="font-bold text-slate-800 mt-1">
                        - {answers.part1_q1 === 'no_suggestions' ? 'รับทราบและไม่มีข้อเสนอแนะเพิ่มเติม' : 'รับทราบและมีข้อเสนอแนะเพิ่มเติม'}
                      </p>
                      {answers.part1_q1 === 'has_suggestions' && (
                        <div className="mt-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 font-medium">
                          <p><strong className="text-slate-900">ความคาดหวัง:</strong> {answers.part1_q2}</p>
                          {answers.part1_q3 && <p className="mt-1"><strong className="text-slate-900 font-semibold">ข้อเสนอแนะ:</strong> {answers.part1_q3}</p>}
                        </div>
                      )}
                    </div>

                    <div className="py-3 text-sm">
                      <span className="text-slate-400 font-bold block uppercase tracking-wide text-[10px] font-display">{part2.title}:</span>
                      <p className="font-bold text-slate-800 mt-1">
                        - {answers.part2_q1 === 'no_suggestions' ? 'รับทราบและไม่มีข้อเสนอแนะเพิ่มเติม' : 'รับทราบและมีข้อเสนอแนะเพิ่มเติม'}
                      </p>
                      {answers.part2_q1 === 'has_suggestions' && (
                        <div className="mt-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 font-medium">
                          <p><strong className="text-slate-900">ความคาดหวัง:</strong> {answers.part2_q2}</p>
                          {answers.part2_q3 && <p className="mt-1"><strong className="text-slate-900 font-semibold">ข้อเสนอแนะ:</strong> {answers.part2_q3}</p>}
                        </div>
                      )}
                    </div>

                    <div className="py-3 text-sm">
                      <span className="text-slate-400 font-bold block uppercase tracking-wide text-[10px] font-display">ผลการให้คะแนนความพึงพอใจ:</span>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-200/90 shadow-xs">
                          <span className="text-[10px] text-slate-500 font-bold block leading-tight">ด้านเนื้อหา</span>
                          <span className="text-xl font-black text-slate-900">{answers.part3_satisfaction.content}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-200/90 shadow-xs">
                          <span className="text-[10px] text-slate-500 font-bold block leading-tight">ด้านสื่อสาร</span>
                          <span className="text-xl font-black text-slate-900">{answers.part3_satisfaction.communication}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-200/90 shadow-xs">
                          <span className="text-[10px] text-slate-500 font-bold block leading-tight">ด้านการใช้ประโยชน์</span>
                          <span className="text-xl font-black text-slate-900">{answers.part3_satisfaction.utilization}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl text-xs text-white border border-slate-950 font-medium shadow-md leading-relaxed">
                     โปรดตรวจสอบความถูกต้องของข้อมูลทุกส่วนอย่างละเอียด เมื่อท่านกดยืนยันส่งข้อมูลแล้ว ระบบงานวิจัยจะทำการบันทึกถาวรและจะไม่สามารถกลับมาแก้ไขสิทธิ์นี้ได้อีก
                  </div>
                </div>
              )}

              {/* Navigation Action Footer inside Wizard Card */}
              {currentStep > 0 && (
                <div id="survey-footer-nav" className="flex justify-between items-center border-t border-slate-100 pt-6 mt-8">
                  <button
                    id="prev-btn"
                    type="button"
                    onClick={handleBack}
                    className="flex items-center space-x-1.5 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>กลับ</span>
                  </button>

                  {currentStep < stepsCount - 1 ? (
                    <button
                      id="next-btn"
                      type="button"
                      disabled={isVerifying}
                      onClick={handleNext}
                      className="flex items-center space-x-1.5 text-sm text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 font-bold px-6 py-3 rounded-lg transition-all cursor-pointer shadow-md font-display"
                    >
                      {isVerifying ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white mr-1" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>ตรวจสอบข้อมูล...</span>
                        </>
                      ) : (
                        <>
                          <span>ถัดไป</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      id="submit-form-btn"
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmit}
                      className="flex items-center space-x-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 font-bold px-8 py-3.5 rounded-xl shadow-md transition cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center space-x-1">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>กำลังส่งข้อมูล...</span>
                        </span>
                      ) : (
                        <>
                          <span>ส่งคำคิดเห็นแบบฟอร์ม</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* Submission completed with elegant design success */
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 space-y-6"
            >
              <div className="inline-flex p-4 bg-emerald-50 border-2 border-emerald-100 text-emerald-600 rounded-full animate-bounce">
                <CheckCircle className="w-14 h-14" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 font-display">ส่งแบบตอบรับสำเร็จเสร็จสิ้น</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed font-sans font-medium">
                  สำนักมาตรฐานคุณภาพการศึกษา ขอขอบพระคุณเป็นอย่างยิ่งสำหรับข้อมูลความเห็นและข้อเสนอแนะในการนำผลวิจัยสถาบันไปพัฒนาต่อยอดเพื่อสิทธิประโยชน์สูงสุดของสถาบัน
                </p>
              </div>

              <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-950 px-4 py-2 rounded-xl text-white text-xs font-bold font-mono">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>คุณสามารถปิดแท็บหรือเบราว์เซอร์นี้ได้เลย</span>
              </div>

              <div className="pt-6">
                <button
                  id="go-home-btn"
                  onClick={() => {
                    setAnswers({
                      part1_q1: '',
                      part1_q2: '',
                      part1_q3: '',
                      part2_q1: '',
                      part2_q2: '',
                      part2_q3: '',
                      part3_satisfaction: { content: 0, communication: 0, utilization: 0 }
                    });
                    setRespondentId('');
                    setRespondentPosition('');
                    setRespondentPhone('');
                    setSelectedFaculty('');
                    setSubmitSuccess(false);
                    setCurrentStep(0);
                  }}
                  className="mx-auto text-sm border-2 border-slate-200 hover:border-indigo-600 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-900 font-bold px-6 py-3 rounded-2xl transition duration-200 cursor-pointer"
                >
                  ทำรายการแบบตอบกลับชุดใหม่
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
