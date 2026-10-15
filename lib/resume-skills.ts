const SKILL_ALIASES = [
  'Python',
  'Java',
  'C++',
  'JavaScript',
  'TypeScript',
  'SQL',
  'R',
  'HTML',
  'CSS',
  'React',
  'Angular',
  'Vue',
  'Node.js',
  'Express',
  'Django',
  'Spring Boot',
  'MongoDB',
  'Flask',
  'FastAPI',
  'REST APIs',
  'GraphQL',
  'JWT',
  'OAuth',
  'Git/GitHub',
  'Git',
  'Power BI',
  'Tableau',
  'Excel',
  'Docker',
  'Kubernetes',
  'AWS',
  'Linux',
  'Networking',
  'Pandas',
  'NumPy',
  'Matplotlib',
  'Seaborn',
  'TensorFlow',
  'PyTorch',
  'Machine Learning',
  'Scikit-learn',
  'Feature Engineering',
  'Model Evaluation',
  'Deep Learning',
  'NLP',
  'Computer Vision',
  'Model Deployment',
  'APIs',
  'Generative AI',
  'LLMs',
  'MLOps',
  'Statistics',
  'Probability',
  'Linear Algebra',
  'Calculus',
  'Data Analysis',
  'Data Cleaning',
  'Data Visualisation',
  'Data Structures and Algorithms',
  'Databases',
  'ORMs',
  'Debugging',
  'Automation Scripting',
  'Bash',
  'Compute',
  'Storage',
  'IAM',
  'Azure',
  'GCP',
  'Terraform',
  'CI/CD',
  'Security Fundamentals',
  'Wireshark',
  'Nmap',
  'Burp Suite',
  'Incident Response',
  'SIEM',
  'Data Modelling',
  'Reporting',
  'Data Storytelling',
  'OOP',
  'Testing',
  'Deployment',
  'Cryptography',
  'Web Security',
  'Ethical Hacking',
]

function findSkills(text: string) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ')
  return SKILL_ALIASES.filter((skill) => {
    const pattern = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
    return new RegExp(`(^|[^a-z0-9+#])${pattern}([^a-z0-9+#]|$)`, 'i').test(normalized)
  })
}

async function extractPdfText(file: File) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
  const document = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise
  const pages = await Promise.all(
    Array.from({ length: document.numPages }, async (_, index) => {
      const page = await document.getPage(index + 1)
      const content = await page.getTextContent()
      return content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    }),
  )
  return pages.join(' ')
}

async function extractDocxText(file: File) {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

export async function extractResumeText(file: File) {
  return file.type === 'application/pdf' ? extractPdfText(file) : extractDocxText(file)
}

export function extractSkillsFromText(text: string) {
  return findSkills(text)
}

const resumeSectionPatterns = [
  /\b(?:professional\s+)?summary\b/i,
  /\bobjective\b/i,
  /\beducation\b/i,
  /\b(?:technical\s+)?skills\b/i,
  /\bprojects?\b/i,
  /\b(?:work\s+)?experience\b/i,
  /\binternships?\b/i,
  /\bcertifications?\b/i,
]

const nonResumePatterns = [
  /\btable\s+of\s+contents\b/i,
  /\brequirements?\s+with\s+screenshots?\b/i,
  /\bfunctional\s+requirements?\b/i,
  /\bsoftware\s+requirements?\s+specification\b/i,
  /\bproject\s+requirements?\b/i,
]

export function classifyResumeText(text: string): { isResume: boolean; reason?: string } {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length < 120) {
    return { isResume: false, reason: 'The file does not contain enough readable text to identify it as a resume.' }
  }

  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(normalized)
  const hasPhone = /(?:\+?\d[\d\s().-]{8,}\d)/.test(normalized)
  const sectionCount = resumeSectionPatterns.filter((pattern) => pattern.test(normalized)).length
  const looksLikeRequirementsDocument = nonResumePatterns.some((pattern) => pattern.test(normalized))

  if (looksLikeRequirementsDocument && (!hasEmail || sectionCount < 3)) {
    return { isResume: false, reason: 'This appears to be a requirements or project document, not a resume.' }
  }
  if (sectionCount < 2 || (!hasEmail && !hasPhone)) {
    return { isResume: false, reason: 'This file does not look like a resume. Include contact details and sections such as Education, Skills, Projects, or Experience.' }
  }
  return { isResume: true }
}

export async function extractResumeSkills(file: File) {
  return extractSkillsFromText(await extractResumeText(file))
}
