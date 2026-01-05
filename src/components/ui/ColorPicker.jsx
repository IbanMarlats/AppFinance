import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

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
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        // Handle scroll to verify position updates or close (simpler to close on scroll usually, or update pos)
        const handleScroll = () => setIsOpen(false);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    const toggleOpen = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Calculate position to show below the button, keeping it on screen if possible
            // Simple positioning: below and aligned left, but checking for right edge
            let left = rect.left;
            let top = rect.bottom + window.scrollY + 5;

            // Adjust if too far right (simplified)
            if (window.innerWidth - rect.left < 280) { // 280 is approx width of dropdown
                left = rect.right - 280;
            }

            setPosition({ top, left });
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            <div className="relative w-full" ref={containerRef}>
                <button
                    type="button"
                    onClick={toggleOpen}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-indigo-300 transition-all w-full"
                >
                    <div
                        className="w-6 h-6 rounded-full border border-slate-200 shadow-sm shrink-0"
                        style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-slate-500 font-medium flex-1 text-left truncate">Couleur</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[9999] p-4 bg-white rounded-xl shadow-xl border border-slate-200 w-72 animate-in fade-in zoom-in-95 duration-100 ease-out"
                    style={{ top: position.top, left: position.left }}
                >
                    <div className="grid grid-cols-6 gap-2 mb-4">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => { onChange(preset); setIsOpen(false); }}
                                className={`w-9 h-9 rounded-full border border-slate-200 shadow-sm flex items-center justify-center hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${color === preset ? 'ring-2 ring-offset-1 ring-indigo-500 scale-105' : ''}`}
                                style={{ backgroundColor: preset }}
                                title={preset}
                            >
                                {color === preset && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                            </button>
                        ))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Personnalisé</span>
                        <div className="flex flex-1 gap-2">
                            <div className="relative flex-1 h-9 rounded-lg border border-slate-300 shadow-sm overflow-hidden group hover:border-indigo-300 transition-colors">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => onChange(e.target.value)}
                                    className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="h-9 w-9 flex items-center justify-center bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors border border-slate-200"
                                title="Valider"
                            >
                                <Check className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
