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

export const sectionTypes = {
  hero: { label: 'Hero', component: HeroSection, defaultData: heroData },
  features: { label: 'Features', component: FeaturesSection, defaultData: featuresData },
  about: { label: 'About', component: AboutSection, defaultData: aboutData },
  stats: { label: 'Stats', component: StatsSection, defaultData: statsData },
  causes: { label: 'Causes', component: CausesSection, defaultData: causesData },
  impact: { label: 'Impact', component: ImpactSection, defaultData: impactData },
  events: { label: 'Events', component: EventsSection, defaultData: eventsData },
  testimonials: { label: 'Testimonials', component: TestimonialsSection, defaultData: testimonialsData },
  donate: { label: 'Donate', component: DonateSection, defaultData: donateData },
  blog: { label: 'Blog', component: BlogSection, defaultData: blogData },
  newsletter: { label: 'Newsletter', component: NewsletterSection, defaultData: newsletterData },
  richText: { label: 'Text + image', component: RichTextSection, defaultData: richTextData },
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

  return {
    ...base,
    site: isObject(base.site) ? base.site : {},
    pages: pages.map((page) => {
      if (!isObject(page)) return page

      const sections = Array.isArray(page.sections) ? page.sections : []

      return {
        ...page,
        sections: sections.map((section) => {
          if (!isObject(section)) return section

          const entry = sectionTypes[section.type]
          if (!entry) return section
          if (!needsData(section.data)) return section

          return { ...section, data: structuredClone(entry.defaultData) }
        }),
      }
    }),
  }
}
