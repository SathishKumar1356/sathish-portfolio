
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Atom,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  GraduationCap,
  Layers3,
  Layers,
  Mail,
  MapPinned,
  Menu,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

const projects = [
  {
    name: "EcoPantryPal",
    category: "Mobile",
    icon: "mobile",
    color: "blue",
    tagline: "AI-powered pantry management",
    description:
      "A mobile application that helps users manage pantry items through receipt scanning, barcode integrations, and intelligent product normalization.",
    work: [
      "Integrated receipt-scanning services and AI-based data normalization.",
      "Worked on iOS application build generation and configuration.",
      "Configured provisioning profiles and certificates for iOS builds.",
      "Worked with mobile application features and push notifications.",
    ],
    tech: ["OutSystems 11", "REST APIs", "OpenAI", "iOS", "Firebase"],
  },
  {
    name: "EduLearn",
    category: "Education",
    icon: "education",
    color: "purple",
    tagline: "Connected school learning platform",
    description:
      "A school education platform covering student enrollment, online courses, quizzes, examinations, payments, and transport visibility.",
    work: [
      "Integrated payment services into the school application.",
      "Implemented live bus tracking with route and polygon-based tracking concepts.",
      "Supported parent notifications for student transport journeys.",
      "Worked on course enrollment, quizzes, exams, and retake workflows.",
    ],
    tech: ["OutSystems", "REST APIs", "Maps", "Payments", "Notifications"],
  },
  {
    name: "OIA eLearning",
    category: "Enterprise",
    icon: "education",
    color: "purple",
    tagline: "Course management and video learning",
    description:
      "An enterprise learning platform with course management and video playback, including tracking of user viewing progress.",
    work: [
      "Worked on course management functionality.",
      "Implemented video playback and viewing-progress tracking.",
      "Worked with video completion and resume-position logic.",
      "Supported the learning experience within the enterprise application.",
    ],
    tech: ["OutSystems 11", "Video", "JavaScript", "Database"],
  },
  {
    name: "Delegation of Authority",
    category: "Enterprise",
    icon: "workflow",
    color: "blue",
    tagline: "Performance-focused enterprise workflows",
    description:
      "An enterprise application supporting delegation and authority workflows, with a focus on performance improvements.",
    work: [
      "Investigated slow server-side actions and data retrieval.",
      "Reviewed aggregates, list processing, and nested category logic.",
      "Optimized server-action execution and database access patterns.",
      "Worked on reducing redundant calls and improving responsiveness.",
    ],
    tech: ["OutSystems", "SQL", "Aggregates", "Performance", "Indexing"],
  },
  {
    name: "Live 3D AI Conversation",
    category: "AI & Automation",
    icon: "ai",
    color: "purple",
    tagline: "Conversational AI with an animated avatar",
    description:
      "An AI-enabled conversational experience combining a chat interface with a live, animated 3D-style avatar.",
    work: [
      "Explored AI conversational experiences and avatar integrations.",
      "Worked with real-time voice and avatar service integrations.",
      "Connected conversational experiences with external AI services.",
    ],
    tech: ["OutSystems", "AI APIs", "D-ID", "ElevenLabs", "REST"],
  },
  {
    name: "Live Polygon Tracking",
    category: "Maps & Tracking",
    icon: "maps",
    color: "blue",
    tagline: "Location-aware tracking experiences",
    description:
      "Map-based tracking functionality involving geographic boundaries, routes, and location visualization.",
    work: [
      "Worked with map-based application integrations.",
      "Explored polygon-based geographic visualization.",
      "Integrated location and route-related information into application workflows.",
    ],
    tech: ["Google Maps", "Mapbox", "REST APIs", "Geolocation"],
  },
  {
    name: "Binary Client-Side Encryption",
    category: "Security",
    icon: "security",
    color: "purple",
    tagline: "Protecting binary application data",
    description:
      "A security-focused implementation exploring encryption and secure handling of binary data in application workflows.",
    work: [
      "Worked with binary data processing and encryption concepts.",
      "Explored AES encryption and integrity verification with HMAC.",
      "Worked on Base64 representation and encrypted-data storage patterns.",
      "Considered secure handling of encryption metadata.",
    ],
    tech: ["AES", "HMAC", "Base64", "OutSystems", ".NET"],
  },
  {
    name: "UiPath Robotic Automation",
    category: "AI & Automation",
    icon: "workflow",
    color: "blue",
    tagline: "Automating repetitive business processes",
    description:
      "An application integrating with robotic process automation services to support automated business workflows.",
    work: [
      "Developed an application connected to UiPath automation services.",
      "Integrated with UiPath Cloud Orchestrator APIs.",
      "Worked with automation execution and application-to-robot communication.",
    ],
    tech: ["UiPath Studio", "Cloud Orchestrator", "REST APIs", "OutSystems"],
  },
  {
    name: "Multi-Tenant School Platform",
    category: "Enterprise",
    icon: "education",
    color: "purple",
    tagline: "School management across tenants",
    description:
      "A multi-tenant school application designed to support multiple school organizations within a shared platform.",
    work: [
      "Worked with tenant-specific application data and workflows.",
      "Explored school-specific configuration and data separation.",
      "Supported a platform serving multiple school organizations.",
    ],
    tech: ["OutSystems ODC", "Multi-tenancy", "Data Modeling", "Security"],
  },
  {
    name: "MariaDB Integration",
    category: "Integrations",
    icon: "database",
    color: "blue",
    tagline: "Connecting enterprise apps to MariaDB",
    description:
      "A .NET extension project connecting OutSystems Developer Cloud with a MariaDB database through a database connector.",
    work: [
      "Created a .NET extension using MySqlConnector.",
      "Worked on connecting application logic to MariaDB.",
      "Explored database connectivity and extension integration in ODC.",
    ],
    tech: ["OutSystems ODC", ".NET", "C#", "MariaDB", "MySqlConnector"],
  },
  {
    name: "AI Play-and-Learn Companion",
    category: "AI & Automation",
    icon: "ai",
    color: "purple",
    tagline: "Personalized learning activities for children",
    description:
      "A concept for a parent-facing learning companion that adapts playful activities to a child's interests, age, and routine.",
    work: [
      "Designed interest, activity, and child-preference data models.",
      "Explored AI-assisted activity recommendations.",
      "Planned a child-friendly experience with parent-controlled preferences.",
    ],
    tech: ["Python", "OpenAI", "OutSystems", "AI", "Data Modeling"],
  },

  {
    name: "Royal Vopak — DevOps & Access Management",
    category: "Enterprise",
    icon: "workflow",
    color: "blue",
    tagline: "Enterprise deployments across live environments",
    description: "Technical lead and DevOps administration work supporting deployments across 21 live servers, with access and group management for OutSystems 11 and ODC applications.",
    work: ["Coordinated automated and manual deployments across multiple live servers.", "Worked with environment release processes and application lifecycle activities.", "Integrated Okta-based user and group management for O11 and ODC applications."],
    tech: ["OutSystems 11", "ODC", "CI/CD", "Okta", "DevOps"],
  },
  {
    name: "GAMI — Secure Service Applications",
    category: "Enterprise",
    icon: "security",
    color: "purple",
    tagline: "Secure government and industry workflows",
    description: "Reactive web services supporting military product qualification, standards update requests, and on-the-job training support requests in a secured network environment.",
    work: ["Developed and supported multiple reactive web service workflows.", "Worked with secured-network requirements and encryption-related needs.", "Translated service processes into application functionality."],
    tech: ["OutSystems", "Reactive Web", "Security", "Encryption", "Workflows"],
  },
  {
    name: "Oceaneering — Employee & Operations Apps",
    category: "Mobile",
    icon: "mobile",
    color: "blue",
    tagline: "Connected onboarding and onshore operations",
    description: "A suite of mobile, tablet, and web applications covering employee onboarding, HSE processes, daily checklists, crew time entry, and onshore inventory management.",
    work: ["Contributed to Horizon onboarding on iOS and Android, including Firebase notifications and DocuSign integration.", "Worked on HSE flows supporting online/offline use and role-based processes.", "Supported daily activity checklist workflows and onshore operational use cases.", "Built a customized calendar widget for Crew Time and supported OMS inventory workflows.", "Worked on the Horizon web onboarding stages, roles, and approval management."],
    tech: ["OutSystems", "Mobile", "Firebase", "DocuSign", "Offline workflows"],
  },
  {
    name: "NST / Netsentries — Tenant Management",
    category: "Enterprise",
    icon: "database",
    color: "purple",
    tagline: "Multi-region tenant and customer portals",
    description: "A two-portal solution for managing tenants and tenant users across regions, with a back-office portal and a customer-facing portal.",
    work: ["Supported tenant and tenant-user management workflows.", "Worked across back-office and customer portal functionality.", "Integrated identity and collaboration services including Amazon SSO, Azure AD, Amazon Cognito/User Pools, and Slack."],
    tech: ["OutSystems", "Multi-tenant", "Azure AD", "AWS", "Slack"],
  },
  {
    name: "EET — Nutrition Made Easy",
    category: "Enterprise",
    icon: "workflow",
    color: "blue",
    tagline: "Meal plans, subscriptions, and scheduled processing",
    description: "A nutrition planning application where customers register, pay, and receive chef- and nutrient-guided weekly meal plans arranged into monthly plans.",
    work: ["Worked with customer registration and payment gateway flows.", "Supported monthly meal-plan generation using timers and scheduled processes.", "Handled business rules for consecutive weekly plans."],
    tech: ["OutSystems", "Payment Gateway", "Timers", "Business Processes"],
  },
  {
    name: "KYC Reusable Component",
    category: "Integrations",
    icon: "security",
    color: "purple",
    tagline: "Reusable identity verification workflows",
    description: "A reusable OutSystems component for KYC workflows, including image capture, document upload, document management, and DocuSign-based signing.",
    work: ["Packaged common KYC functionality for reuse across applications.", "Supported image capture and document upload flows.", "Integrated document signing and maintenance workflows with DocuSign."],
    tech: ["OutSystems 11", "DocuSign", "Document APIs", "Reusable Components"],
  },
  {
    name: "Veryfi Receipt Scanning Component",
    category: "Integrations",
    icon: "mobile",
    color: "blue",
    tagline: "Turn receipt images into structured data",
    description: "A reusable receipt-scanning integration that sends receipt images to Veryfi OCR and returns structured transaction and line-item data.",
    work: ["Integrated the Veryfi API for receipt extraction.", "Mapped transaction dates, item names, quantities, prices, and line items.", "Prepared structured output for display and further processing in OutSystems."],
    tech: ["Veryfi OCR", "REST API", "JSON", "OutSystems"],
  },
  {
    name: "Modal Banking Application",
    category: "Enterprise",
    icon: "database",
    color: "purple",
    tagline: "Banking-style application workflows",
    description: "A model banking application built around common banking functionality, with relational data storage and a web interface.",
    work: ["Worked with SQL-backed data storage.", "Built user interface elements using HTML, CSS, and JavaScript.", "Implemented sample banking-style screens and workflows."],
    tech: ["SQL", "HTML", "CSS", "JavaScript"],
  },
  {
    name: "Smart Dubai — Sales Dashboard",
    category: "Enterprise",
    icon: "workflow",
    color: "blue",
    tagline: "Sales and profitability visualization",
    description: "A model web application for periodic product sales, including visual reporting for sales rates and profit rates.",
    work: ["Worked on sales and profit visualization.", "Used chart-based presentation to summarize business performance.", "Supported periodic sales data views."],
    tech: ["OutSystems", "Charts", "Business Reporting", "Web"],
  },
  {
    name: "Al-Guhair — Banking Mobile App",
    category: "Mobile",
    icon: "mobile",
    color: "purple",
    tagline: "Customer account and transaction views",
    description: "A model mobile banking application with customer account information, transaction rates, and multiple user login scenarios.",
    work: ["Worked on mobile banking-style screens and account information.", "Supported transaction-related views and user login flows.", "Organized customer information for mobile access."],
    tech: ["OutSystems Mobile", "Authentication", "Data Modeling"],
  },
  {
    name: "T-Mobile Corporate Refunds",
    category: "Enterprise",
    icon: "workflow",
    color: "blue",
    tagline: "Hierarchical approvals and notifications",
    description: "A corporate refund workflow that routes requests through approvers at different hierarchy levels and triggers email notifications based on approval level.",
    work: ["Worked on approval hierarchy and routing logic.", "Implemented business rules for approver-level email notifications.", "Supported corporate refund request processing."],
    tech: ["OutSystems", "Workflows", "Email Notifications", "Business Rules"],
  },
  {
    name: "UCIC — Commerce & Intranet Portals",
    category: "Enterprise",
    icon: "layers",
    color: "purple",
    tagline: "Retail, administration, and employee services",
    description: "A collection of web, retail, admin, and intranet modules supporting product management, customer purchasing, and employee requests such as leave and loans.",
    work: ["Supported retail and customer-facing product purchasing workflows.", "Worked with admin functions for product maintenance.", "Contributed to employee intranet request workflows and external database-backed user information."],
    tech: ["OutSystems", "Web", "Retail", "External Database"],
  },
  {
    name: "Enterprise Identity & Cloud Integrations",
    category: "Integrations",
    icon: "security",
    color: "blue",
    tagline: "Connecting apps with identity and cloud services",
    description: "A consolidated showcase of enterprise integration experience across identity providers, cloud storage, external databases, collaboration tools, and authentication flows.",
    work: ["Worked with SAML 2.0 SSO using Azure AD and Okta.", "Integrated AWS RDS, S3, and Amazon user-pool services.", "Worked with Slack, SharePoint Form Data APIs, external databases, and payment gateways.", "Explored OAuth authorization-code and JWT-based authentication, plus DocuSign and SAP integration POCs."],
    tech: ["SAML 2.0", "OAuth", "JWT", "AWS", "Azure AD", "Okta"],
  },
];

// Six consolidated project tabs. Together these cover all 24 project entries.
const categories = [
  "Enterprise Solutions",
  "AI & Automation",
  "Integrations & Cloud",
  "Mobile & Education",
  "Maps & Tracking",
  "Security & Performance",
];

const categoryGroups = {
  "Enterprise Solutions": ["Enterprise"],
  "AI & Automation": ["AI & Automation"],
  "Integrations & Cloud": ["Integrations"],
  "Mobile & Education": ["Mobile", "Education"],
  "Maps & Tracking": ["Maps & Tracking"],
  "Security & Performance": ["Security"],
};

const iconMap = {
  mobile: Cpu,
  education: GraduationCap,
  workflow: Workflow,
  ai: BrainCircuit,
  maps: MapPinned,
  security: ShieldCheck,
  database: Database,
  layers: Layers,
};

const expertise = [
  {
    icon: Layers3,
    title: "OutSystems Development",
    description:
      "Enterprise application development, reusable logic, data modeling, server actions, and application lifecycle practices.",
  },
  {
    icon: Network,
    title: "API Integrations",
    description:
      "REST APIs, third-party services, authentication, payment integrations, maps, notifications, and external systems.",
  },
  {
    icon: BrainCircuit,
    title: "AI & Conversational Experiences",
    description:
      "LLM integrations, AI-assisted workflows, voice services, avatar experiences, and intelligent application features.",
  },
  {
    icon: ShieldCheck,
    title: "Security & Encryption",
    description:
      "Binary data handling, AES concepts, HMAC integrity checks, Base64 encoding, and secure application design.",
  },
  {
    icon: Workflow,
    title: "Automation",
    description:
      "Robotic process automation concepts and application integration with UiPath orchestration services.",
  },
  {
    icon: Database,
    title: "Data & Performance",
    description:
      "SQL, relational databases, query optimization, indexing, execution flows, and application performance analysis.",
  },
];

const certifications = [
  { name: "OutSystems Technical Lead", issuer: "OutSystems", logo: "outsystems" },
  { name: "OutSystems Architecture Specialist", issuer: "OutSystems", logo: "outsystems" },
  { name: "OutSystems Security Specialist", issuer: "OutSystems", logo: "outsystems" },
  { name: "OutSystems Associate Developer (ODC)", issuer: "OutSystems", logo: "outsystems" },
  { name: "OutSystems Web Developer Specialist", issuer: "OutSystems", logo: "outsystems" },
  { name: "OutSystems Agentic AI Specialist", issuer: "OutSystems", logo: "outsystems" },
  { name: "Oracle Database 23ai SQL Certified Associate", issuer: "Oracle", logo: "oracle" },
  { name: "Redhat Linux System Administration", issuer: "Red Hat", logo: "redhat" },
];

const GREETING_TEXT = "Hi there, and welcome to my portfolio! I'm Sathish Kumar, an OutSystems Technical Lead with over six years of experience building enterprise web and mobile applications, delivering OutSystems Developer Cloud solutions, integrating external platforms, and exploring AI-powered products. Feel free to explore my projects, skills, and certifications. Thanks for visiting!";

function WelcomeAvatar() {
  const [speaking, setSpeaking] = useState(false);
  const [greetingPlayed, setGreetingPlayed] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setVoiceAvailable(true);
    // Browsers commonly block speech until a user gesture. Try once on load;
    // the visible button remains available if autoplay is blocked.
    const timer = window.setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(GREETING_TEXT);
        utterance.rate = 0.94;
        utterance.pitch = 1.03;
        utterance.onstart = () => { setSpeaking(true); setGreetingPlayed(true); };
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch (_) {
        setSpeaking(false);
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleGreeting() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(GREETING_TEXT);
    utterance.rate = 0.94;
    utterance.pitch = 1.03;
    utterance.onstart = () => { setSpeaking(true); setGreetingPlayed(true); };
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <aside className={`welcome-avatar ${speaking ? "is-speaking" : ""}`} aria-label="AI welcome introduction">
      <div className="avatar-orbit avatar-orbit-a" aria-hidden="true" />
      <div className="avatar-orbit avatar-orbit-b" aria-hidden="true" />
      <div className="avatar-portrait-wrap">
        <span className="avatar-halo" aria-hidden="true" />
        <img className="avatar-portrait" src="/ai-avatar.webp" alt="Animated 3D AI portfolio guide" />
        <span className="avatar-status-dot" aria-label={speaking ? "Speaking" : "Ready"} />
      </div>
      <div className="avatar-greeting">
        <div className="avatar-greeting-top">
          <span className="avatar-wave-icon" aria-hidden="true"><span /><span /><span /><span /><span /></span>
          <div><strong>Meet Sathish</strong><small>{speaking ? "Introducing myself…" : "Your AI portfolio guide"}</small></div>
          <span className="avatar-ai-pill"><Sparkles size={12} /> AI</span>
        </div>
        <p>Hi there! Welcome to my portfolio. I'm Sathish Kumar, an OutSystems Technical Lead with 6+ years of experience in enterprise apps, ODC, integrations and AI-powered solutions.</p>
        <button className="avatar-play-button" type="button" onClick={toggleGreeting} disabled={!voiceAvailable}>
          {speaking ? <><span className="avatar-pause-icon">Ⅱ</span> Stop introduction</> : <><span className="avatar-play-icon">▶</span> {greetingPlayed ? "Play introduction again" : "Listen to my introduction"}</>}
        </button>
        <small className="avatar-audio-note">{voiceAvailable ? "Audio may require a click if your browser blocks autoplay." : "Audio playback isn't supported by this browser."}</small>
      </div>
    </aside>
  );
}

function App() {
  const [activeCategory, setActiveCategory] = useState("Enterprise Solutions");
  const [tabDirection, setTabDirection] = useState("right");
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const filteredProjects = projects.filter((project) => {
    const group = categoryGroups[activeCategory] || [];
    const searchableProject = [project.name, project.description, project.tagline, ...project.tech].join(" ");
    const matchesCategory = group.includes(project.category) ||
      (activeCategory === "Security & Performance" && /security|encrypt|performance|authority|database|devops|access management/i.test(searchableProject));
    const text = [
      project.name,
      project.category,
      project.tagline,
      project.description,
      ...project.tech,
    ]
      .join(" ")
      .toLowerCase();
    return matchesCategory && text.includes(search.toLowerCase().trim());
  });

  useEffect(() => {
    if (!selectedProject && !showContact) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedProject(null);
        setShowContact(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedProject, showContact]);

  function scrollToProjects() {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
    setMobileMenu(false);
  }

  function scrollToContact() {
    setShowContact(true);
    setMobileMenu(false);
  }

  return (
    <main className="universe">
      <div className="space-background" aria-hidden="true">
        <div className="star-field" />
        <div className="nebula nebula-one" />
        <div className="nebula nebula-two" />
      </div>

      <header className="topbar">
        <a className="brand" href="#home" aria-label="Portfolio home">
          <span className="brand-icon"><Zap size={20} /></span>
          <span>SATHISH<span className="brand-accent">.DEV</span></span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`top-links ${mobileMenu ? "mobile-open" : ""}`}>
          <a href="#home" onClick={() => setMobileMenu(false)}>Home</a>
          <a href="#expertise" onClick={() => setMobileMenu(false)}>Expertise</a>
          <a href="#certifications" onClick={() => setMobileMenu(false)}>Certifications</a>
          <button type="button" className="nav-project-link" onClick={scrollToProjects}>
            Projects
          </button>
          <button type="button" className="availability" onClick={scrollToContact}>
            <span /> Open to opportunities
          </button>
        </nav>
      </header>

      <section className="intro" id="home">
        <div className="intro-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            OUTSYSTEMS TECHNICAL LEAD · ODC · AI
          </div>

          <h1 className="profile-heading">
            Hi, I’m <span className="gradient-text">Sathish Kumar.</span>
            <br />
            <span className="role-line">OutSystems Technical Lead</span>
          </h1>

          <p className="intro-description">
            I’m an OutSystems developer and technical lead with 6+ years of experience building enterprise web and mobile applications, delivering ODC solutions, integrating external platforms, and exploring AI-powered products. I turn complex business requirements into secure, maintainable digital solutions.
          </p>

          <div className="intro-actions">
            <button className="primary-button" type="button" onClick={scrollToProjects}>
              Explore my universe <ArrowRight size={16} />
            </button>
            <button className="secondary-button" type="button" onClick={scrollToContact}>
              Let's connect <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="intro-stats">
            <div>
              <strong>6+</strong>
              <span>Years of experience</span>
            </div>
            <div>
              <strong>{projects.length.toString().padStart(2, "0")}</strong>
              <span>Project showcases</span>
            </div>
            <div>
              <strong>{String(certifications.length).padStart(2, "0")}</strong>
              <span>Certifications listed</span>
            </div>
          </div>

          <p className="small-note">
            Enterprise delivery · OutSystems 11 · ODC · Integrations · AI
          </p>
        </div>

        <div className="hero-universe" aria-label="Rotating planet illustration and profile">
          <div className="orbit-art" aria-hidden="true">
            <div className="orbit-ring ring-one" />
            <div className="orbit-ring ring-two" />
            <div className="orbit-ring ring-three" />
            <div className="planet-glow" />
            <div className="planet">
              <span className="planet-land land-one" />
              <span className="planet-land land-two" />
              <span className="planet-highlight" />
            </div>
            <span className="planet-tag planet-tag-top"><Code2 size={15} /> OutSystems 11</span>
            <span className="planet-tag planet-tag-right"><BrainCircuit size={15} /> AI & ODC</span>
            <span className="planet-tag planet-tag-bottom"><Database size={15} /> Integrations · APIs</span>
          </div>
          <WelcomeAvatar />
          <div className="mini-profile real-profile-footer">
            <img src="/sathish-profile.png" alt="Sathish Kumar" />
            <div><strong>Sathish Kumar</strong><span>OutSystems Technical Lead</span></div>
            <span className="mini-profile-status"><span /> Building solutions that scale</span>
          </div>
        </div>
      </section>

      <section className="project-section" id="projects">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> 01 / PROJECT UNIVERSE
            </div>
            <h2>Explore my <span className="gradient-text">work.</span></h2>
            <p>Selected applications, integrations, and technical explorations.</p>
          </div>
          <div className="project-count">
            <span>{String(filteredProjects.length).padStart(2, "0")}</span>
            <span>PROJECTS FOUND</span>
          </div>
        </div>

        <div className="filter-toolbar">
          <div className="filter-list" aria-label="Filter projects by category">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`filter-chip ${activeCategory === category ? "active" : ""}`}
                onClick={() => {
                  const oldIndex = categories.indexOf(activeCategory);
                  const newIndex = categories.indexOf(category);
                  setTabDirection(newIndex >= oldIndex ? "right" : "left");
                  setActiveCategory(category);
                }}
                aria-pressed={activeCategory === category}
              >
                {category}
              </button>
            ))}
          </div>

          <label className="search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search projects or technologies..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search projects"
            />
            {search && (
              <button
                className="clear-search"
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        <div className={`project-grid tab-slide-${tabDirection}`} key={activeCategory}>
          {filteredProjects.map((project, index) => {
            const Icon = iconMap[project.icon] || BriefcaseBusiness;
            return (
              <button
                type="button"
                className={`project-card ${project.color}`}
                key={project.name}
                onClick={() => setSelectedProject(project)}
                aria-label={`View ${project.name} project details`}
              >
                <div className="card-topline">
                  <span className="project-number">
                    PROJECT / {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="card-arrow"><ArrowUpRight size={17} /></span>
                </div>
                <span className="project-icon"><Icon size={25} /></span>
                <span className="project-category">{project.category}</span>
                <h3>{project.name}</h3>
                <p className="project-tagline">{project.tagline}</p>
                <p className="project-description">{project.description}</p>
                <div className="technology-list">
                  {project.tech.slice(0, 3).map((tech) => (
                    <span key={tech}>{tech}</span>
                  ))}
                  {project.tech.length > 3 && (
                    <span>+{project.tech.length - 3}</span>
                  )}
                </div>
                <span className="card-footer">
                  Explore project <ArrowRight size={15} />
                </span>
              </button>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="empty-state">
            <Search size={27} />
            <h3>No projects found</h3>
            <p>Try another search term or select a different category.</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setSearch("");
                setActiveCategory("Enterprise Solutions");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      <section className="expertise-section" id="expertise">
        <div className="eyebrow">
          <span className="eyebrow-line" /> 02 / TECHNICAL CAPABILITIES
        </div>
        <h2>Technology is my <span className="gradient-text">toolkit.</span></h2>
        <p className="section-subtitle">
          A growing set of skills across application development, integration,
          automation, security, and AI.
        </p>
        <div className="expertise-grid">
          {expertise.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <Icon />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="certifications-section" id="certifications">
        <div className="eyebrow">
          <span className="eyebrow-line" /> 03 / CERTIFICATIONS & LEARNING
        </div>
        <h2>Building expertise <span className="gradient-text">continuously.</span></h2>
        <p className="section-subtitle">
          Professional certifications and learning milestones.
        </p>
        <div className="certification-grid">
          {certifications.map((certification) => (
            <div className="certification-card" key={certification.name}>
              <span className={`issuer-logo issuer-${certification.logo}`} aria-label={`${certification.issuer} logo`}>
                {certification.logo === "outsystems" ? <><span className="outsystems-mark">O</span><small>OutSystems</small></> :
                  certification.logo === "oracle" ? <span className="oracle-wordmark">ORACLE</span> :
                  <span className="redhat-mark"><span>◉</span> Red Hat</span>}
              </span>
              <span className="certification-name">{certification.name}</span>
              <Check className="certification-check" size={17} />
            </div>
          ))}
        </div>
        <p className="certification-note">
          Eight credentials are listed, including Oracle Database 23ai SQL Certified Associate and Redhat Linux System Administration. Issuer marks are visual identifiers, not verification badges.
        </p>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-orb"><Sparkles size={27} /></div>
        <div className="contact-copy">
          <div className="eyebrow">04 / NEXT MISSION</div>
          <h2>Let's build something <span className="gradient-text">meaningful.</span></h2>
          <p>
            Interested in software development, OutSystems, enterprise
            integrations, automation, or AI-enabled application opportunities?
            Let's connect.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={scrollToContact}>
          <Mail size={16} /> Contact me <ArrowUpRight size={16} />
        </button>
      </section>

      <footer className="footer">
        <a className="brand" href="#home">
          <span className="brand-icon"><Zap size={17} /></span>
          <span>SATHISH<span className="brand-accent">.DEV</span></span>
        </a>
        <span>Sathishkumar Ramkumar · OutSystems Technical Lead</span>
        <a href="#home">Back to top <ArrowDown className="back-to-top-icon" size={13} /></a>
      </footer>

      {selectedProject && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedProject(null);
          }}
        >
          <section
            className="project-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close project details"
              onClick={() => setSelectedProject(null)}
            >
              <X size={20} />
            </button>
            <div className={`modal-icon ${selectedProject.color}`}>
              {React.createElement(
                iconMap[selectedProject.icon] || BriefcaseBusiness,
                { size: 27 }
              )}
            </div>
            <div className="eyebrow">
              PROJECT DETAIL / {selectedProject.category.toUpperCase()}
            </div>
            <h2 id="project-modal-title">{selectedProject.name}</h2>
            <p className="modal-tagline">{selectedProject.tagline}</p>
            <p className="modal-description">{selectedProject.description}</p>
            <h3>Key contributions and focus areas</h3>
            <ul className="contribution-list">
              {selectedProject.work.map((item) => (
                <li key={item}>
                  <span className="list-check"><Check size={15} /></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <h3>Technologies</h3>
            <div className="modal-tech">
              {selectedProject.tech.map((tech) => <span key={tech}>{tech}</span>)}
            </div>
            <h3>My role & delivery scope</h3>
            <p className="modal-description">
              I contributed to the design, implementation, integrations, troubleshooting, and delivery activities listed above, based on the scope of each project. The specific responsibilities and technologies are shown for each project so visitors can understand my hands-on contribution.
            </p>
          </section>
        </div>
      )}

      {showContact && (
        <div
          className="modal-backdrop contact-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowContact(false);
          }}
        >
          <section className="project-modal contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
            <button type="button" className="modal-close" aria-label="Close contact details" onClick={() => setShowContact(false)}><X size={20} /></button>
            <div className="modal-icon purple"><Mail size={25} /></div>
            <div className="eyebrow">LET'S CONNECT / CONTACT</div>
            <h2 id="contact-modal-title">Contact <span className="gradient-text">Sathish.</span></h2>
            <p className="modal-description">For opportunities, collaboration, or questions about my OutSystems and AI projects, feel free to reach out.</p>
            <div className="contact-detail-list">
              <a className="contact-detail" href="mailto:sathishkumar1356@gmail.com"><span className="contact-detail-icon"><Mail size={18} /></span><span><small>Email</small><strong>sathishkumar1356@gmail.com</strong></span><ArrowUpRight size={16} /></a>
              <a className="contact-detail" href="https://www.linkedin.com/in/sathish-kumar-070348153" target="_blank" rel="noreferrer"><span className="contact-detail-icon"><ExternalLink size={18} /></span><span><small>LinkedIn</small><strong>linkedin.com/in/sathish-kumar-070348153</strong></span><ArrowUpRight size={16} /></a>
              <a className="contact-detail" href="https://www.outsystems.com/profile/bigm1qvh2c/overview" target="_blank" rel="noreferrer"><span className="contact-detail-icon"><Code2 size={18} /></span><span><small>OutSystems profile</small><strong>View my OutSystems profile</strong></span><ArrowUpRight size={16} /></a>
              <a className="contact-detail" href="tel:+918248327237"><span className="contact-detail-icon"><ExternalLink size={18} /></span><span><small>India contact</small><strong>+91 8248327237</strong></span><ArrowUpRight size={16} /></a>
              <a className="contact-detail" href="tel:+96895764336"><span className="contact-detail-icon"><ExternalLink size={18} /></span><span><small>Oman contact</small><strong>+968 95764336</strong></span><ArrowUpRight size={16} /></a>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
