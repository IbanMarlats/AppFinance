import React from 'react';
import { Navbar, Hero, DualPromise, Pricing, Footer } from './LandingSections';

const LandingPage = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar onLogin={onLogin} onRegister={onRegister} />
      <main>
        <Hero onCtaClick={onRegister} />
        <DualPromise />
        <Pricing onCtaClick={onRegister} />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
