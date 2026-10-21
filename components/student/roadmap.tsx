'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Code2, Sparkles, Target } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Bar, MatchRing, PageHeader, Panel, selectClass } from '@/components/shared'
import { internships, student } from '@/lib/data'
import type { View } from '@/components/app-shell'
import { cn } from '@/lib/utils'
import { useStudentAccount } from '@/components/student/student-account-provider'

export type Roadmap = { id: string; role: string; summary: string; steps: { skill: string; why: string }[]; keywords: string[]; marketRank?: number }
const NON_TECHNICAL_SKILLS = new Set([
  'Negotiation', 'Typography', 'Surveying', 'Communication', 'Stakeholder Management',
  'Presentation Skills', 'Recruitment', 'Candidate Screening', 'Interview Coordination',
  'HR Policies', 'Onboarding', 'Confidentiality', 'Vendor Coordination', 'Lead Generation',
  'Cold Outreach', 'Market Research', 'Email Etiquette', 'Teamwork', 'Time Management',
  'Writing and Editing', 'Tone Adaptation',
])

const coreRoadmaps: Roadmap[] = [
  {
    id: 'analyst',
    role: 'Data Analyst',
    summary: 'Turn raw data into reliable analysis, dashboards, and insights that teams can act on.',
    keywords: ['data analyst', 'data analytics', 'power bi', 'tableau', 'pandas', 'sql', 'excel'],
    steps: [
      { skill: 'Excel', why: 'Formulas and pivot tables for initial analysis' },
      { skill: 'SQL', why: 'Query and combine business data' },
      { skill: 'Statistics', why: 'Understand patterns and uncertainty' },
      { skill: 'Python', why: 'Automate analysis and work with data' },
      { skill: 'Pandas', why: 'Transform and analyse tabular data' },
      { skill: 'NumPy', why: 'Perform numerical computing efficiently' },
      { skill: 'Data Visualisation', why: 'Communicate patterns with effective charts' },
      { skill: 'Power BI', why: 'Build interactive dashboards and reports' },
      { skill: 'Tableau', why: 'Create visual analysis and business insights' },
      { skill: 'Data Cleaning', why: 'Prepare reliable data for analysis' },
      { skill: 'Data Storytelling', why: 'Explain findings and recommendations clearly' },
      { skill: 'Reporting', why: 'Deliver concise, decision-ready analysis' },
    ],
  },
  {
    id: 'scientist',
    role: 'Data Scientist',
    summary: 'Build predictive models and run experiments on real datasets.',
    keywords: ['machine learning', 'scientist', 'tensorflow', 'pandas'],
    steps: [
      { skill: 'Python', why: 'Primary language for data science' },
      { skill: 'SQL', why: 'Retrieve and combine analytical data' },
      { skill: 'Statistics', why: 'Foundation for modelling' },
      { skill: 'Pandas', why: 'Feature preparation' },
      { skill: 'Matplotlib', why: 'Visualise analysis and model results' },
      { skill: 'Seaborn', why: 'Create statistical visualisations' },
      { skill: 'Machine Learning', why: 'Build classical predictive models' },
      { skill: 'Scikit-learn', why: 'Train and evaluate machine-learning models' },
      { skill: 'Feature Engineering', why: 'Create useful model inputs' },
      { skill: 'Model Evaluation', why: 'Measure model quality and generalisation' },
      { skill: 'Deep Learning', why: 'Build neural-network models' },
    ],
  },
  {
    id: 'web',
    role: 'Web Developer',
    summary: 'Design and build fast, accessible web applications end to end.',
    keywords: ['frontend', 'react', 'javascript', 'web'],
    steps: [
      { skill: 'HTML', why: 'Structure accessible web pages' },
      { skill: 'CSS', why: 'Style responsive interfaces' },
      { skill: 'JavaScript', why: 'Make pages interactive' },
      { skill: 'TypeScript', why: 'Add type safety to JavaScript applications' },
      { skill: 'Git/GitHub', why: 'Collaborate and manage source code' },
      { skill: 'React', why: 'Component-based interfaces' },
      { skill: 'Angular', why: 'Build structured front-end applications' },
      { skill: 'Vue', why: 'Build component-based front-end applications' },
      { skill: 'Node.js', why: 'Build server-side JavaScript applications' },
      { skill: 'Express', why: 'Create web back ends with Node.js' },
      { skill: 'Django', why: 'Build web back ends with Python' },
      { skill: 'Spring Boot', why: 'Build enterprise Java back ends' },
      { skill: 'SQL', why: 'Persist and query relational data' },
      { skill: 'MongoDB', why: 'Store application data' },
      { skill: 'REST APIs', why: 'Connect application services' },
      { skill: 'GraphQL', why: 'Query APIs flexibly' },
      { skill: 'JWT', why: 'Secure authenticated sessions' },
      { skill: 'OAuth', why: 'Integrate delegated authentication' },
      { skill: 'Deployment', why: 'Ship and host your app' },
    ],
  },
  {
    id: 'python',
    role: 'Python Developer',
    summary: 'Write clean back-end services and automation in Python.',
    keywords: ['python', 'backend', 'software'],
    steps: [
      { skill: 'Python', why: 'Language fundamentals' },
      { skill: 'Data Structures and Algorithms', why: 'Solve problems efficiently' },
      { skill: 'OOP', why: 'Structure maintainable programs' },
      { skill: 'Git', why: 'Track and collaborate on code' },
      { skill: 'Django', why: 'Build Python web applications' },
      { skill: 'Flask', why: 'Build lightweight web APIs' },
      { skill: 'FastAPI', why: 'Build modern Python APIs' },
      { skill: 'Databases', why: 'Persist application data reliably' },
      { skill: 'ORMs', why: 'Work with databases through application models' },
      { skill: 'REST APIs', why: 'Design service interfaces' },
      { skill: 'Testing', why: 'Keep code reliable' },
      { skill: 'Debugging', why: 'Find and fix software defects' },
      { skill: 'Automation Scripting', why: 'Automate repetitive workflows' },
    ],
  },
  {
    id: 'ai',
    role: 'AI / ML Engineer',
    summary: 'Build and deploy machine learning and generative AI features.',
    keywords: ['machine learning', 'ai', 'tensorflow'],
    steps: [
      { skill: 'Python', why: 'Core language for AI work' },
      { skill: 'Linear Algebra', why: 'Represent data and model transformations' },
      { skill: 'Calculus', why: 'Understand optimisation and learning' },
      { skill: 'Probability', why: 'Reason about uncertain predictions' },
      { skill: 'Machine Learning', why: 'Models and evaluation' },
      { skill: 'Deep Learning', why: 'Build neural-network models' },
      { skill: 'TensorFlow', why: 'Train deep-learning models' },
      { skill: 'PyTorch', why: 'Develop flexible deep-learning models' },
      { skill: 'NLP', why: 'Work with language data' },
      { skill: 'Computer Vision', why: 'Work with image and video data' },
      { skill: 'Model Deployment', why: 'Serve models in applications' },
      { skill: 'APIs', why: 'Expose models as usable services' },
      { skill: 'Docker', why: 'Package model services consistently' },
      { skill: 'MLOps', why: 'Operate and monitor machine-learning systems' },
      { skill: 'LLMs', why: 'Build applications with language models' },
    ],
  },
  {
    id: 'cloud',
    role: 'Cloud Engineer',
    summary: 'Run reliable applications on cloud infrastructure.',
    keywords: ['cloud', 'aws', 'devops'],
    steps: [
      { skill: 'Linux', why: 'Operate systems from the command line' },
      { skill: 'Networking', why: 'Understand how services connect' },
      { skill: 'AWS', why: 'Use a major cloud platform' },
      { skill: 'Azure', why: 'Work with Microsoft cloud services' },
      { skill: 'GCP', why: 'Work with Google cloud services' },
      { skill: 'Compute', why: 'Run workloads in the cloud' },
      { skill: 'Storage', why: 'Manage durable cloud data' },
      { skill: 'IAM', why: 'Control identities and permissions' },
      { skill: 'Bash', why: 'Automate infrastructure tasks' },
      { skill: 'Python', why: 'Script cloud operations' },
      { skill: 'Docker', why: 'Package applications' },
      { skill: 'Kubernetes', why: 'Orchestrate containers' },
      { skill: 'Terraform', why: 'Define infrastructure as code' },
      { skill: 'CI/CD', why: 'Automate releases' },
    ],
  },
  {
    id: 'security',
    role: 'Cybersecurity',
    summary: 'Protect systems and data by finding and fixing weaknesses.',
    keywords: ['security', 'cyber'],
    steps: [
      { skill: 'Networking', why: 'Understand traffic and protocols' },
      { skill: 'Linux', why: 'Work in security tooling' },
      { skill: 'Security Fundamentals', why: 'CIA triad and common threats' },
      { skill: 'Python', why: 'Automate security analysis' },
      { skill: 'Bash', why: 'Automate security operations' },
      { skill: 'Web Security', why: 'Apply the OWASP Top 10' },
      { skill: 'Wireshark', why: 'Inspect network traffic' },
      { skill: 'Nmap', why: 'Discover hosts and services' },
      { skill: 'Burp Suite', why: 'Test web application security' },
      { skill: 'Ethical Hacking', why: 'Practise controlled offensive security' },
      { skill: 'Incident Response', why: 'Contain and investigate incidents' },
      { skill: 'SIEM', why: 'Monitor and correlate security events' },
    ],
  },
]

const makeSteps = (skills: string[]) => skills.map((skill) => ({ skill, why: `Build ${skill} capability for this role` }))
const additionalRoadmaps: Roadmap[] = [
  { id: 'software-engineering', role: 'Software Engineering / SDE Intern', summary: 'Build reliable software from fundamentals through testing.', keywords: ['software', 'sde', 'engineering'], steps: makeSteps(['Java', 'C++', 'Python', 'JavaScript', 'Data Structures and Algorithms', 'OOP', 'System Design', 'DBMS', 'SQL', 'Operating Systems', 'Computer Networks', 'Git/GitHub', 'Debugging', 'Unit Testing']) },
  { id: 'mobile', role: 'Android / Mobile App Developer Intern', summary: 'Build and publish mobile applications across popular platforms.', keywords: ['android', 'mobile', 'app'], steps: makeSteps(['Kotlin', 'Java', 'Swift', 'Flutter', 'Dart', 'React Native', 'UI Layouts', 'Navigation', 'State Management', 'REST APIs', 'JSON', 'SQLite', 'Room', 'Firebase', 'Git', 'App Publishing']) },
  { id: 'devops', role: 'DevOps Intern', summary: 'Automate delivery and operate reliable development infrastructure.', keywords: ['devops', 'ci/cd', 'cloud'], steps: makeSteps(['Linux', 'Shell Scripting', 'Git', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Prometheus', 'Grafana', 'AWS']) },
  { id: 'qa', role: 'Software Testing / QA Intern', summary: 'Plan, automate, and report software quality throughout the lifecycle.', keywords: ['qa', 'testing', 'quality'], steps: makeSteps(['SDLC', 'STLC', 'Test Cases', 'Bug Reports', 'Manual Testing', 'API Testing', 'Postman', 'Selenium', 'Cypress', 'Playwright', 'Java', 'Python', 'SQL', 'Jira', 'TestNG', 'PyTest']) },
  { id: 'game', role: 'Game Developer Intern', summary: 'Create interactive games with engines, physics, and real-time systems.', keywords: ['game', 'unity', 'unreal'], steps: makeSteps(['C#', 'Unity', 'C++', 'Unreal Engine', 'Game Physics', 'Mathematics', 'Vectors', '2D/3D', 'Animation Systems', 'Game Design', 'Version Control']) },
  { id: 'blockchain', role: 'Blockchain Developer Intern', summary: 'Build decentralised applications and smart contracts.', keywords: ['blockchain', 'web3', 'solidity'], steps: makeSteps(['Blockchain Fundamentals', 'Cryptography', 'Solidity', 'Smart Contracts', 'Web3.js', 'Ethers.js', 'Hardhat', 'Truffle', 'JavaScript', 'Ethereum', 'Polygon']) },
  { id: 'data-engineer', role: 'Data Engineer Intern', summary: 'Build data pipelines and platforms that make analytics possible.', keywords: ['data engineer', 'etl', 'spark'], steps: makeSteps(['Python', 'Advanced SQL', 'ETL/ELT', 'Data Warehousing', 'Apache Spark', 'Kafka', 'Airflow', 'BigQuery', 'Redshift', 'Azure Data Factory', 'Data Modelling', 'Git']) },
  { id: 'bi-developer', role: 'Business Intelligence (BI) Developer Intern', summary: 'Turn enterprise data into governed dashboards and KPIs.', keywords: ['business intelligence', 'bi', 'dashboard'], steps: makeSteps(['Excel', 'SQL', 'Data Modelling', 'Power BI', 'Tableau', 'DAX', 'Dashboard Design', 'KPI Definition', 'Data Warehousing']) },
  { id: 'genai', role: 'Generative AI / Prompt Engineering Intern', summary: 'Build useful applications with LLMs, retrieval, and evaluation.', keywords: ['generative ai', 'prompt', 'llm'], steps: makeSteps(['Python', 'LLM Fundamentals', 'Prompt Engineering', 'RAG', 'Vector Databases', 'LangChain', 'LlamaIndex', 'Model APIs', 'Fine-tuning', 'Output Evaluation']) },
  { id: 'computer-vision', role: 'Computer Vision Intern', summary: 'Teach systems to understand images and video.', keywords: ['computer vision', 'opencv', 'image'], steps: makeSteps(['Python', 'OpenCV', 'Image Processing', 'CNNs', 'PyTorch', 'TensorFlow', 'Object Detection', 'Segmentation', 'Dataset Annotation', 'Model Deployment']) },
  { id: 'nlp', role: 'NLP Intern', summary: 'Build systems that understand and generate human language.', keywords: ['nlp', 'natural language', 'transformers'], steps: makeSteps(['Python', 'Text Preprocessing', 'Embeddings', 'Transformers', 'Hugging Face', 'Text Classification', 'NER', 'Summarization', 'Evaluation Metrics', 'LLMs']) },
  { id: 'uiux', role: 'UI/UX Design Intern', summary: 'Design usable, accessible, and consistent digital experiences.', keywords: ['ui', 'ux', 'design'], steps: makeSteps(['Design Principles', 'Typography', 'Color Theory', 'User Research', 'Personas', 'Wireframing', 'Figma', 'Adobe XD', 'Prototyping', 'Usability Testing', 'Design Systems', 'HTML', 'CSS']) },
  { id: 'graphic-design', role: 'Graphic Design Intern', summary: 'Create visual identities and communication assets.', keywords: ['graphic design', 'visual design'], steps: makeSteps(['Photoshop', 'Illustrator', 'Canva', 'Layout', 'Branding', 'Typography', 'Social Media Creatives', 'Print Design']) },
  { id: 'product', role: 'Product Management Intern', summary: 'Discover problems, prioritise opportunities, and guide product delivery.', keywords: ['product', 'management'], steps: makeSteps(['Product Thinking', 'User Research', 'Market Analysis', 'Competitor Analysis', 'Roadmaps', 'RICE', 'MoSCoW', 'SQL', 'Analytics', 'Jira', 'Notion', 'Communication', 'Stakeholder Management']) },
  { id: 'video', role: 'Video Editing / Motion Graphics Intern', summary: 'Produce engaging video and motion content for digital audiences.', keywords: ['video', 'motion', 'editing'], steps: makeSteps(['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Storytelling', 'Color Grading', 'Sound Editing', 'Short-form Content']) },
  { id: 'embedded', role: 'Embedded Systems / IoT Intern', summary: 'Connect hardware, sensors, and software in embedded products.', keywords: ['embedded', 'iot', 'arduino'], steps: makeSteps(['C', 'C++', 'Arduino', 'ESP32', 'STM32', 'Sensors', 'I2C', 'SPI', 'UART', 'MQTT', 'RTOS', 'PCB', 'Raspberry Pi', 'Oscilloscope']) },
  { id: 'vlsi', role: 'VLSI / Electronics Design Intern', summary: 'Design, simulate, and validate digital electronic systems.', keywords: ['vlsi', 'electronics', 'fpga'], steps: makeSteps(['Digital Electronics', 'Verilog', 'VHDL', 'FPGA', 'Cadence', 'Xilinx', 'Circuit Analysis', 'SPICE']) },
  { id: 'electrical', role: 'Electrical Engineering Intern', summary: 'Apply electrical systems knowledge to practical engineering projects.', keywords: ['electrical', 'power systems'], steps: makeSteps(['Circuit Theory', 'Power Systems', 'MATLAB', 'Simulink', 'AutoCAD Electrical', 'PLC', 'SCADA', 'Electrical Safety']) },
  { id: 'mechanical', role: 'Mechanical Design Intern', summary: 'Design manufacturable mechanical components and assemblies.', keywords: ['mechanical', 'cad', 'design'], steps: makeSteps(['AutoCAD', 'SolidWorks', 'CATIA', 'Fusion 360', 'GD&T', 'Engineering Drawing', 'FEA', 'ANSYS', 'Manufacturing Processes']) },
  { id: 'civil', role: 'Civil / Structural Engineering Intern', summary: 'Plan, model, and supervise safe civil and structural works.', keywords: ['civil', 'structural', 'construction'], steps: makeSteps(['AutoCAD', 'STAAD.Pro', 'Revit', 'Surveying', 'Estimation and Costing', 'Construction Materials', 'Site Supervision']) },
  { id: 'robotics', role: 'Robotics / Automation Intern', summary: 'Build autonomous systems using software, sensors, and control.', keywords: ['robotics', 'automation', 'ros'], steps: makeSteps(['Python', 'C++', 'ROS', 'Sensors', 'Actuators', 'Control Systems', 'Computer Vision', 'Arduino', 'Raspberry Pi']) },
  { id: 'business-development', role: 'Business Development Intern', summary: 'Find opportunities and grow relationships with customers and partners.', keywords: ['business development', 'sales'], steps: makeSteps(['Lead Generation', 'Cold Outreach', 'CRM', 'Negotiation', 'Market Research', 'Presentation', 'Communication']) },
  { id: 'finance', role: 'Finance / Financial Analyst Intern', summary: 'Use financial data to support planning, valuation, and decisions.', keywords: ['finance', 'financial analyst'], steps: makeSteps(['Advanced Excel', 'Financial Modelling', 'Accounting', 'Financial Statements', 'DCF', 'Ratio Analysis', 'Tally', 'SQL', 'Power BI']) },
  { id: 'audit', role: 'Accounting / Audit Intern', summary: 'Maintain accurate records and support compliant financial reporting.', keywords: ['accounting', 'audit'], steps: makeSteps(['Bookkeeping', 'GST', 'Taxation', 'Tally', 'Zoho Books', 'Excel', 'Audit Procedures', 'Reporting']) },
  { id: 'hr', role: 'Human Resources (HR) Intern', summary: 'Support people operations from recruitment through onboarding.', keywords: ['human resources', 'hr', 'recruitment'], steps: makeSteps(['Recruitment', 'Screening', 'Interview Coordination', 'HR Policies', 'Onboarding', 'Payroll', 'HRIS', 'Communication', 'Confidentiality']) },
  { id: 'operations', role: 'Operations / Supply Chain Intern', summary: 'Improve processes, inventory, suppliers, and logistics.', keywords: ['operations', 'supply chain', 'logistics'], steps: makeSteps(['Process Mapping', 'Inventory Management', 'Excel', 'Data Analysis', 'ERP', 'SAP', 'Vendor Coordination', 'Logistics']) },
  { id: 'consulting', role: 'Consulting / Research Intern', summary: 'Structure ambiguous problems and turn research into recommendations.', keywords: ['consulting', 'research'], steps: makeSteps(['Structured Problem-solving', 'Market Research', 'Excel', 'PowerPoint', 'Data Interpretation', 'Report Writing']) },
  { id: 'digital-marketing', role: 'Digital Marketing Intern', summary: 'Grow audiences through search, campaigns, content, and measurement.', keywords: ['digital marketing', 'seo', 'marketing'], steps: makeSteps(['SEO', 'SEM', 'Google Ads', 'Social Media Marketing', 'Email Marketing', 'Google Analytics', 'Content Planning', 'A/B Testing']) },
  { id: 'social-media', role: 'Social Media Management Intern', summary: 'Plan content and build engaged communities across platforms.', keywords: ['social media', 'content'], steps: makeSteps(['Content Calendars', 'Platform Algorithms', 'Canva', 'CapCut', 'Copywriting', 'Engagement Analytics', 'Community Management']) },
  { id: 'content-writing', role: 'Content Writing / Copywriting Intern', summary: 'Research and write clear content for different audiences and channels.', keywords: ['content writing', 'copywriting'], steps: makeSteps(['Writing', 'Editing', 'SEO Writing', 'Research', 'Tone Adaptation', 'WordPress', 'CMS']) },
  { id: 'technical-writing', role: 'Technical Writing Intern', summary: 'Make technical products understandable through clear documentation.', keywords: ['technical writing', 'documentation'], steps: makeSteps(['Documentation', 'API Documentation', 'Markdown', 'Basic Coding', 'Git', 'Structured Writing']) },
  { id: 'pr', role: 'Public Relations / Communications Intern', summary: 'Shape messages, coordinate events, and build trusted public relationships.', keywords: ['public relations', 'communications'], steps: makeSteps(['Press Releases', 'Media Outreach', 'Writing', 'Event Coordination', 'Brand Messaging']) },
  { id: 'it-support', role: 'Technical Support / IT Support Intern', summary: 'Troubleshoot technology issues and support users effectively.', keywords: ['technical support', 'it support'], steps: makeSteps(['Troubleshooting', 'Windows', 'Linux', 'Networking', 'Ticketing Tools', 'Customer Communication']) },
]
// Ranked from the 2025-2030 demand signals for AI/data, software, cloud,
// cybersecurity, product, design, and connected-device work. The skills below
// are intentionally role-specific instead of one generic skills list.
const marketRoleOrder = [
  'ai', 'data-engineer', 'genai', 'security', 'cloud', 'devops', 'software-engineering',
  'scientist', 'analyst', 'bi-developer', 'web', 'python', 'qa', 'computer-vision',
  'nlp', 'uiux', 'product', 'embedded', 'robotics', 'electrical', 'mobile', 'data-engineer',
  'blockchain', 'finance', 'digital-marketing', 'technical-writing',
]
const allRoadmaps = [...coreRoadmaps, ...additionalRoadmaps]
export const roadmaps: Roadmap[] = marketRoleOrder
  .filter((id, index, ids) => ids.indexOf(id) === index)
  .map((id, index) => {
    const roadmap = allRoadmaps.find((item) => item.id === id)
    return roadmap ? { ...roadmap, marketRank: index + 1 } : null
  })
  .filter((roadmap): roadmap is Roadmap => roadmap !== null)
export type QuizLevel = 'Beginner' | 'Intermediate' | 'Advanced'

type Verification = { skill: string; method: 'quiz' | 'github'; detail: string | null }
type GithubAnalysisSkill = { skill: string; detected: boolean; strength: 'strong' | 'weak' | null; evidence: string[] }
type GithubAnalysis = { repo_url: string; skills: GithubAnalysisSkill[]; commits: { count: number; days: number; first_date: string | null; last_date: string | null }; commit_requirement_met: boolean; verified: string[] }
type Status = 'verified' | 'claimed' | 'current' | 'next' | 'upcoming'

export function SkillRoadmap({ navigate }: { navigate: (v: View) => void }) {
  const { account, loading, resume, syncResumeSkills } = useStudentAccount()
  const [roleId, setRoleId] = useState(roadmaps[0].id)
  const [level, setLevel] = useState<QuizLevel>('Beginner')
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [startingQuizSkill, setStartingQuizSkill] = useState<string | null>(null)
  const [repoUrl, setRepoUrl] = useState('')
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubLogin, setGithubLogin] = useState<string | null>(null)
  const [githubMessage, setGithubMessage] = useState<string | null>(null)
  const [githubError, setGithubError] = useState<string | null>(null)
  const [githubAnalysis, setGithubAnalysis] = useState<GithubAnalysis | null>(null)
  const [analyzingGithub, setAnalyzingGithub] = useState(false)
  const [verifyingGithub, setVerifyingGithub] = useState(false)
  const [syncingResume, setSyncingResume] = useState(false)
  const syncedResumeId = useRef<string | null>(null)
  const rm = roadmaps.find((r) => r.id === roleId) ?? roadmaps[0]
  const known = useMemo(() => {
    const skills = new Set([
      ...(account?.skills ?? []),
      ...(account?.languages ?? []),
      ...(account?.tools ?? []),
    ].map((skill) => skill.toLowerCase()))
    if ((account?.certifications ?? []).some((certification) => /aws/i.test(certification))) skills.add('aws')
    return skills
  }, [account])

  useEffect(() => {
    const githubResult = new URLSearchParams(window.location.search).get('github')
    if (githubResult === 'connected') setGithubMessage('GitHub account connected successfully.')
    if (githubResult === 'already-linked') setGithubError('That GitHub account is already linked to another website account.')
    if (githubResult) window.history.replaceState({}, '', window.location.pathname)
    void Promise.all([
      fetch('/api/student/verifications', { cache: 'no-store' }).then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to load skill verifications.')
        setVerifications(result.verifications)
      }),
      fetch('/api/github/status', { cache: 'no-store' }).then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to load GitHub status.')
        setGithubConnected(Boolean(result.connected))
        setGithubLogin(typeof result.login === 'string' ? result.login : null)
      }),
    ]).catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Unable to load skill verification status.'))
  }, [])

  useEffect(() => {
    if (!resume || syncedResumeId.current === resume.id) return
    syncedResumeId.current = resume.id
    setSyncingResume(true)
    void syncResumeSkills()
      .catch((error: unknown) => {
        console.error('Unable to sync skills from resume:', error)
        toast.error(error instanceof Error ? `Unable to read skills from your resume: ${error.message}` : 'Unable to read skills from your resume.')
      })
      .finally(() => setSyncingResume(false))
  }, [resume, syncResumeSkills])

  const steps = useMemo(() => {
    const verified = new Map(verifications.map((item) => [item.skill.toLowerCase(), item.method]))
    const base = rm.steps.map((s) => ({
      ...s,
      method: verified.get(s.skill.toLowerCase()),
      claimed: known.has(s.skill.toLowerCase()),
    }))
    let seenCurrent = false
    let seenNext = false
    return base.map((s): typeof s & { status: Status } => {
      if (s.method) return { ...s, status: 'verified' }
      if (s.claimed) return { ...s, status: 'claimed' }
      if (!seenCurrent) {
        seenCurrent = true
        return { ...s, status: 'current' }
      }
      if (!seenNext) {
        seenNext = true
        return { ...s, status: 'next' }
      }
      return { ...s, status: 'upcoming' }
    })
  }, [rm, known, verifications])

  const completed = steps.filter((s) => s.status === 'verified')
  const current = steps.find((s) => s.status === 'current')
  const next = steps.find((s) => s.status === 'next')
  const pct = Math.round((completed.length / steps.length) * 100)

  const related = useMemo(() => {
    const roadmapSkills = new Set(rm.steps.map((s) => s.skill.toLowerCase()))
    return internships
      .map((i) => {
        const text = `${i.role} ${i.skills.join(' ')}`.toLowerCase()
        const overlap = i.skills.filter((s) => roadmapSkills.has(s.toLowerCase())).length
        const kw = rm.keywords.some((k) => text.includes(k))
        return { i, score: overlap * 2 + (kw ? 1 : 0), overlap }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [rm])

  async function startQuiz(skill: string) {
    if (startingQuizSkill) return
    setStartingQuizSkill(skill)
    try {
      navigate({ name: 'quiz', skill, level })
    } finally {
      setStartingQuizSkill(null)
    }
  }

  function connectGithub() {
    window.location.assign('/api/github/login')
  }

  async function verifyGithub(skill: string) {
    setGithubError(null)
    setVerifyingGithub(true)
    try {
      const response = await fetch('/api/github/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ skill, repo_url: repoUrl }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? result.detail ?? 'GitHub verification failed.')
      if (result.passed) {
        setVerifications((current) => [...current.filter((item) => item.skill !== skill), { skill, method: 'github', detail: repoUrl }])
        setGithubAnalysis((current) => current ? { ...current, verified: [...new Set([...current.verified, skill])] } : current)
        toast.success(`${skill} verified by GitHub project`)
      } else {
        setGithubError(result.strength !== 'strong' ? `${skill} has no strong file or dependency evidence.` : 'The repository needs at least 5 commits by you spread over 2 or more days.')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'GitHub verification failed.'
      setGithubError(message)
      throw error
    } finally {
      setVerifyingGithub(false)
    }
  }

  async function analyzeGithub() {
    setGithubError(null)
    setGithubAnalysis(null)
    setAnalyzingGithub(true)
    try {
      const response = await fetch('/api/github/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ repo_url: repoUrl }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? result.detail ?? 'GitHub analysis failed.')
      setGithubAnalysis(result as GithubAnalysis)
    } catch (error: unknown) {
      setGithubError(error instanceof Error ? error.message : 'GitHub analysis failed.')
    } finally {
      setAnalyzingGithub(false)
    }
  }

  async function disconnectGithub() {
    setGithubError(null)
    const response = await fetch('/api/github/disconnect', { method: 'DELETE' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to disconnect GitHub.')
    setGithubConnected(false)
    setGithubLogin(null)
    setGithubMessage('GitHub account disconnected.')
  }

  return (
    <>
      <PageHeader title="Skill Roadmap" description="Explore the top 25 market-demand roles and the role-specific skills to learn for each one." />

      {(loading || syncingResume) && <p className="text-sm text-muted-foreground">Reading your resume skills…</p>}

      <div className="max-w-xl">
        <label htmlFor="roadmap-role" className="mb-2 block text-sm font-medium">Choose a role</label>
        <select
          id="roadmap-role"
          className={selectClass}
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
          aria-label="Choose a role for the skill roadmap"
        >
          {roadmaps.map((r) => <option key={r.id} value={r.id}>#{r.marketRank} — {r.role}</option>)}
        </select>
        <label htmlFor="roadmap-level" className="mb-2 mt-4 block text-sm font-medium">Quiz level</label>
        <select
          id="roadmap-level"
          className={selectClass}
          value={level}
          onChange={(event) => setLevel(event.target.value as QuizLevel)}
          aria-label="Choose your quiz level"
        >
          <option value="Beginner">Beginner — fundamentals</option>
          <option value="Intermediate">Intermediate — applied scenarios</option>
          <option value="Advanced">Advanced — design and edge cases</option>
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Panel title={`${rm.role} — recommended skills`}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">Market-demand rank #{rm.marketRank}</p>
            <p className="text-sm text-muted-foreground">{rm.summary}</p>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-semibold tabular-nums">{pct}%</span>
              <span className="text-xs text-muted-foreground">
                {completed.length} of {steps.length} skills
              </span>
            </div>
            <Bar value={pct} tone={pct === 100 ? 'success' : 'primary'} className="mt-3" />
          </Panel>

          <Panel title="Where you are">
            <dl className="flex flex-col gap-4 text-sm">
              <div className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Check className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs text-muted-foreground">Completed</dt>
                  <dd className="font-medium">{completed.length ? completed.map((c) => c.skill).join(', ') : 'None yet'}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <Target className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs text-muted-foreground">Current skill</dt>
                  <dd className="font-medium">{current?.skill ?? 'All skills complete'}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
                  <Sparkles className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs text-muted-foreground">Recommended next</dt>
                  <dd className="font-medium">{next?.skill ?? 'Nothing further'}</dd>
                </div>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Learning path">
            <ol className="flex flex-col">
              {steps.map((s, idx) => (
                <li key={s.skill} className="relative flex gap-4 pb-6 last:pb-0">
                  {idx < steps.length - 1 && <span className={cn('absolute left-4 top-8 h-[calc(100%-2rem)] w-0.5 -translate-x-1/2', s.status === 'verified' ? 'bg-success' : 'bg-border')} aria-hidden="true" />}
                  <span
                    className={cn(
                      'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                      s.status === 'verified' && 'border-success bg-success text-success-foreground',
                      s.status === 'current' && 'border-primary bg-accent text-primary',
                      s.status === 'next' && 'border-warning bg-warning/15 text-warning-foreground',
                      s.status === 'upcoming' && 'border-border bg-card text-muted-foreground',
                    )}
                    aria-current={s.status === 'current' ? 'step' : undefined}
                  >
                    {s.status === 'verified' ? <Check className="size-4" aria-hidden="true" /> : idx + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {s.skill}
                        {s.status === 'current' && <span className="rounded-full border border-primary/20 bg-accent px-2 py-0.5 text-xs text-primary">Current</span>}
                        {s.status === 'next' && <span className="rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-xs text-warning-foreground">Recommended next</span>}
                        {s.status === 'verified' && <span className="text-xs font-normal text-success">Verified by {s.method === 'github' ? 'GitHub project' : 'quiz'}</span>}
                        {s.status === 'claimed' && <span className="text-xs font-normal text-warning-foreground">In resume, not verified</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.why}</p>
                    </div>
                    {s.status !== 'verified' && (
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={startingQuizSkill !== null} onClick={() => void startQuiz(s.skill).catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Unable to start the quiz.'))}>
                          {startingQuizSkill === s.skill ? 'Opening quiz…' : 'Take quiz'}
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="GitHub project verification">
            <p className="text-sm text-muted-foreground">
              Connect GitHub to verify technical skills automatically. The repository must belong to you and pass the required project checks.
            </p>
            {!githubConnected ? (
              <Button className="mt-4" onClick={connectGithub}>
                <Code2 /> Sign in with GitHub
              </Button>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm text-success">Connected as {githubLogin ?? 'your GitHub account'}</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input className={selectClass} value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/you/project" aria-label="GitHub repository URL" />
                  <Button disabled={!repoUrl || analyzingGithub || verifyingGithub} onClick={() => void analyzeGithub()}>{analyzingGithub ? 'Analyzing…' : 'Analyze repository'}</Button>
                </div>
                {githubAnalysis && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">We found these skills in your project</p>
                    <p className="mt-1 text-xs text-muted-foreground">Your commits: {githubAnalysis.commits.count} across {githubAnalysis.commits.days} day{githubAnalysis.commits.days === 1 ? '' : 's'}.</p>
                    <ul className="mt-3 flex flex-col gap-3">
                      {githubAnalysis.skills.filter((item) => item.detected).map((item) => (
                        <li key={item.skill} className="rounded-md bg-muted/40 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">{item.skill} <span className="text-xs font-normal text-muted-foreground">({item.strength ?? 'weak'} evidence)</span></span>
                            {item.strength === 'strong' && <Button size="sm" variant="outline" disabled={verifyingGithub} onClick={() => void verifyGithub(item.skill).catch(() => undefined)}>{githubAnalysis.verified.includes(item.skill) ? 'Verified' : 'Verify'}</Button>}
                          </div>
                          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">{item.evidence.map((evidence) => <li key={evidence}>• {evidence}</li>)}</ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button type="button" variant="outline" className="self-start" onClick={() => void disconnectGithub().catch((error: unknown) => setGithubError(error instanceof Error ? error.message : 'Unable to disconnect GitHub.'))}>Disconnect</Button>
              </div>
            )}
            {githubMessage && <p className="mt-3 text-sm text-success">{githubMessage}</p>}
            {githubError && <p role="alert" className="mt-3 text-sm text-destructive">{githubError}</p>}
          </Panel>

          <Panel title="Related internships" action={<Button variant="ghost" size="sm" onClick={() => navigate({ name: 'discover' })}>Browse all <ArrowRight /></Button>}>
            {related.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open internships match this role right now. Finish your current skill and check Find Internships again.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {related.map(({ i, overlap }) => (
                  <li key={i.id}>
                    <button onClick={() => navigate({ name: 'internship', id: i.id })} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-primary" aria-hidden="true">
                        {i.company.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{i.role}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {i.company} · uses {overlap} skill{overlap === 1 ? '' : 's'} from this roadmap
                        </span>
                      </span>
                      <MatchRing value={i.match} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
