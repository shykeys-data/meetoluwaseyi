"""Share images (1200x630) for the skill pages and articles, in the style of public/og/default.png.

Run: python3 scripts/og-images.py   (needs Pillow and the DejaVu fonts)
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
CREAM, INK, MUTED, TANG, SUN = (255, 246, 229), (27, 26, 46), (74, 72, 96), (255, 122, 61), (255, 210, 63)
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
BOOK = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

PAGES = {
    'full-stack-developer': ('Full-stack developer', 'React, Node.js, Express & MySQL'),
    'web3-community-manager': ('Web3 community manager', '0 to 25,000+ members in under a year'),
    'web3-business-development': ('Web3 business development', 'Partners, payments and KOLs in Africa'),
    'data-analyst': ('Data analyst', 'Python, SQL & BI dashboards'),
    'server-rendered-react-on-shared-hosting': ('Server-rendered React on shared hosting', 'How I built meetoluwaseyi.com'),
    'growing-a-crypto-community-in-africa': ('Growing a crypto community to 25,000+', 'The daily playbook'),
    'launching-a-crypto-exchange-in-nigeria': ('Launching a crypto exchange in Nigeria', 'Five business development lessons'),
    'late-deliveries-and-repeat-customers': ('What 99,441 orders showed', 'Late deliveries and repeat customers'),
}


def wrap(draw, text, font, width):
    lines, line = [], ''
    for word in text.split():
        test = (line + ' ' + word).strip()
        if draw.textlength(test, font=font) <= width:
            line = test
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def make(slug, title, sub):
    img = Image.new('RGB', (W, H), CREAM)
    d = ImageDraw.Draw(img)
    for x in range(12, W, 24):
        for y in range(12, H, 24):
            d.ellipse((x - 1.3, y - 1.3, x + 1.3, y + 1.3), fill=(234, 226, 211))
    # Photo in an orange ring, with the yellow sun
    d.ellipse((968, 40, 1110, 182), fill=SUN, outline=INK, width=5)
    size = 340
    photo = Image.open('public/img/headshot.webp').convert('RGB').resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    cx, cy = 900, 370
    d.ellipse((cx - size // 2 - 8, cy - size // 2 - 8, cx + size // 2 + 8, cy + size // 2 + 8), fill=TANG)
    img.paste(photo, (cx - size // 2, cy - size // 2), mask)
    # Text
    d.text((80, 84), 'Oluwaseyi Oshunwusi', font=ImageFont.truetype(BOLD, 30), fill=MUTED)
    for fs in (64, 58, 52, 46):
        f = ImageFont.truetype(BOLD, fs)
        lines = wrap(d, title, f, 600)
        if len(lines) <= 3:
            break
    y = 140
    for line in lines:
        d.text((80, y), line, font=f, fill=INK)
        y += int(fs * 1.12)
    d.text((80, y + 18), sub, font=ImageFont.truetype(BOOK, 28), fill=MUTED)
    pill = ImageFont.truetype(BOLD, 26)
    tw = d.textlength('MeetOluwaseyi.com', font=pill)
    d.rounded_rectangle((80, 500, 80 + tw + 64, 562), radius=31, fill=INK)
    d.text((112, 515), 'MeetOluwaseyi.com', font=pill, fill=CREAM)
    img.save(f'public/og/{slug}.png', optimize=True)


for slug, (title, sub) in PAGES.items():
    make(slug, title, sub)
    print('wrote', slug)
