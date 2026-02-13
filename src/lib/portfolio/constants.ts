import { Github, Twitter, Mail } from 'lucide-react'
import { SocialLink } from './types'

export const SOCIAL_LINKS: SocialLink[] = [
    { icon: Github, label: "GH_REPO", href: "https://github.com" },
    { icon: Twitter, label: "TW_FEED", href: "https://twitter.com" },
    { icon: Mail, label: "MAIL_Relay", href: "mailto:hello@example.com" }
]
