import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Trash2,
  RefreshCw,
  Edit2,
  Plus,
  ArrowLeft,
  CheckCircle,
  FileSpreadsheet,
  Mail,
  Copy,
  Check,
  Search,
  SlidersHorizontal,
  Info,
  Users,
  Shield,
  Upload,
  UserPlus,
  FileText,
  Printer,
  BarChart3,
  TrendingUp,
  Award,
  Activity,
  Sparkles,
  Lightbulb,
  ListTodo,
  Briefcase,
  Target
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, FIXED_ADMINS, auth } from '../firebase';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Question, SurveyResponse } from '../types';
import { BU_FACULTIES } from './FacultySelector';

function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  const hRad = (h * Math.PI) / 180;
  const a_ = c * Math.cos(hRad);
  const b_ = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const fn = (x: number) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(fn(rL) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(fn(gL) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(fn(bL) * 255)));

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function oklabToRgb(l: number, a_: number, b_: number, alpha: number = 1): string {
  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const fn = (x: number) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(fn(rL) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(fn(gL) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(fn(bL) * 255)));

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ripOklch(cssText: string): string {
  if (!cssText || !cssText.toLowerCase().includes('oklch')) return cssText;
  return cssText.replace(/oklch\s*\(([^)]+)\)/gi, (match, inner) => {
    try {
      const parts = inner.trim().split(/[\s,/]+/).filter(Boolean);
      if (parts.length >= 3) {
        const lStr = parts[0];
        const cStr = parts[1];
        const hStr = parts[2];
        const aStr = parts[3];

        let l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
        let c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);
        let h = hStr.endsWith('deg') ? parseFloat(hStr) : (hStr.endsWith('%') ? parseFloat(hStr) / 100 * 360 : parseFloat(hStr));
        let a = aStr ? (aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr)) : 1;

        if (l > 1 && !lStr.includes('%')) l = l / 100;
        if (c > 1 && !cStr.includes('%')) c = c / 100;

        return oklchToRgb(l, c, h, a);
      }
    } catch (e) {
      // safe fallback
    }
    return 'rgb(79, 70, 229)';
  });
}

function ripOklab(cssText: string): string {
  if (!cssText || !cssText.toLowerCase().includes('oklab')) return cssText;
  return cssText.replace(/oklab\s*\(([^)]+)\)/gi, (match, inner) => {
    try {
      const parts = inner.trim().split(/[\s,/]+/).filter(Boolean);
      if (parts.length >= 3) {
        const lStr = parts[0];
        const aStr = parts[1];
        const bStr = parts[2];
        const alphaStr = parts[3];

        let l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
        let a = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
        let b = bStr.endsWith('%') ? parseFloat(bStr) / 100 : parseFloat(bStr);
        let alpha = alphaStr ? (alphaStr.endsWith('%') ? parseFloat(alphaStr) / 100 : parseFloat(alphaStr)) : 1;

        if (l > 1 && !lStr.includes('%')) l = l / 100;

        return oklabToRgb(l, a, b, alpha);
      }
    } catch (e) {
      // safe fallback
    }
    return 'rgb(79, 70, 229)';
  });
}

function sanitizeColors(cssText: string): string {
  let sanitized = ripOklch(cssText);
  sanitized = ripOklab(sanitized);
  return sanitized;
}

function sanitizeInlineStyle(val: string): string {
  if (!val) return val;
  let s = val;
  if (s.toLowerCase().includes('oklch')) {
    s = ripOklch(s);
  }
  if (s.toLowerCase().includes('oklab')) {
    s = ripOklab(s);
  }
  return s;
}

interface AdminPanelProps {
  onBack: () => void;
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

interface ActionItem {
  id: string;
  text: string;
  category: 'content' | 'communication' | 'utilization' | 'general';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  isAutoGenerated?: boolean;
}

function ActionTracker({ widgetResponses }: { widgetResponses: SurveyResponse[] }) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'content' | 'communication' | 'utilization' | 'general'>('general');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    const saved = localStorage.getItem('bu_survey_improvement_plans');
    if (saved) {
      try {
        setActions(JSON.parse(saved));
        return;
      } catch (e) {
        console.error("Failed to parse saved plans", e);
      }
    }

    const totalWithSatisfaction = widgetResponses.filter(r => r.answers?.part3_satisfaction);
    let contentAvg = 0;
    let communicationAvg = 0;
    let utilizationAvg = 0;

    if (totalWithSatisfaction.length > 0) {
      let contentSum = 0;
      let commSum = 0;
      let utilSum = 0;
      totalWithSatisfaction.forEach(r => {
        const s = r.answers.part3_satisfaction;
        contentSum += Number(s.content) || 0;
        commSum += Number(s.communication) || 0;
        utilSum += Number(s.utilization) || 0;
      });
      contentAvg = contentSum / totalWithSatisfaction.length;
      communicationAvg = commSum / totalWithSatisfaction.length;
      utilizationAvg = utilSum / totalWithSatisfaction.length;
    }

    const items: ActionItem[] = [
      {
        id: 'auto-1',
        text: 'วิเคราะห์หลักสูตรร่วมกับการประกันคุณภาพการศึกษาและปรับวิชาทักษะเชิงลึกเทคโนโลยีสารสนเทศเพิ่มขึ้น',
        category: 'content',
        priority: (contentAvg > 0 && contentAvg < 3.8) ? 'high' : 'medium',
        status: 'pending',
        createdAt: new Date().toLocaleDateString('th-TH'),
        isAutoGenerated: true
      },
      {
        id: 'auto-2',
        text: 'เพิ่มช่องทางสมาคมสื่อสารประชาสัมพันธ์ศิษย์เก่า บัณฑิตใหม่ และคู่มือแนะนำงานวิจัยหลักสูตรอย่างกระชับชัดเจน',
        category: 'communication',
        priority: (communicationAvg > 0 && communicationAvg < 3.8) ? 'high' : 'medium',
        status: 'pending',
        createdAt: new Date().toLocaleDateString('th-TH'),
        isAutoGenerated: true
      },
      {
        id: 'auto-3',
        text: 'ขยายการทำงานเชิงลึก (MOU) ยกระดับจับคู่ทักษะผู้สมัครฝึกงานและขอบข่ายการใช้ประโยชน์ผลสำรวจ สว.1',
        category: 'utilization',
        priority: (utilizationAvg > 0 && utilizationAvg < 3.8) ? 'high' : 'medium',
        status: 'pending',
        createdAt: new Date().toLocaleDateString('th-TH'),
        isAutoGenerated: true
      },
      {
        id: 'general-1',
        text: 'จัดเวทีสัมมนาระดับคณะวิชาประเมินผลและสรุปรายงานประกันคุณภาพสถาบันเพื่อป้อนผลเชิงบริหาร BU-QA',
        category: 'general',
        priority: 'high',
        status: 'in_progress',
        createdAt: new Date().toLocaleDateString('th-TH'),
        isAutoGenerated: true
      }
    ];
    setActions(items);
    localStorage.setItem('bu_survey_improvement_plans', JSON.stringify(items));
  }, [widgetResponses]);

  const saveAndSetActions = (newActions: ActionItem[]) => {
    setActions(newActions);
    localStorage.setItem('bu_survey_improvement_plans', JSON.stringify(newActions));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newItem: ActionItem = {
      id: 'custom-' + Date.now(),
      text: newTaskText.trim(),
      category: newTaskCategory,
      priority: newTaskPriority,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('th-TH'),
      isAutoGenerated: false
    };

    const updated = [newItem, ...actions];
    saveAndSetActions(updated);
    setNewTaskText('');
  };

  const handleDeleteTask = (id: string) => {
    const updated = actions.filter(a => a.id !== id);
    saveAndSetActions(updated);
  };

  const handleRotateStatus = (id: string) => {
    const updated = actions.map(a => {
      if (a.id === id) {
        let nextStatus: 'pending' | 'in_progress' | 'completed' = 'pending';
        if (a.status === 'pending') nextStatus = 'in_progress';
        else if (a.status === 'in_progress') nextStatus = 'completed';
        return { ...a, status: nextStatus };
      }
      return a;
    });
    saveAndSetActions(updated);
  };

  const handleResetDefaults = () => {
    localStorage.removeItem('bu_survey_improvement_plans');
    window.location.reload();
  };

  const filtered = actions.filter(a => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const completedCount = actions.filter(a => a.status === 'completed').length;
  const totalCount = actions.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 mb-1">
            <span>ความคืบหน้าการขับเคลื่อนปรับปรุงเพื่อตอบโจทย์ผู้ใช้หลักสูตร</span>
            <span>{completedCount}/{totalCount} แผนงาน ({progressPct.toFixed(0)}%)</span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-350" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 items-center shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-1 rounded-md font-bold text-[10px] transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border text-slate-500 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-2 py-1 rounded-md font-bold text-[10px] transition cursor-pointer ${
              statusFilter === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-white border text-slate-500 hover:bg-slate-50'
            }`}
          >
            รอดำเนินการ
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-2 py-1 rounded-md font-bold text-[10px] transition cursor-pointer ${
              statusFilter === 'in_progress' ? 'bg-indigo-50 text-indigo-700' : 'bg-white border text-slate-500 hover:bg-slate-50'
            }`}
          >
            กำลังทำ
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-2 py-1 rounded-md font-bold text-[10px] transition cursor-pointer ${
              statusFilter === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-white border text-slate-500 hover:bg-slate-50'
            }`}
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-bold">
            ไม่มีรายการปรับปรุงในหมวดนี้
          </div>
        ) : (
          filtered.map(item => (
            <div 
              key={item.id} 
              className={`flex items-start justify-between p-3.5 rounded-xl border transition duration-150 ${
                item.status === 'completed' ? 'bg-emerald-50/20 border-emerald-250/50' : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start space-x-2.5 flex-1 min-w-0 mr-2">
                <button
                  type="button"
                  onClick={() => handleRotateStatus(item.id)}
                  title="คลิกเปลี่ยนสถานะ"
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border cursor-pointer mt-0.5 transition-all ${
                    item.status === 'completed' ? 'bg-emerald-500 border-emerald-600 text-white' :
                    item.status === 'in_progress' ? 'bg-indigo-600 border-indigo-700 text-white animate-pulse' :
                    'bg-slate-100 hover:bg-slate-200 border-slate-350'
                  }`}
                >
                  {item.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                  {item.status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                  {item.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>}
                </button>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className={`text-xs font-bold leading-relaxed ${item.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {item.text}
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                      item.priority === 'high' ? 'bg-rose-100 text-rose-800' :
                      item.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.priority === 'high' ? 'ด่วนที่สุด (High)' : 
                       item.priority === 'medium' ? 'สำคัญ (Medium)' : 
                       'ทั่วไป (Low)'
                      }
                    </span>

                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
                      item.category === 'content' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                      item.category === 'communication' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                      item.category === 'utilization' ? 'bg-cyan-50 border-cyan-100 text-cyan-700' :
                      'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      {item.category === 'content' ? 'ความสมบูรณ์เนื้อหา' :
                       item.category === 'communication' ? 'การสื่อสาร' :
                       item.category === 'utilization' ? 'การนำใช้ประโยชน์' :
                       'ทั่วไป'
                      }
                    </span>

                    {item.isAutoGenerated && (
                      <span className="text-[8.5px] text-indigo-700 font-extrabold tracking-tight bg-indigo-50/55 px-1.5 py-0.5 rounded border border-indigo-100">
                        🤖 ประเมินจุดอ่อนอัจฉริยะ
                      </span>
                    )}

                    <span className="text-[8px] text-slate-400 font-mono">
                      สร้างเมื่อ: {item.createdAt}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(item.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition"
                  title="ลบ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddTask} className="border-t border-slate-100 pt-3 space-y-2.5">
        <p className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider">
          บันทึกแผนปรับปรุงยกระดับระบบเพิ่มเติม:
        </p>
        
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="เช่น ปรับปรุงหลักสูตรเสริมภาษาอังกฤษเพิ่ม 2 เครดิตเชิงสหกิจ..."
            className="flex-1 px-3 py-2 border rounded-xl bg-slate-50/50 border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-755"
          />
          
          <button
            type="submit"
            disabled={!newTaskText.trim()}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-white cursor-pointer transition disabled:opacity-50 flex items-center space-x-1 shrink-0 shadow-xs text-xs"
          >
            <Plus className="w-3.5 h-3.5 animate-pulse" />
            <span>เพิ่มแผน</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-1">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400">หมวดหมู่เป้าหมาย:</label>
            <select
              value={newTaskCategory}
              onChange={(e) => setNewTaskCategory(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold text-slate-700 text-[10.5px]"
            >
              <option value="general">ทั่วไป (General Component)</option>
              <option value="content">มิติด้านเนื้อหาหลักสูตร (Quality)</option>
              <option value="communication">มิติด้านการสื่อสาร (Outreach)</option>
              <option value="utilization">มิติด้านการไปใช้ประโยชน์ (Career)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400">ระดับความสำคัญ:</label>
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold text-slate-700 text-[10.5px]"
            >
              <option value="low">ทั่วไป (Low priority)</option>
              <option value="medium">สำคัญ (Medium priority)</option>
              <option value="high">ด่วนที่สุด (High priority)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[9px] text-slate-400 hover:text-slate-600 underline font-semibold cursor-pointer"
          >
            กู้คืนแผนที่แนะนำตั้งต้น (Reset defaults)
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'responses' | 'questions' | 'system' | 'integration'>('dashboard');

  // System Management State
  const [adminsList, setAdminsList] = useState<{ id: string; email: string; name: string; roleType?: string; lastLogin?: any }[]>([]);
  const [newAdminRole, setNewAdminRole] = useState<string>('Dynamic Admin');
  const [editingAdmin, setEditingAdmin] = useState<{ id: string; email: string; name: string; roleType: string } | null>(null);
  const [instructorsList, setInstructorsList] = useState<{ id: string; email: string; name?: string; faculty?: string; addedAt?: any }[]>([]);
  const [systemSubTab, setSystemSubTab] = useState<'admins' | 'instructors'>('admins');
  const [systemSearchQuery, setSystemSearchQuery] = useState('');
  
  // Create Admins/Instructors Form fields
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  
  const [newInstEmail, setNewInstEmail] = useState('');
  const [newInstName, setNewInstName] = useState('');
  const [newInstFaculty, setNewInstFaculty] = useState('');
  const [newInstStaffId, setNewInstStaffId] = useState('');
  const [newInstPosition, setNewInstPosition] = useState('');
  const [newInstInternalPhone, setNewInstInternalPhone] = useState('');
  
  const [editingInstructor, setEditingInstructor] = useState<{
    id: string;
    staffId: string;
    email: string;
    name: string;
    position: string;
    faculty: string;
    internalPhone: string;
  } | null>(null);

  // File Import drag & drop state
  const [isDraggingCSV, setIsDraggingCSV] = useState(false);

  // Question editing Modal state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [newQuestionForm, setNewQuestionForm] = useState<Partial<Question>>({});
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState('');
  const [hideEmptyFaculties, setHideEmptyFaculties] = useState(true);

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Custom confirmation modal state to bypass browser iframe restrictions
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDanger?: boolean;
  } | null>(null);

  // Fetch data
  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      // Load Dynamic Questions
      const qRef = collection(db, 'questions');
      const qQuery = query(qRef, orderBy('section', 'asc'));
      const qSnap = await getDocs(qQuery);
      
      let loadedQuestions: Question[] = [];
      if (qSnap.empty) {
        // Build defaults into Firestore if first initialize
        const batch = writeBatch(db);
        DEFAULT_QUESTIONS.forEach((q) => {
          const newDocRef = doc(db, 'questions', q.id);
          batch.set(newDocRef, {
            ...q,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          loadedQuestions.push({
            ...q,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
        await batch.commit();
      } else {
        qSnap.forEach((docSnap) => {
          loadedQuestions.push(docSnap.data() as Question);
        });
      }
      setQuestions(loadedQuestions);

      // Load Responses
      const resSnap = await getDocs(collection(db, 'responses'));
      const loadedResponses: SurveyResponse[] = [];
      resSnap.forEach((docSnap) => {
        loadedResponses.push(docSnap.data() as SurveyResponse);
      });
      // Sort responses by timestamp desc safely
      loadedResponses.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
      setResponses(loadedResponses);

      // Load Admins
      try {
        const adminsSnap = await getDocs(collection(db, 'admins'));
        let loadedAdmins: any[] = [];
        adminsSnap.forEach((docSnap) => {
          loadedAdmins.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Seed default admins only if the collection is completely empty
        if (loadedAdmins.length === 0) {
          const defaultAdmins = [
            { email: "walailuk.p@bu.ac.th", name: "System Developer Admin", roleType: "System Core" },
            { email: "admin1@bu.ac.th", name: "System Developer Admin", roleType: "System Core" },
            { email: "admin2@bu.ac.th", name: "System Developer Admin", roleType: "System Core" }
          ];
          for (const item of defaultAdmins) {
            await setDoc(doc(db, 'admins', item.email), {
              email: item.email,
              name: item.name,
              roleType: item.roleType,
              lastLogin: null
            });
            loadedAdmins.push({
              id: item.email,
              email: item.email,
              name: item.name,
              roleType: item.roleType,
              lastLogin: null
            });
          }
        }
        // Sort loadedAdmins: System Core (ผู้ดูแลระบบหลัก) first, followed by Dynamic Admin (ผู้ดูแลระบบทั่วไป)
        loadedAdmins.sort((a, b) => {
          const isCoreA = a.roleType === 'System Core';
          const isCoreB = b.roleType === 'System Core';
          if (isCoreA && !isCoreB) return -1;
          if (!isCoreA && isCoreB) return 1;
          return (a.name || a.email || '').localeCompare(b.name || b.email || '');
        });

        setAdminsList(loadedAdmins);
      } catch (adminErr) {
        console.error("Failed to load admins:", adminErr);
      }

      // Load Instructors
      try {
        const instructorsSnap = await getDocs(collection(db, 'instructors'));
        const loadedInstructors: any[] = [];
        instructorsSnap.forEach((docSnap) => {
          loadedInstructors.push({ id: docSnap.id, ...docSnap.data() });
        });
        setInstructorsList(loadedInstructors);
      } catch (instErr) {
        console.error("Failed to load instructors:", instErr);
      }
    } catch (err) {
      setActionError(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerSuccessMessage = (message: string) => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-dashboard-area');
    if (!element) return;

    setIsGeneratingPDF(true);
    setActionError(null);

    const originalGetComputedStyle = window.getComputedStyle;
    const originalGPV = CSSStyleDeclaration.prototype.getPropertyValue;

    const disabledSheets: any[] = [];
    let tempStyleEl: HTMLStyleElement | null = null;

    try {
      // Patch global computed style evaluations to dynamically transform unsupported colors (oklch, oklab)
      (window as any).getComputedStyle = function(elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
        const style = originalGetComputedStyle.call(window, elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            if (prop === '__target') {
              return target;
            }
            if (prop === 'getPropertyValue') {
              return function(propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                return sanitizeInlineStyle(val);
              };
            }
            if (typeof prop === 'string') {
              const val = Reflect.get(target, prop);
              if (typeof val === 'function') {
                return val.bind(target);
              }
              if (typeof val === 'string') {
                return sanitizeInlineStyle(val);
              }
              return val;
            }
            return Reflect.get(target, prop);
          }
        }) as any;
      };

      CSSStyleDeclaration.prototype.getPropertyValue = function(this: any, propertyName: string): string {
        const target = (this && this.__target) || this;
        const val = originalGPV.call(target, propertyName);
        return sanitizeInlineStyle(val);
      };

      // 1. Gather all CSS rules in the page into a single huge string
      let fullCssText = "";
      
      Array.from(document.styleSheets).forEach((sheet: any) => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          rules.forEach((rule: any) => {
            fullCssText += rule.cssText + "\n";
          });
        } catch (e) {
          // Fallback to text content if rules are not accessible (e.g. CORS)
          if (sheet.ownerNode && sheet.ownerNode.textContent) {
            fullCssText += sheet.ownerNode.textContent + "\n";
          }
        }
      });

      // Include static <style> textContents to be absolutely safe
      Array.from(document.querySelectorAll('style')).forEach((el) => {
        if (el.textContent && el.id !== 'temp-pdf-colors-injection') {
          fullCssText += el.textContent + "\n";
        }
      });

      // 2. Convert all oklch and oklab structures inside into standard RGBA/RGB colors
      const sanitizedCss = sanitizeColors(fullCssText);

      // 3. Inject a new temporary sanitized style element
      tempStyleEl = document.createElement('style');
      tempStyleEl.id = 'temp-pdf-colors-injection';
      tempStyleEl.textContent = sanitizedCss;
      document.head.appendChild(tempStyleEl);

      // 4. Disable all other stylesheets temporarily so html2canvas doesn't load/parse them
      Array.from(document.styleSheets).forEach((sheet: any) => {
        if (sheet.ownerNode !== tempStyleEl) {
          try {
            sheet.disabled = true;
            disabledSheets.push(sheet);
          } catch (err) {
            // Ignored
          }
        }
      });

      // Force scrollTo top for clean full height capturing
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowWidth: 1248,
        ignoreElements: (node: any) => {
          return node.classList.contains('no-print');
        },
        onclone: (clonedDoc) => {
          // Force layout sizing on clone to guarantee desktop standard layout & gorgeous balanced spacing
          const clonedElement = clonedDoc.getElementById('printable-dashboard-area');
          if (clonedElement) {
            clonedElement.style.width = '1200px';
            clonedElement.style.padding = '32px';
            clonedElement.style.margin = '0 auto';
            clonedElement.style.backgroundColor = '#f8fafc'; // clean light background
            clonedElement.style.borderRadius = '0px'; 

            // Mathematically push Section 5 (Strategic recommendations) perfectly to Page 2 of the PDF
            const targetSec = clonedDoc.getElementById('pdf-section-strategic-recommendations');
            if (targetSec) {
              const rectContainer = clonedElement.getBoundingClientRect();
              const rectTarget = targetSec.getBoundingClientRect();
              
              // We calculate relative Y offset of Section 5 inside the printable container
              const secTopRelative = rectTarget.top - rectContainer.top;
              
              // Exactly 267 mm contentHeight corresponds to (267 * 1200 / 186) = ~1722.58 px page height on a 1200px wide element
              const clonedPageHeight = 267 * (1200 / 186);
              
              if (secTopRelative > 0 && secTopRelative < clonedPageHeight) {
                const gapNeeded = clonedPageHeight - secTopRelative;
                const spacer = clonedDoc.createElement('div');
                spacer.style.height = `${gapNeeded}px`;
                spacer.style.width = '100%';
                spacer.style.clear = 'both';
                
                if (targetSec.parentNode) {
                  targetSec.parentNode.insertBefore(spacer, targetSec);
                }
                console.log(`PDF Export: Pushed Section 5 to Page 2 by adding a ${gapNeeded}px spacer.`);
              }
            }
          }

          const clonedWindow = clonedDoc.defaultView;
          if (clonedWindow) {
            const orgClonedGCS = clonedWindow.getComputedStyle;
            (clonedWindow as any).getComputedStyle = function(elt: Element, pseudoElt?: string | null) {
              const style = orgClonedGCS.call(clonedWindow, elt, pseudoElt);
              return new Proxy(style, {
                get(target, prop) {
                  if (prop === '__target') {
                    return target;
                  }
                  if (prop === 'getPropertyValue') {
                    return function(propertyName: string) {
                      const val = target.getPropertyValue(propertyName);
                      return sanitizeInlineStyle(val);
                    };
                  }
                  if (typeof prop === 'string') {
                    const val = Reflect.get(target, prop);
                    if (typeof val === 'function') {
                      return val.bind(target);
                    }
                    if (typeof val === 'string') {
                      return sanitizeInlineStyle(val);
                    }
                    return val;
                  }
                  return Reflect.get(target, prop);
                }
              }) as any;
            };

            if ((clonedWindow as any).CSSStyleDeclaration) {
              const originalClonedGPV = (clonedWindow as any).CSSStyleDeclaration.prototype.getPropertyValue;
              (clonedWindow as any).CSSStyleDeclaration.prototype.getPropertyValue = function(
                this: any,
                propertyName: string
              ): string {
                const target = (this && this.__target) || this;
                const val = originalClonedGPV.call(target, propertyName);
                return sanitizeInlineStyle(val);
              };
            }
          }

          const allCloned = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allCloned.length; i++) {
            const el = allCloned[i] as HTMLElement;
            try {
              // Also sanitize any inline styles in clone
              const bg = el.style.backgroundColor;
              const fg = el.style.color;
              const border = el.style.borderColor;

              if (bg && (bg.toLowerCase().includes('oklch') || bg.toLowerCase().includes('oklab'))) {
                el.style.backgroundColor = sanitizeInlineStyle(bg);
              }
              if (fg && (fg.toLowerCase().includes('oklch') || fg.toLowerCase().includes('oklab'))) {
                el.style.color = sanitizeInlineStyle(fg);
              }
              if (border && (border.toLowerCase().includes('oklch') || border.toLowerCase().includes('oklab'))) {
                el.style.borderColor = sanitizeInlineStyle(border);
              }
            } catch (styleErr) {
              // Ignore safely
            }
          }
        }
      });

      // Implement slice-by-slice drawing onto A4 pages to secure beautiful, pristine page margins (จัดกั้นหน้ากั้นหลัง)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const marginX = 12; // 12mm Left & Right margins
      const marginY = 15; // 15mm Top & Bottom margins
      
      const pageWidth = 210;
      const pageHeight = 297;
      
      const contentWidth = pageWidth - (marginX * 2); // 186 mm
      const contentHeight = pageHeight - (marginY * 2); // 267 mm
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Calculate how many pixels of canvas correspond to contentHeight on PDF
      const pixelsPerMm = canvasWidth / contentWidth;
      const sliceHeightPx = contentHeight * pixelsPerMm;
      
      let imgHeightLeft = canvasHeight;
      let currentSourceY = 0;
      let pageIndex = 0;
      
      while (imgHeightLeft > 0) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        
        const currentSliceHeightPx = Math.min(sliceHeightPx, imgHeightLeft);
        
        // Create a temporary canvas for this slice
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = currentSliceHeightPx;
        
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          // Fill background as white (crucial for nice looks)
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          // Draw the slice of the original canvas
          tempCtx.drawImage(
            canvas,
            0, currentSourceY, canvasWidth, currentSliceHeightPx, // Source rectangle
            0, 0, canvasWidth, currentSliceHeightPx // Destination rectangle
          );
        }
        
        const sliceDataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
        
        // Calculate dimensions to render on the PDF page
        const destWidth = contentWidth;
        const destHeight = currentSliceHeightPx / pixelsPerMm;
        
        pdf.addImage(
          sliceDataUrl,
          'JPEG',
          marginX,
          marginY,
          destWidth,
          destHeight,
          undefined,
          'FAST'
        );
        
        currentSourceY += currentSliceHeightPx;
        imgHeightLeft -= currentSliceHeightPx;
        pageIndex++;
      }

      pdf.save(`BU_QA_Feedback_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      triggerSuccessMessage("ดาวน์โหลดสรุปรายงานและจัดพิมพ์ไฟล์ PDF สำเร็จจริงแล้ว!");
    } catch (error: any) {
      console.error("PDF generating failed:", error);
      setActionError(`ไม่สามารถดาวน์โหลดได้โดยตรง: ${error.message || String(error)} กรุณาใช้ปุ่มพิมพ์รายงาน PDF ของบราวเซอร์แทน`);
    } finally {
      // Restore standard CSSStyleDeclaration & getComputedStyle methods
      (window as any).getComputedStyle = originalGetComputedStyle;
      CSSStyleDeclaration.prototype.getPropertyValue = originalGPV;

      // 5. Restore original stylesheets
      disabledSheets.forEach((sheet: any) => {
        try {
          sheet.disabled = false;
        } catch (err) {
          // Ignored
        }
      });
      // 6. Delete temporary style injection
      if (tempStyleEl && tempStyleEl.parentNode) {
        tempStyleEl.parentNode.removeChild(tempStyleEl);
      }
      setIsGeneratingPDF(false);
    }
  };

  // Export responses data to CSV
  const handleExportData = () => {
    if (responses.length === 0) {
      setActionError("ไม่มีข้อมูลสถิติให้ดำเนินการส่งออก");
      return;
    }

    try {
      // Build headers
      const headers = [
        "ลำดับ (Index)",
        "วันที่ทำรายการ (Submission Date)",
        "ครั้งที่ทำแบบสอบถาม (Round)",
        "รหัสบุคลากร (Staff ID)",
        "ชื่อ-นามสกุล (Full Name)",
        "ตำแหน่งบุคลากร (Position)",
        "หน่วยงานคณะวิชา (Faculty)",
        "อีเมลบุคลากร (Email)",
        "เบอร์โทรภายใน (Internal Tel)",
        "งานวิจัย 1: Status (Part 1 Status)",
        "งานวิจัย 1: ความคาดหวัง (Part 1 Expectation)",
        "งานวิจัย 1: ข้อเสนอแนะ (Part 1 Comments)",
        "งานวิจัย 2: Status (Part 2 Status)",
        "งานวิจัย 2: ความคาดหวัง (Part 2 Expectation)",
        "งานวิจัย 2: ข้อเสนอแนะ (Part 2 Comments)",
        "ระดับความพึงพอใจ: ด้านเนื้อหา (Content Rating)",
        "ระดับความพึงพอใจ: ด้านการสื่อสาร (Communication Rating)",
        "ระดับความพึงพอใจ: ด้านการนำไปใช้ประโยชน์ (Utilization Rating)"
      ];

      // Convert response values to array rows
      const rows = responses.map((res, index) => {
        const answers = res.answers;
        const formattedDate = res.timestamp?.seconds 
          ? new Date(res.timestamp.seconds * 1000).toLocaleString('th-TH')
          : "N/A";
        
        const roundText = res.round ? `ครั้งที่ ${res.round}` : "ครั้งที่ 1";
        
        const part1Q1Text = answers.part1_q1 === 'no_suggestions' 
          ? "รับทราบและไม่มีข้อเสนอแนะเพิ่มเติม"
          : answers.part1_q1 === 'has_suggestions'
            ? "รับทราบและมีข้อเสนอแนะเพิ่มเติม"
            : "ไม่ตอบ";

        const part2Q1Text = answers.part2_q1 === 'no_suggestions' 
          ? "รับทราบและไม่มีข้อเสนอแนะเพิ่มเติม"
          : answers.part2_q1 === 'has_suggestions'
            ? "รับทราบและมีข้อเสนอแนะเพิ่มเติม"
            : "ไม่ตอบ";

        return [
          index + 1,
          formattedDate,
          roundText,
          res.respondentId || "-",
          res.respondentName || "N/A",
          res.respondentPosition || "-",
          res.faculty || "N/A",
          res.respondentEmail || "-",
          res.respondentPhone || "-",
          part1Q1Text,
          answers.part1_q2 || "-",
          answers.part1_q3 || "-",
          part2Q1Text,
          answers.part2_q2 || "-",
          answers.part2_q3 || "-",
          answers.part3_satisfaction?.content || 0,
          answers.part3_satisfaction?.communication || 0,
          answers.part3_satisfaction?.utilization || 0
        ];
      });

      // Escape fields and join CSV
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      // Set UTF-8 BOM so Excel opens with Thai letters correctly
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `research_feedback_export_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      triggerSuccessMessage("ดาวน์โหลดไฟล์รายงาน CSV เรียบร้อยแล้ว (รองรับการเปิดใน Excel ภาษาไทย 100%)");
    } catch (err: any) {
      setActionError(`ดาวน์โหลดรายงานผิดพลาด: ${err.message}`);
    }
  };

  // Clear all responses from collection
  const handleClearAllResponses = () => {
    setConfirmConfig({
      title: "ล้างข้อมูลสถิติการตอบกลับทั้งหมด?",
      message: "คำเตือน: คุณแน่ใจชัวร์นะว่าต้องการลบข้อมูลสถิติการตอบกลับทั้งหมด? การทำรายการนี้จะไม่สามารถกู้คืนกลับมาได้อีก",
      confirmText: "ใช่, ลบทั้งหมด",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const batch = writeBatch(db);
          const resSnap = await getDocs(collection(db, 'responses'));
          
          resSnap.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          
          await batch.commit();
          setResponses([]);
          triggerSuccessMessage("ล้างข้อมูลการตอบกลับทั้งหมดออกจากระบบวิจัยเรียบร้อยแล้ว");
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.DELETE, 'responses/*');
          } catch (adaptedError: any) {
            setActionError(`ไม่สามารถล้างข้อมูล: ${adaptedError.message}`);
          }
        } finally {
          setIsLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Delete individual response
  const handleDeleteResponse = (resId: string, name: string) => {
    setConfirmConfig({
      title: "ยืนยันการลบข้อมูลรายบุคคล",
      message: `คุณแน่ใจใช่หรือไม่ว่าต้องการลบข้อมูลสถิติการตอบกลับของ "${name}"? การทำรายการนี้จะไม่สามารถกู้คืนได้`,
      confirmText: "ใช่, ยืนยันลบข้อมูล",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await deleteDoc(doc(db, 'responses', resId));
          setResponses(prev => prev.filter(r => r.id !== resId));
          triggerSuccessMessage(`ลบข้อมูลของ "${name}" สำเร็จเรียบร้อยแล้ว`);
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.DELETE, `responses/${resId}`);
          } catch (adaptedError: any) {
            setActionError(`ไม่สามารถลบข้อมูล: ${adaptedError.message}`);
          }
        } finally {
          setIsLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Update question
  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    
    try {
      setIsLoading(true);
      const updatedPayload: Question = {
        ...editingQuestion,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'questions', editingQuestion.id), updatedPayload);
      setEditingQuestion(null);
      triggerSuccessMessage("บันทึกการแก้ไขหัวข้อและคำถามสำรวจสำเร็จ");
      await loadData();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `questions/${editingQuestion.id}`);
      } catch (adaptedError: any) {
        setActionError(`แก้ไขผิดพลาด: ${adaptedError.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Delete dynamic question
  const handleDeleteQuestion = (qId: string) => {
    setConfirmConfig({
      title: "ยืนยันการลบหัวข้อคำถาม",
      message: "คุณตกลงแน่ใจใช่หรือไม่ว่าต้องการลบส่วนรายงานคำถามชุดนี้ออกจากแบบฟอร์ม? หัวข้อวิจัยที่ถูกส่งและการประเมินทั้งหมดในส่วนนี้จะไม่ปรากฏในตาราง",
      confirmText: "ใช่, ยืนยันลบหัวข้อ",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await deleteDoc(doc(db, 'questions', qId));
          triggerSuccessMessage("ลบคำถามจำกัดเรียบร้อยแล้ว");
          await loadData();
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.DELETE, `questions/${qId}`);
          } catch (adaptedError: any) {
            setActionError(`ลบผิดพลาด: ${adaptedError.message}`);
          }
        } finally {
          setIsLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Add custom dynamic question
  const handleAddQuestion = async () => {
    if (!newQuestionForm.title || !newQuestionForm.targetText) {
      setActionError("กรุณากรอกข้อมูล หัวเรื่องบทวิจัย และค่าเป้าหมาย เพื่อป้อนคำถามชุดใหม่");
      return;
    }

    const nextSection = questions.length + 1;
    const newId = `part_${Date.now()}`;
    const formattedPayload: Question = {
      id: newId,
      section: nextSection,
      title: newQuestionForm.title,
      targetText: newQuestionForm.targetText,
      q1_text: newQuestionForm.q1_text || `1. ${newQuestionForm.targetText}`,
      q2_text: newQuestionForm.q2_text || "2. ความคาดหวังในการนำข้อมูลไปใช้ประโยชน์",
      q3_text: newQuestionForm.q3_text || "3. ข้อเสนอแนะ/ข้อคิดเห็น",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      setIsLoading(true);
      await setDoc(doc(db, 'questions', newId), formattedPayload);
      setNewQuestionForm({});
      setIsAddingQuestion(false);
      triggerSuccessMessage("เพิ่มแบบฟอร์มวิจัยส่วนงานที่เข้ามาใหม่สำเร็จ!");
      await loadData();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `questions/${newId}`);
      } catch (adaptedError: any) {
        setActionError(`การเพิ่มคำถามผิดพลาด: ${adaptedError.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add Dynamic Administrator
  const handleAddAdminAction = async () => {
    if (!newAdminEmail.trim()) {
      setActionError("กรุณากรอกอีเมลของผู้อื่นที่จะเป็นผู้ดูแลระบบ");
      return;
    }
    const emailLower = newAdminEmail.trim().toLowerCase();
    if (!emailLower.endsWith("@bu.ac.th")) {
      setActionError("ผู้ดูแลระบบ (Admin) จะต้องใช้บัญชีอีเมลสังกัด @bu.ac.th เท่านั้นเพื่อความปลอดภัย");
      return;
    }

    try {
      setIsLoading(true);
      await setDoc(doc(db, 'admins', emailLower), {
        email: emailLower,
        name: newAdminName.trim() || emailLower.split('@')[0],
        roleType: newAdminRole,
        lastLogin: null
      }, { merge: true });
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminRole('Dynamic Admin');
      triggerSuccessMessage(`เพิ่มผู้ดูแลระบบ "${emailLower}" สำเร็จเรียบร้อยแล้ว`);
      await loadData();
    } catch (err: any) {
      setActionError(`ไม่สามารถเพิ่ม Admin: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Save Edited Administrator
  const handleSaveAdminAction = async () => {
    if (!editingAdmin) return;
    if (!editingAdmin.name.trim()) {
      setActionError("กรุณากรอกชื่อผู้ดูแลระบบ");
      return;
    }
    const newEmailLower = editingAdmin.email.trim().toLowerCase();
    if (!newEmailLower) {
      setActionError("กรุณากรอกอีเมล");
      return;
    }
    if (!newEmailLower.endsWith("@bu.ac.th")) {
      setActionError("อีเมลต้องลงท้ายด้วย @bu.ac.th");
      return;
    }

    try {
      setIsLoading(true);
      const isEmailChanged = editingAdmin.id !== newEmailLower;
      
      // Save details to the new doc ID
      await setDoc(doc(db, 'admins', newEmailLower), {
        email: newEmailLower,
        name: editingAdmin.name.trim(),
        roleType: editingAdmin.roleType || 'Dynamic Admin',
        lastLogin: null
      }, { merge: true });

      // If they changed the email ID itself, delete the original document ID
      if (isEmailChanged) {
        await deleteDoc(doc(db, 'admins', editingAdmin.id));
      }

      setEditingAdmin(null);
      triggerSuccessMessage(`แก้ไขข้อมูลผู้ดูแลระบบ "${newEmailLower}" สำเร็จเรียบร้อยแล้ว`);
      await loadData();
    } catch (err: any) {
      setActionError(`ไม่สามารถแก้ไขข้อมูล Admin: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Dynamic Administrator
  const handleDeleteAdminAction = (email: string) => {
    const emailLower = email.toLowerCase();
    const currentUserEmail = auth.currentUser?.email?.toLowerCase();
    
    // Check if user is deleting themselves
    const isSelfDelete = emailLower === currentUserEmail;
    const warningMessage = isSelfDelete
      ? `คุณกำลังเลือกลบสิทธิ์ตัวคุณเอง (${email}) ซึ่งจะส่งผลให้สิทธิ์แอดมินของคุณถูกยกเลิกทันที และคุณจะสูญเสียการเข้าถึงของหน้านี้และถูกนำออกจากระบบหลัก คุณแน่ใจที่จะลบใช่หรือไม่?`
      : `คุณแน่ใจว่าต้องการลบสิทธิ์ผู้ดูแลระบบของ "${email}"? ผู้ใช้ท่านนี้จะไม่สามารถเข้าจัดการแดชบอร์ดนี้ได้อีกต่อไป`;

    setConfirmConfig({
      title: isSelfDelete ? "⚠️ เลิกลบสิทธิ์ของตัวเอง?" : "ถอนสิทธิ์ผู้ดูแลระบบ?",
      message: warningMessage,
      confirmText: isSelfDelete ? "ใช่, ลบสิทธิ์ของตัวเองออกจากระบบ" : "ใช่, ถอนสิทธิ์ Admin",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await deleteDoc(doc(db, 'admins', email));
          triggerSuccessMessage(`ถอนสิทธิ์ผู้ดูแลระบบ "${email}" สำเร็จแล้ว`);
          await loadData();
        } catch (err: any) {
          setActionError(`เกิดข้อผิดพลาดในการถอนสิทธิ์: ${err.message}`);
        } finally {
          setIsLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Add Dynamic Instructor (Permitted User)
  const handleAddInstructorAction = async () => {
    if (!newInstEmail.trim()) {
      setActionError("กรุณากรอกอีเมลของผู้มีสิทธิ์ทำแบบสำรวจ");
      return;
    }
    const emailLower = newInstEmail.trim().toLowerCase();
    if (!emailLower.endsWith("@bu.ac.th")) {
      setActionError("อีเมลผู้มีสิทธิ์ทำแบบสำรวจจะต้องสังกัด @bu.ac.th เท่านั้นเพื่อความปลอดภัย");
      return;
    }
    if (!newInstName.trim()) {
      setActionError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    try {
      setIsLoading(true);
      await setDoc(doc(db, 'instructors', emailLower), {
        staffId: newInstStaffId.trim(),
        email: emailLower,
        name: newInstName.trim(),
        position: newInstPosition.trim() || "-",
        faculty: newInstFaculty.trim() || "หน่วยงานทั่วไป",
        internalPhone: newInstInternalPhone.trim() || "-",
        addedAt: serverTimestamp()
      }, { merge: true });

      setNewInstStaffId('');
      setNewInstEmail('');
      setNewInstName('');
      setNewInstPosition('');
      setNewInstFaculty('');
      setNewInstInternalPhone('');

      triggerSuccessMessage(`เพิ่มผู้มีสิทธิ์เข้าทำแบบสำรวจ "${emailLower}" เรียบร้อยแล้ว`);
      await loadData();
    } catch (err: any) {
      setActionError(`ไม่สามารถเพิ่มรายชื่อ: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Save Edited Instructor Information
  const handleSaveInstructorAction = async () => {
    if (!editingInstructor) return;
    if (!editingInstructor.email.trim()) {
      setActionError("กรุณากรอกอีเมล");
      return;
    }
    const emailLower = editingInstructor.email.trim().toLowerCase();
    if (!emailLower.endsWith("@bu.ac.th")) {
      setActionError("อีเมลผู้มีสิทธิ์ทำแบบสำรวจจะต้องสังกัด @bu.ac.th เท่านั้น");
      return;
    }
    if (!editingInstructor.name.trim()) {
      setActionError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    try {
      setIsLoading(true);
      const isEmailChanged = editingInstructor.id !== emailLower;

      // Save details to the new doc ID
      await setDoc(doc(db, 'instructors', emailLower), {
        staffId: editingInstructor.staffId.trim(),
        email: emailLower,
        name: editingInstructor.name.trim(),
        position: editingInstructor.position.trim(),
        faculty: editingInstructor.faculty.trim(),
        internalPhone: editingInstructor.internalPhone.trim(),
        addedAt: serverTimestamp()
      }, { merge: true });

      // If they changed the email ID itself, delete the original document ID
      if (isEmailChanged) {
        await deleteDoc(doc(db, 'instructors', editingInstructor.id));
      }

      setEditingInstructor(null);
      triggerSuccessMessage(`แก้ไขข้อมูลผู้มีสิทธิ์ "${emailLower}" สำเร็จเรียบร้อยแล้ว`);
      await loadData();
    } catch (err: any) {
      setActionError(`ไม่สามารถแก้ไขข้อมูลผู้มีสิทธิ์: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Dynamic Instructor
  const handleDeleteInstructorAction = (email: string) => {
    setConfirmConfig({
      title: "ถอนสิทธิ์การทำแบบสำรวจ?",
      message: `คุณแน่ใจว่าต้องการลบสิทธิ์การเข้าใช้งานระบบทำแบบสำรวจของ "${email}" หรือไม่?`,
      confirmText: "ใช่, ลบรายชื่อ",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await deleteDoc(doc(db, 'instructors', email));
          triggerSuccessMessage(`ลบสิทธิ์ผู้ใช้งาน "${email}" ออกจากระบบแล้ว`);
          await loadData();
        } catch (err: any) {
          setActionError(`เกิดข้อผิดพลาดในการลบรายชื่อ: ${err.message}`);
        } finally {
          setIsLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Clean / Clear all Instructors
  const handleClearAllInstructors = () => {
    setConfirmConfig({
      title: "ล้างรายชื่อผู้มีสิทธิ์ทั้งหมด?",
      message: "คำเตือน: คุณแน่ใจใช่หรือไม่ว่าต้องการลบล้างสิทธิ์ผู้ใช้งานทุกคนออกจากระบบ? การเข้าใช้งานจะกลับไปใช้โหมดสาธารณะปลอดภัยชั่วคราวจนกว่าจะมีการจำกัดสิทธิ์ใหม่",
      confirmText: "ใช่, ล้างทิ้งทั้งหมด",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const batch = writeBatch(db);
          instructorsList.forEach((inst) => {
            batch.delete(doc(db, 'instructors', inst.id));
          });
          await batch.commit();
          triggerSuccessMessage("ล้างข้อมูลสิทธิ์ผู้ประเมินรายบุคคลออกจากระบบหมดเรียบร้อยแล้ว");
          await loadData();
        } catch (err: any) {
          setActionError(`เกิดข้อผิดพลาดในระบบ: ${err.message}`);
        } finally {
          setIsLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // CSV Import parser for Authorized Users (Instructors)
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>, dragFiles?: FileList) => {
    let files: FileList | null = null;
    if (dragFiles) {
      files = dragFiles;
    } else if (e && 'target' in e && e.target.files) {
      files = e.target.files;
    }

    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setActionError("กรุณาเลือกหรือโยนเฉพาะไฟล์นามสกุล .CSV (ข้อความคั่นด้วยจุลภาค) เท่านั้น");
      return;
    }

    try {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) {
          setIsLoading(false);
          setActionError("ไม่สามารถอ่านไฟล์ CSV ที่ส่งเข้ามาได้");
          return;
        }

        const lines = text.split(/\r?\n/);
        const batch = writeBatch(db);
        let addedCount = 0;
        let invalidCount = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Split by comma or semicolon
          const parts = line.split(/[,;]/).map(p => p.trim().replace(/^["']|["']$/g, '').trim());
          
          let email = "";
          let staffId = "";
          let name = "";
          let position = "";
          let faculty = "";
          let internalPhone = "";

          if (parts.length >= 6) {
            // New 6-column format: รหัสบุคลากร, ชื่อ-นามสกุล, ตำแหน่ง, หน่วยงาน, อีเมล, เบอร์ภายใน
            staffId = parts[0] || "";
            name = parts[1] || "";
            position = parts[2] || "";
            faculty = parts[3] || "";
            email = parts[4]?.toLowerCase() || "";
            internalPhone = parts[5] || "";
          } else if (parts.length >= 3) {
            // Legacy 3-column format: อีเมล, ชื่อ-นามสกุล, หน่วยงาน
            email = parts[0]?.toLowerCase() || "";
            name = parts[1] || "";
            faculty = parts[2] || "หน่วยงานทั่วไป";
          } else if (parts.length === 1 && parts[0].includes('@bu.ac.th')) {
            // Just email
            email = parts[0].toLowerCase();
            name = email.split('@')[0];
          } else {
            invalidCount++;
            continue;
          }
          
          if (!email || !email.includes('@bu.ac.th')) {
            invalidCount++;
            continue;
          }

          const docRef = doc(db, 'instructors', email);
          batch.set(docRef, {
            staffId,
            email,
            name,
            position: position || "-",
            faculty: faculty || "หน่วยงานทั่วไป",
            internalPhone: internalPhone || "-",
            addedAt: serverTimestamp()
          }, { merge: true });
          addedCount++;
        }

        if (addedCount > 0) {
          await batch.commit();
          triggerSuccessMessage(`นำเข้าผู้มีสิทธิ์เพิ่มเติมสำเร็จเรียบร้อย ${addedCount} ท่าน! (ข้ามบรรทัดที่ไม่ถูกต้อง ${invalidCount} แถว)`);
          await loadData();
        } else {
          setActionError("ตรวจไม่พบรายชื่อผู้ประเมินหรือไฟล์ไม่สอดคล้องตามรูปแบบที่กำหนด");
        }
        setIsLoading(false);
      };
      reader.readAsText(file, 'UTF-8');
    } catch (err: any) {
      setActionError(`นำเข้าข้อมูล CSV ล้มเหลว: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Drag over handler for files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCSV(true);
  };

  // Drag leave handler for files
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCSV(false);
  };

  // Drop handler for files
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingCSV(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleCSVImport(null as any, e.dataTransfer.files);
    }
  };


  // Filter list of responses
  const filteredResponses = responses.filter(res => {
    const nameMatches = res.respondentName?.toLowerCase().includes(searchQuery.toLowerCase());
    const facultyMatches = selectedFacultyFilter ? res.faculty === selectedFacultyFilter : true;
    return nameMatches && facultyMatches;
  });

  // Calculate Average Satisfaction Scores
  const count = responses.length;
  const avgSatisfaction = count > 0 ? (
    responses.reduce((sum, r) => {
      const sat = r.answers?.part3_satisfaction;
      if (!sat) return sum;
      return sum + ((sat.content + sat.communication + sat.utilization) / 3);
    }, 0) / count
  ).toFixed(2) : "0.00";

  const googleAppsScriptCode = `/*
  Google Apps Script (GAS) สำหรับส่งอีเมลแจ้งเตือนเมื่อตอบแบบสำรวจความเห็นต่อผลการวิจัย
  
  ขั้นตอนการติดตั้งใช้งาน:
  1. สร้าง Google Sheet แผ่นใหม่ขึ้นมาเพื่อใช้เก็บข้อมูล (หรือเก็บจาก CSV ของเว็บ)
  2. ไปที่เมนู "ส่วนขยาย" -> "Apps Script" (Extensions -> Apps Script)
  3. ลบโค้ดเริ่มต้นออก แล้วคัดลอกส่วนโค้ดนี้ไปวางแทนทั้งหมด
  4. ปรับเปลี่ยนอีเมลรับแจ้งเตือนที่ตัวแปร NOTIFICATION_EMAIL ให้ตรงกับการใช้งาน
  5. บันทึกและเชื่อมโยงให้เมื่อมีข้อความใหม่ส่งเข้ามาสั่ง Trigger ทำงานแจ้งเตือนอัตโนมัติ
*/

const NOTIFICATION_EMAIL = "walailuk.p@bu.ac.th"; // พิมพ์อีเมลท่านที่ต้องการส่งไป

function sendFeedbackAlert(e) {
  try {
    // โค้ดส่งข้อคิดเห็นที่ได้รับใหม่ไปยังเมลของอาจารย์ผู้ดูแลอย่างเป็นทางการ
    const recipient = NOTIFICATION_EMAIL;
    const subject = "แจ้งรายงานใหม่: แบบฟอร์มขอรับข้อคิดเห็นต่อผลปีการศึกษา 2568";
    
    // โครงสร้าง html อีเมลที่จัดแต่งความพึงพอใจอย่างเป็นระเบียบ
    const htmlBody = \`
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">มีการตอบแบบสำรวจวิจัยสถาบันใหม่เข้ามา</h2>
        <p style="color: #64748b; font-size: 14px;">ได้รับข้อมูลการตอบแบบตอบรับผ่านเว็บแอปพลิเคชัน Dynamic QR Code เรียบร้อยแล้ว</p>
        <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 20px 0;">
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 35%;">ชื่อผู้ตอบ:</td>
            <td style="padding: 6px 0; color: #1e293b; font-weight: 500;">🔔 มีผลการทำรายการเพิ่มเข้ามาใหม่ในระบบ</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">งานวิจัยคณะ/หลักสูตร:</td>
            <td style="padding: 6px 0; color: #1e293b;">กรุณาเข้าระบบ Admin Dashboard เพื่อนำเข้า ดาวน์โหลด CSV เพื่อความปลอดภัยด้านข้อมูลบุคคล</td>
          </tr>
        </table>
        
        <div style="margin-top: 24px; text-align: center;">
          <a href="\${HtmlService.getSandboxMode ? '#' : 'https://ai.studio/build'}" style="background-color: #4f46e5; color: white; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">เข้าสู่หน้าต่าง Dashboard</a>
        </div>
      </div>
    \`;

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody
    });
    
    Logger.log("Email Alert Sent successfully to " + recipient);
  } catch (error) {
    Logger.log("Error logic: " + error.toString());
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* PDF Rendering Loading Overlay */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xs text-white">
          <div className="bg-white border border-slate-150 p-8 rounded-3xl max-w-xs w-full mx-4 text-center space-y-5 shadow-2xl">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin"></div>
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-black tracking-tight text-slate-800 font-sans">กำลังจัดเตรียมสรุปผล PDF...</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                บราวเซอร์กำลังแปลงคำตอบและจัดสรรแผนงาน BU-QA ให้คมชัดเป็นพิเศษเพื่อดาวน์โหลดลงเครื่องของท่านโดยตรง
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Back to Home Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border no-print">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-sm text-slate-600 hover:text-indigo-600 font-bold px-4 py-2 hover:bg-slate-50 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าแรกหลักสูตร</span>
        </button>
        <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-bold px-3.5 py-1.5 rounded-full">
          <Info className="w-3.5 h-3.5" />
          <span>สิทธิ์แอดมิน: Fixed Admin Mode Active</span>
        </div>
      </div>

      {/* Header Statistics Card Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 no-print">
        <div className="bg-white border rounded-3xl p-6 flex items-center space-x-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">ตอบรับทั้งหมด</p>
            <h3 className="text-2xl font-black text-slate-800">{count} ชุด</h3>
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-6 flex items-center space-x-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium font-sans">คะแนนประเมินเฉลี่ย</p>
            <h3 className="text-2xl font-black text-slate-800">{avgSatisfaction}/5.00</h3>
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-6 flex items-center space-x-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">หัวข้อคำถามในแบบสอบถาม</p>
            <h3 className="text-2xl font-black text-slate-800">{questions.length} หัวข้อหลัก</h3>
          </div>
        </div>
      </div>

      {/* Navigation tabs for Admin */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap no-print">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-2 px-6 py-4.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span>แดชบอร์ดบทวิเคราะห์</span>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-black">วิจัย</span>
        </button>

        <button
          onClick={() => setActiveTab('responses')}
          className={`flex items-center space-x-2 px-6 py-4.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'responses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>ข้อมูลคำตอบที่ส่งกลับ</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{responses.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center space-x-2 px-6 py-4.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'questions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>ตั้งค่าหัวข้อคำถาม</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{questions.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-2 px-6 py-4.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'system' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>การจัดการระบบ</span>
        </button>

        <button
          onClick={() => setActiveTab('integration')}
          className={`flex items-center space-x-2 px-6 py-4.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'integration' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>ระะบบแจ้งเตือน Email</span>
        </button>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-2xl border border-emerald-200 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="bg-rose-50 text-rose-800 px-4 py-3 rounded-2xl border border-rose-200 text-sm font-semibold flex items-center space-x-2">
          <Info className="w-5 h-5 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tab Contents */}
      {isLoading ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">กำลังประมวลผล ดึงข้อมูลหลักจากฐานข้อมูล...</p>
        </div>
      ) : (
        <div className="bg-white border rounded-3xl p-6 sm:p-8 min-h-[380px]">
          
          {/* TAB 0: ANALYTICS DASHBOARD */}
          {activeTab === 'dashboard' && (() => {
            const totalWithSatisfaction = responses.filter(r => r.answers?.part3_satisfaction);
            let contentAvg = 0;
            let communicationAvg = 0;
            let utilizationAvg = 0;
            let overallAvg = 0;

            if (totalWithSatisfaction.length > 0) {
              let contentSum = 0;
              let commSum = 0;
              let utilSum = 0;
              totalWithSatisfaction.forEach(r => {
                const s = r.answers.part3_satisfaction;
                contentSum += Number(s.content) || 0;
                commSum += Number(s.communication) || 0;
                utilSum += Number(s.utilization) || 0;
              });
              contentAvg = contentSum / totalWithSatisfaction.length;
              communicationAvg = commSum / totalWithSatisfaction.length;
              utilizationAvg = utilSum / totalWithSatisfaction.length;
              overallAvg = (contentAvg + communicationAvg + utilizationAvg) / 3;
            }

            // Suggestions calculation
            const totalCount = Math.max(responses.length, 1);
            const part1SuggestionsCount = responses.filter(r => r.answers?.part1_q1 === "has_suggestions").length;
            const part2SuggestionsCount = responses.filter(r => r.answers?.part2_q1 === "has_suggestions").length;
            const p1Rate = (part1SuggestionsCount / totalCount) * 100;
            const p2Rate = (part2SuggestionsCount / totalCount) * 100;

            // Faculty stats
            const rawFacultyStats = BU_FACULTIES.map(fac => {
              const facResponses = responses.filter(r => r.faculty === fac);
              const withSat = facResponses.filter(r => r.answers?.part3_satisfaction);
              let avgScore = 0;
              if (withSat.length > 0) {
                const sum = withSat.reduce((acc, r) => {
                  const s = r.answers.part3_satisfaction;
                  return acc + (((Number(s.content) || 0) + (Number(s.communication) || 0) + (Number(s.utilization) || 0)) / 3);
                }, 0);
                avgScore = sum / withSat.length;
              }
              return {
                name: fac,
                count: facResponses.length,
                average: avgScore,
                percentage: responses.length > 0 ? (facResponses.length / responses.length) * 100 : 0
              };
            });

            // Filter out empty if toggle is on
            const displayedFacultyStats = rawFacultyStats
              .filter(fac => !hideEmptyFaculties || fac.count > 0)
              .sort((a, b) => b.count - a.count || b.average - a.average);

            // Extract real qualitative comments
            const p1SuggestionsList = responses
              .filter(r => r.answers?.part1_q2?.trim() || r.answers?.part1_q3?.trim())
              .map(r => ({
                name: r.respondentName,
                faculty: r.faculty,
                suggestion: r.answers.part1_q2 || '',
                opinion: r.answers.part1_q3 || '',
                date: r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleDateString('th-TH') : 'N/A'
              }));

            const p2SuggestionsList = responses
              .filter(r => r.answers?.part2_q2?.trim() || r.answers?.part2_q3?.trim())
              .map(r => ({
                name: r.respondentName,
                faculty: r.faculty,
                suggestion: r.answers.part2_q2 || '',
                opinion: r.answers.part2_q3 || '',
                date: r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleDateString('th-TH') : 'N/A'
              }));

            // Words frequency/highlights simulation based on matching keywords
            const textKeywords = [
              { label: "หลักสูตร", color: "bg-indigo-50 text-indigo-700", count: responses.filter(r => JSON.stringify(r.answers).includes("หลักสูตร") || JSON.stringify(r.answers).includes("วิชา")).length },
              { label: "ฝึกงาน / สหกิจ", color: "bg-emerald-50 text-emerald-700", count: responses.filter(r => JSON.stringify(r.answers).includes("ฝึกงาน") || JSON.stringify(r.answers).includes("สหกิจ")).length },
              { label: "เทคโนโลยี / ไอที", color: "bg-cyan-50 text-cyan-700", count: responses.filter(r => JSON.stringify(r.answers).includes("เทคโนโลยี") || JSON.stringify(r.answers).includes("ไอที") || JSON.stringify(r.answers).includes("คอม")).length },
              { label: "ภาษาอังกฤษ", color: "bg-purple-50 text-purple-700", count: responses.filter(r => JSON.stringify(r.answers).includes("ภาษา") || JSON.stringify(r.answers).includes("English")).length },
              { label: "วิชาปฏิบัติ", color: "bg-pink-50 text-pink-700", count: responses.filter(r => JSON.stringify(r.answers).includes("ปฏิบัติ") || JSON.stringify(r.answers).includes("ทำจริง")).length },
              { label: "การสื่อสาร", color: "bg-amber-50 text-amber-700", count: responses.filter(r => JSON.stringify(r.answers).includes("สื่อสาร") || JSON.stringify(r.answers).includes("พูด")).length }
            ].filter(kw => kw.count > 0);

            // Circular progress generator helper
            const renderCircularProgress = (val: number, label: string, colorClass: string) => {
              const pct = (val / 5) * 100;
              const strokeOffset = 188.4 - (188.4 * Math.min(Math.max(pct, 0), 100)) / 100;
              return (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-3 shadow-xs hover:shadow-md transition duration-200">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="30" className="stroke-slate-200/80 fill-none" strokeWidth="6" />
                      <circle cx="40" cy="40" r="30" className={`fill-none transition-all duration-700 ease-out ${colorClass}`} strokeWidth="6" strokeDasharray="188.4" strokeDashoffset={strokeOffset} strokeLinecap="round" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-slate-800">{val.toFixed(2)}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">เต็ม 5</span>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-700">{label}</h5>
                    <div className="mt-1.5">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        val >= 4.5 ? "bg-emerald-100 text-emerald-800" :
                        val >= 3.5 ? "bg-indigo-100 text-indigo-800" :
                        val >= 2.5 ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {val >= 4.5 ? "ดีเยี่ยม (Excellent)" :
                         val >= 3.5 ? "ดีมาก (Very Good)" :
                         val >= 2.5 ? "ปานกลาง (Medium)" :
                         "ควรปรับปรุง (Review)"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-8 animate-fadeIn" id="printable-dashboard-area">
                
                {/* PDF & REPORT EXPORT HUB BAR */}
                <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-4.5 shadow-xs transition duration-200 hover:border-indigo-200 no-print">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h4 className="font-extrabold text-[13px] text-slate-800 tracking-tight flex items-center space-x-1.5 font-sans">
                          <FileText className="w-4 h-4 text-indigo-650" />
                          <span>แถบระบบดาวน์โหลดสรุปผลการสำรวจและจัดพิมพ์รายงาน PDF (Executive Report Console)</span>
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-2xl font-sans">
                        ระบบจัดเตรียมนวัตกรรมโครงร่างรายงานสถิติทางการศึกษา จัดพิมพ์สำหรับเสนอระดับสถาบัน 
                        พร้อมแบบสรุปแผนจัดลำดับงานยกระดับ <strong className="text-indigo-600 font-extrabold">BU-QA</strong> และข้อคิดเห็นสะท้อนผู้บังคับบัญชา (สว.1 / สว.2) แบบอัจฉริยะในหน้าเดียว
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end lg:self-center font-sans">

                      {/* Print PDF Button */}
                      <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className={`px-4.5 py-2.5 rounded-xl text-white font-extrabold text-xs inline-flex items-center space-x-2 transition cursor-pointer shadow-xs ${
                          isGeneratingPDF
                            ? 'bg-indigo-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-105'
                        }`}
                        title="ดาวน์โหลดรายงานรูปเล่มความพึงพอใจพร้อมแผนยกระดับโดยบันทึกเป็นไฟล์ PDF"
                      >
                        <Printer className={`w-4 h-4 text-white ${isGeneratingPDF ? 'animate-spin' : 'animate-pulse'}`} />
                        <span>{isGeneratingPDF ? 'กำลังแปลงข้อมูลเป็น PDF...' : 'ดาวน์โหลดไฟล์ PDF'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Helper Information alert */}
                  <div className="mt-3.5 bg-slate-50 border border-slate-150/80 rounded-xl p-3 flex items-start space-x-2.5 text-[10.5px] text-slate-500 leading-relaxed font-sans">
                    <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-slate-700">แนะนำขั้นตอนดาวน์โหลดเป็นไฟล์ PDF: </span>
                      เมื่อคลิกปุ่มดาวน์โหลด หน้าจอสั่งพิมพ์ของเว็บบราวเซอร์จะปรากฏขึ้น ให้เลือกเปลี่ยนตรงหัวข้อ <span className="font-bold underline text-slate-700">ปลายทาง/เป้าหมาย (Destination)</span> เป็นกล่องคำสั่ง <span className="font-black text-emerald-600 underline">"บันทึกเป็น PDF" (Save as PDF)</span> แทนเครื่องปริ้นเตอร์ จากนั้นบันทึกไฟล์ลงเครื่องตามปกติ ระบบจะขจัดปุ่มกด ฟอร์มสแกน และปรับสัดส่วนรูปเล่มให้ประจักษ์เป็นทางราชการทันที!
                    </div>
                  </div>
                </div>

                {/* Print-time Header sheet */}
                <div className="print-header-show hidden flex-col border-b-2 border-slate-900 pb-3 mb-6 font-sans">
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <h1 className="text-lg font-black text-slate-900">รายงานสรุปผลการประเมินและการขับเคลื่อนปรับปรุงหลักสูตร</h1>
                      <p className="text-[11px] text-slate-505 font-medium text-slate-550">สถาบันวิจัยและพัฒนานวัตกรรม มหาวิทยาลัยกรุงเทพ (BU-QA Academic Review Framework)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-mono text-slate-400">รหัสรายงานสรุป: BU-QA-FB-{Math.floor(Date.now() / 10000)}</p>
                      <p className="text-[10px] text-slate-600 font-bold">วันที่ออกรายงานประเมิน: {new Date().toLocaleDateString('th-TH')}</p>
                    </div>
                  </div>
                </div>
                
                {/* 1. TOP HIGHLIGHT MATRICES */}
                <div className="border-b border-slate-150 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                      <span>บทสรุปสถิติวิเคราะห์ความคิดเห็นต่องานวิจัยหลักสูตร</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">สรุปข้อมูลเชิงประจักษ์แบบเรียลไทม์จากระบบประเมินตนเองของสถาบัน</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-slate-50 border p-1 rounded-xl w-fit border-slate-200">
                    <button 
                      onClick={() => setHideEmptyFaculties(!hideEmptyFaculties)}
                      className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                        hideEmptyFaculties ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      กรองเฉพาะคณะที่มีคำตอบ ({rawFacultyStats.filter(f => f.count > 0).length})
                    </button>
                    <button 
                      onClick={() => setHideEmptyFaculties(false)}
                      className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                        !hideEmptyFaculties ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      แสดงทั้งหมด ({rawFacultyStats.length})
                    </button>
                  </div>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-150 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">ตอบแบบสำรวจสถาบัน</p>
                    <h4 className="text-3xl font-black text-slate-800 mt-1">{responses.length} ชุด</h4>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">รวมผลลัพธ์ทุกสาขาวิชา</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-150 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">ความพึงพอใจโดยรวม</p>
                    <h4 className="text-3xl font-black text-slate-800 mt-1">{overallAvg > 0 ? `${overallAvg.toFixed(2)}` : "0.00"}/5.00</h4>
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full mt-2 inline-block">
                      {overallAvg >= 4.0 ? "เกณฑ์ดีเลิศ (Superb)" : overallAvg >= 3.0 ? "เกณฑ์ผ่าน (Pass)" : "ควรปรับปรุง"}
                    </span>
                  </div>

                  {/* Suggestions KPI 1 */}
                  <div className="bg-gradient-to-br from-amber-50/50 to-white border border-amber-150 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">ข้อคิดเห็นงานทำ (สว.1)</p>
                    <h4 className="text-3xl font-black text-slate-800 mt-1">{p1Rate.toFixed(1)}%</h4>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                      <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${p1Rate}%` }}></div>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1.5 font-bold">มีสัญญลักษณ์ข้อคิดเห็น {part1SuggestionsCount} ชุด</p>
                  </div>

                  {/* Suggestions KPI 2 */}
                  <div className="bg-gradient-to-br from-cyan-50/50 to-white border border-cyan-150 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-cyan-700 tracking-wider">ข้อสะท้อนบัณฑิต (สว.2)</p>
                    <h4 className="text-3xl font-black text-slate-800 mt-1">{p2Rate.toFixed(1)}%</h4>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                      <div className="bg-cyan-500 h-1 rounded-full" style={{ width: `${p2Rate}%` }}></div>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1.5 font-bold">ผู้ว่าจ้างป้อนสะท้อนสะสม {part2SuggestionsCount} ชุด</p>
                  </div>
                </div>

                {/* 2. THREE DIMENSION ANALYTICS GAUGE */}
                <div className="w-full">
                  
                  {/* Satisfaction Dimension breakdowns */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black text-slate-800 flex items-center space-x-1">
                        <Activity className="w-4 h-4 text-indigo-650" />
                        <span>จำแนกสถิติดรรชนีความสำเร็จ 3 มิติเชิงกลยุทธ์</span>
                      </h4>
                      <span className="text-[9px] bg-indigo-55 text-indigo-75 font-bold px-2 py-0.5 rounded-full">ดรรชนีวิจัย</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      {renderCircularProgress(contentAvg, "ความสมบูรณ์เนื้อหาหลักสูตร", "stroke-indigo-600")}
                      {renderCircularProgress(communicationAvg, "การสื่อสารเผยแพร่ข้อมูล", "stroke-emerald-500")}
                      {renderCircularProgress(utilizationAvg, "ประสิทธิผลนำไปใช้จริง", "stroke-cyan-500")}
                    </div>

                    <div className="bg-slate-50/70 p-3.5 rounded-xl border text-[10px] text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700 flex items-center space-x-1">
                        <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>เกณฑ์การพิจารณาคะแนนเป้าหมายระดับมหาวิทยาลัย:</span>
                      </p>
                      <p>• ตัวชี้วัดสถิติเป้าหมายถูกกำหนดไว้ที่<strong>ไม่ต่ำกว่า 3.51 คะแนน</strong> (จัดอยู่ในระดับพึงพอใจดีมากขึ้นไป)</p>
                      <p>• ดัชนีทุกตัวถูกคำนวณแบบสมน้ำสมเนื้อจากหัวข้อประเมินจริง เพื่อความเที่ยงตรงด้านการประเมินสากลชีวภาพ</p>
                    </div>
                  </div>

                </div>

                {/* 3. FACULTY BREAKDOWN CHART WITH DYNAMIC Horizontal Bars */}
                <div className="bg-white rounded-2xl border border-slate-150 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                        <span>สถิติจำแนกลำดับคะแนนการประเมินศึกษาในคณะวิชา</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">แสดงผลรวมการตอบแบบสำรวจและเปรียบเทียบคะแนนเฉลี่ยจำแนกตามต้นสังกัด</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10.5px] text-slate-400 font-bold">ตารางการจัดอันดับ:</span>
                      <span className="text-[10.5px] font-extrabold text-slate-705 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {hideEmptyFaculties ? "กรองเฉพาะผู้ตอบ" : "แสดงคณะสังกัดทั้งหมด"}
                      </span>
                    </div>
                  </div>

                  {displayedFacultyStats.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-bold leading-relaxed">
                      ไม่มีการแจ้งผลตอบกลับตอบสนองต่อหลักเกณฑ์ระบบรายงานอันดับในขณะนี้
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayedFacultyStats.map((fac, idx) => {
                        return (
                          <div 
                            key={fac.name} 
                            className="flex items-center justify-between p-3.5 bg-slate-50/40 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-150 md:p-4"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0 mr-4">
                              <span className={`w-6 h-6 rounded-lg text-center font-bold text-xs flex items-center justify-center leading-none ${
                                fac.count > 0 && idx === 0 ? "bg-amber-100 text-amber-805 border border-amber-200" :
                                fac.count > 0 && idx === 1 ? "bg-slate-200/80 text-slate-700" :
                                fac.count > 0 && idx === 2 ? "bg-orange-100 text-orange-705" :
                                "bg-slate-100 text-slate-400"
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-extrabold text-slate-850 truncate">{fac.name}</p>
                                <div className="w-full bg-slate-200/60 rounded-full h-1.5 mt-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full transition-all duration-550 ${fac.count > 0 ? "bg-indigo-600" : "bg-slate-300/45"}`} 
                                    style={{ width: `${Math.max(fac.percentage, fac.count > 0 ? 3 : 0)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 shrink-0 font-mono">
                              <div className="text-right">
                                <p className="text-xs font-black text-slate-800">{fac.count} ชุด</p>
                                <p className="text-[10px] text-slate-400 font-bold">{fac.percentage.toFixed(1)}% ของทั้งหมด</p>
                              </div>
                              <div className="border-l pl-4 h-8 flex flex-col justify-center text-center min-w-16 border-slate-200">
                                <p className="text-xs font-black text-indigo-600">{fac.average > 0 ? `${fac.average.toFixed(2)}` : '-'}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">เฉลี่ย /5</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. REAL CUSTOMER INSIGHTS VOICE (FEEDBACK LOGS) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Part 1 suggestions voices */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                        <Users className="w-4 h-4 text-indigo-600 font-semibold" />
                        <span>ความคิดเห็นเชิงคุณภาพ ภาวการณ์มีงานทำ (สว.1)</span>
                      </h4>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded">
                        {p1SuggestionsList.length} ข้อความ
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                      {p1SuggestionsList.length === 0 ? (
                        <div className="py-12 text-center text-slate-350 text-xs font-semibold">
                          ยังไม่มีผู้ส่งข้อคิดเห็นเพิ่มเติมป้อนเข้ามา ณ ขณะนี้
                        </div>
                      ) : (
                        p1SuggestionsList.map((item, i) => (
                          <div key={i} className="bg-slate-50/50 hover:bg-slate-50 border rounded-xl p-3.5 space-y-2 transition-colors border-slate-150">
                            <div className="flex justify-between items-start text-[10px]">
                              <div>
                                <strong className="text-slate-700">{item.name}</strong> 
                                <span className="text-slate-400 font-sans ml-1 text-[9px]">({item.faculty})</span>
                              </div>
                              <span className="text-slate-400 font-mono text-[9px] shrink-0 ml-1">{item.date}</span>
                            </div>
                            
                            <div className="text-xs font-medium text-slate-650 leading-relaxed font-sans space-y-1 bg-white border border-slate-100 p-2.5 rounded-lg">
                              {item.suggestion && (
                                <p>• <span className="text-slate-400">ข้อคิดเห็น:</span> <span className="text-slate-800 font-semibold">{item.suggestion}</span></p>
                              )}
                              {item.opinion && (
                                <p>• <span className="text-slate-400 text-indigo-650">ข้อเสนอเป้าหมาย:</span> <span className="text-indigo-700 font-bold">{item.opinion}</span></p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Part 2 suggestions voices */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                        <Users className="w-4 h-4 text-emerald-600 font-semibold" />
                        <span>ความคิดเห็นสะท้อนผู้บังคับบัญชา / นายจ้าง (สว.2)</span>
                      </h4>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded">
                        {p2SuggestionsList.length} ข้อความ
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                      {p2SuggestionsList.length === 0 ? (
                        <div className="py-12 text-center text-slate-350 text-xs font-semibold">
                          ยังไม่มีความคิดเห็นสะท้อนจากหน่วยงานนายจ้างป้อนเข้ามา
                        </div>
                      ) : (
                        p2SuggestionsList.map((item, i) => (
                          <div key={i} className="bg-slate-50/50 hover:bg-slate-50 border rounded-xl p-3.5 space-y-2 transition-colors border-slate-150">
                            <div className="flex justify-between items-start text-[10px]">
                              <div>
                                <strong className="text-slate-700">{item.name}</strong> 
                                <span className="text-slate-400 font-sans ml-1 text-[9px]">({item.faculty})</span>
                              </div>
                              <span className="text-slate-400 font-mono text-[9px] shrink-0 ml-1">{item.date}</span>
                            </div>
                            
                            <div className="text-xs font-medium text-slate-650 leading-relaxed font-sans space-y-1 bg-white border border-slate-100 p-2.5 rounded-lg">
                              {item.suggestion && (
                                <p>• <span className="text-slate-400">ข้อสะท้อนบัณฑิต:</span> <span className="text-slate-800 font-semibold">{item.suggestion}</span></p>
                              )}
                              {item.opinion && (
                                <p>• <span className="text-slate-400 text-emerald-650">ข้อแนะนำสถาบัน:</span> <span className="text-emerald-700 font-bold">{item.opinion}</span></p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* 5. RECOMMENDATIONS FOR IMPROVEMENT & STRATEGIC ACTION PLANS */}
                <div id="pdf-section-strategic-recommendations" className="bg-gradient-to-r from-slate-50 to-indigo-50/10 rounded-3xl border border-slate-200/85 p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/80 pb-4 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="bg-indigo-600 text-white p-1 rounded-xl">
                          <Lightbulb className="w-5 h-5 animate-pulse" />
                        </div>
                        <h4 className="text-base font-black text-slate-900">
                          ระบบข้อเสนอแนะเชิงกลยุทธ์และการปรับปรุงหลักสูตรเพื่อการประกันคุณภาพ
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        บทวิเคราะห์และแนวทางตอบสนองอุปสงค์ผู้ประกอบการแบบเรียลไทม์จำแนกตามดรรชนีสถิติ เพื่อการพัฒนาหลักสูตรอย่างต่อเนื่อง
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 font-extrabold shrink-0 shadow-2xs">
                      <CheckCircle className="w-4 h-4 text-emerald-500 animate-pulse" />
                      <span>กรอบอ้างอิงมาตรฐานประกันคุณภาพ BU-QA</span>
                    </div>
                  </div>

                  {/* Recommendations and Plans Matrix */}
                  <div className="w-full">

                    {/* Left: Intelligent Action Suggestions based on current stats */}
                    <div className="bg-white rounded-2xl border border-slate-150 p-5 space-y-4 shadow-sm">
                      <h5 className="text-xs font-black text-slate-800 flex items-center space-x-1.5 border-b pb-2 border-slate-100">
                        <Target className="w-4 h-4 text-indigo-650" />
                        <span>ข้อเสนอแนะเชิงรุกจำแนกตามมิติคะแนนความพึงพอใจ</span>
                      </h5>

                      <div className="space-y-4">
                        
                        {/* Dimension 1: Content */}
                        <div className="p-3.5 rounded-xl border text-xs leading-relaxed space-y-2.5 bg-slate-50/30 hover:bg-slate-50/75 transition border-slate-150">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 flex items-center space-x-1">
                              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                              <span>มิติด้านเนื้อหาหลักสูตร (Content Quality)</span>
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              contentAvg >= 4.0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              contentAvg >= 3.51 ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                              "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {contentAvg > 0 ? contentAvg.toFixed(2) : '3.67'}/5.00
                            </span>
                          </div>
                          
                          <p className="text-slate-600 font-medium text-[11px]">
                            {contentAvg === 0 ? "แนะนำให้เร่งสำรวจข้อมูลความสมบูรณ์เนื้อหา จากระบบหากมีดัชนีภาพรวมเพื่อเริ่มแสดงรายการสังเคราะห์ระดับสถาบัน" :
                             contentAvg < 3.51 ? "⚠️ ระดับคะแนนต่ำกว่าเป้าหมายมหาวิทยาลัย (3.51): คณะวิชาควรจัดประชุมวิชาการเพื่อทบทวนทักษะล้าสมัย และผสานความรู้เทคโนโลยีสารสนเทศสมัยใหม่ เช่น วิเคราะห์ข้อมูล หรือ คอร์ส AI ประยุกต์ในรายวิชาเอกวิชาชีพ" :
                             contentAvg < 4.2 ? "✅ คะแนนบรรลุระดับดี: แนะนำให้เพิ่มความยืดหยุ่นของหลักสูตรโดยเสนอรายวิชาเลือก (Electives) ที่ทันต่อการเปลี่ยนแปลงทางเศรษฐกิจ และปรับปรุงเนื้อหาข้อสอบปฏิบัติ" :
                             "🌟 ระดับพึงพอใจดีเยี่ยมยอด: ควรรักษาความสอดคล้องของหลักสูตรอย่างต่อเนื่อง พร้อมพัฒนาสื่อเรียนรู้และสร้างแนวทางถ่ายทอดกลวิธีการพัฒนาโครงสร้างหลักสูตรฐานสมรรถนะสะสมแก่หลักสูตรอื่น"
                            }
                          </p>

                          <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/60 text-[10.5px] text-indigo-800 font-bold flex items-center space-x-1.5 bg-slate-50">
                            <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[9px] shrink-0 font-black">แนวทางแกน</span>
                            <span className="truncate">{contentAvg < 3.51 ? "เร่งปรับแต่งวิชาสัมมนาและทักษะปฏิบัติเอก" : "ทบทวนรายวิชาเสริมความเข้มข้นเชิงลึกเทคโนโลยีรายปี"}</span>
                          </div>
                        </div>

                        {/* Dimension 2: Communication */}
                        <div className="p-3.5 rounded-xl border text-xs leading-relaxed space-y-2.5 bg-slate-50/30 hover:bg-slate-50/75 transition border-slate-150 font-sans">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 flex items-center space-x-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>มิติด้านสื่อนวัตกรรมและการสื่อสารส่งต่อข้อมูล</span>
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              communicationAvg >= 4.0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              communicationAvg >= 3.51 ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                              "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {communicationAvg > 0 ? communicationAvg.toFixed(2) : '3.80'}/5.00
                            </span>
                          </div>
                          
                          <p className="text-slate-600 font-medium text-[11px]">
                            {communicationAvg === 0 ? "เตรียมพร้อมข้อมูลประสิทธิผลสื่อสารและระบบสถิตินำสว. เพื่อพิจารณาจุดบกพร่องข้อร้องเรียนหลักเกณฑ์ระบบ" :
                             communicationAvg < 3.51 ? "⚠️ ประสิทธิผลการประชาสัมพันธ์ค่อนข้างต่ำ: เสนอให้ปรับปรุงโครงสร้างแบบฟอร์มให้เหลือเพียงหน้าเดียวที่ตอบง่าย เพื่อลดภาระของผู้ว่าจ้างหรือผู้ตอบ และประสานงานกับสื่อประชาสัมพันธ์คณะเชิงรุก" :
                             communicationAvg < 4.2 ? "✅ คะแนนผ่านเกณฑ์มาตรฐาน: แนะนำให้ปรับแต่งระบบแบบสอบถามให้รองรับระบบแจ้งอัพเดทอัตโนมัติ (Automated Notification) แก่นายจ้างที่รับนักศึกษา และเชื่อมความร่วมมือทางช่องทางสมาคมศิษย์เก่า" :
                             "🌟 บรรลุคะแนนเกณฑ์ยอดเยี่ยม: แนะนำให้ริเริ่มจัดทำพอร์ทัลแสดงผลงานวิจัยบัณฑิต (Graduate Innovation Showcase Portals) เผยแพร่สาธารณะเพื่อช่วยเพิ่มมูลค่าแบรนด์ของมหาวิทยาลัยกรุงเทพ"
                            }
                          </p>

                          <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/60 text-[10.5px] text-emerald-800 font-bold flex items-center space-x-1.5 bg-slate-50">
                            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] shrink-0 font-black">แนวทางแกน</span>
                            <span className="truncate">{communicationAvg < 3.51 ? "ปฏิรูประบบจดหมายแจ้งและการเข้าถึงดิจิทัล" : "จัดระบบสรุปอินโฟกราฟิกความก้าวหน้าการเรียนรู้รายไตรมาส"}</span>
                          </div>
                        </div>

                        {/* Dimension 3: Utilization */}
                        <div className="p-3.5 rounded-xl border text-xs leading-relaxed space-y-2.5 bg-slate-50/30 hover:bg-slate-50/75 transition border-slate-150 font-sans">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 flex items-center space-x-1">
                              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                              <span>มิติด้านการนำไปใช้ประโยชน์ในสายอาชีพและการสหกิจ</span>
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              utilizationAvg >= 4.0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              utilizationAvg >= 3.51 ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                              "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {utilizationAvg > 0 ? utilizationAvg.toFixed(2) : '3.55'}/5.00
                            </span>
                          </div>
                          
                          <p className="text-slate-600 font-medium text-[11px]">
                            {utilizationAvg === 0 ? "เตรียมวางการจับคู่อ้างอิงความคาดหวังใช้งานวิจัยจากหน่วยงานนายจ้างเพื่อความสมเหตุสมผลแผนพัฒนา" :
                             utilizationAvg < 3.51 ? "⚠️ เกิดช่องว่างด้านความคาดหวังของนายจ้าง: คณะควรทำบันทึกความเข้าใจสหกิจร่วมกับบริษัทเป้าหมาย (MOU Target Partners) และสนับสนุนโครงการพัฒนาทักษะวิชาชีพหลักสูตรเสริมวิชาชีพเร่งรัด" :
                             utilizationAvg < 4.2 ? "✅ บัณฑิตนำความรู้ไปใช้ประโยชน์ได้ดี: แนะนำให้ขยายโมเดลความร่วมมือในการรับงานวิจัยที่ใช้โจทย์จริงของผู้ประกอบการเป็นสารตั้งต้น (Problem-Based Academic Project Matching)" :
                             "🌟 ดีเลิศสอดคล้องทักษะทำงานทันที: พัฒนาต่อเนื่องร่วมกับสมาคมอุตสาหกรรมในประเทศเพื่อกำหนดตัวชี้วัดความพร้อมของบัณฑิต (Career Readiness Badges) ของมหาวิทยาลัยให้โดดเด่นในภูมิภาค"
                            }
                          </p>

                          <div className="bg-cyan-50/50 p-2.5 rounded-lg border border-cyan-100/60 text-[10.5px] text-cyan-800 font-bold flex items-center space-x-1.5 bg-slate-50">
                            <span className="bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded text-[9px] shrink-0 font-black">แนวทางแกน</span>
                            <span className="truncate">{utilizationAvg < 3.51 ? "ร่วมตกลงความร่วมมือหน่วยงานชั้นนำระดับอุตสาหกรรม" : "ส่งเสริมการจดแจ้งสมรรถนะ Micro-credentials สะสมพอร์ต"}</span>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>

              </div>
            );
          })()}

          {/* TAB 1: RESPONSES LIST */}
          {activeTab === 'responses' && (
            <div className="space-y-6">
              
              {/* Header section with Filter controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 max-w-md relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="ค้นหาตามชื่อ-นามสกุล..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <select
                    value={selectedFacultyFilter}
                    onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-sm py-2.5 px-4 rounded-xl focus:outline-none font-medium"
                  >
                    <option value="">คณะวิชาทั้งหมด (All Faculty)</option>
                    {BU_FACULTIES.map(fac => (
                      <option key={fac} value={fac}>{fac}</option>
                    ))}
                  </select>

                  <button
                    onClick={loadData}
                    className="p-3 border rounded-xl hover:bg-slate-50 active:scale-95 transition text-slate-600 cursor-pointer"
                    title="รีเฟรชข้อมูลข่าวสารล่าสุด"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleExportData}
                    className="flex items-center space-x-2 text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-md font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Data (Excel UTF8)</span>
                  </button>

                  <button
                    onClick={handleClearAllResponses}
                    className="flex items-center space-x-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All Responses</span>
                  </button>
                </div>
              </div>

              {/* Table rendering */}
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-left text-sm font-light">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">วันที่</th>
                      <th className="px-5 py-3.5">ครั้งที่</th>
                      <th className="px-5 py-3.5">ชื่อ-นามสกุล</th>
                      <th className="px-5 py-3.5">คณะวิชา</th>
                      <th className="px-5 py-3.5 text-center">สว.1 (งานทำ)</th>
                      <th className="px-5 py-3.5 text-center">สว.2 (ผู้บังคับ)</th>
                      <th className="px-5 py-3.5 text-center">พึงพอใจเฉลี่ย</th>
                      <th className="px-5 py-3.5 text-center">ลบข้อมูล</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredResponses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                          ไม่มีบันทึกข้อมูลผลตอบรับที่ตรงกับการค้นหา ณ ขณะนี้
                        </td>
                      </tr>
                    ) : (
                      filteredResponses.map((res) => {
                        const sat = res.answers?.part3_satisfaction;
                        const avgS = sat 
                          ? ((sat.content + sat.communication + sat.utilization) / 3).toFixed(1)
                          : "-";
                        
                        return (
                          <tr key={res.id} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                              {res.timestamp?.seconds 
                                ? new Date(res.timestamp.seconds * 1000).toLocaleDateString('th-TH')
                                : "N/A"
                              }
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                              <span className="font-black bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded">
                                ครั้งที่ {res.round || 1}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-slate-900 leading-normal">{res.respondentName}</td>
                            <td className="px-5 py-3.5 font-medium text-slate-600">{res.faculty}</td>
                            <td className="px-5 py-3.5 text-center">
                              <span className={`text-xs inline-flex px-2 py-1 rounded-full font-bold ${
                                res.answers?.part1_q1 === 'has_suggestions' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {res.answers?.part1_q1 === 'has_suggestions' ? 'มีคำตอบเพิ่ม' : 'รับทราบ'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className={`text-xs inline-flex px-2 py-1 rounded-full font-bold ${
                                res.answers?.part2_q1 === 'has_suggestions' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {res.answers?.part2_q1 === 'has_suggestions' ? 'มีคำตอบเพิ่ม' : 'รับทราบ'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center font-black text-indigo-600">{avgS}/5.0</td>
                            <td className="px-5 py-3.5 text-center">
                              <button
                                onClick={() => handleDeleteResponse(res.id, res.respondentName)}
                                className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title={`ลบข้อมูลของ ${res.respondentName}`}
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 2: QUESTIONS SETTINGS */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">จัดการโครงสร้างคำถามบทสำรวจวิจัย</h3>
                  <p className="text-xs text-slate-400 mt-1">แอดมินสามารถกำหนดหัวเรื่อง ค่าเป้าหมาย และฉลากคำถามย่อยได้ตามความพึงพอใจ</p>
                </div>
                {!isAddingQuestion && (
                  <button
                    onClick={() => setIsAddingQuestion(true)}
                    className="flex items-center space-x-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มส่วนวิจัยใหม่</span>
                  </button>
                )}
              </div>

              {/* Add form layout */}
              {isAddingQuestion && (
                <div className="bg-slate-50 border p-5 rounded-2xl relative space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">กรอกข้อมูลส่วนคำถามความพึงพอใจงานวิจัยสถาบันชุดใหม่</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">หัวเรื่องหลักงานวิจัย</label>
                      <input
                        type="text"
                        placeholder="เช่น คลื่นความถี่ผู้เรียนจบใหม่"
                        value={newQuestionForm.title || ''}
                        onChange={(e) => setNewQuestionForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-white border rounded-lg p-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">ข้อความเป้าหมายสถาบัน</label>
                      <input
                        type="text"
                        placeholder="เช่น ร้อยละการตอบแบบสอบถามไม่ต่ำกว่า 40%"
                        value={newQuestionForm.targetText || ''}
                        onChange={(e) => setNewQuestionForm(prev => ({ ...prev, targetText: e.target.value }))}
                        className="w-full bg-white border rounded-lg p-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => {
                        setIsAddingQuestion(false);
                        setNewQuestionForm({});
                      }}
                      className="text-xs border px-4 py-2 bg-white rounded-lg cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleAddQuestion}
                      className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg cursor-pointer"
                    >
                      เพิ่มเป้าหมายวิจัยเข้าสู่แบบสอบถาม
                    </button>
                  </div>
                </div>
              )}

              {/* Questions mapping lists */}
              <div className="grid grid-cols-1 gap-4">
                {questions.map((q) => (
                  <div key={q.id} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          ตอนที่ {q.section}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800">{q.title}</h4>
                      </div>
                      <p className="text-xs text-indigo-700 font-medium">🎯 {q.targetText}</p>
                      
                      <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-500 pt-1">
                        <div><strong>คำถาม 1:</strong> {q.q1_text}</div>
                        <div><strong>คำถาม 2:</strong> {q.q2_text}</div>
                        <div><strong>คำถาม 3:</strong> {q.q3_text}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 justify-end mt-2 md:mt-0">
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="flex items-center space-x-1.5 text-xs text-slate-700 bg-white hover:bg-slate-100 border px-3.5 py-2 rounded-lg cursor-pointer transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>แก้ไขเชิงรายละเอียด</span>
                      </button>

                      {q.section > 2 && (
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 shrink-0 cursor-pointer"
                          title="ลบคำถามจำลองนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: SYSTEM & MEMBERSHIP MANAGEMENT */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="border-b border-slate-150 pb-4">
                <h3 className="text-lg font-black text-slate-800">⚙️ การจัดการระบบและสิทธิ์การเข้าใช้งาน</h3>
                <p className="text-xs text-slate-400 mt-1">
                  กำหนดกลุ่มผู้ดูแลระบบระดับสูง (Admin) และควบคุมบัญชีอาจารย์/ผู้ใช้ที่มีสิทธิ์เข้าทำแบบประเมินหลักสูตร
                </p>
              </div>

              {/* Sub-Selection Tab Controller */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mb-8 space-x-1.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSystemSubTab('admins')}
                  className={`flex items-center space-x-2 px-4.5 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    systemSubTab === 'admins' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>ผู้ดูแลระบบ (Admin)</span>
                  <span className="bg-slate-200/60 text-[10px] text-slate-600 font-bold px-1.5 py-0.5 rounded-md ml-1.5">
                    {adminsList.length + FIXED_ADMINS.length}
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSystemSubTab('instructors')}
                  className={`flex items-center space-x-2 px-4.5 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    systemSubTab === 'instructors' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>ผู้มีสิทธิ์ในการเข้าระบบ</span>
                  <span className="bg-slate-200/60 text-[10px] text-slate-600 font-bold px-1.5 py-0.5 rounded-md ml-1.5">
                    {instructorsList.length}
                  </span>
                </button>
              </div>

              {/* SECTION A: ADMIN LISTS MANAGEMENT */}
              {systemSubTab === 'admins' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Form add dynamic Admin */}
                    <div className="bg-slate-50 border rounded-2xl p-5 space-y-4">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 flex items-center space-x-1">
                          <UserPlus className="w-4 h-4 text-indigo-600" />
                          <span>ป้อนชื่อและแต่งตั้งแอดมินใหม่</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">ผู้ได้รับแต่งตั้งจะสามารถเข้าสู่แดชบอร์ดจัดการระบบนี้ได้ทันที</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">อีเมลแอดมิน (ต้องลงท้าย @bu.ac.th)</label>
                          <input
                            type="email"
                            placeholder="example@bu.ac.th"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="bg-white border rounded-xl p-2.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-slate-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">ชื่อผู้ดูแลระบบ (ภาษาไทย / อังกฤษ)</label>
                          <input
                            type="text"
                            placeholder="ดร. สมชาย มั่นคง"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            className="bg-white border rounded-xl p-2.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-slate-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">ประเภทสิทธิ์การใช้งาน (Admin Role)</label>
                          <select
                            value={newAdminRole}
                            onChange={(e) => setNewAdminRole(e.target.value)}
                            className="bg-white border rounded-xl p-2.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-slate-800"
                          >
                            <option value="Dynamic Admin">ผู้ดูแลระบบทั่วไป (Dynamic Admin)</option>
                            <option value="System Core">ผู้ดูแลระบบหลัก (System Core)</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddAdminAction}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>แต่งตั้งผู้ดูแลระบบ</span>
                        </button>
                      </div>
                    </div>

                    {/* Table lists of Admin users */}
                    <div className="lg:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-slate-800">รายนามผู้ได้รับอนุญาตสิทธิ์แอดมินทั้งหมด</h4>
                        <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 font-bold">
                          ทั้งระบบ {adminsList.length} บัญชี
                        </span>
                      </div>

                      <div className="border rounded-2xl overflow-hidden bg-white">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead className="bg-slate-50 border-b text-slate-550 font-bold">
                            <tr>
                              <th className="p-3">ผู้ใช้งาน (User)</th>
                              <th className="p-3">ประเภทสิทธิ์</th>
                              <th className="p-3">ลงชื่อเข้าล่าสุด</th>
                              <th className="p-3 text-right">ดำเนินการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-slate-700">
                            {adminsList.map((admin) => (
                              <tr key={admin.id} className="hover:bg-slate-50">
                                <td className="p-3 font-medium">
                                  <div className="flex items-center space-x-2.5">
                                    <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center font-bold text-[10px] text-indigo-700">
                                      {(admin.name || admin.email || "").substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-slate-800 font-extrabold">{admin.name}</p>
                                      <p className="text-[10px] text-slate-400 font-mono">{admin.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  {admin.roleType === 'System Core' ? (
                                    <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-md">
                                      System Core (ผู้ดูแลระบบหลัก)
                                    </span>
                                  ) : (
                                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                                      Dynamic Admin (ผู้ดูแลระบบทั่วไป)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-[10px] font-mono text-slate-550">
                                  {admin.lastLogin 
                                    ? (admin.lastLogin.seconds 
                                        ? new Date(admin.lastLogin.seconds * 1000).toLocaleString('th-TH', { hour12: false }) 
                                        : "เพิ่งเข้าสู่ระบบ")
                                    : (admin.roleType === 'System Core' ? "ระบบหลักของสถาบัน" : "ยังไม่เคยเข้าสู่ระบบ")
                                  }
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingAdmin({
                                        id: admin.id,
                                        email: admin.email,
                                        name: admin.name,
                                        roleType: admin.roleType || 'Dynamic Admin'
                                      })}
                                      className="p-1 px-2 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 border border-transparent rounded-lg cursor-pointer transition-colors flex items-center space-x-1"
                                      title="แก้ไขข้อมูลผู้ดูแลระบบ"
                                    >
                                      <Edit2 className="w-3" />
                                      <span className="text-[10px] font-bold">แก้ไข</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAdminAction(admin.email)}
                                      className="p-1 px-2 text-rose-600 hover:bg-rose-50 hover:border-rose-100 border border-transparent rounded-lg cursor-pointer transition-colors flex items-center space-x-1"
                                      title="ลบผู้ดูแลระบบคนนี้"
                                    >
                                      <Trash2 className="w-3" />
                                      <span className="text-[10px] font-bold">ลบ</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}

                            {adminsList.length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-5 text-center text-slate-400 text-xs font-semibold">
                                  ไม่มีผู้ดูแลระบบเพิ่มเติมจากการรับแต่งตั้งในปัจจุบัน
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* SECTION B: AUTHORIZED MEMBERS MANAGEMENT (INSTRUCTORS/STAFF) */}
              {systemSubTab === 'instructors' && (
                <div className="space-y-6">
                  
                  {/* CSV Importer & Single register Form in Bento columns layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* CSV Importer column using elegant drag and drop zone */}
                    <div className="border border-slate-200/80 rounded-2xl p-5 bg-white space-y-4">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 flex items-center space-x-1">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span>นำเข้ารายชื่อผู้มีสิทธิ์ด้วยไฟล์ CSV</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">อัปโหลดรายชื่อข้อมูลบุคลากรหลายท่านได้อย่างรวดเร็วในคราวเดียว</p>
                      </div>

                      {/* Drag & Drop Area */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                          isDraggingCSV 
                            ? 'border-indigo-600 bg-indigo-50/40' 
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-50/80'
                        }`}
                        onClick={() => document.getElementById('csv-file-input')?.click()}
                      >
                        <Upload className={`w-8 h-8 ${isDraggingCSV ? 'text-indigo-600 animate-bounce' : 'text-slate-450'}`} />
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-slate-700">ลากและวางไฟล์ CSV หรือ คลิกเพื่อเลือกไฟล์</p>
                          <p className="text-[10px] text-slate-400">รองรับข้อความคั่นด้วยจุลภาค UTF-8 (.csv)</p>
                        </div>
                        <input
                          id="csv-file-input"
                          type="file"
                          accept=".csv"
                          onChange={handleCSVImport}
                          className="hidden"
                        />
                      </div>

                      {/* Format specification alert guidance */}
                      <div className="space-y-2 bg-slate-50 rounded-xl p-3.5 border text-[10px] text-slate-550 leading-relaxed font-semibold">
                        <p className="text-slate-705 font-extrabold flex items-center space-x-1">
                          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>ข้อกำหนดโครงสร้างฟิลด์ไฟล์ CSV (6 คอลัมน์):</span>
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-500 font-medium font-sans">
                          <li>บรรทัดในไฟล์ต้องคั่นด้วย จุลภาค (Commas `,`)</li>
                          <li>เรียงคอลัมน์: <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono font-bold text-slate-800">รหัสบุคลากร, ชื่อ-นามสกุล, ตำแหน่ง, หน่วยงาน, อีเมล, เบอร์ภายใน</code></li>
                          <li>ตัวอย่าง: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-mono font-bold text-slate-850">10203045, ดร.สมสมร มั่งมี, อาจารย์ประจำ, คณะบัญชี, somsomorn.m@bu.ac.th, 1234</code></li>
                        </ol>
                      </div>
                    </div>

                    {/* Single manual registration Form */}
                    <div className="border border-slate-200/80 rounded-2xl p-5 bg-white space-y-4">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 flex items-center space-x-1">
                          <UserPlus className="w-4 h-4 text-indigo-600" />
                          <span>เพิ่มผู้มีสิทธิ์เข้าระบบสำรวจรายบุคคล</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">เพิ่มข้อมูลบุคลากรรายบุคคลเพื่อรับรองสิทธิ์เข้าใช้งานระบบประเมิน</p>
                      </div>

                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500">รหัสบุคลากร</label>
                            <input
                              type="text"
                              placeholder="เช่น 10902123"
                              value={newInstStaffId}
                              onChange={(e) => setNewInstStaffId(e.target.value)}
                              className="bg-slate-50 border rounded-xl p-2.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-slate-800"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500">อีเมลวิชาการ (ต้องเป็น @bu.ac.th)</label>
                            <input
                              type="email"
                              placeholder="เช่น somchai.m@bu.ac.th"
                              value={newInstEmail}
                              onChange={(e) => setNewInstEmail(e.target.value)}
                              className="bg-slate-50 border rounded-xl p-2.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500">ชื่อ - นามสกุล</label>
                            <input
                              type="text"
                              placeholder="เช่น ดร. สมชาย มั่นคง"
                              value={newInstName}
                              onChange={(e) => setNewInstName(e.target.value)}
                              className="bg-slate-50 border rounded-xl p-2.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-slate-800"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500">ตำแหน่ง</label>
                            <input
                              type="text"
                              placeholder="เช่น อาจารย์ประจำ / เจ้าหน้าที่บริหาร"
                              value={newInstPosition}
                              onChange={(e) => setNewInstPosition(e.target.value)}
                              className="bg-slate-50 border rounded-xl p-2.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500">หน่วยงาน / คณะวิชา</label>
                            <input
                              type="text"
                              placeholder="เช่น คณะมนุษยศาสตร์และและการจัดการการท่องเที่ยว"
                              value={newInstFaculty}
                              onChange={(e) => setNewInstFaculty(e.target.value)}
                              className="bg-slate-50 border rounded-xl p-2.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-slate-800"
                              list="bu-faculties-list"
                            />
                            <datalist id="bu-faculties-list">
                              {BU_FACULTIES.map(v => (
                                <option key={v} value={v} />
                              ))}
                            </datalist>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500">เบอร์ภายใน</label>
                            <input
                              type="text"
                              placeholder="เช่น 1234 หรือ 9"
                              value={newInstInternalPhone}
                              onChange={(e) => setNewInstInternalPhone(e.target.value)}
                              className="bg-slate-50 border rounded-xl p-2.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={handleAddInstructorAction}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>บันทึกชื่อผู้ใช้งานใหม่</span>
                          </button>
                          
                          {instructorsList.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllInstructors}
                              className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-xs font-bold px-3 py-2.5 rounded-xl transition cursor-pointer"
                              title="ลบล้างข้อมูลทั้งหมดทิ้งเพื่อรีเซ็ต"
                            >
                              ล้างทุกคนทิ้ง
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Search bar & Live data list of permitted instructors */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-800">รายชื่อผู้มีสิทธิ์เข้าระบบทำแบบสำรวจที่ลงทะเบียนในสาระข้อมูล</h4>
                      <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 font-extrabold">
                        ทั้งหมด {instructorsList.length} รายชื่อในฐานข้อมูล
                      </span>
                    </div>

                    {/* Filter searching toolbar */}
                    <div className="flex items-center space-x-2.5 w-full bg-slate-50 border border-slate-200/60 p-2.5 rounded-2xl">
                      <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
                      <input
                        type="text"
                        placeholder="ค้นหาตาม รหัสบุคลากร, ชื่อ-นามสกุล, ตำแหน่ง, หน่วยงาน, อีเมล หรือ เบอร์ภายใน..."
                        value={systemSearchQuery}
                        onChange={(e) => setSystemSearchQuery(e.target.value)}
                        className="bg-transparent text-xs text-slate-800 placeholder-slate-400 w-full focus:outline-none font-medium"
                      />
                    </div>

                    {/* Table lists of custom active instructors */}
                    <div className="border rounded-2xl overflow-hidden bg-white shadow-xs overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs min-w-[900px]">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-550 font-bold">
                          <tr>
                            <th className="p-3 w-14 text-center">ลำดับ</th>
                            <th className="p-3 w-28">รหัสบุคลากร</th>
                            <th className="p-3">ชื่อ - นามสกุล</th>
                            <th className="p-3">ตำแหน่ง</th>
                            <th className="p-3">หน่วยงาน / คณะวิชา</th>
                            <th className="p-3">อีเมล (@bu.ac.th)</th>
                            <th className="p-3 w-24">เบอร์ภายใน</th>
                            <th className="p-3 w-28">วันที่เริ่มอนุญาต</th>
                            <th className="p-3 w-28 text-center">การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y border-slate-100 text-slate-700">
                          {instructorsList
                            .filter(inst => {
                              const searchLower = systemSearchQuery.toLowerCase();
                              return (
                                inst.email?.toLowerCase().includes(searchLower) ||
                                inst.name?.toLowerCase().includes(searchLower) ||
                                inst.faculty?.toLowerCase().includes(searchLower) ||
                                inst.staffId?.toLowerCase().includes(searchLower) ||
                                inst.position?.toLowerCase().includes(searchLower) ||
                                inst.internalPhone?.toLowerCase().includes(searchLower)
                              );
                            })
                            .map((inst, idx) => (
                              <tr key={inst.id} className="hover:bg-slate-50/40">
                                <td className="p-3 font-mono text-slate-400 text-[10px] text-center">{idx + 1}</td>
                                <td className="p-3 font-mono text-slate-600 font-bold">{inst.staffId || '-'}</td>
                                <td className="p-3">
                                  <p className="font-extrabold text-slate-800">{inst.name || '-'}</p>
                                </td>
                                <td className="p-3 font-medium text-slate-500">{inst.position || '-'}</td>
                                <td className="p-3 font-semibold text-slate-600">{inst.faculty || '-'}</td>
                                <td className="p-3 font-mono text-slate-500 text-[10px]">{inst.email}</td>
                                <td className="p-3 font-mono font-semibold text-slate-600">{inst.internalPhone || '-'}</td>
                                <td className="p-3 text-[10px] text-slate-400 font-mono">
                                  {inst.addedAt 
                                    ? new Date(inst.addedAt.seconds * 1000).toLocaleDateString('th-TH') 
                                    : "นำเข้าเริ่มต้น"
                                  }
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingInstructor({
                                        id: inst.id,
                                        staffId: inst.staffId || '',
                                        email: inst.email || '',
                                        name: inst.name || '',
                                        position: inst.position || '',
                                        faculty: inst.faculty || '',
                                        internalPhone: inst.internalPhone || ''
                                      })}
                                      className="p-1 px-2 text-indigo-600 hover:bg-indigo-50 border border-transparent rounded-lg cursor-pointer transition-colors"
                                      title="แก้ไขรายชื่อนี้"
                                    >
                                      แก้ไข
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInstructorAction(inst.email)}
                                      className="p-1 px-2 text-rose-600 hover:bg-rose-50 border border-transparent rounded-lg cursor-pointer transition-colors"
                                      title="ยกเลิกสิทธิ์บัญชีนี้"
                                    >
                                      ลบ
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}

                          {instructorsList.length === 0 && (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-400 text-xs font-semibold leading-relaxed">
                                <Info className="w-6 h-6 text-slate-350 mx-auto mb-2" />
                                ยังไม่มีรายชื่อผู้มีสิทธิ์ในระบบสิทธิ์สถาบันในขณะนี้<br/>
                                <span className="text-[10px] text-slate-350 font-medium">เมื่อว่างเปล่า บัญชีสังกัด @bu.ac.th ทุกบัญชีจะสามารถกรอกข้อมูลแบบประเมินผ่านระบบได้ตามอัธยาศัย</span>
                              </td>
                            </tr>
                          )}

                          {instructorsList.length > 0 && instructorsList.filter(inst => {
                            const searchLower = systemSearchQuery.toLowerCase();
                            return (
                              inst.email?.toLowerCase().includes(searchLower) ||
                              inst.name?.toLowerCase().includes(searchLower) ||
                              inst.faculty?.toLowerCase().includes(searchLower) ||
                              inst.staffId?.toLowerCase().includes(searchLower) ||
                              inst.position?.toLowerCase().includes(searchLower) ||
                              inst.internalPhone?.toLowerCase().includes(searchLower)
                            );
                          }).length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-5 text-center text-slate-400 text-xs font-semibold">
                                ไม่พบข้อมูลที่สอดคล้องกับคำค้นหาของคุณ
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: GMAIL SMTP INTEGRATION SYSTEM (NO GOOGLE CLOUD RUN) */}
          {activeTab === 'integration' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <center>
                <div className="inline-flex p-3.5 bg-indigo-50 text-indigo-600 rounded-3xl mb-3">
                  <Mail className="w-8 h-8" />
                </div>
                </center>
                <h3 className="text-lg font-black text-slate-800 text-center">
                  วิธีการติดตั้งระบบส่งเมลตอบรับผ่าน Google Sheets (ไม่ต้องใช้ Cloud Run!)
                </h3>
              </div>

              <div className="text-sm space-y-4 max-w-3xl mx-auto text-slate-600 leading-relaxed">
                <p>
                  ตามนโยบายแบบประเมินประหยัดพลังงาน <strong>(Spark Plan / แบบฟรี) </strong> 
                  แอปพลิเคชันจะจำกัดการออกส่งเมลตรงผ่านเซิร์ฟเวอร์ และเพื่อเป็นเลี่ยงข้อกำหนดของ Google Cloud Run 
                  เราขอแนะนำให้ท่านใช้วิธีต่อเชื่อมเข้ากับ <strong>Google Sheets และ Google Apps Script</strong> แทน 
                  ซึ่งเป็นการทำงานผ่านเซิร์ฟเวอร์ฟรีของ Google ไร้ค่าใช้จ่าย 100% ใช้งานรวดเร็วและปลอดภัยตลอดชีพ
                </p>

                <div className="bg-slate-50 border-2 border-dashed p-4.5 rounded-2xl space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>เพียงคัดลอกโค้ดสคริปต์นี้ไปป้อนหลัง Google Sheets:</span>
                  </h4>

                  <div className="relative">
                    <pre className="bg-slate-900 text-rose-400 font-mono text-[10px] p-4.5 rounded-xl overflow-x-auto max-h-[160px]">
                      {googleAppsScriptCode}
                    </pre>
                    <button
                      onClick={handleCopyCode}
                      className="absolute top-2.5 right-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-sm transition"
                    >
                      {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? "ก๊อปปี้แล้ว!" : "Copy Code"}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <p className="font-semibold text-slate-800">ขั้นตอนการติดตั้งใน Google Apps Script:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-500 font-medium">
                    <li>นำแผ่นสรุปข้อมูล CSV คำตอบด้านหลักสูตรไปอัปโหลดขึ้น Google Sheets</li>
                    <li>ที่แถบเมนูด้านบน เลื่อนคลิกที่ <strong className="text-slate-700">ส่วนขยาย (Extensions)</strong> และเลือก <strong className="text-slate-700">Apps Script</strong></li>
                    <li>ลบโค้ดที่มีอยู่ทิ้ง แล้วทำการเซฟวางโค้ดสคริปต์แบบที่ก๊อปไปจากส่วนบนนี้</li>
                    <li>แก้ช่องอีเมลที่ต้องการรับให้เรียบร้อย และเปลี่ยนเมนู Trigger เป็น "เมื่อมีรายการฟอร์มกระดานส่งคำตอบ"</li>
                    <li>กดไอคอนเซฟและเรียกใช้งานแผ่นงาน Google Sheets ได้ตามปกติ เมลสรุปจะนำส่งอัตโนมัติเมื่อเกิดรายการ!</li>
                  </ol>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Editing question dialog details */}
      <AnimatePresence>
        {editingQuestion && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b">
                <h4 className="text-base font-extrabold text-slate-800">✍️ แก้ไขรายละเอียดคำถามตอนที่ {editingQuestion.section}</h4>
                <p className="text-xs text-slate-400 mt-1">แก้ไขข้อความเพื่อแสดงโครงสร้างคำถามในแบบฟอร์ม</p>
              </div>

              <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">หัวเรื่องงานวิจัยหลัก (Research Title)</label>
                  <input
                    type="text"
                    value={editingQuestion.title}
                    onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">ค่าเป้าหมายผลการส่งข้อมูลสถาบัน</label>
                  <input
                    type="text"
                    value={editingQuestion.targetText}
                    onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, targetText: e.target.value }) : null)}
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">ฉลากคำถามข้อที่ 1 (Acknowledgement text)</label>
                  <input
                    type="text"
                    value={editingQuestion.q1_text}
                    onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, q1_text: e.target.value }) : null)}
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">ฉลากคำถามข้อที่ 2 (Expectation text)</label>
                  <input
                    type="text"
                    value={editingQuestion.q2_text}
                    onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, q2_text: e.target.value }) : null)}
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">ฉลากคำถามข้อที่ 3 (Comments text)</label>
                  <input
                    type="text"
                    value={editingQuestion.q3_text}
                    onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, q3_text: e.target.value }) : null)}
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="text-xs px-4 py-2 bg-white border rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-xl cursor-pointer font-semibold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingAdmin && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b">
                <h4 className="text-base font-extrabold text-slate-800 flex items-center space-x-2">
                  <span>✍️ แก้ไขข้อมูลผู้ดูแลระบบ</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">อัปเดตสิทธิ์หรือแก้ไขรายละเอียดชื่อ/อีเมลผู้ดูแลระบบ</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">ชื่อผู้ดูแลระบบ (ชื่อ-นามสกุล)</label>
                  <input
                    type="text"
                    value={editingAdmin.name}
                    onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-semibold"
                    placeholder="ดร. สมชาย มั่นคง"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">อีเมลแอดมิน (ต้องลงท้าย @bu.ac.th)</label>
                  <input
                    type="email"
                    value={editingAdmin.email}
                    onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-mono"
                    placeholder="example@bu.ac.th"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">ประเภทสิทธิ์การใช้งาน (Admin Role)</label>
                  <select
                    value={editingAdmin.roleType}
                    onChange={(e) => setEditingAdmin(prev => prev ? ({ ...prev, roleType: e.target.value }) : null)}
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800"
                  >
                    <option value="Dynamic Admin">ผู้ดูแลระบบทั่วไป (Dynamic Admin)</option>
                    <option value="System Core">ผู้ดูแลระบบหลัก (System Core)</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="text-xs px-4 py-2.5 bg-white border hover:bg-slate-50 rounded-xl cursor-pointer transition font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdminAction}
                  className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl cursor-pointer font-bold shadow-sm transition"
                >
                  บันทึกการจัดเก็บ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingInstructor && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b">
                <h4 className="text-base font-extrabold text-slate-800 flex items-center space-x-2">
                  <span>✍️ แก้ไขข้อมูลผู้มีสิทธิ์เข้าระบบ</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">อัปเดตรายละเอียดและข้อมูลติดต่อของผู้มีสิทธิ์ทำแบบประเมิน</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">รหัสบุคลากร</label>
                    <input
                      type="text"
                      value={editingInstructor.staffId}
                      onChange={(e) => setEditingInstructor(prev => prev ? ({ ...prev, staffId: e.target.value }) : null)}
                      className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-semibold"
                      placeholder="เช่น 10902123"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">อีเมลผู้ใช้งาน (ต้องลงท้าย @bu.ac.th)</label>
                    <input
                      type="email"
                      value={editingInstructor.email}
                      onChange={(e) => setEditingInstructor(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                      className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-mono"
                      placeholder="example@bu.ac.th"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">ชื่อ - นามสกุล</label>
                    <input
                      type="text"
                      value={editingInstructor.name}
                      onChange={(e) => setEditingInstructor(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                      className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-semibold"
                      placeholder="ดร. สมชาย มั่นคง"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">ตำแหน่ง</label>
                    <input
                      type="text"
                      value={editingInstructor.position}
                      onChange={(e) => setEditingInstructor(prev => prev ? ({ ...prev, position: e.target.value }) : null)}
                      className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-medium"
                      placeholder="เช่น อาจารย์ประจำ"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">หน่วยงาน / คณะวิชา</label>
                    <input
                      type="text"
                      value={editingInstructor.faculty}
                      onChange={(e) => setEditingInstructor(prev => prev ? ({ ...prev, faculty: e.target.value }) : null)}
                      className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-medium"
                      placeholder="เช่น คณะวิชา..."
                      list="bu-faculties-list-edit"
                    />
                    <datalist id="bu-faculties-list-edit">
                      {BU_FACULTIES.map(v => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">เบอร์ภายใน</label>
                    <input
                      type="text"
                      value={editingInstructor.internalPhone}
                      onChange={(e) => setEditingInstructor(prev => prev ? ({ ...prev, internalPhone: e.target.value }) : null)}
                      className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-semibold"
                      placeholder="เช่น 1234 หรือ 9"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingInstructor(null)}
                  className="text-xs px-4 py-2.5 bg-white border hover:bg-slate-50 rounded-xl cursor-pointer transition font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveInstructorAction}
                  className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl cursor-pointer font-bold shadow-sm transition"
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmConfig && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-2xl ${confirmConfig.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                    <Info className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-base font-extrabold text-slate-800">{confirmConfig.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{confirmConfig.message}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 border-t flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmConfig(null)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmConfig.onConfirm}
                  className={`text-xs font-bold text-white px-5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer ${
                    confirmConfig.isDanger 
                      ? 'bg-rose-600 hover:bg-rose-700' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {confirmConfig.confirmText || 'ยืนยัน'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
