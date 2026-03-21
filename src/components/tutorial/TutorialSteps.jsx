import React from 'react';

export const tutorialSteps = [
  {
    selector: '[data-tour="app-logo"]',
    content: (
      <div className="p-2">
        <h3 className="text-lg font-bold text-indigo-600 mb-2">Bienvenue sur Fiskeo ! 🚀</h3>
        <p className="text-slate-600">On vous montre comment gérer vos finances en 2 minutes chrono.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="nav-settings"]',
    path: '/?tab=config',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Configuration</h3>
        <p className="text-slate-600 text-sm">Commençons par configurer votre environnement de travail.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="add-platform-btn"]',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Plateformes</h3>
        <p className="text-slate-600 text-sm">Ajoutez ici les plateformes par lesquelles vous passez (Shopify, Amazon, Freelance, etc.).</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="add-category-btn"]',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Catégories</h3>
        <p className="text-slate-600 text-sm">Créez vos propres catégories de dépenses pour mieux les suivre.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="nav-income"]',
    path: '/?tab=income',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Revenus</h3>
        <p className="text-slate-600 text-sm">C'est ici que vous enregistrez tout ce que vous gagnez.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="income-submit"]',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Ajouter un Revenu</h3>
        <p className="text-slate-600 text-sm">Enregistrez vos ventes ici. Fiskeo calcule automatiquement votre <b>revenu net</b> après déduction des commissions de plateforme et des cotisations URSSAF.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="income-columns-btn"]',
    path: '/?tab=income',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Personnaliser le tableau</h3>
        <p className="text-slate-600 text-sm">Cliquez ici pour choisir les colonnes que vous voulez afficher ou masquer dans votre tableau de revenus.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="nav-expense"]',
    path: '/?tab=expense',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Dépenses</h3>
        <p className="text-slate-600 text-sm">Ici, on note toutes vos charges professionnelles.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="expense-submit"]',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Ajouter une Dépense</h3>
        <p className="text-slate-600 text-sm">Pareil que pour les revenus : saisie simplifiée, modifiable et supprimable à tout moment.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="nav-dashboard"]',
    path: '/?tab=stats',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Tableau de bord</h3>
        <p className="text-slate-600 text-sm">Votre centre de pilotage pour voir l'évolution de votre activité.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="stats-global"]',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Bilan Global</h3>
        <p className="text-slate-600 text-sm">Retrouvez vos recettes nettes, dépenses et votre bénéfice réel ici.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="stats-premium"]',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Statistiques Avancées</h3>
        <p className="text-slate-600 text-sm">Découvrez le détail par plateforme et d'autres analyses poussées (inclus en Premium).</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="nav-goals"]',
    path: '/?tab=goals',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Objectifs</h3>
        <p className="text-slate-600 text-sm">Fixez-vous des cibles de CA et des limites de dépenses pour rester sur la bonne voie.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="nav-recap"]',
    path: '/?tab=recap',
    content: (
      <div className="p-2">
        <h3 className="text-md font-bold text-indigo-600 mb-1">Bilan Mensuel</h3>
        <p className="text-slate-600 text-sm">Chaque mois, Fiskeo génère automatiquement vos archives et bilans d'activité.</p>
      </div>
    ),
  },
  {
    selector: '[data-tour="nav-help"]',
    content: ({ setIsOpen, setCurrentStep }) => (
      <div className="p-2 text-center">
        <h3 className="text-lg font-bold text-indigo-600 mb-2">C'est tout bon ! 🎉</h3>
        <p className="text-slate-600 mb-4">Vous pouvez rejouer ce tutoriel à tout moment en cliquant ici.</p>
        <button
          onClick={() => {
            setIsOpen(false);
            setCurrentStep(0);
          }}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
        >
          Terminer le tutoriel
        </button>
      </div>
    ),
  },
];
