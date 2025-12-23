import { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';

const PRESETS = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#84cc16', // Lime
    '#eab308', // Yellow
    '#f97316', // Orange
    '#ef4444', // Red
    '#ec4899', // Pink
    '#a855f7', // Purple
    '#64748b', // Slate
    '#000000', // Black
];

export function hexToRgba(hex, alpha = 1) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return hex; // Fallback
}

export default function ColorPicker({ color, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [containerRef]);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors w-full"
            >
                <div
                    className="w-5 h-5 rounded-full border border-slate-200 shadow-sm"
                    style={{ backgroundColor: color }}
                />
                <span className="text-sm text-slate-600 flex-1 text-left">Couleur</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 p-3 bg-white rounded-xl shadow-xl border border-slate-200 w-64 right-0 md:left-0">
                    <div className="grid grid-cols-6 gap-2 mb-3">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => { onChange(preset); setIsOpen(false); }}
                                className={`w-8 h-8 rounded-full border border-slate-200 shadow-sm flex items-center justify-center hover:scale-110 transition-transform ${color === preset ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''}`}
                                style={{ backgroundColor: preset }}
                                title={preset}
                            >
                                {color === preset && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                            </button>
                        ))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Personnalisé</span>
                        <div className="relative overflow-hidden w-8 h-8 rounded-full border border-slate-300 shadow-sm cursor-pointer hover:scale-110 transition-transform">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => onChange(e.target.value)}
                                className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
