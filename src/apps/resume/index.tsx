'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, Printer, ZoomIn, ZoomOut, ChevronDown, Share2 } from 'lucide-react'

// Resume Data
const RESUME_DATA = {
  name: "TRAE_DEVELOPER",
  title: "SENIOR_SOFTWARE_ENGINEER",
  contact: {
    email: "dev@trae.ai",
    location: "Cyberspace, Net",
    website: "trae.ai"
  },
  summary: "Highly decorated operative with extensive experience in full-stack development and interface design. Proven track record of delivering mission-critical systems under high pressure. Specialized in next-gen web technologies and immersive user experiences.",
  experience: [
    {
      role: "SENIOR_ENGINEER",
      company: "CYBER_CORP_LTD",
      period: "2022 - PRESENT",
      description: "Lead architect for distributed neural networks and core system infrastructure. Optimized rendering pipelines by 400%. Mentored junior operatives in secure coding practices."
    },
    {
      role: "INTERFACE_DESIGNER",
      company: "NEON_STUDIOS",
      period: "2020 - 2022",
      description: "Designed immersive holographic interfaces for consumer-grade terminals. Awarded 'Best UX' in Sector 7. Implemented novel gesture recognition systems."
    },
    {
      role: "FREELANCE_MERC",
      company: "GLOBAL_NET",
      period: "2018 - 2020",
      description: "Executed high-value contracts for various clients. Specializing in rapid prototyping and crisis management. Delivered 15+ successful projects."
    }
  ],
  skills: [
    "React / Next.js", "TypeScript", "Node.js", "WebGL / Three.js",
    "System Architecture", "UI/UX Design", "Cyber Security", "Cloud Infrastructure"
  ],
  education: [
    {
      degree: "MASTER_OF_COMPUTING",
      school: "VIRTUAL_UNIVERSITY",
      year: "2018"
    }
  ]
}

export default function ResumeApp() {
  const [zoom, setZoom] = useState(100)

  return (
    <div className="h-full w-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] pt-8">
      {/* Toolbar */}
      <div className="h-12 border-b border-[#333] bg-[#252526] flex items-center justify-between px-4 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <FileText size={16} className="text-[#3b82f6]" />
            resume.pdf
          </div>
          <div className="h-4 w-[1px] bg-[#333]" />
          <div className="text-xs text-[#888]">1 of 1</div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 hover:bg-[#333] rounded transition-colors">
            <ZoomOut size={16} />
          </button>
          <div className="w-12 text-center text-xs bg-[#1e1e1e] py-1 rounded border border-[#333]">{zoom}%</div>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 hover:bg-[#333] rounded transition-colors">
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-[#333] rounded transition-colors" title="Print">
            <Printer size={16} />
          </button>
          <button className="p-1.5 hover:bg-[#333] rounded transition-colors" title="Download">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Viewer Content */}
      <div className="flex-1 overflow-auto bg-[#1e1e1e] p-8 flex justify-center custom-scrollbar">
        <div 
          className="bg-white text-black shadow-2xl transition-transform duration-200 origin-top"
          style={{ 
            width: '210mm', 
            minHeight: '297mm', // A4
            transform: `scale(${zoom / 100})`,
            marginBottom: '2rem'
          }}
        >
          {/* Resume Content (A4 Page) */}
          <div className="p-12 flex flex-col h-full font-sans">
            {/* Header */}
            <header className="border-b-2 border-gray-900 pb-6 mb-8">
              <h1 className="text-4xl font-bold tracking-tight mb-2 uppercase">{RESUME_DATA.name}</h1>
              <h2 className="text-xl text-gray-600 tracking-wider mb-4">{RESUME_DATA.title}</h2>
              <div className="flex gap-4 text-sm text-gray-500 font-medium">
                <span>{RESUME_DATA.contact.email}</span>
                <span>•</span>
                <span>{RESUME_DATA.contact.location}</span>
                <span>•</span>
                <span>{RESUME_DATA.contact.website}</span>
              </div>
            </header>

            {/* Main Content */}
            <div className="flex gap-8">
              {/* Left Column (Main Info) */}
              <div className="flex-1 space-y-8">
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b border-gray-200 pb-2 mb-4">Profile</h3>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {RESUME_DATA.summary}
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b border-gray-200 pb-2 mb-4">Experience</h3>
                  <div className="space-y-6">
                    {RESUME_DATA.experience.map((job, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-gray-900">{job.role}</h4>
                          <span className="text-xs text-gray-500 font-medium">{job.period}</span>
                        </div>
                        <div className="text-sm text-blue-600 font-medium mb-2">{job.company}</div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {job.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column (Sidebar) */}
              <div className="w-1/3 space-y-8">
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b border-gray-200 pb-2 mb-4">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {RESUME_DATA.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b border-gray-200 pb-2 mb-4">Education</h3>
                  {RESUME_DATA.education.map((edu, i) => (
                    <div key={i}>
                       <h4 className="font-bold text-gray-900 text-sm">{edu.degree}</h4>
                       <div className="text-sm text-gray-600">{edu.school}</div>
                       <div className="text-xs text-gray-500 mt-1">{edu.year}</div>
                    </div>
                  ))}
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
