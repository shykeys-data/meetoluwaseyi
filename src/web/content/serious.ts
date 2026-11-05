// Serious homepage copy, word for word from the approved mockup (design copy, not CMS content).
const AMBER = '#F5A524';
const GREEN = '#3DDC97';

export const WORDS: string[] = ['turn members into traders.', 'grow crypto communities.', 'open doors across Africa.', 'make data make sense.'];

export const TICKER = [
      { k: '07:00 WAT, daily', v: 'Morning market brief', c: '#3DDC97' },
      { k: 'Fridays', v: 'Futures Friday', c: '#F5A524' },
      { k: 'Building', v: 'Korrect Swap', c: '#F5A524' },
      { k: 'Learning', v: 'Python for BI', c: '#3DDC97' },
      { k: 'Writing', v: 'Growth Without Reach', c: '#3DDC97' },
      { k: 'Filming', v: 'Crypto lessons for TikTok & Reels', c: '#F5A524' }
    ];

/** The "In a sentence" statement. Tokens in braces are swapped for small inline images. */
export const MANIFESTO = "I'm {face} Oluwaseyi. I turn crypto-curious Africans {chat} into active traders, open doors {deal} for exchanges and founders, and turn raw data {chart} into decisions people can act on.";

export const PILLARS = [
      { n: 'i', t: 'Community', c: AMBER, bg: 'linear-gradient(160deg,rgba(245,165,36,.14) 0%,rgba(16,19,25,.25) 60%)', b: 'Members who trade, not just lurk. WEEX: zero to 25,000+ in under a year, with 7,000+ activated through live classes. Gate.io: 20,000+ members, 30+ X Spaces and Nigeria’s first Gate.io meetup.', tags: ['Growth', 'Education', 'AMAs'] },
      { n: 'ii', t: 'Business Development', c: AMBER, bg: 'linear-gradient(160deg,rgba(245,165,36,.11) 0%,rgba(16,19,25,.25) 60%)', b: 'Doors opened in Africa. I helped launch Gate.io P2P for Nigeria, built campus programmes with LASU and Yabatech, and run KOL partnerships for WEEX. Plus dealer and financier deals for Korrect Cars.', tags: ['KOLs', 'P2P launch', 'Campus'] },
      { n: 'iii', t: 'Data & BI', c: GREEN, bg: 'linear-gradient(160deg,rgba(61,220,151,.13) 0%,rgba(16,19,25,.25) 60%)', b: 'Decisions backed by numbers. Eight IBM data certificates and analysis I test before I publish, from 99,441 e-commerce orders to five African economies.', tags: ['Python', 'SQL', 'Power BI'] },
      { n: 'iv', t: 'Building', c: AMBER, bg: 'linear-gradient(160deg,rgba(245,165,36,.14) 0%,rgba(16,19,25,.25) 60%)', b: 'Products that ship. Building for the web since 2014: a live car marketplace, a free moderation bot that replaced paid tools, and a BDC rate platform in progress.', tags: ['WordPress', 'MERN', 'Bots'] }
    ];

export const PROGRAMS: string[] = ['Morning Market Brief', 'Evening Wrap', 'Meme Monday', 'Futures Friday', 'Last Commenter', 'Community Polls', 'Weekend Education', 'Learn & Earn', 'Monthly League', 'Predict-to-Win', 'X AMAs', 'WE-Launch'];
export const PHRASES: string[] = ['Community', 'Business Development', 'Data & BI', 'Ventures', 'Storytelling', 'Partnerships'];

const daily = { when: '07:00 WAT', name: 'Morning Market Brief', note: 'The day starts informed, every single day.', c: GREEN };
    const wrap = { when: 'Evening', name: 'Evening market wrap', note: 'What moved, what it means, what’s next.', c: GREEN };
    const midweek = { when: 'Through the week', name: 'Polls, Last Commenter, Learn & Earn', note: 'Quick games and lessons that keep the chat moving.', c: AMBER };
    const weekend = { when: 'Weekend', name: 'Weekend Education', note: 'Lessons like position sizing and support & resistance.', c: AMBER };
    const monthly = { when: 'This month', name: 'League & Predict-to-Win', note: 'Monthly League, football Predict-to-Win and X AMAs.', c: AMBER };
    export const DAY_DEFS = [
      { short: 'Mon', name: 'Monday', items: [daily, { when: 'All day', name: 'Meme Monday', note: 'The week starts with a laugh and a lot of replies.', c: AMBER }, wrap] },
      { short: 'Tue', name: 'Tuesday', items: [daily, midweek, wrap] },
      { short: 'Wed', name: 'Wednesday', items: [daily, midweek, wrap] },
      { short: 'Thu', name: 'Thursday', items: [daily, midweek, wrap] },
      { short: 'Fri', name: 'Friday', items: [daily, { when: 'All day', name: 'Futures Friday', note: 'New futures listings and market setups, explained simply.', c: AMBER }, wrap] },
      { short: 'Sat', name: 'Saturday', items: [daily, weekend, monthly] },
      { short: 'Sun', name: 'Sunday', items: [daily, weekend, monthly] }
    ];
    