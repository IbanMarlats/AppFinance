import { useState, useRef, useEffect } from 'react';
import { Bold, Italic, List, Heading1, Heading2, Link, Undo, Redo, RemoveFormatting, Image } from 'lucide-react';

export default function RichTextEditor({ value, onChange, placeholder }) {
    const editorRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    // Initial value setup
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            // Only update if significantly different to avoid cursor jumping
            // Simple check: if empty and value provided
            if (editorRef.current.innerHTML === '<br>' && !value) return;
            if (value === '' && editorRef.current.innerHTML === '<br>') return;

            // This is tricky with contentEditable. 
            // Ideally we only set it once or when external value changes drastically.
            // For this simple usage, we might just set it if empty.
            if (!editorRef.current.innerHTML || (value && editorRef.current.innerHTML !== value)) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const fileInputRef = useRef(null);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            // NOTE: We assume axios is available or we use fetch. 
            // AdminDashboard uses axios, but this is a pure component.
            // Let's use fetch for zero-dep inside component or import axios if we are sure.
            // Let's use fetch to be safe and portable.
            // Actually, we need authentication token... 
            // The simplest is to pass an `onImageUpload` prop, but for speed I'll try to fetch with localStorage token or just use fetch credentials: include?
            // Wait, standard auth is via header. 
            // Let's try to assume simple usage or use a passed-in upload function?
            // For now, I'll hardcode the fetch using localStorage token which fits the app pattern seen elsewhere (AuthContext often stores it).
            // Actually, best practice: This component shouldn't know about auth.
            // PROPOSAL: Simple fetch with token from localStorage 'token' (common).
            // We use httpOnly cookies for auth, so we don't need to manually attach a token.
            // We just need to ensure credentials (cookies) are sent with the request.
            const res = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            execCommand('insertImage', data.url);

        } catch (err) {
            console.error('Upload Error:', err);
            alert('Erreur lors de l\'upload de l\'image');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const ToolbarButton = ({ icon: Icon, command, arg, title, active }) => (
        <button
            type="button"
            onClick={(e) => { e.preventDefault(); execCommand(command, arg); }}
            className={`p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors ${active ? 'bg-slate-200 text-slate-900' : ''}`}
            title={title}
        >
            <Icon size={16} />
        </button>
    );

    return (
        <div className={`border rounded-lg overflow-hidden transition-colors ${isFocused ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-300'}`}>
            <div className="bg-slate-50 border-b border-slate-200 p-1 flex flex-wrap gap-1">
                <ToolbarButton icon={Bold} command="bold" title="Gras" />
                <ToolbarButton icon={Italic} command="italic" title="Italique" />
                <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
                <ToolbarButton icon={Heading1} command="formatBlock" arg="H2" title="Grand Titre" />
                <ToolbarButton icon={Heading2} command="formatBlock" arg="H3" title="Petit Titre" />
                <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
                <ToolbarButton icon={List} command="insertUnorderedList" title="Liste à puces" />
                <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        const url = prompt('URL:');
                        if (url) execCommand('createLink', url);
                    }}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Lien"
                >
                    <Link size={16} />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                    }}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Insérer une image"
                >
                    <Image size={16} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />
                <ToolbarButton icon={RemoveFormatting} command="removeFormat" title="Effacer le formatage" />
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="p-4 min-h-[200px] outline-none prose prose-indigo max-w-none text-sm text-slate-800"
                style={{ whiteSpace: 'pre-wrap' }}
            />
            {/* Placeholder simulation if needed, or just CSS empty pseudo-class */}
            {!value && (
                <div className="absolute top-[52px] left-4 text-slate-400 pointer-events-none text-sm">
                    {placeholder || 'Commencez à écrire...'}
                </div>
            )}
        </div>
    );
}
