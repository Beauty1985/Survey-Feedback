import { GraduationCap } from 'lucide-react';

export const BU_FACULTIES = [
  "คณะเทคโนโลยีสารสนเทศและนวัตกรรม",
  "คณะวิศวกรรมศาสตร์",
  "คณะบัญชี",
  "คณะบริหารธุรกิจ",
  "คณะเศรษฐศาสตร์และการลงทุน",
  "คณะนิติศาสตร์",
  "คณะนิเทศศาสตร์",
  "คณะมนุษยศาสตร์และการจัดการการท่องเที่ยว",
  "คณะศิลปกรรมศาสตร์",
  "คณะสถาปัตยกรรมศาสตร์",
  "คณะดิจิทัลมีเดียและศิลปะภาพยนตร์",
  "คณะการสร้างเจ้าของธุรกิจและการบริหารกิจการ",
  "วิทยาลัยนานาชาติ",
  "วิทยาลัยนานาชาติจีน",
  "บัณฑิตวิทยาลัย"
];

interface FacultySelectorProps {
  selectedFaculty: string;
  onSelect: (faculty: string) => void;
  label?: string;
}

export default function FacultySelector({ selectedFaculty, onSelect, label }: FacultySelectorProps) {
  return (
    <div id="faculty-selector-container" className="space-y-4">
      <label className="block text-sm font-bold text-slate-800 mb-1 font-display">
        {label || "4. คณะวิชาหรือหน่วยงานที่สังกัด"} <span className="text-rose-500">*</span>
      </label>
      <div id="faculty-grid" className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BU_FACULTIES.map((faculty, fIdx) => {
          const isSelected = selectedFaculty === faculty;
          const labelId = `faculty-label-${fIdx}`;
          const radioId = `faculty-radio-${fIdx}`;
          
          return (
            <button
              key={faculty}
              id={labelId}
              type="button"
              onClick={() => onSelect(faculty)}
              className={`flex items-center text-left p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer outline-none focus:ring-2 focus:ring-slate-900 ${
                isSelected
                  ? 'border-slate-900 bg-slate-50 text-slate-950 shadow-sm'
                  : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700'
              }`}
              style={{ minHeight: '52px' }}
            >
              <div className="flex items-center space-x-3 w-full">
                <div
                  id={radioId}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white transition-all" />
                  )}
                </div>
                <GraduationCap className={`w-4 h-4 shrink-0 ${isSelected ? 'text-slate-900' : 'text-slate-400'}`} />
                <span className="text-sm font-bold leading-relaxed">{faculty}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
