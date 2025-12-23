import { useState, useEffect, useRef } from 'react';

export default function DatePicker({ label, value, onChange, className = "", error, min, max }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const [currentDate, setCurrentDate] = useState(new Date()); // For navigation

    // Parse value (YYYY-MM-DD) to Date object
    useEffect(() => {
        if (value) {
            const dateParams = value.split('-').map(Number);
            // new Date(y, m-1, d)
            const d = new Date(dateParams[0], dateParams[1] - 1, dateParams[2]);
            if (!isNaN(d.getTime())) {
                setCurrentDate(d);
            }
        }
    }, [isOpen]); // Reset to selected date when opening

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start (0=Mon, 6=Sun)
    };

    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleYearChange = (e) => {
        setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1));
    };

    const handleDayClick = (day) => {
        // Format YYYY-MM-DD in local time
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        const formatted = `${year}-${month}-${d}`;

        onChange({ target: { value: formatted } });
        setIsOpen(false);
    };

    const displayDate = value ? new Date(value.split('-')[0], value.split('-')[1] - 1, value.split('-')[2]).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : 'Sélectionner une date';

    // Generate days
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const numDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month); // 0-6

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= numDays; i++) days.push(i);

    // Generate years range (current year - 5 to + 2)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 15 }, (_, i) => currentYear - 10 + i);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="label text-slate-700">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`input bg-white text-slate-900 w-full text-left flex items-center justify-between cursor-pointer ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-600'}`}
            >
                <span className={`block truncate ${!value ? 'text-slate-400' : ''}`}>
                    {value ? displayDate : 'JJ/MM/AAAA'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 p-4 bg-white shadow-xl rounded-xl border border-slate-100 min-w-[300px] animate-fadeIn right-0 md:left-0 md:right-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={handlePrevMonth} type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <div className="flex gap-2 font-bold text-slate-800">
                            <span>{months[month]}</span>
                            <select
                                value={year}
                                onChange={handleYearChange}
                                className="bg-transparent border-none p-0 cursor-pointer text-indigo-600 font-bold focus:ring-0 appearance-none hover:underline"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <button onClick={handleNextMonth} type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        <div>Lun</div>
                        <div>Mar</div>
                        <div>Mer</div>
                        <div>Jeu</div>
                        <div>Ven</div>
                        <div>Sam</div>
                        <div>Dim</div>
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, index) => {
                            if (day === null) return <div key={`empty-${index}`} />;

                            const isSelected = value &&
                                parseInt(value.split('-')[2]) === day &&
                                parseInt(value.split('-')[1]) === month + 1 &&
                                parseInt(value.split('-')[0]) === year;

                            const isToday =
                                new Date().getDate() === day &&
                                new Date().getMonth() === month &&
                                new Date().getFullYear() === year;

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleDayClick(day)}
                                    className={`
                                        h-9 w-9 rounded-full flex items-center justify-center text-sm transition-all duration-200
                                        ${isSelected
                                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200'
                                            : isToday
                                                ? 'bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-200'
                                                : 'hover:bg-slate-100 text-slate-700 font-medium'
                                        }
                                    `}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const today = new Date();
                            const y = today.getFullYear();
                            const m = String(today.getMonth() + 1).padStart(2, '0');
                            const d = String(today.getDate()).padStart(2, '0');
                            onChange({ target: { value: `${y}-${m}-${d}` } });
                            setIsOpen(false);
                        }}
                        className="w-full mt-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        Aujourd'hui
                    </button>
                </div>
            )}
        </div>
    );
}
