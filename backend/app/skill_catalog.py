from __future__ import annotations

# This is the server-side allowlist. Keep it in sync with the published roadmap
# catalogue; clients are never trusted to define a skill.
SKILLS = frozenset(
    {
        "Excel", "SQL", "Statistics", "Python", "Pandas", "NumPy", "Power BI", "Tableau",
        "Data Cleaning", "Data Storytelling", "Probability", "Matplotlib", "Seaborn",
        "Machine Learning", "Feature Engineering", "Model Evaluation", "Deep Learning",
        "HTML", "CSS", "JavaScript", "TypeScript", "Git", "React", "Angular", "Vue",
        "Node.js", "Express", "Django", "Spring Boot", "MongoDB", "REST APIs", "GraphQL",
        "Authentication", "Deployment", "Data Structures", "Algorithms", "OOP", "Flask",
        "FastAPI", "Databases", "ORMs", "Testing", "Debugging", "Automation Scripting",
        "Linear Algebra", "Calculus", "TensorFlow", "PyTorch", "NLP", "Computer Vision",
        "Docker", "MLOps", "LLMs", "Linux", "Networking", "Wireshark", "AWS", "Azure", "GCP",
        "IAM", "Bash", "Kubernetes", "Terraform", "CI/CD", "Security Basics",
        "OWASP Top 10", "Java", "C++", "System Design", "DBMS", "Operating Systems",
        "Unit Testing", "Kotlin", "Swift", "Flutter", "React Native", "JSON", "SQLite",
        "Firebase", "Jenkins", "GitHub Actions", "Ansible", "Prometheus", "Grafana",
        "Postman", "Selenium", "Cypress", "Playwright", "PyTest", "C#", "ETL",
        "Data Warehousing", "Apache Spark", "Kafka", "Airflow", "BigQuery", "Redshift",
        "Azure Data Factory", "Data Modeling", "DAX", "Dashboard Design", "KPI Definition",
        "Prompt Engineering", "RAG", "Vector Databases", "LangChain", "LlamaIndex",
        "Fine-tuning", "LLM Evaluation", "OpenCV", "Image Processing", "CNNs",
        "Object Detection", "Segmentation", "Embeddings", "Transformers", "Hugging Face",
        "Text Classification", "NER", "Summarization", "Evaluation Metrics",
        "Design Principles", "Typography", "Color Theory", "User Research", "Personas",
        "Wireframing", "Figma", "Adobe XD", "Prototyping", "Usability Testing",
        "Design Systems", "Photoshop", "Illustrator", "Canva", "Branding",
        "Social Media Creatives", "Product Thinking", "Market Analysis",
        "Competitor Analysis", "Roadmapping", "Prioritization", "Product Analytics",
        "Notion", "Communication", "Stakeholder Management", "Storytelling", "C",
        "Arduino", "ESP32", "STM32", "Sensors", "I2C", "SPI", "UART", "MQTT", "RTOS",
        "PCB Design", "Digital Electronics", "Verilog", "VHDL", "FPGA", "Circuit Analysis",
        "MATLAB", "Simulink", "PLC", "SCADA", "Electrical Safety", "AutoCAD",
        "SolidWorks", "CATIA", "Fusion 360", "GD&T", "Engineering Drawing", "FEA",
        "ANSYS", "Manufacturing Processes", "Revit", "Surveying", "Construction Materials",
        "ROS", "Actuators", "Control Systems", "Lead Generation", "Cold Outreach", "CRM",
        "Negotiation", "Market Research", "Presentation Skills", "Advanced Excel",
        "Financial Modeling", "Accounting Basics", "Financial Statements", "Valuation",
        "Ratio Analysis", "Bookkeeping", "Recruitment", "Candidate Screening",
        "Interview Coordination", "HR Policies", "Onboarding", "Payroll Basics", "HRIS",
        "Confidentiality", "Process Mapping", "Inventory Management", "Data Analysis",
        "SAP", "Vendor Coordination", "Logistics", "Structured Problem Solving",
        "PowerPoint", "Data Interpretation", "Report Writing", "SEO", "SEM", "Google Ads",
        "Social Media Marketing", "Email Marketing", "Google Analytics", "Content Planning",
        "A/B Testing", "Content Calendars", "Platform Algorithms", "Copywriting",
        "Engagement Analytics", "Community Management", "Writing and Editing", "SEO Writing",
        "Research", "Tone Adaptation", "WordPress", "Documentation", "API Documentation",
        "Markdown", "Structured Writing", "Press Releases", "Media Outreach",
        "Event Coordination", "Brand Messaging", "Troubleshooting", "Windows",
        "Ticketing Tools", "Customer Communication", "Customer Onboarding", "Problem Solving",
        "Product Knowledge", "Subject Knowledge", "Explaining Concepts", "Content Creation",
        "Doubt Solving", "LMS Tools", "Legal Research", "Legal Drafting", "Contract Basics",
        "Compliance Awareness", "Teamwork", "Time Management", "Google Sheets",
        "Email Etiquette", "Data Visualisation", "Reporting", "Git/GitHub",
        "Data Structures and Algorithms", "Security Fundamentals", "APIs", "Compute",
        "Storage", "JWT", "OAuth", "CMS", "Basic Coding",
    }
)

TECHNICAL_SKILLS = frozenset(
    skill
    for skill in SKILLS
    if skill not in {
        "Negotiation", "Typography", "Surveying", "Communication", "Stakeholder Management",
        "Presentation Skills", "Recruitment", "Candidate Screening", "Interview Coordination",
        "HR Policies", "Onboarding", "Confidentiality", "Vendor Coordination",
        "Lead Generation", "Cold Outreach", "Market Research", "Email Etiquette",
        "Teamwork", "Time Management", "Writing and Editing", "Tone Adaptation",
    }
)

KEYWORDS = {
    "Python": ("python", "py"),
    "JavaScript": ("javascript", "js", "node"),
    "TypeScript": ("typescript", "ts"),
    "React": ("react",),
    "SQL": ("sql", "database"),
    "Django": ("django",),
    "FastAPI": ("fastapi",),
    "Machine Learning": ("machine learning", "ml"),
    "Docker": ("docker", "container"),
    "Kubernetes": ("kubernetes", "k8s"),
    "AWS": ("aws", "amazon web services"),
    "Azure": ("azure",),
    "GCP": ("gcp", "google cloud"),
}
