// Playful homepage copy, kept word for word from the approved mockup.
// It is design copy (tone, colours, tilt), so it lives with the design rather than in the CMS.
// Real facts (projects, roles, links) come from the database.

export const DOING = [
      { t: 'hosting the 7AM market brief', c: '#E0601F' },
      { t: 'on a partnership call', c: '#1B7F6A' },
      { t: 'cleaning data in Colab', c: '#2B7DB5' },
      { t: 'running a Telegram quiz', c: '#C2335F' },
      { t: 'listing cars on Korrect', c: '#E0601F' }
    ] as const;

export const TAPE_WORDS: string[] = ['community', 'deals', 'data', 'ventures', 'good vibes', 'Telegram', 'Korrect Cars', 'Python'];
export const TAPE_NOTES: string[] = ['say hi, I don’t bite', 'gm from Nigeria', 'built with love', 'scroll for good stuff'];

export const LOVES = [
      { k: 'C', title: 'Community', bg: '#FFD23F', t: '-4deg', z: 1, body: 'I grew WEEX from zero to 25,000+ members in under a year, and Gate.io Nigeria to 20,000+ before that. Briefs, games, live classes and AMAs people show up for.' },
      { k: 'D', title: 'Deals', bg: '#FFB38A', t: '3deg', z: 2, body: 'KOL partnerships, a P2P launch for Africa, campus programmes with LASU and Yabatech, and car deals for Korrect Cars. I like a handshake that sticks.' },
      { k: 'Da', title: 'Data', bg: '#9FE8D0', t: '-2deg', z: 3, body: 'Eight IBM data certificates and counting. I analyse in public, then tell the story so anyone can follow it.' },
      { k: 'B', title: 'Building', bg: '#B9E2F7', t: '4deg', z: 4, body: 'Building websites since 2014. Now a car marketplace, a free moderation bot and a BDC rate app.' }
    ];

export const DAYS = [
      { t: '07:00', label: 'Morning', title: 'Market brief, live', body: 'I open the WEEX Africa chat with the 7AM market brief so the community starts the day informed.', sky: '#FFD9B8', orb: '#FFD23F', glow: 'rgba(255,210,63,.35)', x: '58cqw', y: '300px' },
      { t: '11:00', label: 'Late morning', title: 'Calls & partnerships', body: 'Business development calls, KOL onboarding and partner follow-ups.', sky: '#FFEB99', orb: '#FFD23F', glow: 'rgba(255,255,255,.6)', x: '66cqw', y: '110px' },
      { t: '15:00', label: 'Afternoon', title: 'Games o’clock', body: 'Quiz polls, Last Commenter and Predict-to-Win keep the chat buzzing.', sky: '#FFC48A', orb: '#FFB020', glow: 'rgba(255,255,255,.45)', x: '76cqw', y: '40px' },
      { t: '19:00', label: 'Evening', title: 'Data time', body: 'Python in Google Colab, turning big datasets into stories people can follow.', sky: '#D7C3F5', orb: '#FF7A3D', glow: 'rgba(255,122,61,.3)', x: '86cqw', y: '150px' },
      { t: '22:00', label: 'Night', title: 'Builder mode', body: 'Korrect Cars, bots and whatever idea won’t let me sleep.', sky: '#2D2A5A', orb: '#FFF6E5', glow: 'rgba(255,246,229,.18)', x: '82cqw', y: '56px' }
    ];

/** Counters: `live` numbers count up from 0 when the section scrolls into view. */
export const NUMS = [
  { v: 'k', live: true, l: 'orders analysed', bg: '#FFD23F', sh: 'rgba(255,176,32,.8)', t: '-3deg' },
  { v: 'k+', live: true, l: 'WEEX members, from zero', bg: '#9FE8D0', sh: 'rgba(46,196,160,.8)', t: '2deg' },
  { v: ' yrs', live: true, l: 'building websites', bg: '#B9E2F7', sh: 'rgba(91,192,235,.8)', t: '-1deg' },
  { v: '7k+', live: false, l: 'members turned futures traders', bg: '#FFB38A', sh: 'rgba(255,122,61,.8)', t: '3deg' },
];

export const ROAD = [[30, 0]];

export const NOTES = [
      { txt: 'filming short crypto lessons for TikTok & Reels', bg: '#FFF39A', pin: '#FF7A3D', t: '-4deg' },
      { txt: 'building Korrect Swap so you can trade car for car', bg: '#FFD1E0', pin: '#5BC0EB', t: '3deg' },
      { txt: 'getting my Safety Bot live in the WEEX Africa group', bg: '#C9F2E2', pin: '#FFD23F', t: '-2deg' },
      { txt: 'telling data stories on LinkedIn, like Growth Without Reach', bg: '#D6ECFA', pin: '#F25F8B', t: '4deg' }
    ];

export const INTENTS = [
      { id: 'partner', label: 'Let’s partner', bg: '#FFD23F', reply: 'Love that! Partnerships are my favourite kind of conversation. Drop your email and I’ll reach out.' },
      { id: 'hire', label: 'I’m hiring', bg: '#9FE8D0', reply: 'Ooh, tell me about the role! Leave your email and I’ll get back to you.' },
      { id: 'collab', label: 'Let’s build something', bg: '#B9E2F7', reply: 'Yes! I’m always up for building something fun. Where can I reach you?' },
      { id: 'hi', label: 'Just saying hi', bg: '#F7B6CC', reply: 'Hi back! You just made my day. Leave your email if you want to keep in touch.' }
    ];

/** Playful voice for project cards, by slug. Projects without an entry use their own summary. */
export const PLAYFUL_CARDS: Record<string, { label?: string; mark?: string; bg?: string; blurb?: string; href?: string; cta?: string }> = {
  'olist-ecommerce-bi': { label: 'Data', mark: '99,441 orders!', bg: '#9FE8D0', blurb: '99,441 real orders. Late parcels dropped ratings from 4.3★ to under 2★, and only 2.2% of shoppers came back.', href: 'https://olist-bi-shykeys.streamlit.app', cta: 'Play with the live dashboard' },
  'korrect-cars': { label: 'Venture', mark: 'Buy. Sell. Swap.', bg: '#FFB38A', blurb: 'Live at korrectcars.com! Buy an inspected car, pay small small over up to 48 months, or swap yours.', href: 'https://www.korrectcars.com', cta: 'Take it for a spin' },
  'weex-safety-bot': { label: 'Bot', mark: 'beep, no spam', bg: '#F7B6CC', blurb: 'My own Telegram moderation bot that keeps spam and fake followers out, for free.', href: '/work', cta: 'Story coming soon' },
  'growth-without-reach': { label: 'Data story', mark: '5 economies', bg: '#C9F2E2', blurb: 'My data series and digital book on five African economies, built with Python on World Bank data.', href: 'https://drive.google.com/file/d/1MGE0tIrHogphMomjjWxtnbU8be1UBK72/view', cta: 'Read the free book' },
  'ibm-data-analyst-capstone': { label: 'Data', mark: 'dev survey', bg: '#B9E2F7', blurb: '65,437 developers, one survey: JavaScript tops the job ads and PostgreSQL keeps growing.', href: 'https://github.com/shykeys-data/ibm-data-analyst-capstone', cta: 'See the analysis' },
  'weex-community': { label: 'Community', mark: 'gm, fam!', bg: '#FFD23F', blurb: '45,000+ members across two exchanges: daily briefs, live trading classes, weekly games, leagues and AMAs.', href: '#day', cta: 'See a day in there' },
  'ratedesk': { label: 'Idea', mark: '₦ ⇄ $', bg: '#D7C3F5', blurb: 'Compare bureau de change rates in Nigeria and book with licensed BDCs. Cooking now.', href: '/work', cta: 'In the oven' },
};
