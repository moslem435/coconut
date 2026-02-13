// English Data Exports
export { PROJECTS_EN } from './data/en/projects'
export { SKILLS_EN } from './data/en/skills'
export { EXPERIENCE_EN } from './data/en/experience'
export { ARSENAL_EN } from './data/en/arsenal'
export { SERVICES_EN } from './data/en/services'
export { LOGS_EN } from './data/en/logs'
export { WORK_ITEMS_EN } from './data/en/work'
export { LAB_ITEMS_EN } from './data/en/lab'

// Chinese Data Exports
export { PROJECTS_ZH } from './data/zh/projects'
export { SKILLS_ZH } from './data/zh/skills'
export { EXPERIENCE_ZH } from './data/zh/experience'
export { ARSENAL_ZH } from './data/zh/arsenal'
export { SERVICES_ZH } from './data/zh/services'
export { LOGS_ZH } from './data/zh/logs'
export { WORK_ITEMS_ZH } from './data/zh/work'

// Constants
export { SOCIAL_LINKS } from './constants'

// Types
export type { Project, Skill, Experience, SocialLink, WorkItem, LogItem, LabItem, ArsenalItem } from './types'

// Import for DATA object construction
import { PROJECTS_EN } from './data/en/projects'
import { SKILLS_EN } from './data/en/skills'
import { EXPERIENCE_EN } from './data/en/experience'
import { ARSENAL_EN } from './data/en/arsenal'
import { SERVICES_EN } from './data/en/services'
import { LOGS_EN } from './data/en/logs'
import { WORK_ITEMS_EN } from './data/en/work'
import { LAB_ITEMS_EN } from './data/en/lab'

import { PROJECTS_ZH } from './data/zh/projects'
import { SKILLS_ZH } from './data/zh/skills'
import { EXPERIENCE_ZH } from './data/zh/experience'
import { ARSENAL_ZH } from './data/zh/arsenal'
import { SERVICES_ZH } from './data/zh/services'
import { LOGS_ZH } from './data/zh/logs'
import { WORK_ITEMS_ZH } from './data/zh/work'

// Data Dictionary
export const DATA = {
    en: {
        PROJECTS: PROJECTS_EN,
        SKILLS: SKILLS_EN,
        EXPERIENCE: EXPERIENCE_EN,
        ARSENAL: ARSENAL_EN,
        SERVICES: SERVICES_EN,
        LOGS: LOGS_EN,
        WORK_ITEMS: WORK_ITEMS_EN,
        LAB_ITEMS: LAB_ITEMS_EN
    },
    zh: {
        PROJECTS: PROJECTS_ZH,
        SKILLS: SKILLS_ZH,
        EXPERIENCE: EXPERIENCE_ZH,
        ARSENAL: ARSENAL_ZH,
        SERVICES: SERVICES_ZH,
        LOGS: LOGS_ZH,
        WORK_ITEMS: WORK_ITEMS_ZH,
        LAB_ITEMS: LAB_ITEMS_EN // Reuse EN for Lab items
    }
}

// Default exports for backward compatibility
export const PROJECTS = PROJECTS_EN
export const SKILLS = SKILLS_EN
export const EXPERIENCE = EXPERIENCE_EN
export const ARSENAL = ARSENAL_EN
export const SERVICES = SERVICES_EN
export const LOGS = LOGS_EN
export const WORK_ITEMS = WORK_ITEMS_EN
export const LAB_ITEMS = LAB_ITEMS_EN
