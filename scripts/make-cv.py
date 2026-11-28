# Builds public/cv/Oluwaseyi-Oshunwusi-CV.pdf (no phone number; employer kept anonymous).
# Run: python3 scripts/make-cv.py public/cv/Oluwaseyi-Oshunwusi-CV.pdf   (needs reportlab)
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
import sys
from reportlab import rl_config
rl_config.pageCompression = 0  # plain text streams, so tests can check what the CV says

INK = HexColor('#1B1A2E'); MUTED = HexColor('#4A4860'); ACC = HexColor('#C2410C')
name = ParagraphStyle('n', fontName='Helvetica-Bold', fontSize=20, leading=24, textColor=INK)
head = ParagraphStyle('h', fontName='Helvetica', fontSize=10.5, leading=14, textColor=ACC)
contact = ParagraphStyle('c', fontName='Helvetica', fontSize=8.8, leading=12, textColor=MUTED)
sec = ParagraphStyle('s', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=INK, spaceBefore=9, spaceAfter=3, keepWithNext=1)
role = ParagraphStyle('r', fontName='Helvetica-Bold', fontSize=9.4, leading=12.5, textColor=INK, spaceBefore=5)
when = ParagraphStyle('w', fontName='Helvetica', fontSize=8.6, leading=11, textColor=MUTED)
body = ParagraphStyle('b', fontName='Helvetica', fontSize=9, leading=12.2, textColor=INK)
bul = ParagraphStyle('u', parent=body, leftIndent=10, bulletIndent=1, spaceBefore=1)

def B(t): return Paragraph(t, bul, bulletText='•')
def section(t): return Paragraph(t.upper(), sec)
def job(title, org, dates, bullets, heading=None):
    return KeepTogether(([section(heading)] if heading else []) + [Paragraph(f'{title} <font color="#4A4860">| {org}</font>', role), Paragraph(dates, when)] + [B(x) for x in bullets])

s = []
s += [Paragraph('OLUWASEYI OSHUNWUSI', name),
      Paragraph('Full-Stack Developer · Data Analyst · Web3 Community &amp; Growth', head),
      Paragraph('Lagos, Nigeria (UTC+1), working remotely · hello@meetoluwaseyi.com · '
                '<link href="https://www.meetoluwaseyi.com">meetoluwaseyi.com</link> · '
                '<link href="https://github.com/shykeys-data">github.com/shykeys-data</link> · '
                '<link href="https://www.linkedin.com/in/oluwaseyi-o-601915b5">linkedin.com/in/oluwaseyi-o-601915b5</link> · '
                'Dashboard: <link href="https://olist-bi-shykeys.streamlit.app">olist-bi-shykeys.streamlit.app</link>', contact)]

s += [section('Summary'), Paragraph(
    'Full-stack developer with 10+ years on the web, working in JavaScript, React, Node.js, Express, MySQL and Python. '
    'I rebuilt a car marketplace from WordPress into a full-stack web app, built a Telegram moderation bot that replaced a paid service, '
    'and ship server-rendered sites with tests and automatic rollback. '
    'As a data analyst, I built an end-to-end BI project on 99,441 e-commerce orders, from data modelling to a live dashboard. '
    'In Web3, I grew a global crypto exchange\'s African community from zero to 25,000+ members in under a year, and before that '
    'Gate.io\'s Nigeria and Africa community to 20,000+. Open to remote full-stack roles and freelance projects.', body)]

s += [section('Selected projects')]
s += [job('Korrect Cars web app', 'car marketplace for Lagos', '2026 · Node.js, Express, React, MySQL · github.com/shykeys-data/korrectcars-app', [
    'Rebuilt a WordPress car marketplace as a full-stack JavaScript web app on MySQL.',
    'Email-verified sign-up, an admin dashboard, vehicle listings, a peer-to-peer car swap module and an instalment calculator (6 to 48 months).',
    'I wrote the code; Uwem designed the UI/UX.']),
      job('meetoluwaseyi.com', 'personal site, live', '2026 · React 19, TypeScript, Express 5, MySQL, Vite, Zod', [
    'Server-rendered React with an Express API on shared hosting; two modes (playful and serious) on one URL.',
    'Admin with two-factor sign-in, lockout, CSRF protection, rate-limited forms and a strict content security policy.',
    'GitHub Actions CI with Vitest, Playwright and CodeQL; pull-based deploys with health checks and automatic rollback; structured data and IndexNow.']),
      job('Olist e-commerce business intelligence', 'data project', '2026 · Python, pandas, SQL, DuckDB, SciPy, Plotly, Streamlit, Power BI', [
    'End-to-end pipeline on 99,441 orders: 9 raw tables into a star schema, with 14 automated checks so revenue reconciles to the cent.',
    'SQL KPI layer, cohort retention and RFM segmentation into 7 groups; only 2.2% of customers buy again once split orders are corrected.',
    'Hypothesis tests: late deliveries average 2.27 stars against 4.29 on time; slower regions rate worse (Spearman r = -0.84, p < 0.001).',
    'Live Streamlit dashboard and a four-page Power BI report; I dropped two of my own findings that failed the checks.']),
      job('Telegram Safety Bot', 'moderation bot, in production', '2026 · Python, Node.js, Telegram Bot API', [
    'Wrote the product requirements and built a bot that removes spam and fake accounts in a 25,000+ member group, replacing a paid service.']),
      job('RateDesk', 'in development', 'MERN', [
    'Bureau de change rate-comparison and booking platform for Nigerians, with clearly labelled indicative rates.'])]

s += [section('Skills'),
      Paragraph('<b>Development:</b> JavaScript, TypeScript, React, Node.js, Express, Python, HTML, CSS, Vite, REST APIs, Telegram Bot API, Zod · '
                '<b>Databases:</b> MySQL, MongoDB, SQL, DuckDB · <b>Testing and delivery:</b> Git, GitHub Actions, Vitest, Playwright, CodeQL, Cloudflare, DirectAdmin, cPanel · '
                '<b>Data:</b> pandas, NumPy, SciPy, Plotly, Streamlit, Power BI, Excel, data modelling, cohort analysis, hypothesis testing, KPI reporting · '
                '<b>Growth:</b> community growth, KOL partnerships, AMAs and X Spaces, trading education, Google Analytics, Google Ads, SEO, A/B testing · '
                '<b>Also:</b> WordPress, Search Console, communication, stakeholder reporting', body)]

s += [job('Community Manager (Africa)', 'Global crypto exchange', 'December 2024 to present', heading='Experience', bullets=[
    'Grew the African community from zero to 25,000+ members in under 12 months; live trading lectures turned 7,000+ members into active futures traders.',
    'Run daily engagement and moderation across channels, and escalate user issues to support before they become complaints.',
    'Built a Telegram moderation bot in Python and Node.js that replaced paid tools; track community KPIs and present weekly reports to management.',
    'Host AMAs on X Spaces and Telegram; run KOL partnerships judged on trader sign-ups; sourced and onboarded a licensed Nigerian payments provider.',
    'Write community newsletters and produce campaign visuals for Telegram, X, Instagram and Facebook.']),
      job('Co-Founder and Full-Stack Developer', 'Korrect Cars', 'October 2026 to present', [
    'Co-founded a Nigerian car marketplace with three ways to buy: direct purchase, peer-to-peer swap and instalments.',
    'Lead product and engineering: development, database design, hosting, SEO and analytics.']),
      job('Web3 Community Manager / Business Developer', 'Gate.io', 'November 2021 to March 2024', [
    'Grew and managed a Nigeria and Africa community of 20,000+ members.',
    'Helped launch Gate.io P2P trading for Nigerian and African users.',
    "Organised Gate.io's first local meetup in Nigeria (2022); hosted 30+ X Spaces with 1,000+ live listeners on international sessions.",
    'Ran monthly trading classes that turned an estimated 2,000 to 3,000 members into active traders; set up campus affiliate programmes with LASU and Yabatech.']),
      job('Web Developer / Digital Marketer (Freelance)', 'Amaget Online Store', 'January 2020 to January 2023', [
    'Managed site content and page builds; ran Google Ads, SEO and SEM; A/B tested landing pages to raise conversion.']),
      job('Administrative Assistant, Operations', 'Sixteen by Nine Creatives', 'January 2020 to March 2021', [
    'Deputised as HR and operations lead for 8 staff; coordinated music-video production and kept the accounts.']),
      job('Web Developer / Digital Marketer', 'Blessing Computers and Technocrat NG', 'April 2016 to August 2018', [
    'Built client websites in HTML, CSS, JavaScript and WordPress; ran Technocrat operations, Google Ads and SEO.']),
      job('Senior Web Developer', 'Lantern Books', 'January 2015 to January 2016', [
    "Built and ran the company website and IT, and started its digital marketing."]),
      job('Web Developer', 'HCS Properties', '2014', [
    'Built the company site and ran customer service and social media.'])]

s += [section('Education and certificates'),
      Paragraph('IBM Data Analyst Capstone Project (2026) · MERN Stack Professional Course, Udemy (2024) · Diploma in Software Development, British Computer Society (coursework completed) · '
                'OND, Computer Science, Lagos City Polytechnic (2010) · IBM Data Analyst certificates: Data Visualization with Python, '
                'Data Analysis with Python, Databases and SQL, Python for Data Science and AI, Dashboards with Excel and Cognos', body),
      section('Languages'),
      Paragraph('English (fluent) · Yoruba (fluent) · Hausa (conversational)', body)]

doc = SimpleDocTemplate(sys.argv[1], pagesize=A4, leftMargin=16*mm, rightMargin=16*mm, topMargin=14*mm, bottomMargin=14*mm,
                        title='Oluwaseyi Oshunwusi: CV', author='Oluwaseyi Oshunwusi',
                        subject='Full-stack developer, data analyst, Web3 community and growth. Lagos, Nigeria.')
doc.build(s)
