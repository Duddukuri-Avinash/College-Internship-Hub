/* =====================================================================
   resume-skills.ts
   Reads a resume (PDF or DOCX) in the browser, checks that it looks like a
   resume, finds skills, and compares them with a target internship role.
   Guidance only. It never promises selection.

   Keeps the old exports so existing code still works:
   extractResumeText, extractSkillsFromText, extractResumeSkills, classifyResumeText
   ===================================================================== */

/* ------------------------------ 1. Skills ------------------------------ */

type Entry = string | string[] // ['Name', 'alias1', 'alias2']

export const DICTIONARY: Record<string, Entry[]> = {
  Languages: ['Python', 'Java', 'C', ['C++', 'cpp'], ['C#', 'csharp'], 'Go', 'Rust', 'Kotlin', 'Swift', 'PHP', 'Ruby', 'Dart', 'Scala', ['JavaScript', 'js', 'ecmascript'], 'TypeScript', 'R', ['SQL', 't-sql', 'tsql'], ['Bash', 'shell scripting']],
  Web: [['HTML', 'html5'], ['CSS', 'css3'], ['Tailwind CSS', 'tailwind'], 'Bootstrap', ['React', 'reactjs', 'react.js'], ['Next.js', 'nextjs'], 'Angular', ['Vue.js', 'vuejs', 'vue'], 'Redux', ['Node.js', 'nodejs', 'node js'], ['Express.js', 'expressjs'], ['Spring Boot', 'springboot'], 'Django', 'Flask', 'FastAPI', ['ASP.NET', '.net core'], 'Laravel', 'GraphQL', ['REST APIs', 'rest api', 'restful'], 'Microservices', 'WebSockets', 'JWT', 'OAuth'],
  Mobile: ['Android', 'iOS', 'Flutter', ['React Native', 'reactnative'], 'Firebase'],
  Databases: ['MySQL', ['PostgreSQL', 'postgres'], ['SQL Server', 'mssql'], 'Oracle', 'SQLite', ['MongoDB', 'mongo'], 'Redis', 'Cassandra', 'DynamoDB', 'Elasticsearch', 'Supabase'],
  'Data & BI': [['Excel', 'ms excel', 'microsoft excel'], ['Power BI', 'powerbi'], 'DAX', 'Power Query', 'Tableau', 'Looker', ['Data Warehousing', 'data warehouse'], 'ETL', 'SSIS', 'Snowflake', 'BigQuery', 'dbt', 'Airflow', ['Spark', 'apache spark', 'pyspark'], 'Hadoop', 'Kafka', 'Databricks', 'Data Modelling', 'Statistics', 'A/B Testing', 'Data Storytelling'],
  'AI / ML': ['Pandas', 'NumPy', 'Matplotlib', 'Seaborn', ['Scikit-learn', 'sklearn', 'scikit learn'], 'TensorFlow', 'Keras', 'PyTorch', 'OpenCV', ['Machine Learning', 'ML'], 'Deep Learning', ['NLP', 'natural language processing'], 'Computer Vision', ['LLMs', 'large language models'], ['Generative AI', 'genai', 'gen ai'], 'LangChain', 'Hugging Face', 'RAG', 'Prompt Engineering', 'MLOps', 'Jupyter', 'Time Series'],
  'Cloud & DevOps': [['AWS', 'amazon web services'], 'Azure', 'GCP', 'Docker', ['Kubernetes', 'k8s'], 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', ['CI/CD', 'cicd'], 'Linux', 'Nginx', 'Git', 'GitHub', 'GitLab', 'Prometheus', 'Grafana'],
  Security: ['Networking', 'TCP/IP', 'Wireshark', 'Nmap', 'Burp Suite', 'Metasploit', 'Kali Linux', 'OWASP', ['SIEM', 'siem tools'], 'Splunk', 'Cryptography', ['Penetration Testing', 'pentesting'], 'Incident Response', 'Firewalls'],
  Testing: ['Selenium', 'Cypress', 'Playwright', 'Postman', 'JUnit', 'Manual Testing', 'Test Automation', 'Jira'],
  Electronics: [['Embedded C', 'embedded c programming'], 'Arduino', 'Raspberry Pi', 'STM32', 'ARM', 'RTOS', 'MATLAB', 'Simulink', 'Verilog', 'VHDL', 'FPGA', 'Vivado', 'Cadence', 'Proteus', ['PCB Design', 'pcb layout'], 'Altium', 'KiCad', 'IoT', 'MQTT', 'UART', 'SPI', 'I2C', 'PLC', 'SCADA', 'LabVIEW', 'Signal Processing', 'Power Systems'],
  Mechanical: ['AutoCAD', 'SolidWorks', 'CATIA', 'Creo', 'ANSYS', 'Fusion 360', ['CAD/CAM', 'cad cam'], 'CNC', '3D Printing', 'GD&T', 'Six Sigma', 'Lean Manufacturing'],
  Civil: ['Revit', ['STAAD.Pro', 'staad'], 'ETABS', 'Primavera', 'MS Project', 'SketchUp', ['GIS', 'arcgis', 'qgis'], 'BIM', 'Surveying', 'Estimating & Costing'],
  Design: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Canva', ['UI/UX', 'ux design', 'ui design'], 'Wireframing'],
  Practices: ['Agile', 'Scrum', 'Project Management', 'Technical Writing', ['Data Structures and Algorithms', 'dsa', 'data structures'], ['OOP', 'object oriented programming'], 'Debugging'],
}

export const DICTIONARY_EXTRA: Record<string, Entry[]> = {
  'Mobile+': ['Jetpack Compose', 'Android Studio', 'SwiftUI', 'Xcode', 'Retrofit', 'Room Database'],
  'Testing+': ['Test Cases', 'Bug Tracking', 'API Testing', 'Load Testing', 'JMeter', 'TestNG', 'Appium'],
  Game: ['Unity', ['Unreal Engine', 'unreal', 'ue5'], 'Godot', 'Blender', 'Game Design', 'Shader Programming'],
  Blockchain: ['Blockchain', 'Solidity', 'Ethereum', ['Web3.js', 'web3js'], ['Ethers.js', 'ethersjs'], 'Hardhat', 'Truffle', 'Smart Contracts', 'Hyperledger', 'IPFS'],
  'Data & AI+': ['Data Pipelines', 'Redshift', 'Hive', 'Vector Databases', ['OpenAI API', 'openai'], 'LlamaIndex', 'Streamlit', 'Gradio', 'Embeddings', 'Fine-tuning', 'spaCy', 'NLTK', ['Transformers', 'bert'], 'Text Classification', 'Sentiment Analysis', ['YOLO', 'yolov8'], 'Image Processing', 'Object Detection', ['CNN', 'convolutional neural network']],
  Robotics: [['ROS', 'ros2', 'robot operating system'], 'Gazebo', 'SLAM', 'PID Control', 'Control Systems', 'Kinematics', 'Path Planning'],
  Electronics2: ['FreeRTOS', ['Microcontrollers', '8051', 'pic microcontroller'], 'ESP32', 'CAN Bus', 'Firmware', 'SystemVerilog', 'UVM', 'Synopsys', 'RTL Design', ['Static Timing Analysis', 'STA'], 'Digital Design', 'Analog Design', 'CMOS', 'Physical Design', 'ModelSim'],
  Electrical: ['ETAP', 'AutoCAD Electrical', 'Circuit Design', 'Power Electronics', 'Electrical Machines', 'Load Flow Analysis', 'Relay Protection'],
  Core2: [['FEA', 'finite element analysis'], 'CFD', 'Product Design', 'DFM', 'Technical Drawing', ['Structural Analysis', 'structural design'], ['RCC Design', 'rcc'], 'Quantity Surveying', 'Site Supervision', 'Civil 3D'],
  Marketing: [['SEO', 'search engine optimization'], ['Google Ads', 'adwords'], ['Google Analytics', 'ga4'], ['Meta Ads', 'facebook ads', 'instagram ads'], ['Social Media Marketing', 'smm'], 'Content Marketing', 'Email Marketing', 'Mailchimp', 'HubSpot', 'Influencer Marketing', 'Hootsuite', 'Keyword Research', ['Conversion Optimization', 'cro'], 'Brand Strategy', 'Content Calendar', 'WordPress'],
  Writing: ['Copywriting', 'Content Writing', 'Blogging', 'Proofreading', 'Storytelling', ['API Documentation', 'api docs'], 'Markdown', ['Docs-as-Code', 'docs as code'], 'Confluence', 'Press Releases', 'Media Relations', ['Public Relations', 'PR'], 'Public Speaking', 'Crisis Communication', 'Event Management'],
  'Video & Design+': [['Premiere Pro', 'adobe premiere'], 'After Effects', ['DaVinci Resolve', 'davinci'], 'Final Cut Pro', 'Motion Graphics', 'Video Editing', 'CorelDRAW', 'InDesign', 'Typography', 'Color Theory', ['Branding', 'logo design'], 'Lightroom', 'Prototyping'],
  Product: ['Product Roadmap', 'User Stories', ['PRD', 'product requirements document'], 'User Research', 'Mixpanel', 'Amplitude', 'Notion', 'OKRs', 'Competitor Analysis'],
  Business: ['Lead Generation', ['CRM', 'customer relationship management'], 'Salesforce', 'Zoho CRM', 'Market Research', 'Negotiation', 'B2B Sales', 'Cold Emailing', 'Business Planning', ['PowerPoint', 'ppt', 'ms powerpoint'], 'Pitch Decks', 'Presentation Skills'],
  Finance: [['Financial Modelling', 'financial modeling'], 'Valuation', 'DCF', ['Financial Statements', 'financial statement analysis'], 'Ratio Analysis', 'Equity Research', 'Bloomberg', 'Budgeting', 'Forecasting', ['VBA', 'excel vba', 'macros'], 'Investment Analysis', 'Risk Analysis', 'Capital Markets', 'Pivot Tables', ['XLOOKUP', 'vlookup']],
  Accounting: [['Tally', 'tally prime', 'tally erp'], 'GST', 'TDS', 'Bookkeeping', 'Accounts Payable', 'Accounts Receivable', 'Bank Reconciliation', ['Internal Audit', 'auditing'], 'Taxation', 'QuickBooks', ['SAP', 'sap fico'], 'Financial Reporting', 'IFRS', 'Ind AS', 'Compliance'],
  HR: [['Recruitment', 'talent acquisition'], 'Sourcing', 'Candidate Screening', 'Interview Coordination', 'Onboarding', 'Employee Engagement', 'Payroll', 'HRIS', 'Performance Management', 'HR Policies', ['Training & Development', 'l&d']],
  Operations: [['Supply Chain Management', 'scm'], 'Inventory Management', 'Logistics', 'Procurement', 'Vendor Management', 'Demand Forecasting', 'Warehouse Management', 'ERP', 'Process Improvement', 'Kaizen', 'Operations Research'],
  Research: ['Secondary Research', 'Survey Design', 'SPSS', 'Qualitative Research', 'Quantitative Research', 'Literature Review', ['Structured Problem Solving', 'mece'], 'Case Studies', 'Report Writing', 'Research Methodology', 'Hypothesis Testing'],
  'IT Support': ['Troubleshooting', ['Windows Server', 'windows administration'], 'Active Directory', ['Help Desk', 'helpdesk', 'service desk'], ['Ticketing Systems', 'zendesk', 'servicenow'], ['Office 365', 'microsoft 365'], 'ITIL', 'Remote Support', 'VPN', 'DNS', 'DHCP', 'Hardware Troubleshooting', 'Backup & Recovery'],
}

/** Words that are also ordinary English. Match only with this exact capital letters. */
const EXACT_CASE = new Set(['R', 'C', 'Go', 'ML', 'PR', 'GST', 'TDS', 'ROS', 'CNN', 'SAP', 'ARM', 'STA', 'RAG', 'Swift', 'Ruby', 'Dart', 'Excel', 'Unity', 'Notion', 'Compliance'])
/** Single letters and short words: count them only when they appear in the Skills section. */
const NEEDS_SKILLS_SECTION = new Set(['R', 'C', 'Go', 'ARM'])

/** If a student lists the left skill, the right ones are implied. */
const IMPLIES: Record<string, string[]> = {
  Pandas: ['Python'], NumPy: ['Python'], Django: ['Python'], Flask: ['Python'], FastAPI: ['Python'],
  'Scikit-learn': ['Python', 'Machine Learning'], TensorFlow: ['Python', 'Machine Learning'], PyTorch: ['Python', 'Machine Learning'],
  'Spring Boot': ['Java'], React: ['JavaScript'], 'Next.js': ['React', 'JavaScript'], 'Node.js': ['JavaScript'], 'Express.js': ['JavaScript', 'Node.js'],
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const build = (forms: string[], flags: string) =>
  new RegExp(`(?<![\\w+#.])(?:${forms.map((f) => esc(f).replace(/\s+/g, '[\\s-]*')).join('|')})(?![\\w+#]|\\.\\w)`, flags)

type Compiled = { name: string; category: string; res: RegExp[] }

function compile(category: string, entry: Entry): Compiled {
  const forms = Array.isArray(entry) ? entry : [entry]
  const exact = forms.filter((f) => EXACT_CASE.has(f))
  const loose = forms.filter((f) => !EXACT_CASE.has(f))
  const res = [loose.length ? build(loose, 'gi') : null, exact.length ? build(exact, 'g') : null].filter(Boolean) as RegExp[]
  return { name: forms[0], category, res }
}

const BASE: Compiled[] = Object.entries({ ...DICTIONARY, ...DICTIONARY_EXTRA }).flatMap(([cat, list]) => list.map((e) => compile(cat, e)))

export type FoundSkill = { skill: string; category: string; count: number; implied: boolean }

/**
 * Build a matcher once and reuse it.
 * Pass skills from your own internship listings and roadmaps so the matcher
 * never misses a skill that a real posting asks for.
 */
export function createSkillMatcher(extraSkills: string[] = []) {
  const known = new Set(BASE.map((c) => c.name.toLowerCase()))
  const extras = [...new Set(extraSkills.map((s) => s.trim()).filter((s) => s.length >= 2))]
    .filter((s) => !known.has(s.toLowerCase()))
    .map((s) => compile('Other', s))
  const all = [...BASE, ...extras]

  return function match(text: string, skillsSection = ''): FoundSkill[] {
    const found = new Map<string, FoundSkill>()
    for (const c of all) {
      const count = c.res.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0)
      if (!count) continue
      if (NEEDS_SKILLS_SECTION.has(c.name) && !c.res.some((re) => new RegExp(re.source, re.flags.replace('g', '')).test(skillsSection))) continue
      found.set(c.name, { skill: c.name, category: c.category, count, implied: false })
    }
    for (const f of [...found.values()])
      for (const extra of IMPLIES[f.skill] ?? [])
        if (!found.has(extra)) found.set(extra, { skill: extra, category: all.find((c) => c.name === extra)?.category ?? 'Other', count: 0, implied: true })
    return [...found.values()]
  }
}

/** Terms in the Skills section that were not recognised, so the student can confirm them. */
export function unmatchedTerms(skillsSectionLines: string[], matchedNames: string[], isKnown?: (term: string) => boolean) {
  const matched = new Set(matchedNames.map((n) => n.toLowerCase()))
  const terms = skillsSectionLines
    .join('\n')
    .split(/[,|•·;\n]/)
    .map((t) => t.replace(/^[^:]*:\s*/, '').trim())
    .filter((t) => t.length >= 2 && t.length <= 30 && !/^\d+$/.test(t) && !matched.has(t.toLowerCase()) && !(isKnown && isKnown(t)))
  return [...new Set(terms)].slice(0, 15)
}

/* ------------------------- 2. Reading the file ------------------------- */

export class ResumeReadError extends Error {
  code: 'password' | 'scanned' | 'unsupported' | 'too-large' | 'unreadable'
  constructor(code: ResumeReadError['code'], message: string) {
    super(message)
    this.code = code
  }
}

export type ExtractedResume = { text: string; links: string[]; pages: number }

export async function extractPdf(file: File): Promise<ExtractedResume> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Keep this line as it was in your project: the worker file must be in /public
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
  let pdf
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  } catch (e) {
    if ((e as { name?: string })?.name === 'PasswordException') throw new ResumeReadError('password', 'This PDF is password protected. Remove the password and try again.')
    throw new ResumeReadError('unreadable', 'We could not read this PDF.')
  }
  const lines: string[] = []
  const links: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    let line = ''
    let lastY: number | null = null
    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = item.transform[5]
      if (lastY !== null && Math.abs(y - lastY) > 3 && line.trim()) {
        lines.push(line.trim())
        line = ''
      }
      line += (line && !line.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str
      lastY = y
      if (item.hasEOL) {
        lines.push(line.trim())
        line = ''
        lastY = null
      }
    }
    if (line.trim()) lines.push(line.trim())
    for (const a of await page.getAnnotations()) if (a.subtype === 'Link' && a.url) links.push(a.url)
  }
  const pages = pdf.numPages
  await (pdf as unknown as { destroy?: () => Promise<void> }).destroy?.()
  const text = lines.join('\n')
  if (text.replace(/\s/g, '').length < 40 * pages) throw new ResumeReadError('scanned', 'This looks like a scanned image. Upload a PDF exported from Word or Google Docs.')
  return { text, links, pages }
}

export async function extractDocx(file: File): Promise<ExtractedResume> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return { text: value, links: [], pages: Math.max(1, Math.round(value.split(/\s+/).length / 500)) }
}

export async function extractResume(file: File): Promise<ExtractedResume> {
  if (file.size > 5 * 1024 * 1024) throw new ResumeReadError('too-large', 'File is larger than 5 MB.')
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return extractPdf(file)
  if (name.endsWith('.docx')) return extractDocx(file)
  throw new ResumeReadError('unsupported', 'Upload a PDF or DOCX file. Older .doc files are not supported.')
}

/* ---------------------------- 3. Sections ---------------------------- */

const HEADINGS: Record<string, RegExp> = {
  summary: /^(professional\s+)?(summary|profile|objective|about me)$/i,
  education: /^education(al)?(\s+(background|qualifications?))?$/i,
  skills: /^((technical|key|core)\s+)?(skills|competenc(y|ies)|technologies)(\s*(&|and)\s*tools)?$/i,
  projects: /^(academic\s+|personal\s+)?projects?$/i,
  experience: /^((work|professional)\s+)?experience$|^internships?(\s+experience)?$/i,
  certifications: /^(certifications?|licenses?|courses?)(\s*(&|and)\s*.+)?$/i,
  achievements: /^(achievements?|awards?|honou?rs)$/i,
}

export function splitSections(text: string) {
  const out: Record<string, string[]> = { header: [] }
  let current = 'header'
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/[:\-–—_|]+$/, '').trim()
    if (!line) continue
    const hit = line.length <= 40 ? Object.entries(HEADINGS).find(([, re]) => re.test(line)) : undefined
    if (hit) {
      current = hit[0]
      out[current] ??= []
      continue
    }
    ;(out[current] ??= []).push(line)
  }
  return out
}

/* ------------------------ 4. Is this a resume? ------------------------ */

const EMAIL = /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/i
const PHONE = /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|\+\d{1,3}[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?'
const DATE_RANGE = new RegExp(`${MONTH}\\s+\\d{4}\\s*(?:-|–|—|to)\\s*(?:${MONTH}\\s+\\d{4}|present|current)|\\b20\\d{2}\\s*(?:-|–|—)\\s*(?:20\\d{2}|present)`, 'gi')
const NOT_RESUME = [/table\s+of\s+contents/i, /\babstract\b/i, /\bchapter\s+\d/i, /software\s+requirements?\s+specification/i, /\bbibliography\b/i]

export function classifyResume(text: string, pages = 1, links: string[] = []) {
  const sections = splitSections(text)
  const found = Object.keys(sections).filter((k) => k !== 'header' && sections[k].length)
  const words = text.split(/\s+/).filter(Boolean).length
  let score = 0
  if (EMAIL.test(text) || PHONE.test(text)) score += 2
  if (/linkedin\.com|github\.com/i.test(text) || links.some((l) => /linkedin\.com|github\.com/i.test(l))) score += 1
  score += Math.min(found.length, 4)
  if ((text.match(DATE_RANGE) ?? []).length >= 2) score += 1
  if ((text.match(/^\s*[•●▪\-*]\s+/gm) ?? []).length >= 3) score += 1
  if (words < 120 || words > 2200) score -= 2
  if (pages > 4) score -= 2
  if (NOT_RESUME.some((r) => r.test(text))) score -= 3
  const isResume = score >= 5
  return {
    isResume,
    score,
    sections: found,
    reason: isResume ? undefined : 'This does not look like a resume. Include headings such as Education, Skills, Projects or Experience, plus dates and contact details.',
  }
}

/* -------------------------- 5. Bullet quality -------------------------- */

const ACTION_VERBS = new Set(['built', 'developed', 'designed', 'created', 'implemented', 'analysed', 'analyzed', 'automated', 'optimised', 'optimized', 'led', 'deployed', 'reduced', 'improved', 'trained', 'managed', 'organised', 'organized', 'launched', 'wrote', 'presented', 'coordinated'])
const WEAK = /\b(responsible for|worked on|helped|assisted|hard.?working|team player)\b/i
const RESULT = /\d+\s?%|\b\d[\d,]*\+?\s*(users|students|records|requests|rows|ms|hours|x|leads|followers|clients)\b/i

export function checkBullets(lines: string[]) {
  const bullets = lines.map((l) => l.replace(/^[•●▪\-*]\s*/, '')).filter((l) => l.split(' ').length >= 5)
  const total = Math.max(bullets.length, 1)
  const withVerb = bullets.filter((b) => ACTION_VERBS.has(b.split(' ')[0].toLowerCase())).length
  const withResult = bullets.filter((b) => RESULT.test(b)).length
  const weak = bullets.filter((b) => WEAK.test(b)).length
  const findings: { text: string; points: number }[] = []
  if (bullets.length && withResult / total < 0.3) findings.push({ text: 'Add numbers to your project bullets, for example users, accuracy or time saved.', points: 4 })
  if (bullets.length && withVerb / total < 0.6) findings.push({ text: 'Start bullets with action verbs such as Built, Designed or Automated.', points: 3 })
  if (weak) findings.push({ text: `Replace ${weak} weak phrase${weak > 1 ? 's' : ''} such as "responsible for" with what you actually did.`, points: 2 })
  return { total: bullets.length, withVerb, withResult, weak, findings }
}

/* ---------------------------- 6. Role fit ---------------------------- */

export type InternRole = { family: string; title: string; required: string[]; preferred: string[] }
const role = (family: string, title: string, required: string[], preferred: string[] = []): InternRole => ({ family, title, required, preferred })

export const ROLES: InternRole[] = [
  role('Software', 'Software Engineering / SDE Intern', ['Data Structures and Algorithms', 'Java', 'OOP', 'Git'], ['Python', 'C++', 'SQL', 'REST APIs']),
  role('Software', 'Web Developer', ['HTML', 'CSS', 'JavaScript', 'React', 'Git'], ['Node.js', 'TypeScript', 'Tailwind CSS', 'REST APIs']),
  role('Software', 'Python Developer', ['Python', 'OOP', 'SQL', 'Git'], ['Django', 'Flask', 'FastAPI', 'REST APIs', 'Docker']),
  role('Software', 'Android / Mobile App Developer Intern', ['Android', 'Kotlin', 'Android Studio', 'Git'], ['Java', 'Jetpack Compose', 'Firebase', 'REST APIs', 'Flutter']),
  role('Software', 'Software Testing / QA Intern', ['Manual Testing', 'Test Cases', 'Bug Tracking', 'Selenium'], ['Postman', 'JUnit', 'Jira', 'API Testing', 'Test Automation']),
  role('Software', 'Game Developer Intern', ['Unity', 'C#', 'Game Design'], ['Unreal Engine', 'C++', 'Blender', 'Git']),
  role('Software', 'Blockchain Developer Intern', ['Solidity', 'Ethereum', 'Smart Contracts', 'JavaScript'], ['Hardhat', 'Web3.js', 'Cryptography', 'Git']),
  role('Data & AI', 'Data Analyst', ['SQL', 'Excel', 'Power BI', 'Python', 'Statistics'], ['Tableau', 'Pandas', 'Data Storytelling']),
  role('Data & AI', 'Data Scientist', ['Python', 'Statistics', 'Machine Learning', 'Pandas', 'SQL'], ['Scikit-learn', 'Deep Learning', 'Matplotlib', 'Jupyter']),
  role('Data & AI', 'AI / ML Engineer', ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow'], ['PyTorch', 'Scikit-learn', 'MLOps', 'Docker', 'Git']),
  role('Data & AI', 'Data Engineer Intern', ['SQL', 'Python', 'ETL', 'Data Pipelines'], ['Spark', 'Airflow', 'Kafka', 'Snowflake', 'AWS', 'Data Warehousing']),
  role('Data & AI', 'Business Intelligence (BI) Developer Intern', ['SQL', 'Power BI', 'DAX', 'Data Modelling'], ['Tableau', 'ETL', 'Excel', 'Data Warehousing', 'Power Query']),
  role('Data & AI', 'Generative AI / Prompt Engineering Intern', ['Python', 'Prompt Engineering', 'LLMs', 'Generative AI'], ['LangChain', 'RAG', 'Vector Databases', 'OpenAI API', 'Streamlit']),
  role('Data & AI', 'Computer Vision Intern', ['Python', 'OpenCV', 'Deep Learning', 'Image Processing'], ['PyTorch', 'TensorFlow', 'YOLO', 'Object Detection', 'NumPy']),
  role('Data & AI', 'NLP Intern', ['Python', 'NLP', 'Machine Learning', 'NLTK'], ['spaCy', 'Transformers', 'Hugging Face', 'Text Classification', 'Sentiment Analysis']),
  role('Cloud & Security', 'Cloud Engineer', ['AWS', 'Linux', 'Networking', 'Docker'], ['Terraform', 'Azure', 'Kubernetes', 'Python']),
  role('Cloud & Security', 'DevOps Intern', ['Linux', 'Git', 'Docker', 'CI/CD'], ['Kubernetes', 'Jenkins', 'Terraform', 'AWS', 'Bash']),
  role('Cloud & Security', 'Cybersecurity', ['Networking', 'Linux', 'OWASP', 'Wireshark'], ['Nmap', 'Burp Suite', 'Kali Linux', 'SIEM', 'Cryptography']),
  role('Cloud & Security', 'Technical Support / IT Support Intern', ['Troubleshooting', 'Networking', 'Help Desk', 'Active Directory'], ['Office 365', 'ITIL', 'Linux', 'Ticketing Systems']),
  role('Design & Product', 'UI/UX Design Intern', ['Figma', 'Wireframing', 'UI/UX', 'User Research'], ['Prototyping', 'Adobe XD', 'Typography', 'Color Theory']),
  role('Design & Product', 'Graphic Design Intern', ['Photoshop', 'Illustrator', 'Canva', 'Typography'], ['CorelDRAW', 'InDesign', 'Branding', 'Color Theory']),
  role('Design & Product', 'Product Management Intern', ['Product Roadmap', 'User Stories', 'Market Research', 'Wireframing'], ['Figma', 'Jira', 'Mixpanel', 'A/B Testing', 'SQL', 'OKRs']),
  role('Design & Product', 'Video Editing / Motion Graphics Intern', ['Premiere Pro', 'After Effects', 'Video Editing', 'Motion Graphics'], ['DaVinci Resolve', 'Final Cut Pro', 'Photoshop', 'Blender']),
  role('Electronics & Core', 'Embedded Systems / IoT Intern', ['Embedded C', 'Arduino', 'Microcontrollers', 'IoT'], ['Raspberry Pi', 'ESP32', 'STM32', 'RTOS', 'MQTT']),
  role('Electronics & Core', 'VLSI / Electronics Design Intern', ['Verilog', 'Digital Design', 'RTL Design', 'Cadence'], ['SystemVerilog', 'FPGA', 'Vivado', 'CMOS', 'Static Timing Analysis']),
  role('Electronics & Core', 'Electrical Engineering Intern', ['MATLAB', 'Circuit Design', 'Power Systems', 'AutoCAD Electrical'], ['PLC', 'SCADA', 'ETAP', 'Power Electronics', 'Simulink']),
  role('Electronics & Core', 'Mechanical Design Intern', ['AutoCAD', 'SolidWorks', 'Technical Drawing', 'GD&T'], ['CATIA', 'Creo', 'ANSYS', 'FEA', '3D Printing']),
  role('Electronics & Core', 'Civil / Structural Engineering Intern', ['AutoCAD', 'STAAD.Pro', 'Structural Analysis', 'Surveying'], ['Revit', 'ETABS', 'Primavera', 'BIM', 'Estimating & Costing']),
  role('Electronics & Core', 'Robotics / Automation Intern', ['ROS', 'Python', 'Control Systems', 'PLC'], ['C++', 'MATLAB', 'Gazebo', 'PID Control', 'SLAM', 'Arduino']),
  role('Business & Finance', 'Business Development Intern', ['Lead Generation', 'Market Research', 'Excel', 'PowerPoint'], ['CRM', 'Cold Emailing', 'Negotiation', 'B2B Sales']),
  role('Business & Finance', 'Finance / Financial Analyst Intern', ['Excel', 'Financial Modelling', 'Financial Statements', 'Valuation'], ['Ratio Analysis', 'Equity Research', 'DCF', 'VBA', 'Bloomberg', 'Power BI']),
  role('Business & Finance', 'Accounting / Audit Intern', ['Tally', 'GST', 'Bookkeeping', 'Excel'], ['TDS', 'Internal Audit', 'Bank Reconciliation', 'Financial Reporting', 'QuickBooks', 'SAP']),
  role('Business & Finance', 'Human Resources (HR) Intern', ['Recruitment', 'Sourcing', 'Onboarding', 'Excel'], ['Employee Engagement', 'Payroll', 'HRIS', 'Interview Coordination', 'HR Policies']),
  role('Business & Finance', 'Operations / Supply Chain Intern', ['Supply Chain Management', 'Inventory Management', 'Logistics', 'Excel'], ['Procurement', 'Vendor Management', 'ERP', 'SAP', 'Demand Forecasting']),
  role('Business & Finance', 'Consulting / Research Intern', ['Market Research', 'Excel', 'PowerPoint', 'Report Writing'], ['Secondary Research', 'Survey Design', 'SPSS', 'Case Studies', 'Structured Problem Solving']),
  role('Marketing & Communication', 'Digital Marketing Intern', ['SEO', 'Google Analytics', 'Google Ads', 'Social Media Marketing'], ['Content Marketing', 'Email Marketing', 'Meta Ads', 'Keyword Research', 'Canva']),
  role('Marketing & Communication', 'Social Media Management Intern', ['Social Media Marketing', 'Canva', 'Content Calendar', 'Copywriting'], ['Meta Ads', 'Hootsuite', 'Influencer Marketing', 'Video Editing', 'Google Analytics']),
  role('Marketing & Communication', 'Content Writing / Copywriting Intern', ['Copywriting', 'Content Writing', 'SEO', 'Proofreading'], ['WordPress', 'Blogging', 'Keyword Research', 'Storytelling']),
  role('Marketing & Communication', 'Technical Writing Intern', ['Technical Writing', 'Markdown', 'Proofreading', 'Git'], ['API Documentation', 'Confluence', 'Docs-as-Code']),
  role('Marketing & Communication', 'Public Relations / Communications Intern', ['Press Releases', 'Media Relations', 'Public Relations', 'Copywriting'], ['Public Speaking', 'Social Media Marketing', 'Event Management', 'Crisis Communication']),
]

export const FAMILIES = [...new Set(ROLES.map((r) => r.family))]

export function roleFit(r: InternRole, detected: string[]) {
  const have = new Set(detected.map((d) => d.toLowerCase()))
  const has = (s: string) => have.has(s.toLowerCase())
  const reqHit = r.required.filter(has)
  const prefHit = r.preferred.filter(has)
  const score = Math.round((reqHit.length / r.required.length) * 70 + (prefHit.length / Math.max(r.preferred.length, 1)) * 30)
  return {
    score,
    matched: [...reqHit, ...prefHit],
    missingRequired: r.required.filter((s) => !has(s)),
    missingPreferred: r.preferred.filter((s) => !has(s)),
  }
}

/* ------------------------ 7. One call for the UI ------------------------ */

export async function analyzeResume(file: File, roleTitle?: string, extraSkills: string[] = []) {
  const { text, links, pages } = await extractResume(file)

  const verdict = classifyResume(text, pages, links)
  if (!verdict.isResume) return { ok: false as const, reason: verdict.reason }

  const sections = splitSections(text)
  const match = createSkillMatcher([...ROLES.flatMap((r) => [...r.required, ...r.preferred]), ...extraSkills])
  const skills = match(text, (sections.skills ?? []).join('\n'))
  const names = skills.map((s) => s.skill)
  const target = ROLES.find((r) => r.title === roleTitle)

  return {
    ok: true as const,
    pages,
    links,
    sections: Object.keys(sections).filter((k) => k !== 'header'),
    skills,
    unmatched: unmatchedTerms(sections.skills ?? [], names, (t) => match(t, t).length > 0),
    bullets: checkBullets([...(sections.projects ?? []), ...(sections.experience ?? [])]),
    fit: target ? roleFit(target, names) : null,
  }
}

/* ---------------- 8. Old names, so nothing else breaks ---------------- */

export async function extractResumeText(file: File) {
  return (await extractResume(file)).text
}

export function extractSkillsFromText(text: string) {
  const sections = splitSections(text)
  return createSkillMatcher()(text, (sections.skills ?? []).join('\n')).map((s) => s.skill)
}

export async function extractResumeSkills(file: File) {
  return extractSkillsFromText(await extractResumeText(file))
}

export function classifyResumeText(text: string): { isResume: boolean; reason?: string } {
  const { isResume, reason } = classifyResume(text)
  return { isResume, reason }
}