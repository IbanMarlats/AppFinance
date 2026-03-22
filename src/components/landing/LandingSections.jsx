import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  TrendingUp, 
  BarChart3, 
  Package, 
  ArrowRight, 
  Zap, 
  Layers, 
  Target,
  Lock,
  Heart
} from 'lucide-react';
import LogoFull from '../../assets/logo/logofiskeo.png';
import LogoIcon from '../../assets/logo/iconefiskeo.png';

export const Navbar = ({ onLogin, onRegister }) => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16 gap-2">
        <div className="flex items-center space-x-2">
          <img src={LogoFull} alt="Fiskeo" className="h-10 w-auto hidden sm:block" />
          <img src={LogoIcon} alt="Fiskeo" className="h-10 w-auto sm:hidden" />
        </div>
        <div className="flex items-center space-x-1 sm:space-x-4 shrink-0">
          <button 
            onClick={onLogin}
            className="text-slate-600 hover:text-indigo-600 font-medium transition-colors px-1 sm:px-3 py-2 text-[13px] sm:text-base"
          >
            Connexion
          </button>
          <button 
            onClick={onRegister}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-[13px] sm:text-base whitespace-nowrap"
          >
            Commencer
          </button>
        </div>
      </div>
    </div>
  </nav>
);

export const Hero = ({ onCtaClick }) => (
  <section className="relative pt-20 pb-20 lg:pt-28 lg:pb-24 overflow-hidden">
    {/* Decorative Background */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-100/50 rounded-full blur-3xl opacity-50"></div>
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-[1.2]">
          Arrêtez de deviner, commencez à <span className="text-indigo-600">piloter</span> votre micro-entreprise.
        </h1>
        <p className="max-w-3xl mx-auto text-lg text-slate-600 mb-8 leading-relaxed">
          L'outil de gestion qui calcule vos marges réelles, anticipe vos charges URSSAF et surveille vos seuils de TVA. Gérez vos revenus, dépenses, objectifs et récapitulatifs mensuels avec des statistiques détaillées. Conçu pour les freelances et les e-commerçants.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <button 
            onClick={onCtaClick}
            className="group w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
            Commencer - 14 jours gratuits
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="text-slate-500 text-sm font-medium flex items-center gap-2 group cursor-help" title="Vos données sont chiffrées et sécurisées. Une version gratuite est disponible après l'essai.">
            <Lock className="w-4 h-4 text-indigo-500" />
            Sécurisé & Version gratuite disponible.
            </div>
        </div>
        
        {/* Build in Public Section */}
        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-sm italic">
            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
            <span>Un outil créé par un indépendant, pour les indépendants. Suivez l'évolution en toute transparence.</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Image Placeholder */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl shadow-2xl border-4 border-slate-100 p-4 aspect-[4/3] flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl m-4">
              <div className="text-center">
                 <div className="w-16 h-16 bg-slate-200 rounded-2xl mb-4 mx-auto flex items-center justify-center">
                    <Layers className="w-8 h-8 text-slate-400" />
                 </div>
                 <p className="text-slate-400 font-medium">Capture d'écran de l'application</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Why Us content */}
        <div className="lg:col-span-5 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Pourquoi choisir Fiskeo ?</h2>
            <p className="text-slate-600 italic text-sm">Transparence totale, simplicité radicale.</p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 group">
                <div className="shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <ShieldCheck className="w-6 h-6 text-indigo-600 group-hover:text-inherit" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Zéro stress administratif</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Ne calculez plus vos cotisations à la main, l'outil le fait en temps réel à chaque euro encaissé.</p>
                </div>
            </div>

            <div className="flex gap-4 group">
                <div className="shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <BarChart3 className="w-6 h-6 text-indigo-600 group-hover:text-inherit" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Visibilité Totale</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">"Chiffre d'Affaires" n'est pas "Bénéfice". Nous vous montrons votre vrai salaire net, après toutes les taxes.</p>
                </div>
            </div>

            <div className="flex gap-4 group">
                <div className="shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <Target className="w-6 h-6 text-indigo-600 group-hover:text-inherit" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Garantie Sans Risque</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Données chiffrées, pas de stockage de carte bancaire à l'inscription, et résiliable en un seul clic.</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const DualPromise = () => (
  <section id="features" className="py-20 bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Freelance Side */}
        <div className="group bg-white p-8 rounded-3xl border border-blue-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <h3 className="text-blue-600 font-bold text-sm mb-2 uppercase tracking-wider">Freelance</h3>
          <h4 className="text-xl font-bold text-slate-900 mb-6">"Maîtrisez votre temps et vos taxes."</h4>
          
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 text-sm">Suivi du TJM net:</span>
                <p className="text-slate-600 text-sm">Voyez ce qu'il vous reste vraiment après charges et frais.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 text-sm">Alerte Seuils:</span>
                <p className="text-slate-600 text-sm">Une barre de progression visuelle pour ne jamais être surpris par la TVA.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 text-sm">Prévision URSSAF:</span>
                <p className="text-slate-600 text-sm">On vous dit exactement quel montant mettre de côté ce mois-ci.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* E-commerce Side */}
        <div className="group bg-white p-8 rounded-3xl border border-orange-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <h3 className="text-orange-600 font-bold text-sm mb-2 uppercase tracking-wider">E-commerce</h3>
          <h4 className="text-xl font-bold text-slate-900 mb-6">"Rentabilité par plateforme."</h4>
          
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 text-sm">Multi-plateformes:</span>
                <p className="text-slate-600 text-sm">Comparez vos marges réelles sur <span className="font-medium text-slate-900">Shopify, Amazon, Etsy, Vinted Pro</span> ou <span className="font-medium text-slate-900">Stripe</span>.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 text-sm">Calcul NET auto:</span>
                <p className="text-slate-600 text-sm">Déduction automatique des commissions, frais de port et coûts d'achat (COGS).</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 text-sm">Gestion des stocks:</span>
                <p className="text-slate-600 text-sm">Vision comptable juste de vos stocks pour anticiper vos rachats.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export const Pricing = ({ onCtaClick }) => {
  return (
    <section id="pricing" className="py-24 bg-slate-900 text-white overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 blur-3xl opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight text-white">
            Une tarification simple, <br className="hidden md:block" />
            <span className="text-indigo-400">sans compromis.</span>
          </h2>
          <p className="text-slate-400 text-lg">
            Payez ce qui est juste pour votre activité. 14 jours d'essai offerts sur tous les plans.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Monthly Plan */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl flex flex-col hover:bg-white/10 transition-all duration-300">
            <div className="mb-8">
                <h3 className="text-indigo-400 font-bold text-lg mb-4">Plan Mensuel</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-white">8.90€</span>
                  <span className="text-slate-400 text-sm">/ mois TTC</span>
                </div>
                <p className="mt-3 text-slate-500 text-sm">Sans engagement, résiliable à tout moment.</p>
            </div>
            
            <ul className="text-left space-y-4 mb-10 grow">
              {[
                "Pilotage complet micro-entreprise",
                "Calcul des charges URSSAF auto",
                "Suivi des marges nettes e-commerce",
                "Alertes seuils de TVA en temps réel",
                "Récapitulatif mensuel automatisé"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                  <span className="text-slate-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={onCtaClick}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98]"
            >
              Choisir Mensuel
            </button>
          </div>

          {/* Annual Plan */}
          <div className="bg-indigo-600/10 backdrop-blur-xl border-2 border-indigo-500 p-8 rounded-3xl flex flex-col relative shadow-2xl shadow-indigo-500/10 scale-105 z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-400 to-orange-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                Économie de 30%
            </div>
            <div className="mb-8">
                <h3 className="text-indigo-300 font-bold text-lg mb-4">Plan Annuel (Recommandé)</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-white">5.90€</span>
                  <span className="text-slate-400 text-sm">/ mois TTC</span>
                </div>
                <p className="mt-3 text-indigo-300/60 text-sm font-medium">Facturé 70.80€ une fois par an.</p>
            </div>
            
            <ul className="text-left space-y-4 mb-10 grow">
              {[
                "Tout ce qui est inclus dans le mensuel",
                "Support prioritaire 7j/7",
                "Accès en avant-première aux nouveautés",
                "Bilan annuel complet",
                "Conseils d'optimisation fiscale"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span className="text-slate-200 text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={onCtaClick}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-900/40 active:scale-[0.98]"
            >
              Choisir Annuel
            </button>
            <div className="mt-4 text-[10px] text-center text-indigo-300/50 flex items-center justify-center gap-2">
               <ShieldCheck className="w-3 h-3" />
               14 jours d'essai gratuits inclus
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const Footer = () => (
  <footer className="py-12 bg-white border-t border-slate-100 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
        <div className="flex items-center space-x-2">
          <img src={LogoIcon} alt="Fiskeo" className="h-8 w-auto" />
          <span className="text-xl font-bold text-slate-900 tracking-tight">Fiskeo</span>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-500">
          <Link to="/mentions-legales" className="hover:text-indigo-600 transition-colors">Mentions Légales</Link>
          <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Politique de confidentialité</Link>
          <Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
        </div>
      </div>

      <div className="border-t border-slate-50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-xs text-slate-400 flex items-center gap-2">
           <Heart className="w-3 h-3 text-red-300" />
           <span>Un outil créé par un indépendant, pour les indépendants. Build with passion in 2026.</span>
        </div>
        <div className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Fiskeo. Tous droits réservés.
        </div>
      </div>
    </div>
  </footer>
);
