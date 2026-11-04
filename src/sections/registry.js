import IntroHero, { defaultData as introHeroData } from '../components/sections/IntroHero'
import PageHeader, { defaultData as pageHeaderData } from '../components/sections/PageHeader'
import TextBlock, { defaultData as textBlockData } from '../components/sections/TextBlock'
import CardsGrid, { defaultData as cardsGridData } from '../components/sections/CardsGrid'
import Steps, { defaultData as stepsData } from '../components/sections/Steps'
import Faq, { defaultData as faqData } from '../components/sections/Faq'
import CtaBand, { defaultData as ctaBandData } from '../components/sections/CtaBand'
import Updates, { defaultData as updatesData } from '../components/sections/Updates'
import ContactForm, { defaultData as contactFormData } from '../components/sections/ContactForm'
import OrgInfo, { defaultData as orgInfoData } from '../components/sections/OrgInfo'
import Form230Data, { defaultData as form230Data } from '../components/sections/Form230Data'
import HeroSection, { defaultData as heroData } from '../components/home/HeroSection'
import FeaturesSection, { defaultData as featuresData } from '../components/home/FeaturesSection'
import AboutSection, { defaultData as aboutData } from '../components/home/AboutSection'
import StatsSection, { defaultData as statsData } from '../components/home/StatsSection'
import CausesSection, { defaultData as causesData } from '../components/home/CausesSection'
import ImpactSection, { defaultData as impactData } from '../components/home/ImpactSection'
import EventsSection, { defaultData as eventsData } from '../components/home/EventsSection'
import TestimonialsSection, { defaultData as testimonialsData } from '../components/home/TestimonialsSection'
import DonateSection, { defaultData as donateData } from '../components/home/DonateSection'
import BlogSection, { defaultData as blogData } from '../components/home/BlogSection'
import NewsletterSection, { defaultData as newsletterData } from '../components/home/NewsletterSection'
import RichTextSection, { defaultData as richTextData } from '../components/home/RichTextSection'
import { defaultSite } from '../components/layout/Navbar'
import { defaultFooter } from '../components/layout/Footer'

export const sectionTypes = {
  introHero: { label: 'Prezentare principală', component: IntroHero, defaultData: introHeroData },
  pageHeader: { label: 'Antet de pagină', component: PageHeader, defaultData: pageHeaderData },
  textBlock: { label: 'Text și imagine', component: TextBlock, defaultData: textBlockData },
  cardsGrid: { label: 'Carduri', component: CardsGrid, defaultData: cardsGridData },
  steps: { label: 'Pași', component: Steps, defaultData: stepsData },
  faq: { label: 'Întrebări frecvente', component: Faq, defaultData: faqData },
  ctaBand: { label: 'Bandă cu îndemn', component: CtaBand, defaultData: ctaBandData },
  updates: { label: 'Actualizări', component: Updates, defaultData: updatesData },
  contactForm: { label: 'Formular de contact', component: ContactForm, defaultData: contactFormData },
  orgInfo: { label: 'Date de contact și identificare', component: OrgInfo, defaultData: orgInfoData },
  form230Data: { label: 'Date pentru Formularul 230', component: Form230Data, defaultData: form230Data },
  hero: { label: 'Hero', component: HeroSection, defaultData: heroData, legacy: true },
  features: { label: 'Features', component: FeaturesSection, defaultData: featuresData, legacy: true },
  about: { label: 'About', component: AboutSection, defaultData: aboutData, legacy: true },
  stats: { label: 'Stats', component: StatsSection, defaultData: statsData, legacy: true },
  causes: { label: 'Causes', component: CausesSection, defaultData: causesData, legacy: true },
  impact: { label: 'Impact', component: ImpactSection, defaultData: impactData, legacy: true },
  events: { label: 'Events', component: EventsSection, defaultData: eventsData, legacy: true },
  testimonials: { label: 'Testimonials', component: TestimonialsSection, defaultData: testimonialsData, legacy: true },
  donate: { label: 'Donate', component: DonateSection, defaultData: donateData, legacy: true },
  blog: { label: 'Blog', component: BlogSection, defaultData: blogData, legacy: true },
  newsletter: { label: 'Newsletter', component: NewsletterSection, defaultData: newsletterData, legacy: true },
  richText: { label: 'Text + image', component: RichTextSection, defaultData: richTextData, legacy: true },
}

const createId = (type) =>
  `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const needsData = (value) =>
  value === undefined || value === null || !isObject(value) || Object.keys(value).length === 0

export function createSection(type) {
  const entry = sectionTypes[type]

  return {
    id: createId(type),
    type,
    hidden: false,
    data: entry ? structuredClone(entry.defaultData) : {},
  }
}

export function normalizeContent(content) {
  const base = isObject(content) ? content : {}
  const pages = Array.isArray(base.pages) ? base.pages : []
  const site = isObject(base.site) ? base.site : {}

  return {
    ...base,
    site: {
      ...site,
      nav:
        Array.isArray(site.nav) && site.nav.length > 0
          ? site.nav
          : structuredClone(defaultSite.nav),
      header: needsData(site.header) ? structuredClone(defaultSite.header) : site.header,
      footer: needsData(site.footer) ? structuredClone(defaultFooter) : site.footer,
    },
    pages: pages.map((page) => {
      if (!isObject(page)) return page

      const sections = Array.isArray(page.sections) ? page.sections : []

      return {
        ...page,
        sections: sections.map((section) => {
          if (!isObject(section)) return section

          const entry = sectionTypes[section.type]
          if (!entry) return section
          if (needsData(section.data)) return { ...section, data: structuredClone(entry.defaultData) }
          if (!isObject(entry.defaultData)) return section

          // completează doar cheile de top lipsă, fără să suprascrie datele existente
          const data = { ...section.data }

          Object.keys(entry.defaultData).forEach((key) => {
            if (key in data) return
            data[key] = structuredClone(entry.defaultData[key])
          })

          return { ...section, data }
        }),
      }
    }),
  }
}
