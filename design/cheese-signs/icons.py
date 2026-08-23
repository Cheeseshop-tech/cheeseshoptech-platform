# Cheese Signs — icon set. Monochrome-friendly inline SVG, drawn to read at 0.4 in.
# Kept in one place so the JS module (src/lib/sign-icons.js) and the print proof stay identical.

COW = '''<svg viewBox="0 0 120 82" xmlns="http://www.w3.org/2000/svg" class="ic ic-cow" aria-label="Cow's milk">
<g fill="none" stroke="{ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M34 30 Q34 17 52 17 L84 17 Q100 17 103 31 Q106 45 96 52 L40 52 Q30 45 34 30 Z" fill="{paper}"/>
<path d="M36 33 L18 37 Q8 39 8 47 Q8 55 18 55 L28 53 Q34 51 36 46 Z" fill="{paper}"/>
<path d="M17 34 Q9 28 12 24 Q17 22 22 30" fill="{paper}"/>
<path d="M8 47 L18 47" />
<path d="M44 52 L44 72 M58 52 L58 72 M84 52 L84 72 M96 52 L96 72"/>
<path d="M101 26 Q112 22 112 34 Q112 44 106 47"/>
<path d="M62 52 Q68 62 76 58"/>
</g>
<g fill="{ink}">
<circle cx="15" cy="43" r="2.1"/>
<path d="M52 22 Q66 19 74 26 Q78 34 68 37 Q56 39 51 32 Q48 25 52 22 Z"/>
<path d="M86 30 Q98 30 99 39 Q100 47 91 47 Q83 46 82 38 Q82 31 86 30 Z"/>
<path d="M40 40 Q49 41 50 47 L38 48 Q36 43 40 40 Z"/>
</g>
</svg>'''

# Region illustrations — same 120x82 frame, same stroke weight, so the rail reads as one family.
REGION = {
    # Dolomite peaks over a valley floor + river: Valsugana / Grigno.
    "valsugana": '''<svg viewBox="0 0 120 82" xmlns="http://www.w3.org/2000/svg" class="ic" aria-label="Valsugana">
<g fill="none" stroke="{ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M4 58 L30 20 L46 42 L56 30 L78 58 Z" fill="{paper}"/>
<path d="M62 58 L86 24 L116 58 Z" fill="{paper}"/>
<path d="M22 32 L30 20 L38 32 L33 29 L27 33 Z" fill="{ink}"/>
<path d="M78 36 L86 24 L94 36 L89 33 L83 37 Z" fill="{ink}"/>
<path d="M4 62 L116 62"/>
<path d="M18 72 Q38 64 58 72 Q78 80 102 71"/>
</g></svg>''',
    # Broad tabletop plateau with pasture fence: Altopiano di Asiago / Enego.
    "altopiano-asiago": '''<svg viewBox="0 0 120 82" xmlns="http://www.w3.org/2000/svg" class="ic" aria-label="Altopiano di Asiago">
<g fill="none" stroke="{ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M6 56 L26 30 Q34 21 48 21 L78 21 Q92 21 100 32 L116 56 Z" fill="{paper}"/>
<path d="M40 21 L48 12 L56 21" fill="{ink}"/>
<path d="M6 60 L116 60"/>
<path d="M20 60 L20 74 M44 60 L44 74 M68 60 L68 74 M92 60 L92 74"/>
<path d="M12 66 L100 66"/>
</g></svg>''',
    # Two ranges meeting over a wide valley: the Trentino + Veneto PDO milkshed.
    "trentino-veneto": '''<svg viewBox="0 0 120 82" xmlns="http://www.w3.org/2000/svg" class="ic" aria-label="Trentino and Veneto">
<g fill="none" stroke="{ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M2 56 L24 26 L40 48 L52 34 L68 56 Z" fill="{paper}"/>
<path d="M54 56 L76 22 L98 50 L106 40 L118 56 Z" fill="{paper}"/>
<path d="M17 36 L24 26 L31 36 L27 33 L21 37 Z" fill="{ink}"/>
<path d="M69 32 L76 22 L83 32 L79 29 L73 33 Z" fill="{ink}"/>
<path d="M2 60 L118 60"/>
<path d="M14 70 Q40 62 60 70 Q84 79 108 69"/>
</g></svg>''',
}

# House DOP badge. NOT the EU PDO mark — swap in the official consortium artwork before a commercial run.
DOP = '''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="ic-badge" aria-label="DOP protected designation of origin">
<circle cx="50" cy="50" r="46" fill="none" stroke="{accent}" stroke-width="4"/>
<circle cx="50" cy="50" r="38" fill="{accent}"/>
<text x="50" y="46" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="26" fill="{paper}">DOP</text>
<text x="50" y="64" text-anchor="middle" font-family="Inter,sans-serif" font-weight="600" font-size="11" letter-spacing="1.2" fill="{paper}">PDO</text>
</svg>'''

ITALY = '''<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg" class="ic-italy" aria-label="Italy">
<path d="M20 6 L27 4 L31 12 L38 15 L36 24 L44 34 L52 48 L50 58 L42 62 L36 74 L28 86 L20 94 L14 90 L18 78 L14 68 L8 60 L12 50 L10 38 L14 26 L18 16 Z"
      fill="{ink}" opacity=".9"/>
<path d="M50 74 L56 70 L58 78 L52 82 Z" fill="{ink}" opacity=".9"/>
</svg>'''

MOUNTAIN_MARK = '''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="ic-badge" aria-label="Product of the Mountain">
<circle cx="50" cy="50" r="46" fill="none" stroke="{primary}" stroke-width="4"/>
<circle cx="50" cy="50" r="38" fill="{paper}"/>
<path d="M22 64 L40 34 L52 52 L60 42 L78 64 Z" fill="{primary}"/>
<path d="M34 48 L40 34 L46 48 L41 45 L37 49 Z" fill="{paper}"/>
<text x="50" y="80" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="10" letter-spacing="0.6" fill="{primary}">MOUNTAIN</text>
</svg>'''


def paint(svg, primary="#064E22", accent="#009640", ink="#141413", paper="#FFFFFF"):
    return svg.replace("{primary}", primary).replace("{accent}", accent) \
              .replace("{ink}", ink).replace("{paper}", paper)
