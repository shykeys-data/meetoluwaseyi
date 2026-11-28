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
sec = ParagraphStyle('s', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=INK, spaceBefore=9, spaceAfter=3)
role = ParagraphStyle('r', fontName='Helvetica-Bold', fontSize=9.4, leading=12.5, textColor=INK, spaceBefore=5)
when = ParagraphStyle('w', fontName='Helvetica', fontSize=8.6, leading=11, textColor=MUTED)
body = ParagraphStyle('b', fontName='Helvetica', fontSize=9, leading=12.2, textColor=INK)
bul = ParagraphStyle('u', parent=body, leftIndent=10, bulletIndent=1, spaceBefore=1)

def B(t): return Paragraph(t, bul, bulletText='•')
def section(t): return Paragraph(t.upper(), sec)
def job(title, org, dates, bullets):
    return KeepTogether([Paragraph(f'{title} <font color="#4A4860">| {org}</font>', role), Paragraph(dates, when)] + [B(x) for x in bullets])

s = []
s += [Paragraph('OLUWASEYI OSHUNWUSI', name),
      Paragraph('Full-Stack Developer (MERN) · Web3 Community &amp; Business Development · Data Analysis', head),
      Paragraph('Lagos, Nigeria (UTC+1), working remotely · hello@meetoluwaseyi.com · '
                '<link href="https://www.meetoluwaseyi.com">meetoluwaseyi.com</link> · '
                '<link href="https://github.com/shykeys-data">github.com/shykeys-data</link> · '
                '<link href="https://www.linkedin.com/in/oluwaseyi-o-601915b5">linkedin.com/in/oluwaseyi-o-601915b5</link>', contact)]

s += [section('Summary'), Paragraph(
    'Full-stack developer building for the web since 2014, now working in React, TypeScript, Node.js, Express and MySQL. '
    'I ship server-rendered sites with tests, security scanning and automatic rollback, and I build marketplaces and bots that real users depend on. '
    'Alongside the code, I run the African community for a global crypto exchange (zero to 25,000+ members in under a year) '
    'and analyse data in Python and SQL. Open to remote full-stack roles and freelance projects.', body)]

s += [section('Selected projects')]
s += [job('meetoluwaseyi.com', 'personal site, live', '2026 · React 19, TypeScript, Express 5, MySQL, Vite, Zod', [
    'Server-rendered React with an Express API on DirectAdmin shared hosting; two modes (playful and serious) on one URL.',
    'Admin panel with two-factor sign-in, account lockout, CSRF protection, rate-limited forms and a strict content security policy.',
    'CI on GitHub Actions: Vitest and Playwright tests, CodeQL security scanning, OpenAPI linting; pull-based deploys with health checks and automatic rollback.',
    'Technical SEO: structured data, dated sitemap, IndexNow; Lighthouse SEO and Best Practices both 100.']),
      job('Korrect Cars', 'car marketplace for Lagos', 'Node.js, React, MySQL · code by me, UI/UX by Uwem', [
    'Inspected-car listings, Pay Small Small instalment plans from 6 to 48 months, and car-for-car swaps.']),
      job('Telegram Safety Bot', 'moderation bot, in production', 'Python', [
    'Replaced paid moderation tools in a 25,000-member Telegram group; removes spam and fake accounts automatically.']),
      job('Olist E-commerce BI', 'data case study', 'Python, SQL, Streamlit, Power BI', [
    '99,441 orders modelled into a star schema with 14 automated data checks; cohort retention and RFM segmentation.',
    'Live Streamlit dashboard, four-page Power BI report and four recommendations; tested and dropped two of my own findings that failed the checks.']),
      job('RateDesk', 'in development', 'MERN', [
    'Bureau de change rate-comparison and booking platform for Nigerians, with clearly labelled indicative rates.'])]

s += [section('Skills'),
      Paragraph('<b>Frontend:</b> React, TypeScript, JavaScript, HTML, CSS, Vite · <b>Backend:</b> Node.js, Express, REST APIs, Zod · '
                '<b>Data stores:</b> MySQL, MongoDB, SQL · <b>Testing and delivery:</b> Vitest, Playwright, GitHub Actions, CodeQL, Cloudflare, DirectAdmin, cPanel · '
                '<b>Data:</b> Python (pandas, NumPy, SciPy, Plotly), Power BI, Streamlit · '
                '<b>Also:</b> WordPress, Google Analytics, Search Console, SEO, Google Ads', body)]

s += [section('Experience')]
s += [job('Community Manager (Africa)', 'Global crypto exchange', 'December 2024 to present', [
    'Grew the African community from zero to 25,000+ members in under 12 months; live trading lectures turned 7,000+ members into active futures traders.',
    'Run daily engagement and moderation across channels, and escalate user issues to support before they become complaints.',
    'Built and run a custom Telegram safety bot that replaced paid moderation tools.',
    'Host AMAs on X Spaces and Telegram; run KOL partnerships judged on trader sign-ups; sourced and onboarded a licensed Nigerian payments provider.',
    'Write community newsletters and produce campaign visuals for Telegram, X, Instagram and Facebook.']),
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
      Paragraph('MERN Stack Professional Course, Udemy (2024) · Diploma in Software Development, British Computer Society (coursework completed) · '
                'OND, Computer Science, Lagos City Polytechnic (2010) · IBM Data Analyst certificates: Data Analyst Capstone, Data Visualization with Python, '
                'Data Analysis with Python, Databases and SQL, Python for Data Science and AI, Dashboards with Excel and Cognos', body),
      section('Languages'),
      Paragraph('English (fluent) · Yoruba (fluent) · Hausa (conversational)', body)]

doc = SimpleDocTemplate(sys.argv[1], pagesize=A4, leftMargin=16*mm, rightMargin=16*mm, topMargin=14*mm, bottomMargin=14*mm,
                        title='Oluwaseyi Oshunwusi: CV', author='Oluwaseyi Oshunwusi',
                        subject='Full-stack developer (MERN), Web3 community and business development, data analysis. Lagos, Nigeria.')
doc.build(s)
