#!/usr/bin/env python3
"""Convert Claude Design .dc.html mockup templates into React TSX view components.

Template rules (the mockup runtime): {{dotted.path}} interpolation, <sc-for list as>, <sc-if value>.
Output per page: <Name>View.tsx exporting `function <Name>View({ v }: { v: V })`.
Forms are replaced by slots ({v.form_N}) because real forms are hand-written.
"""
import json, re, sys
from html.parser import HTMLParser

SVG_TAGS = {t.lower(): t for t in [
    'svg', 'defs', 'filter', 'feTurbulence', 'feDisplacementMap', 'feGaussianBlur', 'feOffset', 'feComposite', 'feFlood',
    'feMerge', 'feMergeNode', 'feColorMatrix', 'feBlend', 'feMorphology', 'feSpecularLighting', 'feDiffuseLighting',
    'fePointLight', 'feDistantLight', 'feComponentTransfer', 'feFuncA', 'feFuncR', 'feFuncG', 'feFuncB', 'feImage', 'feTile',
    'feDropShadow', 'radialGradient', 'linearGradient', 'stop', 'path', 'circle', 'ellipse', 'rect', 'g', 'line', 'polyline',
    'polygon', 'text', 'tspan', 'clipPath', 'mask', 'pattern', 'use', 'symbol', 'textPath', 'animate', 'animateTransform', 'title']}
SVG_ATTRS = {a.lower(): a for a in [
    'viewBox', 'baseFrequency', 'numOctaves', 'stdDeviation', 'xChannelSelector', 'yChannelSelector', 'gradientUnits',
    'gradientTransform', 'preserveAspectRatio', 'patternUnits', 'patternContentUnits', 'filterUnits', 'primitiveUnits',
    'stitchTiles', 'surfaceScale', 'specularExponent', 'specularConstant', 'diffuseConstant', 'kernelMatrix', 'tableValues',
    'spreadMethod', 'pathLength', 'startOffset', 'textLength', 'lengthAdjust', 'maskUnits', 'maskContentUnits', 'clipPathUnits',
    'markerWidth', 'markerHeight', 'refX', 'refY', 'attributeName', 'repeatCount', 'keyTimes', 'keySplines', 'calcMode']}
HTML_ATTRS = {'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'autocomplete': 'autoComplete',
              'maxlength': 'maxLength', 'minlength': 'minLength', 'readonly': 'readOnly', 'spellcheck': 'spellCheck',
              'inputmode': 'inputMode', 'novalidate': 'noValidate', 'colspan': 'colSpan', 'rowspan': 'rowSpan',
              'crossorigin': 'crossOrigin', 'srcset': 'srcSet', 'fetchpriority': 'fetchPriority', 'enterkeyhint': 'enterKeyHint',
              'contenteditable': 'contentEditable', 'datetime': 'dateTime', 'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace',
              'onclick': 'onClick', 'onsubmit': 'onSubmit', 'onfocus': 'onFocus', 'onpointerenter': 'onPointerEnter',
              'onpointerleave': 'onPointerLeave', 'onpointermove': 'onPointerMove', 'onkeydown': 'onKeyDown', 'onchange': 'onChange',
              'oninput': 'onInput', 'onblur': 'onBlur', 'onmouseenter': 'onMouseEnter', 'onmouseleave': 'onMouseLeave'}
NUMERIC = {'tabIndex', 'rows', 'cols', 'maxLength', 'minLength', 'colSpan', 'rowSpan', 'size', 'span'}
VOID = {'img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'col', 'wbr'}
BOOL_ATTRS = {'hidden', 'disabled', 'required', 'checked', 'selected', 'autofocus', 'multiple', 'open', 'playsinline', 'muted', 'loop', 'autoplay', 'defer', 'async'}
WHOLE = re.compile(r'^\s*\{\{\s*([A-Za-z_$][\w$.]*)\s*\}\}\s*$')
PART = re.compile(r'\{\{\s*([A-Za-z_$][\w$.]*)\s*\}\}')
HREF_MAP = {'Happy.dc.html': '/', 'Main.dc.html': '/', 'Choose.dc.html': '/', 'Work.dc.html': '/work', 'About.dc.html': '/about',
            'Writing.dc.html': '/writing', 'Contact.dc.html': '/contact', 'CaseStudy.dc.html': '/work/olist-ecommerce-bi'}
IMG_MAP = {'/_blob/66390826b052b68ed6f343eed00c9f4f': '/img/avatar-3d.webp', '/_blob/98c2fbd4367f41799950fb503db9f382': '/img/headshot.webp'}


class Node:
    def __init__(self, tag, attrs):
        self.tag, self.attrs, self.children = tag, attrs, []


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('#root', [])
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs)
        self.stack[-1].children.append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


class Gen:
    def __init__(self, shell=False):
        self.loops = []
        self.forms = 0
        self.shell = shell  # keep nav/menu/footer, swap all <section>s for one {v.main} slot
        self.slot_done = False

    def ref(self, path):
        head = path.split('.')[0]
        if head in self.loops or head in ('true', 'false'):
            return path
        return 'v.' + path

    def tpl(self, s):
        """Attribute value with interpolations -> JS template literal."""
        out, last = [], 0
        for m in PART.finditer(s):
            out.append(s[last:m.start()].replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${'))
            out.append('${' + self.ref(m.group(1)) + ' ?? \'\'}')
            last = m.end()
        out.append(s[last:].replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${'))
        return '`' + ''.join(out) + '`'

    def attr(self, tag, name, value, svg):
        if name.startswith('hint-placeholder'):
            return None
        if value is None:
            if name in BOOL_ATTRS:
                return HTML_ATTRS.get(name, name)
            value = ''
        if tag == 'img' and name == 'src':
            value = IMG_MAP.get(value, value)
        if name == 'href' and value:
            base, _, frag = value.partition('#')
            if base in HREF_MAP:
                value = HREF_MAP[base] + ('#' + frag if frag else '')
        jname = HTML_ATTRS.get(name) or (SVG_ATTRS.get(name) if svg else None) or name
        if not (jname.startswith('aria-') or jname.startswith('data-')) and '-' in jname:
            parts = jname.split('-')
            jname = parts[0] + ''.join(p[:1].upper() + p[1:] for p in parts[1:])
        if jname == 'style':
            return f'style={{css({self.tpl(value) if PART.search(value) else json.dumps(value)})}}'
        m = WHOLE.match(value)
        if m:
            return f'{jname}={{{self.ref(m.group(1))}}}'
        if PART.search(value):
            return f'{jname}={{{self.tpl(value)}}}'
        if jname in NUMERIC and re.fullmatch(r'-?\d+', value):
            return f'{jname}={{{value}}}'
        if jname == 'value' and tag in ('input', 'textarea'):
            jname = 'defaultValue'
        if jname in ('checked',):
            jname = 'defaultChecked'
        return f'{jname}={json.dumps(value)}'

    def text(self, s, pre):
        if not pre:
            if not s.strip():
                return '' if '\n' in s else "{' '}"
            s = re.sub(r'\s+', ' ', s)
        out, last = [], 0
        for m in PART.finditer(s):
            out.append(esc_text(s[last:m.start()]))
            out.append('{' + self.ref(m.group(1)) + '}')
            last = m.end()
        out.append(esc_text(s[last:]))
        return ''.join(out)

    def kids(self, children, svg, pre, depth):
        """Children joined with newlines + indent, but only between elements: JSX would eat spaces next to text."""
        parts = [(isinstance(c, str), self.node(c, svg, pre, depth + 1)) for c in children]
        parts = [(t, x) for t, x in parts if x != '']
        out = ''
        pad = '\n' + '  ' * (depth + 1)
        for i, (is_text, x) in enumerate(parts):
            prev_text = parts[i - 1][0] if i else True
            out += (pad if not is_text and not prev_text else '') + x
        if parts and not parts[-1][0] and len(parts) > 1:
            out += '\n' + '  ' * depth
        return out

    def node(self, n, svg=False, pre=False, depth=2):
        if isinstance(n, str):
            return self.text(n, pre)
        tag = n.tag
        a = dict(n.attrs)
        if self.shell and tag == 'section':
            if self.slot_done:
                return ''
            self.slot_done = True
            return '{v.main}'
        if self.shell and tag == 'sc-for' and any(not isinstance(c, str) and c.tag == 'section' for c in n.children):
            return ''
        if tag == 'section' and not self.slot_done and not getattr(self, 'anchored', False):
            self.anchored = True
            if not any(k == 'id' for k, _ in n.attrs):
                n.attrs = list(n.attrs) + [('id', 'main-content')]
        if tag == 'sc-for':
            lst = WHOLE.match(a.get('list', '')).group(1)
            as_ = a.get('as', 'item')
            src = self.ref(lst)
            self.loops.append(as_)
            inner = self.kids(n.children, svg, pre, depth)
            self.loops.pop()
            return f'{{({src} ?? []).map(({as_}: any, {as_}_i: number) => (<Fragment key={{{as_}_i}}>{inner}</Fragment>))}}'
        if tag == 'sc-if':
            cond = self.ref(WHOLE.match(a.get('value', '')).group(1))
            inner = self.kids(n.children, svg, pre, depth)
            return f'{{{cond} ? (<>{inner}</>) : null}}'
        if tag == 'form':
            slot = f'form_{self.forms}'
            self.forms += 1
            return f'{{v.{slot}}}'
        is_svg = svg or tag == 'svg'
        jtag = SVG_TAGS.get(tag, tag) if is_svg else tag
        attrs = [x for x in (self.attr(tag, k, v, is_svg) for k, v in n.attrs) if x]
        open_ = '<' + jtag + (' ' + ' '.join(attrs) if attrs else '')
        kids = self.kids(n.children, is_svg, pre or tag in ('pre', 'textarea'), depth)
        if tag == 'textarea' and kids.strip():
            return open_ + f' defaultValue={json.dumps("".join(c for c in n.children if isinstance(c, str)))} />'
        if not kids and (tag in VOID or is_svg or tag in ('div', 'span', 'i', 'b', 'p', 'a', 'button', 'textarea', 'canvas', 'section', 'li', 'ul')):
            return open_ + ' />'
        return f'{open_}>{kids}</{jtag}>'


def esc_text(s):
    return s.replace('{', "{'{'}").replace('}', "{'}'}").replace('<', '&lt;').replace('>', '&gt;')


# Hand-made changes applied on top of the generated markup, so a re-run keeps them.
PATCHES = {
    'PlayfulHome': [
        ('className="navlink" href="/">Serious', 'className="navlink" href="/?mode=serious">Serious'),
        ('<a href="/" style={css("flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 14px;',
         '<a href="/?mode=serious" style={css("flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 14px;'),
        ('<input id="hi-email" className="field" type="email" placeholder="your@email.com" />',
         '<input id="hi-email" className="field" type="email" name="email" autoComplete="email" required placeholder="your@email.com" value={v.chatEmail} onChange={v.onChatEmail} aria-invalid={v.chatInvalid} aria-describedby="hi-status" />'),
        ('<button type="button" className="pbtn" style={css("background:#1B1A2E;color:#FFF6E5;min-height:56px")}>Send',
         '<button type="button" className="pbtn" onClick={v.sendChat} disabled={v.chatSending} aria-busy={v.chatSending} style={css("background:#1B1A2E;color:#FFF6E5;min-height:56px")}>{v.chatSendLabel}'),
        ('<button type="button" onClick={v.resetChat}', '{v.chatStatus}\n                    <button type="button" onClick={v.resetChat}'),
        ('built with MongoDB, Express, React & Node', 'built with React, Express, Node & MySQL'),
    ],
    'Work': [
        ('<div className="wrap wgrid">', '{v.empty}<div className="wrap wgrid">'),
    ],
    'SeriousHome': [
        ('Built on MongoDB, Express, React and Node', 'Built with React, Express, Node and MySQL'),
        ('className="navlink" href="/" style={css("color:#F5A524")}>Playful', 'className="navlink" href="/?mode=playful" style={css("color:#F5A524")}>Playful'),
        ('<a href="/" style={css("flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:999px;background:#F5A524',
         '<a href="/?mode=playful" style={css("flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:999px;background:#F5A524'),
    ],
}


def convert(path, name, shell=False):
    s = open(path, encoding='utf-8').read()
    css = re.search(r'<style>([\s\S]*?)</style>', s).group(1)
    body = s[s.index('</helmet>') + len('</helmet>'):s.index('</x-dc>')]
    p = P()
    p.feed(body)
    g = Gen(shell)
    jsx = g.kids(p.root.children, False, False, 2).strip()
    tsx = (
        f'// Generated from the approved mockup ({name}.dc.html) by scripts/dc2jsx.py.\n'
        '// Markup only: data and behaviour live in the matching page file. Safe to edit by hand.\n'
        "import { Fragment } from 'react';\n"
        "import { css } from './css-text.ts';\n\n"
        'export type V = Record<string, any>;\n\n'
        f'export function {name}View({{ v }}: {{ v: V }}) {{\n  return (\n    <>{jsx}</>\n  );\n}}\n'
    )
    # The public contact address on every page (your login and alert email stay in ADMIN_EMAIL).
    tsx = tsx.replace('shykeys@gmail.com', 'hello@meetoluwaseyi.com')
    for old, new in PATCHES.get(name, []):
        if old not in tsx:
            raise SystemExit(f'{name}: patch target not found: {old[:60]}')
        tsx = tsx.replace(old, new, 1)
    return tsx, css.strip(), g.forms


if __name__ == '__main__':
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    pages = {'Happy': 'PlayfulHome', 'Main': 'SeriousHome', 'About': 'About', 'Work': 'Work', 'Writing': 'Writing',
             'Contact': 'Contact', 'CaseStudy': 'CaseStudy', 'Choose': 'Intro'}
    css_map = {}
    for f, name in pages.items():
        tsx, css, forms = convert(f'{src_dir}/{f}.dc.html', name)
        open(f'{out_dir}/{name}View.tsx', 'w', encoding='utf-8').write(tsx)
        css_map[name] = css
        if f == 'Writing':
            stsx, _, _ = convert(f'{src_dir}/{f}.dc.html', 'Shell', shell=True)
            open(f'{out_dir}/ShellView.tsx', 'w', encoding='utf-8').write(stsx)
        print(f'{f} -> {name}View.tsx ({len(tsx)//1024} KB, forms={forms}, css {len(css)//1024} KB)')
    with open(f'{out_dir}/page-css.ts', 'w', encoding='utf-8') as fh:
        fh.write('// Generated from the mockup by scripts/dc2jsx.py. Server-only: each page gets just its own CSS.\n')
        fh.write('export const PAGE_CSS: Record<string, string> = {\n')
        for k, v in css_map.items():
            fh.write(f'  {k}: {json.dumps(v)},\n')
        fh.write('};\n')
