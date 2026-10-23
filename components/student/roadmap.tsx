'use client'

import { useEffect, useMemo, useState } from 'react'
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
      { skill: 'SQL', why: 'Query, join, and aggregate data for analysis' },
      { skill: 'Excel and Google Sheets', why: 'Use formulas, pivot tables, and modern spreadsheet tools' },
      { skill: 'Power Query', why: 'Clean and reshape repeatable data imports' },
      { skill: 'Statistics and Experimentation', why: 'Interpret uncertainty and evaluate A/B tests' },
      { skill: 'Python', why: 'Automate analysis and build reproducible workflows' },
      { skill: 'Pandas', why: 'Transform and analyse tabular datasets' },
      { skill: 'Data Cleaning', why: 'Validate missing, duplicate, and inconsistent records' },
      { skill: 'Data Visualisation', why: 'Choose clear charts for analytical questions' },
      { skill: 'Power BI', why: 'Build interactive, shareable business dashboards' },
      { skill: 'DAX', why: 'Create measures and calculations in Power BI' },
      { skill: 'Tableau', why: 'Explore data and publish interactive visualisations' },
      { skill: 'Data Quality and Validation', why: 'Check source data and prevent misleading conclusions' },
      { skill: 'Git/GitHub', why: 'Version analysis code and collaborate on projects' },
      { skill: 'Data Storytelling', why: 'Explain findings and recommendations with evidence' },
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
      { skill: 'Probability and Statistics', why: 'Design experiments and reason about uncertainty' },
      { skill: 'Pandas', why: 'Feature preparation' },
      { skill: 'Matplotlib', why: 'Visualise analysis and model results' },
      { skill: 'Seaborn', why: 'Explore relationships and distributions with statistical charts' },
      { skill: 'Exploratory Data Analysis', why: 'Identify distributions, anomalies, and useful signals' },
      { skill: 'Feature Engineering', why: 'Create robust inputs for predictive models' },
      { skill: 'Scikit-learn', why: 'Train reproducible classical machine-learning pipelines' },
      { skill: 'Gradient Boosting (XGBoost/LightGBM)', why: 'Model structured data with high-performing tree ensembles' },
      { skill: 'Model Evaluation', why: 'Select appropriate metrics and validate generalisation' },
      { skill: 'Experiment Design and A/B Testing', why: 'Measure whether interventions cause meaningful changes' },
      { skill: 'Deep Learning with PyTorch', why: 'Build neural models for complex data' },
      { skill: 'Model Explainability', why: 'Communicate feature impact and prediction limitations' },
      { skill: 'MLflow', why: 'Track experiments and model versions' },
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
      { skill: 'React', why: 'Build maintainable component-driven interfaces' },
      { skill: 'Next.js', why: 'Build full-stack React apps with routing and server rendering' },
      { skill: 'Responsive Design', why: 'Deliver usable experiences across screen sizes' },
      { skill: 'Web Accessibility', why: 'Build interfaces that work with assistive technology' },
      { skill: 'Frontend Testing', why: 'Verify components and user flows automatically' },
      { skill: 'Node.js', why: 'Run JavaScript services and tooling on the server' },
      { skill: 'REST APIs', why: 'Connect web clients to backend services' },
      { skill: 'SQL and PostgreSQL', why: 'Persist and query relational application data' },
      { skill: 'MongoDB', why: 'Store document-oriented application data' },
      { skill: 'Authentication and OAuth', why: 'Implement secure sign-in and delegated access' },
      { skill: 'Web Performance', why: 'Improve loading speed and responsiveness' },
      { skill: 'Deployment and CI/CD', why: 'Ship tested applications reliably' },
    ],
  },
  {
    id: 'python',
    role: 'Python Developer',
    summary: 'Write clean back-end services and automation in Python.',
    keywords: ['python', 'backend', 'software'],
    steps: [
      { skill: 'Python', why: 'Language fundamentals' },
      { skill: 'Data Structures and Algorithms', why: 'Choose efficient structures and solve programming problems' },
      { skill: 'Object-Oriented and Modular Design', why: 'Organise maintainable Python applications' },
      { skill: 'Git/GitHub', why: 'Track changes and collaborate through code review' },
      { skill: 'FastAPI', why: 'Build typed, asynchronous Python APIs' },
      { skill: 'Pydantic', why: 'Validate structured data and API requests' },
      { skill: 'Django', why: 'Build complete Python web applications' },
      { skill: 'SQL and PostgreSQL', why: 'Model, query, and maintain relational data' },
      { skill: 'SQLAlchemy', why: 'Work with databases through Python ORM patterns' },
      { skill: 'REST API Design', why: 'Create consistent and versionable service interfaces' },
      { skill: 'Pytest', why: 'Write reliable unit and integration tests' },
      { skill: 'Type Hints', why: 'Make interfaces clearer and catch defects earlier' },
      { skill: 'Async Python', why: 'Handle concurrent I/O efficiently' },
      { skill: 'Logging and Observability', why: 'Diagnose failures in deployed services' },
      { skill: 'Docker', why: 'Package Python applications consistently' },
    ],
  },
  {
    id: 'ai',
    role: 'AI / ML Engineer',
    summary: 'Build and deploy machine learning and generative AI features.',
    keywords: ['machine learning', 'ai', 'pytorch', 'llm', 'rag', 'mlops'],
    steps: [
      { skill: 'Python', why: 'Core language for AI work' },
      { skill: 'Linear Algebra', why: 'Represent data and model transformations' },
      { skill: 'Probability and Statistics', why: 'Reason about uncertainty and evaluate model results' },
      { skill: 'SQL', why: 'Retrieve and prepare data for model training and analysis' },
      { skill: 'Machine Learning', why: 'Build predictive models for real-world problems' },
      { skill: 'Model Evaluation', why: 'Choose metrics and check model quality and generalisation' },
      { skill: 'PyTorch', why: 'Build and train deep-learning models' },
      { skill: 'TensorFlow', why: 'Train and deploy deep-learning models' },
      { skill: 'Hugging Face Transformers', why: 'Use and adapt pretrained language and vision models' },
      { skill: 'Natural Language Processing', why: 'Process and model text and language data' },
      { skill: 'Computer Vision', why: 'Build models for image and video data' },
      { skill: 'LLM Application Development', why: 'Build software features powered by large language models' },
      { skill: 'Prompt Engineering', why: 'Design and test instructions for reliable model outputs' },
      { skill: 'Retrieval-Augmented Generation (RAG)', why: 'Ground language-model answers in trusted documents' },
      { skill: 'Vector Databases', why: 'Store and retrieve semantically similar content' },
      { skill: 'LLM Evaluation', why: 'Measure answer quality, relevance, and safety systematically' },
      { skill: 'LLM Fine-tuning (LoRA/PEFT)', why: 'Adapt pretrained models efficiently for specific tasks' },
      { skill: 'Model Serving with FastAPI', why: 'Expose models through production-ready APIs' },
      { skill: 'Docker', why: 'Package model services consistently across environments' },
      { skill: 'MLflow', why: 'Track experiments, model versions, and deployments' },
      { skill: 'Monitoring and Observability', why: 'Detect model quality, latency, and reliability issues' },
      { skill: 'Cloud Deployment', why: 'Run model workloads on scalable cloud infrastructure' },
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
      { skill: 'AWS', why: 'Deploy and operate cloud workloads on a major platform' },
      { skill: 'Azure or GCP', why: 'Understand cloud services beyond one provider' },
      { skill: 'Linux', why: 'Operate and troubleshoot cloud-hosted systems' },
      { skill: 'Networking and DNS', why: 'Connect services securely and diagnose connectivity' },
      { skill: 'IAM and Least Privilege', why: 'Grant only necessary identities and permissions' },
      { skill: 'Cloud Networking', why: 'Configure virtual networks, routing, and firewalls' },
      { skill: 'Containers with Docker', why: 'Package and run workloads consistently' },
      { skill: 'Kubernetes', why: 'Operate container workloads and deployments' },
      { skill: 'Terraform', why: 'Provision repeatable infrastructure as code' },
      { skill: 'CI/CD', why: 'Automate tested infrastructure and application releases' },
      { skill: 'Cloud Monitoring and Logging', why: 'Observe health, latency, and resource usage' },
      { skill: 'Backup and Disaster Recovery', why: 'Protect data and restore services after failures' },
      { skill: 'Cloud Cost Management', why: 'Track usage and avoid unnecessary spend' },
    ],
  },
  {
    id: 'security',
    role: 'Cybersecurity',
    summary: 'Protect systems and data by finding and fixing weaknesses.',
    keywords: ['security', 'cyber'],
    steps: [
      { skill: 'Networking and Linux Fundamentals', why: 'Understand systems, protocols, and security telemetry' },
      { skill: 'Security Fundamentals', why: 'Apply threat, risk, and control concepts' },
      { skill: 'Identity and Access Management', why: 'Protect accounts with least privilege and MFA' },
      { skill: 'Web Application Security', why: 'Apply OWASP guidance and secure coding practices' },
      { skill: 'Vulnerability Management', why: 'Prioritise remediation based on risk and exposure' },
      { skill: 'Python and Bash', why: 'Automate defensive analysis and routine response tasks' },
      { skill: 'Wireshark', why: 'Analyse network traffic for suspicious behaviour' },
      { skill: 'SIEM (Microsoft Sentinel/Splunk)', why: 'Correlate events and investigate security alerts' },
      { skill: 'Endpoint Detection and Response', why: 'Investigate and contain endpoint threats' },
      { skill: 'Cloud Security', why: 'Review cloud identities, configurations, and audit logs' },
      { skill: 'Incident Response', why: 'Triage, contain, and document security incidents' },
      { skill: 'Threat Modelling', why: 'Identify likely abuse cases before deployment' },
      { skill: 'Security Frameworks (NIST/ISO 27001)', why: 'Map controls to recognised security standards' },
    ],
  },
]

const makeSteps = (skills: string[]) => skills.map((skill) => ({ skill, why: `Build ${skill} capability for this role` }))
const additionalRoadmaps: Roadmap[] = [
  { id: 'software-engineering', role: 'Software Engineering / SDE Intern', summary: 'Build reliable software from fundamentals through testing.', keywords: ['software', 'sde', 'engineering'], steps: makeSteps(['Java', 'Python', 'JavaScript/TypeScript', 'Data Structures and Algorithms', 'Object-Oriented Design', 'System Design Fundamentals', 'SQL and DBMS', 'Operating Systems', 'Computer Networks', 'REST APIs', 'Git/GitHub', 'Unit and Integration Testing', 'CI/CD', 'Debugging']) },
  { id: 'mobile', role: 'Android / Mobile App Developer Intern', summary: 'Build and publish mobile applications across popular platforms.', keywords: ['android', 'mobile', 'app'], steps: makeSteps(['Kotlin', 'Jetpack Compose', 'Android Studio', 'App Architecture (MVVM)', 'Navigation and State Management', 'REST APIs and JSON', 'Room and SQLite', 'Firebase', 'Coroutines and Flow', 'Mobile UI Testing', 'Git/GitHub', 'App Signing and Publishing']) },
  { id: 'devops', role: 'DevOps Intern', summary: 'Automate delivery and operate reliable development infrastructure.', keywords: ['devops', 'ci/cd', 'cloud'], steps: makeSteps(['Linux', 'Bash and Python Scripting', 'Git/GitHub', 'GitHub Actions or Jenkins', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Helm', 'Cloud Fundamentals (AWS/Azure/GCP)', 'Prometheus and Grafana', 'Log Aggregation', 'Secrets Management', 'SRE and Incident Response']) },
  { id: 'qa', role: 'Software Testing / QA Intern', summary: 'Plan, automate, and report software quality throughout the lifecycle.', keywords: ['qa', 'testing', 'quality'], steps: makeSteps(['Test Planning and Risk-Based Testing', 'Test Cases and Bug Reports', 'Manual and Exploratory Testing', 'API Testing with Postman', 'Playwright', 'Cypress or Selenium', 'Pytest or Jest', 'SQL for Test Data', 'Accessibility Testing', 'Performance Testing Fundamentals', 'CI Test Pipelines', 'Jira']) },
  { id: 'game', role: 'Game Developer Intern', summary: 'Create interactive games with engines, physics, and real-time systems.', keywords: ['game', 'unity', 'unreal'], steps: makeSteps(['C#', 'Unity', 'C++', 'Unreal Engine', 'Game Programming Patterns', '3D Mathematics and Linear Algebra', 'Physics and Collision Systems', 'Animation and State Machines', 'Shaders and Materials', 'Profiling and Optimisation', 'Git and Version Control']) },
  { id: 'blockchain', role: 'Blockchain Developer Intern', summary: 'Build decentralised applications and smart contracts.', keywords: ['blockchain', 'web3', 'solidity'], steps: makeSteps(['Solidity', 'EVM and Ethereum Fundamentals', 'Smart Contract Security', 'Foundry or Hardhat', 'Unit and Fuzz Testing', 'Ethers.js or Viem', 'Wallet Integration', 'Web3.js', 'Layer 2 Networks', 'Decentralised Application Design', 'Git/GitHub']) },
  { id: 'data-engineer', role: 'Data Engineer Intern', summary: 'Build data pipelines and platforms that make analytics possible.', keywords: ['data engineer', 'etl', 'spark'], steps: makeSteps(['Python', 'Advanced SQL', 'Data Modelling', 'ETL/ELT Pipelines', 'dbt', 'Apache Spark', 'Kafka and Streaming', 'Airflow or Dagster', 'Data Warehousing (BigQuery/Snowflake)', 'Data Quality Testing', 'Cloud Storage and IAM', 'Git and CI/CD']) },
  { id: 'bi-developer', role: 'Business Intelligence (BI) Developer Intern', summary: 'Turn enterprise data into governed dashboards and KPIs.', keywords: ['business intelligence', 'bi', 'dashboard'], steps: makeSteps(['SQL', 'Dimensional Data Modelling', 'Power BI', 'DAX', 'Power Query', 'Tableau', 'Dashboard UX and Accessibility', 'KPI Design', 'Data Warehousing', 'Row-Level Security', 'Data Validation', 'Stakeholder Reporting']) },
  { id: 'genai', role: 'Generative AI / Prompt Engineering Intern', summary: 'Build useful applications with LLMs, retrieval, and evaluation.', keywords: ['generative ai', 'prompt', 'llm'], steps: makeSteps(['Python', 'LLM APIs and Structured Outputs', 'Prompt Design and Versioning', 'Embeddings and Semantic Search', 'RAG Pipeline Design', 'Vector Databases', 'LangChain or LlamaIndex', 'Reranking and Hybrid Retrieval', 'LLM Evaluation and Observability', 'Guardrails and Prompt Injection Defense', 'Cost and Latency Optimisation', 'FastAPI and Docker']) },
  { id: 'computer-vision', role: 'Computer Vision Intern', summary: 'Teach systems to understand images and video.', keywords: ['computer vision', 'opencv', 'image'], steps: makeSteps(['Python', 'OpenCV', 'Image Processing', 'PyTorch', 'CNNs and Vision Transformers', 'Object Detection', 'Image Segmentation', 'Dataset Curation and Annotation', 'Augmentation and Evaluation Metrics', 'ONNX and Model Optimisation', 'Edge Deployment', 'Experiment Tracking']) },
  { id: 'nlp', role: 'NLP Intern', summary: 'Build systems that understand and generate human language.', keywords: ['nlp', 'natural language', 'transformers'], steps: makeSteps(['Python', 'Text Preprocessing and Tokenisation', 'Embeddings and Semantic Search', 'Transformers', 'Hugging Face', 'Text Classification', 'Named Entity Recognition', 'Information Extraction', 'LLM Evaluation', 'Retrieval-Augmented Generation', 'Dataset Quality and Bias Checks', 'Model Serving']) },
  { id: 'uiux', role: 'UI/UX Design Intern', summary: 'Design usable, accessible, and consistent digital experiences.', keywords: ['ui', 'ux', 'design'], steps: makeSteps(['User-Centred Design', 'User Research and Interviews', 'Journey Mapping', 'Wireframing', 'Figma Components and Auto Layout', 'Interactive Prototyping', 'Usability Testing', 'Accessibility (WCAG)', 'Design Systems', 'Responsive UI Patterns', 'Design Handoff', 'HTML and CSS Fundamentals']) },
  { id: 'graphic-design', role: 'Graphic Design Intern', summary: 'Create visual identities and communication assets.', keywords: ['graphic design', 'visual design'], steps: makeSteps(['Adobe Photoshop', 'Adobe Illustrator', 'Figma', 'Canva', 'Typography and Layout', 'Brand Identity Systems', 'Colour Management', 'Social Media Creative Formats', 'Print Production and Prepress', 'Image Licensing and Asset Management']) },
  { id: 'product', role: 'Product Management Intern', summary: 'Discover problems, prioritise opportunities, and guide product delivery.', keywords: ['product', 'management'], steps: makeSteps(['User Interviews and Research Synthesis', 'Problem Framing and Opportunity Assessment', 'Product Requirements and User Stories', 'Prioritisation (RICE/MoSCoW)', 'Roadmapping and Backlog Management', 'Product Analytics and Funnels', 'SQL Fundamentals', 'A/B Testing and Experiment Design', 'Jira or Linear', 'Prototyping with Figma', 'Go-to-Market Fundamentals', 'AI Product Evaluation and Risk']) },
  { id: 'video', role: 'Video Editing / Motion Graphics Intern', summary: 'Produce engaging video and motion content for digital audiences.', keywords: ['video', 'motion', 'editing'], steps: makeSteps(['Adobe Premiere Pro', 'DaVinci Resolve', 'After Effects', 'Editing Workflow and Story Structure', 'Colour Grading and Colour Management', 'Audio Editing and Mixing', 'Motion Graphics and Compositing', 'Captions and Accessibility', 'Short-Form Platform Formats', 'Export Codecs and Delivery Specs', 'Asset and Project Management']) },
  { id: 'embedded', role: 'Embedded Systems / IoT Intern', summary: 'Connect hardware, sensors, and software in embedded products.', keywords: ['embedded', 'iot', 'arduino'], steps: makeSteps(['C and Modern C++', 'Microcontroller Architecture', 'ESP32 or STM32', 'RTOS and Task Scheduling', 'I2C, SPI, and UART', 'Sensor Integration and Calibration', 'MQTT and IoT Messaging', 'Embedded Debugging with JTAG/SWD', 'Power and Memory Optimisation', 'PCB Design Fundamentals', 'Secure Firmware Updates', 'Hardware-in-the-Loop Testing']) },
  { id: 'vlsi', role: 'VLSI / Electronics Design Intern', summary: 'Design, simulate, and validate digital electronic systems.', keywords: ['vlsi', 'electronics', 'fpga'], steps: makeSteps(['Digital Logic Design', 'Verilog or SystemVerilog', 'RTL Design and Simulation', 'Verification and Testbenches', 'FPGA Prototyping (Xilinx/Intel)', 'Synthesis and Timing Analysis', 'Static Timing Analysis', 'Linux and EDA Toolflows', 'Cadence or Synopsys Tools', 'SPICE and Circuit Simulation', 'Git for Hardware Projects']) },
  { id: 'electrical', role: 'Electrical Engineering Intern', summary: 'Apply electrical systems knowledge to practical engineering projects.', keywords: ['electrical', 'power systems'], steps: makeSteps(['Circuit Analysis and Simulation', 'Power Systems Fundamentals', 'MATLAB and Simulink', 'AutoCAD Electrical or EPLAN', 'PLC Programming', 'SCADA and HMI Systems', 'Power Electronics', 'Electrical Protection and Grounding', 'Energy Audits and Efficiency', 'Electrical Safety Standards', 'Instrumentation and Testing']) },
  { id: 'mechanical', role: 'Mechanical Design Intern', summary: 'Design manufacturable mechanical components and assemblies.', keywords: ['mechanical', 'cad', 'design'], steps: makeSteps(['3D CAD (SolidWorks/Fusion 360)', 'Engineering Drawings and GD&T', 'Design for Manufacturing and Assembly', 'Finite Element Analysis', 'ANSYS or SolidWorks Simulation', 'Tolerance Stack-Up', 'Materials Selection', 'Rapid Prototyping and 3D Printing', 'Manufacturing Processes', 'Product Lifecycle Management', 'Design Validation and Testing']) },
  { id: 'civil', role: 'Civil / Structural Engineering Intern', summary: 'Plan, model, and supervise safe civil and structural works.', keywords: ['civil', 'structural', 'construction'], steps: makeSteps(['AutoCAD and Civil 3D', 'Revit and BIM Coordination', 'Structural Analysis (STAAD.Pro/ETABS)', 'Surveying and Total Station', 'Construction Estimation and BOQ', 'Concrete and Construction Materials', 'Quantity Surveying', 'Project Scheduling (Primavera/MS Project)', 'Site Quality and Safety Checks', 'Geotechnical Fundamentals', 'Building Codes and Documentation']) },
  { id: 'robotics', role: 'Robotics / Automation Intern', summary: 'Build autonomous systems using software, sensors, and control.', keywords: ['robotics', 'automation', 'ros'], steps: makeSteps(['Python and C++', 'ROS 2', 'Robot Kinematics and Dynamics', 'Control Systems', 'Sensors and Sensor Fusion', 'Computer Vision', 'Motion Planning and Navigation', 'Gazebo or Isaac Sim', 'Embedded Systems (Arduino/STM32)', 'Actuators and Motor Control', 'Real-Time Debugging', 'Autonomous System Testing']) },
  { id: 'business-development', role: 'Business Development Intern', summary: 'Find opportunities and grow relationships with customers and partners.', keywords: ['business development', 'sales'], steps: makeSteps(['Ideal Customer Profile and Account Research', 'Lead Qualification and Pipeline Management', 'CRM (Salesforce/HubSpot)', 'Outbound Email and Outreach', 'Discovery Calls and Needs Analysis', 'Sales Enablement and Proposals', 'Market and Competitor Research', 'Forecasting and Funnel Analytics', 'Partnership Development', 'Negotiation and Contract Handoffs']) },
  { id: 'finance', role: 'Finance / Financial Analyst Intern', summary: 'Use financial data to support planning, valuation, and decisions.', keywords: ['finance', 'financial analyst'], steps: makeSteps(['Advanced Excel and Google Sheets', 'Financial Statement Analysis', 'Financial Modelling and Forecasting', 'Accounting Principles', 'Budgeting and Variance Analysis', 'Valuation and DCF', 'Ratio and Sensitivity Analysis', 'Power BI or Tableau', 'SQL for Financial Data', 'Tally or ERP Fundamentals', 'Financial Data Reconciliation', 'Indian Tax and GST Fundamentals']) },
  { id: 'audit', role: 'Accounting / Audit Intern', summary: 'Maintain accurate records and support compliant financial reporting.', keywords: ['accounting', 'audit'], steps: makeSteps(['Accounting Principles and Bookkeeping', 'Excel and Spreadsheet Controls', 'Tally Prime or Zoho Books', 'GST Returns and Reconciliation', 'Accounts Payable and Receivable', 'Bank and Ledger Reconciliation', 'Audit Evidence and Workpapers', 'Internal Controls and Risk', 'Financial Statement Preparation', 'Tax Documentation', 'ERP and Accounting Systems']) },
  { id: 'hr', role: 'Human Resources (HR) Intern', summary: 'Support people operations from recruitment through onboarding.', keywords: ['human resources', 'hr', 'recruitment'], steps: makeSteps(['Applicant Tracking Systems', 'Recruitment Operations and Sourcing', 'Structured Interview Coordination', 'HRIS and People Data', 'Onboarding Workflows', 'Payroll and Attendance Systems', 'Excel and HR Reporting', 'Employment Documentation', 'HR Policy and Compliance Basics', 'Data Privacy and Confidentiality', 'Learning Management Systems']) },
  { id: 'operations', role: 'Operations / Supply Chain Intern', summary: 'Improve processes, inventory, suppliers, and logistics.', keywords: ['operations', 'supply chain', 'logistics'], steps: makeSteps(['Process Mapping and SOPs', 'Advanced Excel and Google Sheets', 'Inventory Planning and Forecasting', 'ERP (SAP/Oracle)', 'Procurement and Purchase Orders', 'Supplier Performance Analysis', 'Logistics and Freight Fundamentals', 'Demand Planning', 'Power BI and Operations Dashboards', 'Lean and Root Cause Analysis', 'Warehouse Management Systems', 'Supply Chain Risk']) },
  { id: 'consulting', role: 'Consulting / Research Intern', summary: 'Structure ambiguous problems and turn research into recommendations.', keywords: ['consulting', 'research'], steps: makeSteps(['Structured Problem Solving', 'Primary and Secondary Research', 'Market Sizing and Competitive Analysis', 'Excel Modelling and Data Analysis', 'SQL and BI Fundamentals', 'Hypothesis-Driven Analysis', 'PowerPoint Storylining', 'Source Evaluation and Fact Checking', 'Survey and Interview Design', 'Report Writing and Recommendations', 'AI-Assisted Research Verification']) },
  { id: 'digital-marketing', role: 'Digital Marketing Intern', summary: 'Grow audiences through search, campaigns, content, and measurement.', keywords: ['digital marketing', 'seo', 'marketing'], steps: makeSteps(['Technical and On-Page SEO', 'Google Search Console', 'Google Ads and Campaign Measurement', 'GA4 and Conversion Tracking', 'Paid Social Campaigns', 'Email Automation and Segmentation', 'Landing Page Optimisation', 'A/B Testing', 'Content Strategy and SEO Briefs', 'Marketing Attribution and UTM Tagging', 'CRM and Marketing Automation', 'Privacy-Aware Analytics']) },
  { id: 'social-media', role: 'Social Media Management Intern', summary: 'Plan content and build engaged communities across platforms.', keywords: ['social media', 'content'], steps: makeSteps(['Platform-Specific Content Strategy', 'Editorial Calendars and Scheduling', 'Short-Form Video (Reels/Shorts)', 'Canva and CapCut', 'Social Copywriting and Hooks', 'Community Moderation', 'Social Listening', 'Platform Analytics and Reporting', 'Creator Collaboration', 'Accessibility and Captions', 'Brand Safety and Disclosure']) },
  { id: 'content-writing', role: 'Content Writing / Copywriting Intern', summary: 'Research and write clear content for different audiences and channels.', keywords: ['content writing', 'copywriting'], steps: makeSteps(['Audience and Intent Research', 'SEO Content Briefs', 'Clear Drafting and Editing', 'Fact Checking and Source Attribution', 'Brand Voice and Style Guides', 'Content Management Systems', 'Web Accessibility and Readability', 'Content Refresh and Performance Analysis', 'AI-Assisted Draft Review', 'Copyright and Plagiarism Awareness']) },
  { id: 'technical-writing', role: 'Technical Writing Intern', summary: 'Make technical products understandable through clear documentation.', keywords: ['technical writing', 'documentation'], steps: makeSteps(['Markdown and Documentation-as-Code', 'API Documentation (OpenAPI)', 'Git and Pull Request Workflows', 'Developer Guides and Tutorials', 'Information Architecture', 'Diagrams (Mermaid)', 'Versioning and Release Notes', 'Docs Testing and Link Checking', 'Basic HTML and CSS', 'Technical Editing and Style Guides', 'Accessibility and Localization Readiness']) },
  { id: 'pr', role: 'Public Relations / Communications Intern', summary: 'Shape messages, coordinate events, and build trusted public relationships.', keywords: ['public relations', 'communications'], steps: makeSteps(['Press Releases and Media Briefs', 'Media Database and Outreach', 'Message Development and Brand Voice', 'Media Monitoring and Coverage Reporting', 'Crisis Communications Fundamentals', 'Fact Checking and Approval Workflows', 'Event and Launch Coordination', 'Social Media Communications', 'Spokesperson Briefing Materials', 'Disclosure and Communications Compliance']) },
  { id: 'it-support', role: 'Technical Support / IT Support Intern', summary: 'Troubleshoot technology issues and support users effectively.', keywords: ['technical support', 'it support'], steps: makeSteps(['Windows 11 and Linux Fundamentals', 'Networking and DNS Troubleshooting', 'Microsoft 365 or Google Workspace Administration', 'Identity, MFA, and Access Management', 'Endpoint Management (Intune/Jamf)', 'Ticketing and ITSM (ServiceNow/Jira)', 'PowerShell or Bash Scripting', 'Backup and Device Recovery', 'Security Awareness and Phishing Triage', 'Knowledge Base Documentation', 'Remote Support and Diagnostics']) },
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
  .map((id) => allRoadmaps.find((item) => item.id === id))
  .filter((roadmap): roadmap is Roadmap => roadmap !== undefined)
  .map((roadmap, index) => ({ ...roadmap, marketRank: index + 1 }))
export type QuizLevel = 'Beginner' | 'Intermediate' | 'Advanced'

type Verification = { skill: string; method: 'quiz' | 'github'; detail: string | null }
type GithubAnalysisSkill = { skill: string; detected: boolean; strength: 'strong' | 'weak' | null; evidence: string[] }
type GithubAnalysis = { repo_url: string; skills: GithubAnalysisSkill[]; commits: { count: number; days: number; first_date: string | null; last_date: string | null }; commit_requirement_met: boolean; verified: string[] }
type Status = 'verified' | 'claimed' | 'current' | 'next' | 'upcoming'

export function SkillRoadmap({ navigate }: { navigate: (v: View) => void }) {
  const { account, loading, resume, syncResumeSkills } = useStudentAccount()
  const [roleId, setRoleId] = useState(roadmaps[0].id)
  const [marketRoadmaps, setMarketRoadmaps] = useState<Roadmap[] | null>(null)
  const [marketSources, setMarketSources] = useState<{ title: string; url: string }[]>([])
  const [marketUpdatedAt, setMarketUpdatedAt] = useState<string | null>(null)
  const [marketIsCurrent, setMarketIsCurrent] = useState(false)
  const [marketLoaded, setMarketLoaded] = useState(false)
  const [marketRefreshError, setMarketRefreshError] = useState<string | null>(null)
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
  const displayedRoadmaps = marketRoadmaps ?? roadmaps
  const rm = displayedRoadmaps.find((r) => r.id === roleId) ?? displayedRoadmaps[0]
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
    let active = true
    void fetch('/api/student/roadmaps/monthly', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roadmaps }),
    }).then(async (response) => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? result.detail ?? 'Unable to load monthly market roadmaps.')
      if (!active) return
      const generatedRoadmaps = result.roadmaps as Roadmap[]
      setMarketRoadmaps(generatedRoadmaps)
      setRoleId((current) =>
        generatedRoadmaps.some((roadmap) => roadmap.id === current)
          ? current
          : generatedRoadmaps[0]?.id ?? current,
      )
      setMarketSources(result.sources ?? [])
      setMarketUpdatedAt(result.updatedAt)
      setMarketIsCurrent(Boolean(result.isCurrent))
      setMarketRefreshError(typeof result.refreshError === 'string' ? result.refreshError : null)
    }).catch((error: unknown) => {
      if (active) toast.error(error instanceof Error ? error.message : 'Unable to refresh market roadmaps.')
    }).finally(() => {
      if (active) setMarketLoaded(true)
    })
    return () => { active = false }
  }, [])

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

  async function syncSkillsFromResume() {
    if (syncingResume) return
    setSyncingResume(true)
    try {
      const detectedSkills = await syncResumeSkills()
      if (detectedSkills.length) {
        toast.success(`Checked your resume for skills (${detectedSkills.length} detected).`)
      } else {
        toast('No additional skills were detected in your resume.')
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? `Unable to read skills from your resume: ${error.message}` : 'Unable to read skills from your resume.')
    } finally {
      setSyncingResume(false)
    }
  }

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

      {loading && <p className="text-sm text-muted-foreground">Loading your student details…</p>}
      {resume && (
        <Button variant="outline" className="mb-4" onClick={() => void syncSkillsFromResume()} disabled={loading || syncingResume}>
          {syncingResume ? 'Reading resume skills…' : 'Sync skills from resume'}
        </Button>
      )}

      <div className="max-w-xl">
        <label htmlFor="roadmap-role" className="mb-2 block text-sm font-medium">Choose a role</label>
        <select
          id="roadmap-role"
          className={selectClass}
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
          aria-label="Choose a role for the skill roadmap"
        >
          {displayedRoadmaps.map((r) => <option key={r.id} value={r.id}>#{r.marketRank} — {r.role}</option>)}
        </select>
        <div className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {!marketLoaded
            ? 'Loading monthly India market research; curated skills are shown meanwhile.'
            : marketIsCurrent && marketUpdatedAt
              ? `India market research updated ${new Date(marketUpdatedAt).toLocaleDateString()}.`
              : marketUpdatedAt
                ? `Showing saved India market research from ${new Date(marketUpdatedAt).toLocaleDateString()}; this month’s refresh is unavailable. ${marketRefreshError ?? ''}`
                : `Market refresh unavailable; showing the curated roadmap. ${marketRefreshError ?? ''}`}
          {marketSources.length > 0 && <p className="mt-1">Sources: {marketSources.slice(0, 5).map((source, index) => <span key={source.url}>{index > 0 ? ' · ' : ''}<a className="underline underline-offset-2" href={source.url} target="_blank" rel="noreferrer">{source.title}</a></span>)}</p>}
        </div>
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
