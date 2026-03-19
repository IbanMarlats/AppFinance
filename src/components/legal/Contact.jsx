import React from 'react';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Contact = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 text-center">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-8 group mx-auto"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour à l'accueil
        </button>

        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-6">
          <Mail className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-4">Contactez-nous</h1>
        <p className="text-slate-600 mb-10 leading-relaxed">
          Une question ? Un bug à signaler ? Une suggestion ? <br />
          Je vous réponds personnellement dans les meilleurs délais.
        </p>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8 group hover:border-indigo-200 transition-colors">
            <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Email Direct</div>
            <a 
                href="mailto:iban.marlats@gmail.com" 
                className="text-xl md:text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors break-all"
            >
                iban.marlats@gmail.com
            </a>
        </div>

        <a 
          href="mailto:iban.marlats@gmail.com"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 active:translate-y-0 w-full justify-center"
        >
          <Send className="w-5 h-5" />
          Envoyer un message
        </a>

        <p className="mt-8 text-xs text-slate-400">
            Fiskeo est un outil indépendant. Merci de votre soutien !
        </p>
      </div>
    </div>
  );
};

export default Contact;
