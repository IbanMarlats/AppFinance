import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
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
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Politique de Confidentialité</h1>
        </div>

        <div className="space-y-8 text-slate-600 leading-relaxed text-sm">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 text-base">1. Collecte des données</h2>
            <p>
              Nous collectons les données suivantes lors de votre inscription et utilisation de Fiskeo :
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>Adresse email (pour l'authentification et les notifications)</li>
              <li>Données de revenus et dépenses saisies par vos soins</li>
              <li>Paramètres de micro-entreprise (catégorie d'activité, seuils)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 text-base">2. Utilisation des données</h2>
            <p>
              Vos données sont utilisées exclusivement pour :
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>Fournir les services de calcul de charges et de marges</li>
              <li>Gérer votre abonnement via Stripe</li>
              <li>Améliorer l'expérience utilisateur</li>
            </ul>
            <p className="mt-4 font-bold text-indigo-600 italic">
              Nous ne vendons ni ne partageons vos données personnelles à des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 text-base">3. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité rigoureuses pour protéger vos informations. Vos données sont chiffrées au repos et en transit. Nous utilisons les services de Google Cloud (Firebase) pour l'hébergement et la base de données.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 text-base">4. Vos droits (RGPD)</h2>
            <p>
              Conformément à la réglementation RGPD, vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression de vos données personnelles. Vous pouvez exercer ces droits depuis votre interface utilisateur ou en nous contactant à iban.marlats@gmail.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 text-base">5. Cookies</h2>
            <p>
              Nous utilisons des cookies essentiels au fonctionnement de l'application (sessions, authentification) et des outils d'analyse anonymisés pour l'optimisation du site.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
