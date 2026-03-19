import React from 'react';
import { ArrowLeft, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MentionsLegales = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour à l'accueil
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Mentions Légales</h1>
        </div>

        <div className="space-y-8 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Édition du site</h2>
            <p>
              En vertu de l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique, il est précisé aux utilisateurs du site internet <strong>Fiskeo</strong> l'identité des différents intervenants dans le cadre de sa réalisation et de son suivi :
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-sm">
              <li><strong>Propriétaire du site :</strong> Iban Marlats - Contact : iban.marlats@gmail.com</li>
              <li><strong>Directeur de la publication :</strong> Iban Marlats</li>
              <li><strong>Hébergement :</strong> Vercel (Frontend) & Alwaysdata (Backend)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. Propriété intellectuelle</h2>
            <p>
              Iban Marlats est propriétaire des droits de propriété intellectuelle ou détient les droits d’usage sur tous les éléments accessibles sur le site internet, notamment les textes, images, graphismes, logos, vidéos, architecture, icônes et sons.
            </p>
            <p className="mt-4">
              Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de Iban Marlats.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. Limitations de responsabilité</h2>
            <p>
              Iban Marlats ne pourra être tenu pour responsable des dommages directs et indirects causés au matériel de l’utilisateur, lors de l’accès au site Fiskeo.
            </p>
            <p className="mt-4">
              Fiskeo décline toute responsabilité quant à l’utilisation qui pourrait être faite des informations et contenus présents sur son site. L'outil est une aide à la gestion et ne remplace en aucun cas les conseils d'un expert-comptable ou les obligations légales de déclaration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. Droit applicable et attribution de juridiction</h2>
            <p>
              Tout litige en relation avec l’utilisation du site Fiskeo est soumis au droit français. En dehors des cas où la loi ne le permet pas, il est fait attribution exclusive de juridiction aux tribunaux compétents.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MentionsLegales;
