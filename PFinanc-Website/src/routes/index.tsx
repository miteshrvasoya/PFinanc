import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Code2,
  Github,
  Landmark,
  LockKeyhole,
  Menu,
  MessageSquareText,
  PieChart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";

const github = "https://github.com/miteshrvasoya/PFinanc";

const trackClick = (label: string) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag('event', 'click', {
      event_category: 'outbound',
      event_label: label,
      transport_type: 'beacon'
    });
  }
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PFinanc — Open-Source Personal Finance" },
      { name: "description", content: "Open-source personal and family finance with investments, imports, net worth, and privacy-first automation." },
      { property: "og:title", content: "PFinanc — Your finances, without the manual work" },
      { property: "og:description", content: "A privacy-first financial operating system for individuals and families." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://pfinanc.vercel.app/og-image.png" }, // IMPORTANT: Change this to your actual production domain!
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://pfinanc.vercel.app/og-image.png" }, // IMPORTANT: Change this to your actual production domain!
    ],
  }),
  component: Index,
});

function Action({ children, secondary = false, onClick }: { children: React.ReactNode; secondary?: boolean; onClick?: () => void }) {
  return <a href={github} target="_blank" rel="noreferrer" onClick={onClick} className={secondary ? "button-secondary" : "button-primary"}>{children}</a>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

function SectionTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <div className="section-heading"><Label>{eyebrow}</Label><h2>{title}</h2>{copy && <p>{copy}</p>}</div>;
}

function MockLabel() {
  return <span className="mock-label">Product mockup · Sample data</span>;
}

function DashboardMockup() {
  const activity = [
    ["Swiggy", "₹850", "Expense"], ["Salary", "₹50,000", "Income"],
    ["Mutual Fund SIP", "₹5,000", "Investment"], ["HDFC → Savings", "₹10,000", "Transfer"],
  ];
  return <div className="dashboard-shell">
    <div className="mock-top"><span className="mock-brand"><i /> PFinanc</span><MockLabel /><span>September 2026</span></div>
    <div className="net-row"><div><small>NET WORTH</small><strong>₹24,86,420</strong></div><span className="growth">↑ 8.4%</span></div>
    <div className="metric-grid">
      <div><WalletCards size={18}/><small>Cash</small><b>₹4.2L</b></div>
      <div><TrendingUp size={18}/><small>Investments</small><b>₹20.6L</b></div>
      <div><PieChart size={18}/><small>Monthly</small><b>−₹32.4K</b></div>
    </div>
    <div className="chart"><span style={{height:"38%"}}/><span style={{height:"56%"}}/><span style={{height:"43%"}}/><span style={{height:"72%"}}/><span style={{height:"63%"}}/><span style={{height:"84%"}}/><span style={{height:"76%"}}/><span style={{height:"95%"}}/></div>
    <div className="activity"><div className="table-title">Recent activity <span>View all</span></div>{activity.map((item, i) => <div className="activity-row" key={item[0]}><i className={`dot dot-${i}`}/><b>{item[0]}</b><span>{item[1]}</span><em>{item[2]}</em></div>)}</div>
  </div>;
}

function Nav() {
  return <header className="site-nav"><a href="#top" className="logo"><i/>PFinanc</a><nav><a href="#product">Product</a><a href="#how">How it works</a><a href="#privacy">Privacy</a><a href="#open-source">Open Source</a><a href="#roadmap">Roadmap</a><a href="#faq">FAQ</a></nav><div className="nav-actions"><a href={github} target="_blank" rel="noreferrer" onClick={() => trackClick("Nav GitHub")}>GitHub ↗</a><Action onClick={() => trackClick("Nav Try PFinanc")}>Try PFinanc <ArrowRight size={15}/></Action></div><details className="mobile-menu"><summary aria-label="Open menu"><Menu size={21}/></summary><div><a href="#product">Product</a><a href="#how">How it works</a><a href="#privacy">Privacy</a><a href="#roadmap">Roadmap</a><a href="#faq">FAQ</a></div></details></header>;
}

function SmsAutomation() {
  return <section id="how" className="sms-section"><div className="section-wrap"><div className="sms-intro"><Label>COMING SOON — ANDROID SMS AUTOMATION</Label><h2>Your bank already sent the notification.</h2><p>PFinanc can turn it into a transaction—after you review it.</p></div>
    <div className="sms-stage">
      <div className="phone"><div className="phone-head"><span>9:42</span><span>● ● ●</span></div><div className="message"><div className="sender"><Landmark size={17}/> HDFC Bank <span>now</span></div><p>Your account has been debited by <strong>INR 850</strong> at <strong>SWIGGY</strong>.</p></div><span className="phone-caption">Relevant message detected on device</span></div>
      <div className="flow-arrow"><ArrowRight/><span>Detects & parses</span></div>
      <div className="review-panel"><div className="review-head"><div><small>TRANSACTION DETECTED</small><strong>₹850</strong></div><span>96% confidence</span></div><div className="review-merchant"><span className="merchant-mark">S</span><div><b>Swiggy</b><small>Expense</small></div></div><dl><div><dt>Account</dt><dd>HDFC Bank •••• 4821</dd></div><div><dt>Why?</dt><dd><Check size={13}/> Known sender · No duplicate</dd></div></dl><div className="review-actions"><button>Reject</button><button>Edit</button><button className="approve">Approve <Check size={15}/></button></div><MockLabel /></div>
    </div>
    <div className="ledger-flow"><span>Candidate</span><ArrowRight/><span>User approval</span><ArrowRight/><span>Transaction API</span><ArrowRight/><strong>Ledger updated</strong></div>
    <p className="sms-note"><ShieldCheck size={17}/> SMS never writes directly to the ledger. Detection, validation and approval remain separate.</p>
  </div></section>;
}

const productPillars: Array<[LucideIcon, string, string]> = [
  [CircleDollarSign, "Money", "Income · Expenses · Transfers · Accounts · Cash"],
  [TrendingUp, "Wealth", "Stocks · Mutual Funds · ETFs · FDs · EPF · PPF · NPS"],
  [Users, "People", "Individual finances · Family finances · Permissions"],
  [PieChart, "Visibility", "Cash flow · Portfolio · Analytics · Net worth"],
  [Sparkles, "Automation", "Transaction detection · Review workflows · Future automation"],
];

const automation = [
  ["01", "Detect", "A financial signal is detected."], ["02", "Parse", "Amount, merchant, account and type are extracted."],
  ["03", "Validate", "Consistency and duplicates are checked."], ["04", "Review", "You approve, edit or reject the candidate."],
  ["05", "Record", "The transaction API becomes the source of truth."], ["06", "Update", "Balances, analytics and net worth refresh."],
];

function Index() {
  return <main id="top">
    <Nav />
    <section className="hero"><div className="hero-copy"><Label>OPEN-SOURCE • PRIVACY-FIRST • PERSONAL FINANCE</Label><h1>Your finances, without the manual work.</h1><p className="hero-lead">PFinanc brings transactions, accounts, investments, cash flow, and net worth into one system.</p><p className="hero-sub">Built to reduce manual tracking—while keeping you in control of your financial data.</p><div className="hero-actions"><Action onClick={() => trackClick("Hero Get Started")}>Get Started <ArrowRight size={17}/></Action><Action secondary onClick={() => trackClick("Hero View on GitHub")}><Github size={17}/> View on GitHub ↗</Action></div><div className="trust"><ShieldCheck size={16}/> Open source <i/> Self-hostable <i/> Privacy-focused <i/> No money movement</div></div><div className="hero-visual"><DashboardMockup /></div><a href="#problem" className="scroll-cue" aria-label="Scroll to learn more"><ArrowDown size={18}/></a></section>

    <section id="problem" className="problem section-wrap"><div className="problem-copy"><Label>THE PROBLEM</Label><h2>Your bank tracks the transaction.<br/><em>Why are you still typing it into a spreadsheet?</em></h2><p>Bank alerts, UPI notifications, statements, broker reports and CSV exports already contain the signals. Yet the financial picture still lives across spreadsheets, notes and disconnected apps.</p></div><div className="problem-list">{["Transactions get forgotten", "Categories become inconsistent", "Investments live somewhere else", "Transfers get counted incorrectly", "Family finances become fragmented", "Net worth becomes difficult to calculate"].map((x,i)=><div key={x}><span>0{i+1}</span>{x}</div>)}</div><div className="before-after"><div><small>THE OLD MODEL</small><p>Financial activity <ArrowRight/> Manual entry <ArrowRight/> Spreadsheet <ArrowRight/> Manual analysis</p></div><div className="new-model"><small>THE PFINANC MODEL</small><p>Financial activity <ArrowRight/> PFinanc <ArrowRight/> Structured ledger <ArrowRight/> Financial visibility</p></div></div></section>

    <section id="product" className="product-section"><div className="section-wrap"><SectionTitle eyebrow="ONE FINANCIAL PICTURE" title="Meet your personal financial operating system." copy="More than an expense tracker. PFinanc connects everyday money, long-term wealth and the people you share it with."/><div className="pillar-grid">{productPillars.map(([Icon,title,copy])=><article key={String(title)}><Icon size={21}/><h3>{String(title)}</h3><p>{String(copy)}</p></article>)}</div></div></section>

    <SmsAutomation />

    <section className="control section-wrap"><SectionTitle eyebrow="CONTROL BY DESIGN" title="Automation without giving up control." copy="Reliability comes from separating each step—not letting AI write blindly to your financial ledger."/><div className="steps">{automation.map(([n,t,c])=><div key={n}><span>{n}</span><h3>{t}</h3><p>{c}</p></div>)}</div><div className="modes"><article className="mode-active"><small>AVAILABLE</small><h3>Manual</h3><p>Nothing happens automatically. You create transactions yourself.</p><b>Maximum control</b></article><article><small>PLANNED</small><h3>Detect + Review</h3><p>PFinanc detects a candidate and asks you to approve, edit or reject.</p><b>Intended first mode</b></article><article><small>PLANNED</small><h3>High-confidence auto add</h3><p>Known, validated patterns can eventually be recorded automatically.</p><b>Rules + confidence</b></article><article><small>LONG-TERM VISION</small><h3>Fully automatic</h3><p>You review exceptions instead of every transaction.</p><b>Minimal intervention</b></article></div></section>

    <section className="semantics"><div className="section-wrap"><SectionTitle eyebrow="BUILT FOR REAL FINANCIAL DATA" title={'Money is more than “in” and “out.”'} copy="An extensible ledger preserves what a transaction actually means."/><div className="semantic-grid">{[["Expense","₹850","Swiggy"],["Income","₹50,000","Salary"],["Transfer","₹10,000","HDFC → Savings"],["Investment","₹5,000","Mutual Fund SIP"],["Refund","₹850","Swiggy Refund"],["Dividend","₹1,240","Equity Dividend"]].map(([type,amount,name])=><article key={type}><small>{type}</small><strong>{amount}</strong><span>{name}</span></article>)}</div>
      <div className="transfer"><div><Label>TRANSFERS DONE CORRECTLY</Label><h3>Moving money isn’t spending money.</h3><p>When ₹10,000 moves between family accounts, PFinanc records one transfer—not a fake expense and income.</p><ul><li><Check/> No double counting</li><li><Check/> No fake income</li><li><Check/> No distorted family cash flow</li></ul></div><div className="transfer-visual"><div><small>YOUR ACCOUNT</small><b>−₹10,000</b></div><span><ArrowDown/> TRANSFER</span><div><small>FATHER’S ACCOUNT</small><b>+₹10,000</b></div><MockLabel/></div></div>
    </div></section>

    <section className="capabilities section-wrap"><SectionTitle eyebrow="THE WHOLE PICTURE" title="From cash flow to long-term wealth."/><div className="feature-showcase"><div className="feature-copy"><Label>INVESTMENTS</Label><h3>Your spending and your wealth belong in the same picture.</h3><p>Track stocks, mutual funds, ETFs, fixed deposits, EPF, PPF, NPS, SGB and bonds alongside daily finances.</p><div className="tag-list"><span>Holdings</span><span>Cost basis</span><span>Allocation</span><span>Realized P&L</span><span>Unrealized P&L</span></div></div><div className="portfolio-card"><div className="mock-top"><span>Portfolio</span><MockLabel/></div><strong>₹20,64,250</strong><small>TOTAL VALUE · +12.6% ALL TIME</small><div className="donut"><span>55%<small>Stocks</small></span></div><div className="legend"><i/> Stocks 55% <i/> Mutual funds 33% <i/> Other 12%</div></div></div>
      <div className="triple-features"><article><div className="icon-box"><Users/></div><small>FAMILY FINANCE</small><h3>Shared visibility. Individual privacy.</h3><p>Give each member access to accounts, transactions, investments or analytics—without exposing everything.</p><div className="permissions"><span>You <b>Full access</b></span><span>Spouse <b>Accounts · Investments</b></span><span>Father <b>Accounts · Transactions</b></span></div></article><article><div className="icon-box"><Upload/></div><small>CSV MIGRATION</small><h3>Don’t start from zero.</h3><p>Parse, validate, map, stage, review and reconcile years of bank and investment history.</p><div className="import-box"><b>bank_transactions.csv</b><span><Check/> 1,232 valid</span><span className="warn">16 require review</span></div></article><article><div className="icon-box"><TrendingUp/></div><small>NET WORTH</small><h3>Know what you actually have.</h3><p>Assets and liabilities stay connected to structured financial data—not manually entered headline numbers.</p><div className="worth-mini"><b>₹24,86,420</b><span>Assets − Liabilities</span><svg viewBox="0 0 300 60" aria-label="Sample upward net worth trend"><path d="M0 52 C35 48,42 34,76 39 S122 21,151 30 S202 15,224 20 S265 3,300 8"/></svg></div></article></div>
    </section>

    <section id="privacy" className="privacy"><div className="section-wrap privacy-grid"><div><Label>PRIVACY, NOT PROMISES</Label><h2>Your financial data is yours.</h2><p className="lead">Collect less. Expose less. Give the user control.</p><div className="privacy-list">{([[LockKeyhole,"Minimal data collection","Only collect what is necessary."],[MessageSquareText,"Selective processing","Process relevant financial signals—not your entire inbox."],[ShieldCheck,"On-device where practical","Especially important for Android SMS processing."],[Code2,"Transparent AI usage","Understand what is processed, where it goes and why."]] as Array<[LucideIcon, string, string]>).map(([Icon,t,c])=><div key={t}><Icon/><span><b>{t}</b><small>{c}</small></span></div>)}</div></div><div className="ai-boundary"><div className="ai-title"><Sparkles size={20}/><span>AI WITH GUARDRAILS</span></div><h3>AI can suggest.<br/>The application validates.<br/><em>The ledger stays deterministic.</em></h3><div className="vertical-flow">{["Raw input","Parsed data","AI interpretation","Validation","User approval","Transaction API","Financial ledger"].map((x,i)=><div key={x}><span>{x}</span>{i<6&&<ArrowDown/>}</div>)}</div><p>Known formats are parsed deterministically. AI helps only when a message is ambiguous.</p></div></div></section>

    <section id="open-source" className="open-source"><div className="section-wrap"><SectionTitle eyebrow="OPEN SOURCE FIRST" title="Your financial system shouldn’t be a black box." copy="Inspect it. Self-host it. Fork it. Extend it. Contribute to it."/><div className="architecture"><div className="arch-sources"><span>SMS</span><span>CSV</span><span>Email</span><span>API</span></div><ArrowDown/><div className="arch-flow">{["Ingestion","Parsing","Validation","Candidate layer","Approval / rules","Transaction API","Financial ledger","Analytics / Net worth"].map((x,i)=><span key={x} className={i===6?"arch-focus":""}>{x}</span>)}</div><MockLabel/></div><div className="developer-row"><div><h3>Built for people who want to understand the system underneath.</h3><p>Modular boundaries, documented workflows and provider-agnostic AI. Core calculations and ledger operations stay functional without an AI provider.</p></div><div className="providers"><span>OpenRouter</span><span>OpenAI</span><span>Google</span><span>Anthropic</span><span>Local LLMs</span><span>Self-hosted</span></div></div><div className="center-actions"><Action onClick={() => trackClick("Open Source - Explore")}><Github size={17}/> Explore the source</Action><Action secondary onClick={() => trackClick("Open Source - Star")}>Star PFinanc on GitHub ⭐</Action></div></div></section>

    <section className="workflow section-wrap"><SectionTitle eyebrow="PRODUCT WORKFLOW" title="From financial event to financial insight."/><div className="timeline">{["Financial event","Detect","Parse","Validate","Candidate","Review","Transaction API","Ledger","Analytics","Net worth"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><b>{x}</b></div>)}</div><div className="event-log"><div><time>9:42 AM</time><p>Bank sends: <b>₹850 debited at Swiggy.</b></p></div><div><time>9:42 AM</time><p>PFinanc creates a candidate: <b>Expense · Swiggy · ₹850</b></p></div><div><time>9:43 AM</time><p>You approve. <b>Ledger, cash flow and analytics update.</b></p></div></div></section>

    <Roadmap />
    <Audience />
    <FAQ />
    <section className="final-cta"><div><Label>OPEN SOURCE · PRIVACY FIRST</Label><h2>Stop manually tracking your money.</h2><p>Turn the financial data you already generate into a structured system—automatically where possible, transparently where it matters.</p><div className="hero-actions"><Action onClick={() => trackClick("Final CTA - Get Started")}>Get Started <ArrowRight size={17}/></Action><Action secondary onClick={() => trackClick("Final CTA - Explore")}>Explore GitHub ↗</Action></div></div></section>
    <Footer />
    <a className="sticky-cta" href={github} target="_blank" rel="noreferrer" onClick={() => trackClick("Sticky Try PFinanc")}>Try PFinanc <ArrowRight size={15}/></a>
  </main>;
}

function Roadmap() {
 const groups = [
  ["AVAILABLE NOW", "available", ["Personal & family finance", "Accounts and transactions", "Income, expenses & transfers", "Bank and investment CSV imports", "Stocks and mutual funds", "Portfolio and net worth", "Financial analytics", "AI-assisted statement analysis"]],
  ["IN DEVELOPMENT / PLANNED", "planned", ["Android SMS detection", "Transaction candidates", "Approval workflow", "Duplicate detection", "Account & transfer matching", "Confidence scoring", "High-confidence auto-add", "Offline retry and resume"]],
  ["ROADMAP", "future", ["Email transaction detection", "Automatic categorization", "Merchant normalization", "Recurring transactions", "Budgets and goals", "Loans and EMI", "Advanced analytics", "Corporate actions"]],
  ["LONG-TERM VISION", "vision", ["AI financial assistant", "Natural-language queries", "Intelligent insights", "Anomaly detection", "Personalized recommendations", "Automated workflows", "Plugin ecosystem", "Advanced family finance"]],
 ];
 return <section id="roadmap" className="roadmap"><div className="section-wrap"><SectionTitle eyebrow="HONEST BY DESIGN" title="What’s available today—and what comes next." copy="Future automation is exciting. Trust starts with labeling it accurately."/><div className="roadmap-grid">{groups.map(([title,kind,items])=><article className={String(kind)} key={String(title)}><small>{String(title)}</small><ul>{(items as string[]).map(x=><li key={x}><Check size={14}/>{x}</li>)}</ul></article>)}</div></div></section>;
}

function Audience() {
 const groups: Array<[LucideIcon, string, string]> = [[WalletCards,"Individuals","Track less. Understand more."],[Users,"Families","Shared finances. Granular control."],[TrendingUp,"Investors","Spending, portfolio and net worth together."],[Code2,"Developers","Inspect, self-host and extend."]];
 return <section className="audience section-wrap"><SectionTitle eyebrow="WHO IT’S FOR" title="One platform. Four perspectives."/><div className="audience-grid">{groups.map(([Icon,t,c])=><article key={String(t)}><Icon/><h3>{String(t)}</h3><p>{String(c)}</p></article>)}</div><div className="not-bank"><div><Label>IMPORTANT DISTINCTION</Label><h2>PFinanc observes your finances.<br/><em>It does not move your money.</em></h2></div><div><p>PFinanc is not a bank, payment processor, trading platform or financial institution.</p><p className="never"><X/> No UPI payments <X/> No bank transfers <X/> No trades <X/> No withdrawals</p></div></div></section>;
}

function FAQ() {
 const faq=[
  ["Is PFinanc free?","PFinanc is being built as an open-source project first. A long-term commercial model has not been defined."],
  ["Is PFinanc currently fully automatic?","No. Core financial management is available, while the major Android SMS workflow is planned."],
  ["Does PFinanc read all my SMS messages?","The intended architecture processes only potentially relevant financial messages—not your entire inbox."],
  ["Can AI directly add transactions?","No. AI output is structured and validated. The ledger changes only through the application’s transaction workflow."],
  ["Can I self-host PFinanc?","Self-hosting is a core open-source goal of the project."],
  ["Can I use PFinanc for family finances?","Yes. Family finance includes configurable access for accounts, transactions, investments and analytics."],
  ["Does PFinanc move my money?","No. It records and analyzes activity; it does not initiate payments, transfers, trades, deposits or withdrawals."],
  ["Will SMS automation work on iPhone?","The planned workflow is Android-first. iOS support depends on what the platform permits."],
  ["Can I import existing financial data?","Yes. CSV imports support bank transactions, stocks, mutual funds and current holdings."],
 ];
 return <section id="faq" className="faq section-wrap"><SectionTitle eyebrow="FAQ" title="Questions, answered plainly."/><div className="faq-list">{faq.map(([q,a])=><details key={q}><summary>{q}<ChevronDown/></summary><p>{a}</p></details>)}</div></section>;
}

function Footer() {
 const connectLinks: Record<string, string> = {
  "X": "https://x.com/mitesh_rv",
  "Portfolio": "https://mitesh-vasoya.vercel.app",
  "GitHub": "https://github.com/miteshrvasoya",
  "LinkedIn": "https://www.linkedin.com/in/mitesh-vasoya"
 };

 return <footer><div className="footer-main"><div className="footer-brand"><a href="#top" className="logo"><i/>PFinanc</a><p>Your finances, without the manual work.</p><div style={{marginTop:"1rem"}}><small>Built by Mitesh Vasoya</small></div></div>{[["Product",["Features","Investments","Family Finance","Privacy","Roadmap"]],["Developers",["GitHub","Documentation","Architecture","Contributing","Self-hosting"]],["Connect",["X","LinkedIn","Portfolio","GitHub"]],["Legal",["Privacy","Terms","Security"]]].map(([title,links])=><div className="footer-col" key={String(title)}><b>{String(title)}</b>{(links as string[]).map(x=><a key={x} href={title === "Connect" ? connectLinks[x] : (x==="GitHub"?github:"#top")} target={title === "Connect" ? "_blank" : undefined} rel={title === "Connect" ? "noreferrer" : undefined} onClick={() => trackClick(`Footer ${title} - ${x}`)}>{x}</a>)}</div>)}</div><div className="footer-bottom"><span>© 2026 PFinanc. Open-source personal finance.</span><span>Built for individuals, families and developers.</span></div></footer>;
}