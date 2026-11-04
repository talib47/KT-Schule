# Baut index.html und version.txt aus src/. Nach jeder Änderung: python3 build.py, dann beides committen.
import hashlib
base=open('src/base.css').read();extra=open('src/extra.css').read();js=open('src/app.js').read()
VER=hashlib.sha1((base+extra+js).encode()).hexdigest()[:10]
js=js.replace('__VERSION__',VER).replace('__ICON__','icon.svg')
FACE='''@font-face{font-family:"Newsreader";font-style:normal;font-weight:200 800;font-display:swap;src:url("fonts/newsreader-latin.woff2") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Newsreader";font-style:normal;font-weight:200 800;font-display:swap;src:url("fonts/newsreader-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
'''
html=f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>KT Schule</title>
<meta name="theme-color" content="#0E8A8F">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/svg+xml" href="icon.svg">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="KT Schule">
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}img{{max-width:100%}}
{FACE}{base}{extra}</style>
</head>
<body>
<div id="fbar" hidden></div>
<main id="app"></main>
<nav id="nav" aria-label="Bereiche" hidden></nav>
<div id="layer"></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script>
{js}
</script>
</body>
</html>
'''
open('index.html','w').write(html);open('version.txt','w').write(VER+'\n');print(VER)
