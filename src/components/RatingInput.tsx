import { Star } from 'lucide-react';

interface RatingInputProps {
  label: string;
  description: string;
  value: number;
  onChange: (val: number) => void;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "พึงพอใจน้อยที่สุด",
  2: "พึงพอใจน้อย",
  3: "พึงพอใจปานกลาง",
  4: "พึงพอใจมาก",
  5: "พึงพอใจมากที่สุด",
};

export default function RatingInput({ label, description, value, onChange }: RatingInputProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
      <div>
        <h4 className="text-base font-bold text-slate-905 font-display leading-snug">{label}</h4>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans font-medium">{description}</p>
      </div>
      
      {/* Desktop view: Horizontal Row & Mobile view: Clean stacked grids */}
      <div className="space-y-3">
        {/* Horizontal rating circles */}
        <div className="flex justify-between items-center sm:gap-2 pt-1">
          {[1, 2, 3, 4, 5].map((num) => {
            const isSelected = value === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onChange(num)}
                className={`flex-1 max-w-[56px] h-12 rounded-xl flex flex-col justify-center items-center font-display transition-all duration-205 cursor-pointer border ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-250 scale-105'
                    : 'border-slate-200 hover:border-slate-355 hover:bg-slate-50 text-slate-600'
                }`}
                title={LEVEL_LABELS[num]}
                style={{ touchAction: 'manipulation' }}
              >
                <span className="text-lg font-bold">{num}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic score label */}
        <div className="flex justify-between items-center bg-slate-50 px-3.5 py-2.5 rounded-lg text-xs font-medium border border-slate-200/50">
          <span className="text-slate-500">ระดับความพึงพอใจ:</span>
          <span className={`font-bold font-display ${value > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
            {value > 0 ? `${value} - ${LEVEL_LABELS[value]}` : 'กรุณาเลือกระดับ (คลิกหมายเลขด้านบน)'}
          </span>
        </div>
      </div>
    </div>
  );
}
