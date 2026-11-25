/**
 * The four skill pages and the four articles. Written in a small Markdown subset (see web/lib/markdown.tsx):
 * ## and ### headings, paragraphs, - and 1. lists, | tables |, **bold** and [links](/path).
 * Server-only: a page gets its own doc in the page data. Approved copy from the "skill pages and articles" doc. Every number comes from the CV or the case study.
 */
import type { Doc } from '../../shared/page.ts';

const DATE = '2026-11-25';
const OLIST = 'https://olist-bi-shykeys.streamlit.app';
const OLIST_CODE = 'https://github.com/shykeys-data/olist-ecommerce-bi';

export const SKILLS: Doc[] = [
  {
    kind: 'skill',
    slug: 'full-stack-developer',
    path: '/full-stack-developer',
    name: 'Full-stack web development',
    title: 'Full-Stack Developer in Lagos, Nigeria (MERN)',
    description:
      'I build websites and web apps with React, Node.js, Express and MySQL. Remote or freelance, from Lagos. See live projects and send me your brief.',
    eyebrow: 'Full-stack developer',
    h1: 'Full-stack web developer in Lagos, building for clients anywhere',
    published: DATE,
    updated: DATE,
    body: `I'm Oluwaseyi Oshunwusi, a full-stack developer in Lagos, Nigeria. I build websites and web apps with React, Node.js, Express and MySQL, and I've been shipping for the web since 2014. You get one person who handles the design build, the server, the database and the launch, and who explains each step in plain words.

My current work is live and public: Korrect Cars, a car marketplace for Lagos buyers, and this site, which you can read the code for on [GitHub](https://github.com/shykeys-data/meetoluwaseyi).

## What I build

**Business websites that load fast and rank.** Server-rendered pages, so Google and AI search read every word on the first visit. This site scores 97 for mobile performance on Google PageSpeed Insights.

**Web apps with accounts, payments and dashboards.** React on the front, Node.js and Express on the back, MySQL underneath. Korrect Cars handles car listings, Pay Small Small instalment plans from 6 to 48 months, and car-for-car swaps.

**Admin panels you can run yourself.** A private dashboard where you edit pages, publish projects and read messages without calling a developer. Mine has two-factor sign-in and locks itself after five wrong attempts.

**Fixes and rescues.** A slow site, a broken form, a site Google can't see. I find the cause, fix it and show you what changed.

**Bots and automations.** I replaced the paid moderation tools in a 25,000-member Telegram group with a free custom bot that removes spam and fake accounts.

## Work you can check

- **Korrect Cars** ([korrectcars.com](https://www.korrectcars.com)). A car marketplace for Lagos: inspected cars, Pay Small Small over 6 to 48 months, and car-for-car swaps. I wrote the code in Node.js, React and MySQL; Uwem designed the UI/UX.
- **meetoluwaseyi.com.** Server-rendered React with an Express API and MySQL on shared hosting, a two-factor admin, automatic tests on every change, and automatic rollback if a release fails. [Read how I built it](/writing/server-rendered-react-on-shared-hosting)
- **RateDesk.** A bureau de change rate-comparison and booking platform for Nigerians, with clearly labelled indicative rates. In development.
- **Earlier client work.** Company websites and online stores for Lantern Books, Blessing Computers, Technocrat NG and Amaget Online Store, where I also ran Google Ads, SEO and A/B tests on landing pages.

## How we work together

1. **You send the brief.** What the site must do, who it's for, examples you like, and your deadline.
2. **I send a plan and a quote.** Pages, features, timeline and cost, in writing, within 5 working days.
3. **You see a staging site.** A private preview address where you click through the real site before anyone else can.
4. **We launch.** I set up the domain, SSL, search indexing and analytics, then hand over the admin and a short guide.
5. **I stay reachable.** Fixes after launch, plus updates when you need them.

## Tools I use

React, TypeScript, Node.js, Express, MySQL, MongoDB, Vite, Playwright for browser tests, GitHub Actions for automatic testing and deployment, Cloudflare, DirectAdmin and cPanel hosting, WordPress, Google Analytics and Google Search Console.`,
    faq: [
      [
        'Do you work with clients outside Nigeria?',
        'Yes. I work remotely from Lagos (UTC+1) and overlap with UK and European working hours, plus the US East Coast morning.',
      ],
      [
        'What does a website cost?',
        "It depends on the pages and features. Send the brief and I'll reply with a written quote before any work starts.",
      ],
      [
        'Can I update the site myself?',
        "Yes. Each site comes with an admin panel for your pages, projects and messages, so you don't need a developer for everyday changes.",
      ],
      [
        'Will Google find my site?',
        'I build every page so search engines read the full text on the first visit, then set up Google Search Console and submit your sitemap at launch.',
      ],
      [
        'Do you only build in the MERN stack?',
        "It's my main stack. I also work in WordPress when a client needs it, and in Python for bots and data work.",
      ],
      [
        'Can you fix a site someone else built?',
        "Yes. I'll review it first and tell you what's wrong before quoting the fix.",
      ],
    ],
    cta: {
      title: 'Have a site or app in mind?',
      body: "Tell me what it needs to do and I'll send a plan and a quote within 5 working days.",
      href: '/contact',
      label: 'Send me your brief',
    },
    related: [
      { href: '/web3-community-manager', label: 'Web3 community management' },
      { href: '/data-analyst', label: 'Data analysis and dashboards' },
    ],
  },
  {
    kind: 'skill',
    slug: 'web3-community-manager',
    path: '/web3-community-manager',
    name: 'Web3 community management',
    title: 'Web3 Community Manager for Crypto Projects',
    description:
      "I grew a global crypto exchange's African community from zero to 25,000+ in under a year and turned 7,000+ members into active traders.",
    eyebrow: 'Web3 community manager',
    h1: 'Web3 community manager for crypto exchanges and projects in Africa',
    published: DATE,
    updated: DATE,
    body: `I'm Oluwaseyi Oshunwusi, a Web3 community manager based in Lagos. At a global crypto exchange I grew the African community from zero to more than 25,000 members in under 12 months, and turned over 7,000 of them into active futures traders through live trading classes. Before that I built Gate.io's Nigeria and Africa community to 20,000+ members.

I trade spot and futures myself, so I talk to your users as a fellow trader, in English, Yoruba or Hausa.

## What I do

**Community growth from zero.** I build the channels, the posting rhythm and the first 1,000 members, then grow from there with campaigns, KOLs and referrals.

**Trading education that converts.** Live classes from futures basics to risk management. At Gate.io, monthly classes turned an estimated 2,000 to 3,000 members into active traders; at my current exchange, live lectures turned 7,000+.

**Daily engagement and moderation.** A 7AM market brief every morning, weekly games (quiz polls, Last Commenter, Predict-to-Win), fast replies, and user issues escalated to support before they turn into complaints. I also built a free custom Telegram bot that keeps my current community clear of spam and fake accounts.

**AMAs and X Spaces.** I've hosted 30+ X Spaces for Gate.io, drawing 1,000+ live listeners on international sessions and 200 to 400 on Africa-focused ones.

**Events and campus programmes.** I organised Gate.io's first local meetup in Nigeria in 2022 and set up campus affiliate programmes with two Nigerian universities, LASU and Yabatech.

## Results

| Community | Period | Result |
| --- | --- | --- |
| Global crypto exchange (current role) | Dec 2024 to now | 0 to 25,000+ members in under 12 months; 7,000+ turned futures traders |
| Gate.io Nigeria/Africa | Nov 2021 to Mar 2024 | 20,000+ members; helped launch Gate.io P2P for Nigerian and African users; first Nigeria meetup (2022) |

[Read how I grew a crypto community to 25,000+](/writing/growing-a-crypto-community-in-africa)

## How we work together

1. **Audit.** I join your channels and review your numbers: members, active users, message volume, conversion to trading or sign-ups.
2. **Plan.** A 90-day plan: channel structure, daily and weekly programmes, campaigns, KOLs and the metrics we track.
3. **Run.** I run the community myself or train your moderators, with a weekly report on growth and activity.
4. **Review.** Every month we look at what moved the numbers and change what didn't.

## Tools and platforms

Telegram, X (Twitter) and X Spaces, Discord, TweetDeck, Instagram, Facebook, TikTok, email newsletters, Telegram bots written in Python, and Google Analytics.`,
    faq: [
      [
        'Which markets do you know best?',
        "Nigeria and the wider African crypto market, where I've run communities since 2021. I speak English, Yoruba and conversational Hausa.",
      ],
      [
        'Do you only work with exchanges?',
        'Exchanges are where my results come from, but the same playbook works for wallets, DeFi projects and token launches that need real, active users.',
      ],
      [
        'How do you measure a community?',
        'By what members do, not by member count: daily active members, AMA attendance, and how many members start trading or using the product.',
      ],
      [
        'How do you handle scams and fake accounts?',
        'Clear rules, active moderation and a custom bot that removes spam and fake followers automatically.',
      ],
      [
        'Can you train our team?',
        'Yes. I can run your community while training your moderators, then hand it over with a written playbook.',
      ],
    ],
    cta: {
      title: 'Building a crypto community in Africa?',
      body: 'Tell me where you are today and where you want to be. I reply within 5 working days.',
      href: '/contact',
      label: 'Talk to me about your community',
    },
    related: [
      { href: '/web3-business-development', label: 'Web3 business development' },
      { href: '/writing/growing-a-crypto-community-in-africa', label: 'How I grew a crypto community to 25,000+' },
    ],
  },
  {
    kind: 'skill',
    slug: 'web3-business-development',
    path: '/web3-business-development',
    name: 'Web3 business development',
    title: 'Web3 & Crypto Business Development, Africa',
    description:
      'Partnerships, KOL deals, payments partners and market entry for crypto projects in Nigeria and Africa. BD experience at Gate.io and a global exchange.',
    eyebrow: 'Web3 business development',
    h1: 'Web3 business development for crypto projects entering Africa',
    published: DATE,
    updated: DATE,
    body: `I'm Oluwaseyi Oshunwusi, a Web3 business developer in Lagos. I help crypto exchanges and projects enter Nigeria and the wider African market: the partners, the payment rails, the creators and the first communities that turn a launch into users.

At Gate.io I helped launch P2P trading for Nigerian and African users. At a global crypto exchange I sourced and onboarded the licensed Nigerian payments provider it uses today, and I run its KOL partnerships.

## What I do

**Market entry for Nigeria and Africa.** What to launch first, which rails users expect, how local competitors win users, and which communities and creators to reach before you spend on ads.

**Payments and on-ramp partners.** I find and onboard licensed local partners so users can deposit and withdraw in naira. I did this for a global exchange in Nigeria, from first call to live integration.

**KOL and creator partnerships.** I pick creators who move trader sign-ups, not only impressions, and agree terms you can measure.

**Campus and community partnerships.** At Gate.io I set up campus affiliate programmes with LASU and Yabatech, bringing student crypto communities onto the platform.

**Launch events and AMAs.** Gate.io's first local meetup in Nigeria (2022), 30+ X Spaces, and AMAs on Telegram that put a human voice behind the brand.

## Results

- **Gate.io P2P in Nigeria and Africa.** Helped launch P2P trading for the region, one of the exchange's biggest moves into Africa.
- **A live payments partner for a global exchange in Nigeria.** Sourced a licensed Nigerian payments provider and took it from introduction to live use.
- **Campus programmes.** Affiliate programmes with two Nigerian universities, LASU and Yabatech.
- **Communities that back the deals.** 25,000+ members at my current exchange and 20,000+ at Gate.io Nigeria/Africa, so partners reach real, active users.

## How we work together

1. **Brief.** You tell me your product, your target countries and what a good first year looks like.
2. **Map.** I map the partners, payment providers, creators and communities that matter for that market, with a shortlist.
3. **Outreach and deals.** I make the introductions, run the calls and bring back terms for you to approve.
4. **Launch and report.** I support the launch on the ground and report sign-ups, volume and partner performance.

## Tools and channels

Telegram, X and X Spaces, LinkedIn, email outreach, partner calls, campus networks, and CRM tracking in spreadsheets or the tool your team uses.`,
    faq: [
      [
        'Why Nigeria first?',
        "Nigeria has one of the world's most active crypto user bases, and users there expect P2P trading and local payment rails from day one.",
      ],
      [
        'Can you help with payments in naira?',
        "Yes. I've sourced and onboarded a licensed Nigerian payments provider for an exchange, so I know the questions to ask and the documents partners need.",
      ],
      [
        'Do you work outside Nigeria?',
        'Yes. My communities reach users across Africa, and I work remotely with teams anywhere.',
      ],
      [
        'Do you handle regulation and licensing?',
        "I work with licensed partners and point you to local counsel. I don't give legal advice.",
      ],
      [
        'How do you price BD work?',
        "By scope: a market-entry plan, a set of introductions, or ongoing BD. Tell me what you need and I'll propose terms.",
      ],
    ],
    cta: {
      title: 'Planning a launch in Nigeria or Africa?',
      body: "Tell me what you're launching and where. I reply within 5 working days.",
      href: '/contact',
      label: 'Start a conversation',
    },
    related: [
      { href: '/web3-community-manager', label: 'Web3 community management' },
      { href: '/writing/launching-a-crypto-exchange-in-nigeria', label: 'Taking a crypto exchange into Nigeria' },
    ],
  },
  {
    kind: 'skill',
    slug: 'data-analyst',
    path: '/data-analyst',
    name: 'Data analysis and BI dashboards',
    title: 'Data Analyst in Lagos: Python, SQL & BI Dashboards',
    description:
      'Python, SQL and Power BI dashboards that answer one business question at a time. See my 99,441-order e-commerce case study and send me your data question.',
    eyebrow: 'Data analyst',
    h1: 'Data analyst turning business data into decisions you can act on',
    published: DATE,
    updated: DATE,
    body: `I'm Oluwaseyi Oshunwusi, a data analyst in Lagos working in Python, SQL, Power BI and Streamlit. I start with the question your business needs answered, clean the data until the numbers hold, and finish with a dashboard and a short list of recommendations.

My main case study analyses 99,441 real e-commerce orders, and I test my own findings before I publish them: two of mine didn't survive. [Read the case study](/work/olist-ecommerce-bi)

## What I do

**Dashboards people use.** Interactive dashboards in Power BI or Streamlit, filtered by month, region and category, where every number matches the analysis behind it.

**Customer and sales analysis.** Retention cohorts, RFM segments (recency, frequency, monetary value) and repeat-purchase rates that show which customers come back and why the others leave.

**Cleaning and joining messy data.** Several tables in different shapes, turned into one dataset you can trust. The Olist project started as nine separate tables.

**Testing findings before you act on them.** Hypothesis tests and checks against my own conclusions, so you don't act on a pattern that isn't real.

**Market and economic research.** Public datasets such as World Bank open data, turned into a readable series or report.

## Results

- **Olist E-commerce BI.** 99,441 Brazilian e-commerce orders over four weeks. Late deliveries pulled review scores from 4.3 stars to under 2, and only 2.2% of customers ever ordered again. Outputs: Python notebooks, a live Streamlit dashboard, a four-page Power BI executive report and four recommendations. [Case study](/work/olist-ecommerce-bi) · [Live dashboard](${OLIST}) · [Code on GitHub](${OLIST_CODE})
- **Growth Without Reach.** Five African economies from 2020 to 2024 on World Bank open data, published as a LinkedIn series and a free digital book.
- **IBM Data Analyst capstone.** The 2024 Stack Overflow developer survey, 65,437 respondents: JavaScript leads job postings and PostgreSQL keeps growing. [Code on GitHub](https://github.com/shykeys-data/ibm-data-analyst-capstone)

## How we work together

1. **The question.** You tell me the decision you need to make. I turn it into two or three questions the data can answer.
2. **The data.** You share exports or access. I check what's missing or broken before I promise anything.
3. **The analysis.** I clean, analyse and test the findings, with my code kept so you can rerun it.
4. **The handover.** A dashboard, a one-page summary and a short call to walk through the recommendations.

## Tools

Python (pandas, NumPy, SciPy, Plotly), SQL, Power BI, Streamlit, Jupyter and Google Colab, Excel and Google Sheets, IBM Cognos, Google Analytics, and GitHub for version control.`,
    faq: [
      [
        'What data do you need from me?',
        'Exports from your sales, CRM, shop or analytics tools, as CSV or Excel, or read-only access to your database.',
      ],
      [
        'Do you sign an NDA?',
        'Yes. Your data stays private and I delete my copy when the project ends, unless you ask me to keep it.',
      ],
      [
        'Power BI or Streamlit?',
        'Power BI if your team already uses Microsoft 365; Streamlit when you want a free web link anyone can open.',
      ],
      [
        'Can you set up a dashboard that updates itself?',
        'Yes, when your data source allows a live connection or a scheduled export.',
      ],
      [
        'How long does an analysis take?',
        'A focused question on clean data takes days; the Olist project took four weeks from raw tables to executive report.',
      ],
    ],
    cta: {
      title: "Sitting on data you don't use?",
      body: 'Send me the question you want answered. I reply within 5 working days.',
      href: '/contact',
      label: 'Send me your data question',
    },
    related: [
      { href: '/full-stack-developer', label: 'Full-stack web development' },
      {
        href: '/writing/late-deliveries-and-repeat-customers',
        label: 'What 99,441 orders showed about late deliveries',
      },
    ],
  },
];

export const ARTICLES: Doc[] = [
  {
    kind: 'article',
    slug: 'server-rendered-react-on-shared-hosting',
    path: '/writing/server-rendered-react-on-shared-hosting',
    name: 'Server-rendered React on shared hosting',
    title: 'Server-Rendered React on Shared Hosting: How I Built My Site',
    description:
      'How I built meetoluwaseyi.com with React, Express and MySQL on DirectAdmin shared hosting: server rendering, safe deploys, 2FA and a 97 PageSpeed score.',
    eyebrow: 'Full-stack development',
    h1: 'Server-rendered React on shared hosting: how I built meetoluwaseyi.com',
    published: DATE,
    updated: DATE,
    body: `You don't need an expensive cloud setup to run a fast, secure React site. I built meetoluwaseyi.com with React, Node.js, Express and MySQL on a DirectAdmin shared hosting plan, the kind many Nigerian businesses already pay for. It scores 97 for mobile performance on Google PageSpeed Insights, and every release goes through automatic tests before it reaches visitors.

This is how it works, and what broke along the way.

## Why server rendering matters

A standard React app sends the browser an empty page and builds the content with JavaScript. Visitors on slow phones wait, and Google and AI search tools may index a blank page. On my site, the Express server renders every page to full HTML first. Google, ChatGPT and Perplexity read the headings and text on the first request, and the browser then attaches React so the animations and the playful/serious switch work.

## The stack

| Layer | What I used | Why |
| --- | --- | --- |
| Pages | React 19, rendered on the server | Full text for search engines; fast first paint |
| Build | Vite | Small bundles, split per page |
| Server | Node.js 20 and Express 5 | Runs on the host's Node.js app manager |
| Database | MySQL | Included with the hosting plan |
| Validation | Zod | One set of rules shared by the browser and the server |
| Tests | Vitest and Playwright | Code tests plus real browser tests on every change |

## Deploying without SSH

My host gives me a control panel, not a terminal. So GitHub does the building. When I merge a change, GitHub Actions runs the tests, builds the site and publishes the finished files to a release branch. Every five minutes, a scheduled job on the server checks for a new version, installs it, restarts the app and calls a health-check address. If the health check fails, the script puts the previous version back on its own.

New work goes to a password-protected staging site first. The live site only updates when I publish a tagged release.

## Security for a one-person site

The admin page has two-factor sign-in with an authenticator app, and the account locks after five wrong attempts. Forms are rate-limited, every admin change needs a CSRF token, and the browser is only allowed to run scripts the server signed for that page. GitHub's CodeQL scanner checks the code on every change. It caught a real bug: an address starting with two slashes could redirect a visitor to another website. I fixed it, added a test, and the scanner now stays quiet.

## The bug that cost 22 performance points

The first Google PageSpeed test on mobile gave the homepage 75. The layout shift score was 1.0, where Google wants under 0.1. The cause: the main stylesheet loaded at the end of the page. On a slow phone, the browser painted before the styles arrived, a hidden full-screen block showed for a moment, and the whole page jumped. Moving the stylesheet into the page head took the shift to 0.008 and the score to 97.

## What I'd tell a business owner

Cheap hosting can run a modern site if the build happens elsewhere and the server only runs the finished app. Ask your developer three questions: can Google read my pages without JavaScript, what happens if a release breaks, and who can sign in to my admin?`,
    cta: {
      title: 'Want a site built this way?',
      body: "Tell me what it needs to do and I'll send a plan and a quote within 5 working days.",
      href: '/contact',
      label: 'Send me your brief',
    },
    related: [{ href: '/full-stack-developer', label: 'See my full-stack work' }],
  },
  {
    kind: 'article',
    slug: 'growing-a-crypto-community-in-africa',
    path: '/writing/growing-a-crypto-community-in-africa',
    name: 'How I grew a crypto community to 25,000+',
    title: 'How I Grew a Crypto Community From Zero to 25,000+',
    description:
      "How a crypto exchange's African community grew from zero to 25,000+ members in under a year, and how live classes turned 7,000+ members into traders.",
    eyebrow: 'Community management',
    h1: 'How I grew a crypto community in Africa from zero to 25,000+ members',
    published: DATE,
    updated: DATE,
    body: `In December 2024, the exchange community I now manage had zero members. In under 12 months it passed 25,000, and more than 7,000 of those members became active futures traders. No single campaign did that. A daily rhythm did, one that gave people a reason to open the chat every morning and a reason to trade once they understood how.

Here is the playbook, with the parts you can copy.

## 1. Give the community a morning habit

The group chat opens every day with a 7AM market brief: what moved overnight, what to watch, and one idea to discuss. It takes ten minutes to write. It gives members a reason to check in before work, and it gives quiet members something easy to reply to.

## 2. Teach first, sell never

Most new members in Nigeria join a crypto group curious but unsure. Weekly live trading classes take them from futures basics to risk management, in plain English, with time for questions. People who understand leverage and stop-losses trade with more confidence. I ran the same model at Gate.io, where monthly classes turned an estimated 2,000 to 3,000 members into active traders. At my current exchange, the classes turned more than 7,000.

## 3. Make the chat fun on purpose

Every week the group runs games: quiz polls on market basics, Last Commenter, and Predict-to-Win, where members call a price move. Games bring back members who stopped reading, and the quiz questions double as lessons.

## 4. Pick creators who bring traders

KOL and influencer partnerships drove a large share of new members. I choose creators whose audiences sign up and trade, and I judge them on sign-ups, not impressions.

## 5. Put a human voice in front of the brand

AMAs on X Spaces and Telegram let members ask a real person about listings, fees and problems. At Gate.io I hosted more than 30 X Spaces, with over 1,000 live listeners on international sessions and 200 to 400 on Africa-focused ones. People trust a voice they've heard answer questions live.

## 6. Protect the room

A growing crypto group attracts scammers, fake admins and spam bots. I replaced the group's paid moderation tools with a free custom Telegram bot that removes spam and fake accounts, and I escalate user problems to support before they turn into public complaints.

## What I'd do first in a new community

1. Set the daily rhythm before chasing members: a morning brief and a fixed weekly class.
2. Write clear rules and set up moderation on day one.
3. Bring in the first members through two or three creators your target users already follow.
4. Track active members and conversions every week, not the member count alone.`,
    cta: {
      title: 'Building a crypto community in Africa?',
      body: 'Tell me where you are today and where you want to be.',
      href: '/contact',
      label: 'Talk to me about your community',
    },
    related: [{ href: '/web3-community-manager', label: 'See how I work as a Web3 community manager' }],
  },
  {
    kind: 'article',
    slug: 'launching-a-crypto-exchange-in-nigeria',
    path: '/writing/launching-a-crypto-exchange-in-nigeria',
    name: 'Taking a crypto exchange into Nigeria',
    title: 'Launching a Crypto Exchange in Nigeria: 5 BD Lessons',
    description:
      "Five business development lessons from Gate.io's P2P launch and a global exchange's Nigerian payments partner: naira rails, campus deals, meetups and KOLs.",
    eyebrow: 'Business development',
    h1: 'Launching a crypto exchange in Nigeria: five business development lessons',
    published: DATE,
    updated: DATE,
    body: `Nigerian crypto users decide fast whether a new exchange is worth their money. They check three things: can I deposit and withdraw in naira, do people I trust use it, and is there a real person I can ask when something goes wrong. Over four years at Gate.io and my current exchange, most of my business development work came down to answering those three questions before the launch, not after.

## 1. Naira rails come before marketing

At Gate.io I helped launch P2P trading for Nigerian and African users, because P2P is how many people here move between naira and crypto. At my current exchange I sourced and onboarded a licensed Nigerian payments provider that the exchange uses today. In both cases, users stayed away until they could move money in and out easily, and marketing spent before that was wasted.

When you talk to payment partners, ask early about licensing, settlement times, limits per user, and the documents they need from you. Those answers decide your launch date.

## 2. Students are early adopters, so meet them on campus

Gate.io's campus affiliate programmes with LASU and Yabatech brought student crypto communities onto the platform. Students learn fast, talk to each other constantly and bring friends. A campus ambassador with a referral link and a monthly target reached more real users than a bigger budget spent on ads.

## 3. A meetup builds more trust than a month of posts

In 2022 I organised Gate.io's first local meetup in Nigeria. Members who had only seen a logo met the team, asked hard questions face to face, and went home to tell their own groups. Online communities in Nigeria run on personal trust, and one good event feeds months of word of mouth.

## 4. Choose KOLs by sign-ups, not followers

Crypto creators with big follower counts don't always bring traders. I pick creators whose audiences already trade, agree tracked links or codes, and renew only the ones who deliver sign-ups.

## 5. Put a person in front of the brand

Live AMAs and X Spaces let users hear someone answer questions about fees, listings and withdrawals. At Gate.io I hosted more than 30 X Spaces, reaching over 1,000 live listeners on international sessions. In Nigeria, a familiar voice who speaks English, Yoruba or Hausa closes a gap that no banner can.

## A launch checklist for Nigeria

1. Confirm your naira deposit and withdrawal route with a licensed partner.
2. Line up two or three creators and one campus programme before launch day.
3. Open the community channels and run education from week one.
4. Plan one in-person event within the first three months.
5. Track sign-ups, first deposits and active traders by source every week.`,
    cta: {
      title: 'Planning a launch in Nigeria or Africa?',
      body: "Tell me what you're launching and where.",
      href: '/contact',
      label: 'Start a conversation',
    },
    related: [{ href: '/web3-business-development', label: 'See my Web3 business development work' }],
  },
  {
    kind: 'article',
    slug: 'late-deliveries-and-repeat-customers',
    path: '/writing/late-deliveries-and-repeat-customers',
    name: 'What 99,441 orders showed about late deliveries',
    title: 'Late Deliveries and Repeat Customers: 99,441 Orders Analysed',
    description:
      'What 99,441 Brazilian e-commerce orders show about late deliveries, review scores and repeat customers, and the four recommendations that followed.',
    eyebrow: 'Data analysis',
    h1: 'What 99,441 orders taught me about late deliveries and repeat customers',
    published: DATE,
    updated: DATE,
    body: `Late deliveries cost an online shop more than one bad review. In the Olist dataset of 99,441 Brazilian e-commerce orders, customers rated on-time orders 4.3 stars on average and orders more than 8 days late 1.7 stars. Only 2.2% of customers ever placed a second order. I spent four weeks turning nine raw tables into a dashboard and four recommendations, and two of my own findings failed the checks along the way.

## The numbers that matter

| Measure | Value |
| --- | --- |
| Revenue from delivered orders | R$15.4M |
| Average order value | R$159.83 |
| Orders that arrived late | 6.8% |
| Average review score | 4.16 out of 5 |
| Customers who ever came back | 2.2% |

## Week 1: make the data trustworthy

The data came as nine linked tables. I modelled them into a star schema with two fact tables and four dimensions, and wrote 14 automated checks so no row went missing and revenue reconciled to the cent. One check exposed a trap: the customer ID changes with every order. Using the real customer key showed 96,096 actual customers, and every retention number depends on that fix.

## Week 2: analyse, then try to break it

I built a monthly KPI layer in SQL with a written definition for every metric, then ran 12-month cohort retention and RFM segmentation of 95,000 customers into seven groups. Then I tested my own conclusions. Two didn't survive:

- **"Repeat buyers come back within 28 days."** 28% of these "repeat customers" had split one shopping trip into several orders. Counting real return visits, the typical wait is 74 days.
- **"A late first order makes customers less likely to return."** Late orders cluster in certain months. Comparing customers who joined at the same time, the effect isn't statistically significant.

If I had published after week 2 without those checks, two of the headline findings would have been wrong.

## Weeks 3 and 4: a dashboard and a report

I published a live Streamlit dashboard anyone can filter by month, state and category, with every number matching the notebooks. Then I built a four-page Power BI executive report for a manager who has five minutes.

## Four recommendations

1. **Set honest delivery dates by region.** Late parcels drop ratings from about 4.3 stars to under 2.
2. **Ask for reviews after delivery.** 74% of reviews on late orders were written before the parcel arrived.
3. **Build a second-purchase programme.** With 2.2% of customers returning, the next sale is the biggest opportunity.
4. **Protect delivery in São Paulo, Rio de Janeiro and Minas Gerais.** These three states bring in 62.5% of revenue.

## What this means for your business

Check your own delivery promise against your actual delivery times, and look at when your customers write reviews. If most of your customers buy once, the cheapest growth you have is a reason to buy twice.

[Open the live dashboard](${OLIST}) · [Read the full case study](/work/olist-ecommerce-bi) · [Code on GitHub](${OLIST_CODE})`,
    cta: {
      title: 'Have data you want answers from?',
      body: 'Send me the question you want answered.',
      href: '/contact',
      label: 'Send me your data question',
    },
    related: [{ href: '/data-analyst', label: 'See how I work as a data analyst' }],
  },
];

export const DOCS: Doc[] = [...SKILLS, ...ARTICLES];
const BY_PATH = new Map(DOCS.map((d) => [d.path, d]));

export function docForPath(path: string): Doc | undefined {
  return BY_PATH.get(path);
}
