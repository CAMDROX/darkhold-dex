import React from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import HeroPreviewWidget from './components/HeroPreviewWidget'
import ProblemVsSolution from './components/ProblemVsSolution'
import CoreFeatures from './components/CoreFeatures'
import InteractiveSimulator from './components/InteractiveSimulator'
import TechArchitecture from './components/TechArchitecture'
import RubricAlignment from './components/RubricAlignment'
import FaqSection from './components/FaqSection'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-[#080706] text-[#E5E0D8] selection:bg-[#D4AF37]/30 selection:text-white relative">
      {/* Background Arcane Grid Texture */}
      <div className="fixed inset-0 pointer-events-none arcane-grid-bg opacity-40 z-0" />
      
      {/* Main Content Layers */}
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <HeroPreviewWidget />
          <ProblemVsSolution />
          <CoreFeatures />
          <InteractiveSimulator />
          <TechArchitecture />
          <RubricAlignment />
          <FaqSection />
        </main>
        <Footer />
      </div>
    </div>
  )
}
