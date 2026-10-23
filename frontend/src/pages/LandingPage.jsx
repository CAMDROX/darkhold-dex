import React from 'react'
import Hero from '../components/Hero'
import HeroPreviewWidget from '../components/HeroPreviewWidget'
import ProblemVsSolution from '../components/ProblemVsSolution'
import CoreFeatures from '../components/CoreFeatures'
import InteractiveSimulator from '../components/InteractiveSimulator'
import TechArchitecture from '../components/TechArchitecture'
import RubricAlignment from '../components/RubricAlignment'
import FaqSection from '../components/FaqSection'

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HeroPreviewWidget />
      <ProblemVsSolution />
      <CoreFeatures />
      <InteractiveSimulator />
      <TechArchitecture />
      <RubricAlignment />
      <FaqSection />
    </>
  )
}
