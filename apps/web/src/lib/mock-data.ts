import type {
  Assignment,
  ProjectFile,
  ActivityEvent,
  AiInsight,
  StudentMatrixEntry,
  User,
} from "@/types";

export const DEMO_USERS: Record<string, User & { password: string }> = {
  "U22/FNS/CSC/1101": {
    id: "user-1",
    matricNumber: "U22/FNS/CSC/1101",
    firstName: "Nuhu",
    lastName: "Ibrahim",
    role: "STUDENT",
    institutionId: "inst-1",
    password: "student123",
  },
  LEC001: {
    id: "user-2",
    matricNumber: "LEC001",
    firstName: "Nuhu Muhammad",
    lastName: "Datti",
    role: "LECTURER",
    institutionId: "inst-1",
    password: "lecturer123",
  },
  ADMIN001: {
    id: "user-admin",
    matricNumber: "ADMIN001",
    firstName: "Platform",
    lastName: "Administrator",
    role: "ADMIN",
    institutionId: "inst-1",
    password: "admin123",
  },
};

export const STARTER_FILES: ProjectFile[] = [
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Welcome to Project ULA</h1>
    <p>Start building your dream project here.</p>
    <button id="cta">Get Started</button>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    language: "html",
  },
  {
    path: "styles.css",
    content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: linear-gradient(135deg, #050508, #12121a); color: #f4f4f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.container { text-align: center; padding: 2rem; }
h1 { font-size: 2.5rem; margin-bottom: 1rem; background: linear-gradient(90deg, #00e5ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
p { color: #a1a1aa; margin-bottom: 2rem; }
button { background: linear-gradient(135deg, #00e5ff, #7c3aed); border: none; padding: 12px 32px; border-radius: 8px; color: white; font-size: 1rem; cursor: pointer; }
button:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,229,255,0.3); }`,
    language: "css",
  },
  {
    path: "script.js",
    content: `document.getElementById('cta').addEventListener('click', () => alert('You clicked! Keep building 🚀'));`,
    language: "javascript",
  },
];

export const BLANK_STARTER: ProjectFile[] = [
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Start building</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Paste your full HTML/CSS/JS here. This project starts empty for students. -->
</body>
</html>`,
    language: "html",
  },
  {
    path: "styles.css",
    content: `/* Empty starter stylesheet — paste your styles here */`,
    language: "css",
  },
  {
    path: "script.js",
    content: `// Empty starter script — paste your JS here
document.addEventListener('DOMContentLoaded', () => {
  // Your code
});
`,
    language: "javascript",
  },
];

export const PORTFOLIO_STARTER: ProjectFile[] = [
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Portfolio</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="hero">
    <h1>Your Name</h1>
    <p>Web Developer · Designer · Creator</p>
  </header>
  <main>
    <section class="projects">
      <h2>Projects</h2>
      <div class="grid">
        <article class="card">Project 1</article>
        <article class="card">Project 2</article>
      </div>
    </section>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
    language: "html",
  },
  {
    path: "styles.css",
    content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #0a0a0f; color: #f4f4f5; }
.hero { min-height: 40vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #12121a, #1a1a2e); }
.hero h1 { font-size: 3rem; background: linear-gradient(90deg, #00e5ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.projects { padding: 3rem 2rem; max-width: 900px; margin: 0 auto; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem; }
.card { padding: 2rem; background: #12121a; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }`,
    language: "css",
  },
  {
    path: "script.js",
    content: `console.log('Portfolio assignment — build something amazing!');`,
    language: "javascript",
  },
];

export const CALCULATOR_STARTER: ProjectFile[] = [
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculator</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="calculator">
    <div id="display">0</div>
    <div class="buttons">
      <button data-val="7">7</button><button data-val="8">8</button><button data-val="9">9</button>
      <button data-val="+">+</button><button data-val="4">4</button><button data-val="5">5</button>
      <button data-val="6">6</button><button data-val="-">-</button><button data-val="1">1</button>
      <button data-val="2">2</button><button data-val="3">3</button><button data-val="=">=</button>
      <button data-val="0">0</button><button data-val="C">C</button>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    language: "html",
  },
  {
    path: "styles.css",
    content: `body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #050508; margin: 0; font-family: system-ui, sans-serif; }
.calculator { background: #12121a; padding: 1.5rem; border-radius: 16px; width: 280px; }
#display { background: #0a0a0f; padding: 1rem; text-align: right; font-size: 2rem; color: #00e5ff; border-radius: 8px; margin-bottom: 1rem; }
.buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
button { padding: 1rem; border: none; border-radius: 8px; background: #1a1a24; color: white; cursor: pointer; font-size: 1.1rem; }
button:hover { background: #7c3aed; }`,
    language: "css",
  },
  {
    path: "script.js",
    content: `// Build your calculator logic here
const display = document.getElementById('display');
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
  const val = btn.dataset.val;
  if (val === 'C') display.textContent = '0';
  else if (val === '=') display.textContent = 'TODO';
  else display.textContent = val;
  });
});`,
    language: "javascript",
  },
];

// Fix calculator HTML - I used a hack with replace, let me fix properly in the write

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: "asn-1",
    title: "Personal Portfolio Website",
    description: "Build a responsive portfolio showcasing your skills and projects",
    instructions: "Create a multi-section portfolio with hero, projects grid, and contact section. Use flexbox/grid for layout.",
    deadline: "2026-06-15",
    status: "PUBLISHED",
    maxScore: 100,
    difficulty: "intermediate",
    engagement: "high",
    enrolled: 42,
    submitted: 28,
    starterFiles: PORTFOLIO_STARTER,
  },
  {
    id: "asn-2",
    title: "Interactive Calculator",
    description: "Create a functional calculator with HTML, CSS, and JavaScript",
    instructions: "Implement basic arithmetic operations. Handle edge cases like division by zero.",
    deadline: "2026-06-22",
    status: "PUBLISHED",
    maxScore: 100,
    difficulty: "beginner",
    engagement: "medium",
    enrolled: 42,
    submitted: 12,
    starterFiles: CALCULATOR_STARTER,
  },
  {
    id: "asn-3",
    title: "Landing Page Clone",
    description: "Recreate a modern SaaS landing page with animations",
    instructions: "Clone any modern SaaS landing page. Focus on typography, spacing, and responsive design.",
    deadline: "2026-07-01",
    status: "DRAFT",
    maxScore: 100,
    difficulty: "advanced",
    engagement: "low",
    enrolled: 0,
    submitted: 0,
  },
];

export const INITIAL_ACTIVITY: ActivityEvent[] = [
  { id: "e1", type: "start", student: "Amina Yusuf", matric: "U22/FNS/CSC/1102", message: "started Portfolio assignment", timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: "e2", type: "deploy", student: "Chidi Okafor", matric: "U22/FNS/CSC/1103", message: "deployed project live", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "e3", type: "ai_help", student: "Fatima Bello", matric: "U22/FNS/CSC/1104", message: "requested AI help on flexbox", timestamp: new Date(Date.now() - 450000).toISOString() },
  { id: "e4", type: "submit", student: "Emeka Nwosu", matric: "U22/FNS/CSC/1105", message: "submitted Calculator assignment", timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: "e5", type: "error", student: "System", matric: "SYS", message: "detected 12 syntax errors across class", timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: "e6", type: "grade", student: "Chidi Okafor", matric: "U22/FNS/CSC/1103", message: "received score 92/100", timestamp: new Date(Date.now() - 1200000).toISOString() },
];

export const AI_INSIGHTS: AiInsight[] = [
  { id: "i1", severity: "critical", title: "CSS Flexbox Struggle", detail: "72% failure rate on layout exercises", action: "Recommend: revisit layout fundamentals" },
  { id: "i2", severity: "warning", title: "At-Risk Students", detail: "3 students likely to fail Assignment 2", action: "Schedule intervention session" },
  { id: "i3", severity: "info", title: "Engagement Peak", detail: "Portfolio assignment has highest engagement this semester", action: "Use as template for future tasks" },
  { id: "i4", severity: "success", title: "Top Performer", detail: "Chidi Okafor consistently scores above 90%", action: "Consider peer mentoring role" },
  { id: "i5", severity: "warning", title: "Syntax Patterns", detail: "Unclosed HTML tags detected in 18 submissions", action: "Auto-send hint to affected students" },
];

export const STUDENT_MATRIX: StudentMatrixEntry[] = [
  { id: "s1", name: "Nuhu Ibrahim", matric: "U22/FNS/CSC/1101", avatar: "NI", status: "IN_PROGRESS", liveStatus: "typing", risk: "safe", predictionScore: 85, score: null, lastActive: "now", assignmentProgress: 65, activityTimeline: ["Started portfolio", "Edited CSS", "Asked AI for hint"] },
  { id: "s2", name: "Amina Yusuf", matric: "U22/FNS/CSC/1102", avatar: "AY", status: "SUBMITTED", liveStatus: "submitted", risk: "safe", predictionScore: 91, score: 87, lastActive: "1h ago", assignmentProgress: 100, activityTimeline: ["Submitted portfolio", "Deployed live"] },
  { id: "s3", name: "Chidi Okafor", matric: "U22/FNS/CSC/1103", avatar: "CO", status: "GRADED", liveStatus: "idle", risk: "safe", predictionScore: 95, score: 92, lastActive: "3h ago", assignmentProgress: 100, activityTimeline: ["Graded 92/100", "Deployed project"] },
  { id: "s4", name: "Fatima Bello", matric: "U22/FNS/CSC/1104", avatar: "FB", status: "NOT_STARTED", liveStatus: "offline", risk: "critical", predictionScore: 42, score: null, lastActive: "2d ago", assignmentProgress: 0, activityTimeline: ["Not enrolled yet"] },
  { id: "s5", name: "Emeka Nwosu", matric: "U22/FNS/CSC/1105", avatar: "EN", status: "IN_PROGRESS", liveStatus: "typing", risk: "watch", predictionScore: 68, score: null, lastActive: "5m ago", assignmentProgress: 40, activityTimeline: ["Working on calculator", "3 syntax errors"] },
  { id: "s6", name: "Zainab Ahmed", matric: "U22/FNS/CSC/1106", avatar: "ZA", status: "IN_PROGRESS", liveStatus: "idle", risk: "watch", predictionScore: 71, score: null, lastActive: "20m ago", assignmentProgress: 55, activityTimeline: ["Paused work", "Viewed assignment"] },
];

export const LIVE_ACTIVITY_TEMPLATES = [
  { type: "start" as const, student: "Kemi Ade", matric: "U22/FNS/CSC/1107", message: "started Calculator assignment" },
  { type: "ai_help" as const, student: "Tunde Bakare", matric: "U22/FNS/CSC/1108", message: "asked AI about event listeners" },
  { type: "deploy" as const, student: "Nuhu Ibrahim", matric: "U22/FNS/CSC/1101", message: "deployed portfolio live" },
  { type: "error" as const, student: "System", matric: "SYS", message: "detected 4 new syntax errors" },
  { type: "submit" as const, student: "Amina Yusuf", matric: "U22/FNS/CSC/1102", message: "submitted assignment for grading" },
];
