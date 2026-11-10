import React from 'react'
import ScrollReveal from '../components/ScrollReveal'
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
      <ScrollReveal initialVisible>
        <Hero />
      </ScrollReveal>
      <ScrollReveal>
        <HeroPreviewWidget />
      </ScrollReveal>
      <ScrollReveal>
        <ProblemVsSolution />
      </ScrollReveal>
      <ScrollReveal>
        <CoreFeatures />
      </ScrollReveal>
      <ScrollReveal>
        <InteractiveSimulator />
      </ScrollReveal>
      <ScrollReveal>
        <TechArchitecture />
      </ScrollReveal>
      <ScrollReveal>
        <RubricAlignment />
      </ScrollReveal>
      <ScrollReveal>
        <FaqSection />
      </ScrollReveal>
    </>
  )
}
