---
name: Emblema prata e ouro
description: The HC logo's own materials, silver chrome lettering with gold rims and a gold ring on black lacquer, set as a sign board for the public booking link and as a black-and-gold workbench for the owner's panel.
colors:
  preto: "#0b0a08"
  preto-campo: "#13110d"
  ouro: "#f8b80a"
  ouro-claro: "#ffd21f"
  bronze-escuro: "#3d2a05"
  acento-bronze: "#7a4a00"
  prata: "#ece9e2"
  prata-2: "#bdb8ae"
  prata-3: "#918b7f"
  contorno: "rgb(230 226 216 / 0.42)"
  contorno-forte: "rgb(236 233 226 / 0.75)"
  linha-quieta: "rgb(230 226 216 / 0.13)"
  campo-borda: "#6f685a"
  erro-noite: "#ff9273"
  cal: "#f3f1ec"
  tinta: "#14120e"
  tinta-2: "#46443f"
  tinta-3: "#66645e"
  chao: "#ececeb"
  folha: "#f9f9f8"
  folha-hover: "#f1f1f0"
  linha: "#d9d9d6"
  linha-forte: "#888883"
  ouro-fundo: "#fbefc8"
  zarcao: "#cf3c12"
  zarcao-texto: "#a8320c"
  zarcao-fundo: "#fbe2d8"
  whats: "#137a43"
  whats-escuro: "#0f6637"
  placa-azul: "#1c3e9c"
  placa-branca: "#f4f4f2"
typography:
  display:
    fontFamily: "'Saira', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2.9rem, 14vw, 5rem)"
    fontWeight: 900
    lineHeight: 0.98
    fontVariation: "'wdth' 120"
  headline:
    fontFamily: "'Saira', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.75rem, 7.6vw, 2.25rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "0.005em"
    fontVariation: "'wdth' 122"
  title:
    fontFamily: "'Saira', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.2rem, 5.4vw, 1.5rem)"
    fontWeight: 800
    lineHeight: 1.08
    fontVariation: "'wdth' 112"
  price:
    fontFamily: "'Saira', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.35rem, 6vw, 1.7rem)"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 110"
  section:
    fontFamily: "'Saira', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "'Saira', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Saira', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.3em"
    fontVariation: "'wdth' 118"
  plate:
    fontFamily: "'Saira', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 85"
rounded:
  lean: "3px"
  field: "4px"
  control: "6px"
  sheet: "8px"
  pill: "999px"
spacing:
  gutter-public: "clamp(16px, 5vw, 40px)"
  gutter-panel: "clamp(16px, 4.5vw, 32px)"
  gutter-panel-wide: "32px"
  step: "26px"
  row: "14px"
  field-gap: "18px"
  control-gap: "8px"
components:
  button-gold-plate:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.preto}"
    typography: "{typography.title}"
    rounded: "{rounded.lean}"
    padding: "12px 22px 13px"
    height: "60px"
  button-silver-outline:
    backgroundColor: "transparent"
    textColor: "{colors.prata}"
    rounded: "{rounded.lean}"
    padding: "10px 18px"
    height: "52px"
  choice-open:
    backgroundColor: "transparent"
    textColor: "{colors.prata}"
    rounded: "{rounded.lean}"
    padding: "6px 8px"
    height: "52px"
  choice-chosen:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.preto}"
    rounded: "{rounded.lean}"
    padding: "6px 8px"
    height: "52px"
  service-row:
    backgroundColor: "transparent"
    textColor: "{colors.prata}"
    rounded: "{rounded.field}"
    padding: "15px 14px 16px"
  service-row-chosen:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.preto}"
    rounded: "{rounded.field}"
    padding: "15px 14px 16px"
  field-night:
    backgroundColor: "{colors.preto-campo}"
    textColor: "{colors.prata}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
    height: "52px"
  button-primary:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.ouro}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#2a251b"
    textColor: "{colors.ouro}"
  button-band-gold:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
    height: "38px"
  button-band-outline:
    backgroundColor: "transparent"
    textColor: "{colors.cal}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
    height: "38px"
  button-line:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
    height: "44px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.acento-bronze}"
    rounded: "{rounded.control}"
    padding: "9px 10px"
    height: "44px"
  button-whats:
    backgroundColor: "{colors.whats}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "9px 16px"
    height: "44px"
  button-whats-hover:
    backgroundColor: "{colors.whats-escuro}"
  field-light:
    backgroundColor: "#ffffff"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "48px"
  status-chip:
    backgroundColor: "{colors.zarcao-fundo}"
    textColor: "{colors.zarcao-texto}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  segment-chosen:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "44px"
  plate-search:
    backgroundColor: "{colors.cal}"
    textColor: "{colors.tinta}"
    typography: "{typography.plate}"
    rounded: "{rounded.sheet}"
    padding: "10px 52px 12px 50px"
    height: "52px"
  plate-mini:
    backgroundColor: "#ffffff"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lean}"
    padding: "4px 6px 0"
---

# Design System: Letreiro dourado

## Overview

**Creative North Star: "The Gilded Sign on Black Lacquer"**

Everything is made of the logo's own materials. Black lacquer is the ground, with a fine procedural gold metal-flake grain and a soft warm sheen from above. Step titles are silver chrome with a thin gold rim, like the HC monogram. Gold carries the prices and whatever the visitor has chosen. Silver carries what is still open and the quiet text. One typeface, Saira, does all the work. Display lines use it wide, heavy and oblique like the HC monogram, labels use it as tracked silver caps, and running text uses it plainly. The public booking link reads like a sign board: service lines with dotted gold leaders running to gold prices, open days and times drawn as silver outlines that lean like the logo's italics, the chosen one filled with a solid gold plate. Confirming gilds the appointment, and a polishing shine sweeps once across the gold date.

The owner's panel uses the same brand as a workbench. A black lacquer band at the top holds the logo, the metal title, a search shaped like a Mercosul plate, and the day board. Under the band sits a neutral silver-white work surface for lists and forms, legible in a bright workshop. On that light surface the primary action is a black plate with a gold label, which is the logo's own pairing. Gold fill is kept for the chosen state and the band's one main action.

Density is moderate on the public link (one step at a time, generous rows) and working-dense on the panel (hairline-divided rows, 44px controls). Depth comes from material, meaning metal gradients, a thin dark drop shade under gilded type, and the black band against the light sheet. Stacked shadows are not used to show depth.

**Key Characteristics:**
- Owner-pinned materials: the HC round emblem, black, saturated metallic gold from pale to bronze, chrome silver/white, and a wide heavy oblique sans.
- Metal gradient type only on display lines. Everything smaller is solid gold or silver.
- Silver outline = open, solid gold plate = chosen, on every choice surface.
- Public choices lean through a skewed shape behind upright text.
- The panel is split into a black band and a silver-white sheet. Black-and-gold plates are its primary actions.
- The Mercosul plate is the one literal object: white, blue band, black rim.

## Colors

The palette is the logo itself: lacquer black, gold that runs from pale leaf through a dark bronze horizon, and silver that runs from near-white to warm grey. Outside the logo there are only two functional colors, red-orange for late/now/error and WhatsApp green.

### Primary
- **Logo Gold** (`ouro`, #f8b80a, sampled from the emblem's ring): the solid gold. Prices, the "próximo livre" time, icons on black, the dotted leaders, the gold hairline rules, and selection highlight. It is the solid stand-in wherever text is too small for the metal gradient.
- **Bright Gold** (`ouro-claro`): focus outline and plate focus ring on the black ground.
- **Gold Metal** (gradient, sidecar `ouro-metal`): pale yellow leaf → bright gold → logo gold → a hard dark-bronze horizon at 50% → amber → pale reflection. It is used only on display text: the confirmation time and the panel band titles.
- **Gold Plate** (gradient, sidecar `ouro-placa`): pale gold → logo gold → deep gold with no horizon, so black text reads cleanly on it. It fills every chosen day, slot, service row, panel segment, and active desktop tab, plus the public confirm button and the panel band's main action.

### Secondary
- **Silver** (`prata`): primary text on black, service names, open-slot labels.
- **Soft Silver** (`prata-2`): secondary text on black (address, help lines, metadata).
- **Worn Silver** (`prata-3`): tertiary text on black (placeholders, "a partir de", disabled days).
- **Silver Metal** (gradient, sidecar `prata-metal`): the chrome of the HC letters. Public step titles and the confirmation date, always with a thin Logo Gold stroke (`-webkit-text-stroke: 0.035em`) as the letters' gold rim. The confirmation time uses Gold Metal for contrast.
- **Silver Outline** (`contorno`) and **Strong Silver Outline** (`contorno-forte`): the 1.5px lean outline of open choices, and its hover state.

### Tertiary
- **Bronze Accent** (`acento-bronze`): accent text on the light sheet. Text buttons, links, the current mobile tab, today's agenda heading, the checkbox accent, the panel focus ring, and dashed open slots in the panel's new-appointment form.
- **Dark Bronze** (`bronze-escuro`): secondary text set on a gold plate (durations, slot "vagas", "a partir de" inside a chosen row).
- **Pale Gold Wash** (`ouro-fundo`): the "return" status chip and the brief highlight on a newly added row.

### Neutral
- **Lacquer Black** (`preto`): the public page ground, the panel band, and the desktop rail. It also serves as the text color on gold plates.
- **Field Black** (`preto-campo`): input fill on the public form. **Field Rim** (`campo-borda`): its 1.5px border.
- **Quiet Line** (`linha-quieta`): row dividers on black.
- **Ink** (`tinta`), **Ink 2** (`tinta-2`), **Ink 3** (`tinta-3`): text on the light sheet, from primary to tertiary. Ink is also the fill of the primary black plate button.
- **Shop Floor** (`chao`) and **Sheet** (`folha`): the neutral silver-white work surface (ground and list/form sheets), with **Sheet Hover** (`folha-hover`).
- **Line** (`linha`) and **Strong Line** (`linha-forte`): hairline row borders and outlined control borders on the sheet.
- **Lime White** (`cal`): text on the black band, and the face of the plate search.
- **Signal Red-Orange** (`zarcao`, `zarcao-texto`, `zarcao-fundo`): the "now" line on the day board, the count badge, overdue/no-show chips and section titles, and errors on the sheet. **Night Error** (`erro-noite`) is the error color on black.
- **WhatsApp Green** (`whats`, `whats-escuro`): only on actions that open WhatsApp.
- **Plate Blue** (`placa-azul`) and **Plate White** (`placa-branca`): only on the Mercosul plate object.

### Named Rules
**The Display-Only Metal Rule.** The metal gradients are clipped to text only on display lines: public step titles, panel band titles, and the confirmation date and time. Prices, codes, labels and small text use solid Logo Gold. If the dark horizon band would cut through a line shorter than about 1.75rem, use solid gold instead.

**The Open/Chosen Rule.** A silver outline means "open, choose me" and a solid gold plate means "chosen". This holds for days, slots, service rows, panel segments and the active desktop tab. Do not swap the meanings or invent a third selection style.

**The Black Plate Rule.** On the light sheet, the primary action is a black plate with a gold label. Gold fill on the sheet means a chosen state. On the black band, the one main action may be a gold plate, and secondary band actions are silver outlines.

**The Green-Only-for-WhatsApp Rule.** WhatsApp green appears only on controls that open WhatsApp.

## Typography

**Display Font:** Saira, variable (weight 100–900, width 50–125%, roman and italic, self-hosted), falling back to system-ui
**Body Font:** Saira
**Label Font:** Saira (expanded, tracked caps)

**Character:** One variable family stretched to every role. Display lines use the black weight, expanded and italic in uppercase, the same build as the "HC" monogram. Labels use the "ESTÉTICA AUTOMOTIVA" treatment: silver uppercase tracked wide and flanked by a gold rule. Width and slant carry the hierarchy. No second family is needed.

### Hierarchy
- **Display** (900 italic, width 120%, `clamp(2.9rem, 14vw, 5rem)`, 0.98, uppercase): the confirmation date, in gold metal. The time beneath it is 800 roman at `clamp(2.3rem, 11vw, 3.75rem)`, in silver metal.
- **Headline** (900 italic, width 122%, `clamp(1.75rem, 7.6vw, 2.25rem)`, 1.05, uppercase): public step titles in gold metal. Panel band titles use the same build at width 120%, `clamp(1.9rem, 8vw, 2.5rem)`.
- **Title** (800 italic, width 112%, `clamp(1.2rem, 5.4vw, 1.5rem)`, 1.08, uppercase, max 14ch): service names on the sign board, in silver. The booking summary service line (1.25rem) uses this build in solid gold.
- **Price** (800 italic, width 110%, `clamp(1.35rem, 6vw, 1.7rem)`, 1): prices in solid Logo Gold, with a 0.6875rem tracked-caps "a partir de" above.
- **Section** (800 roman, 1.1875rem, 1.3): panel section titles on the sheet ("Hoje", "Próximos"). Form legends are 800 at 1.125rem.
- **Body** (400, 1rem, 1.5): running text. Help lines and sub-rows are 0.9375rem. Descriptions are capped at 60ch.
- **Label** (500, 0.8125rem, width 118%, 0.3em tracking, uppercase, silver): group labels such as the morning/afternoon slot groups, each followed by a gold rule that fades out. Small metadata caps (duration · cycle) are 0.8125rem, 500, 0.08em, uppercase, tabular numerals.
- **Plate** (700, width 82–85%, 0.08em tracking, uppercase): every Mercosul plate. This is the one place Saira is condensed.

### Named Rules
**The Lean Lettering Rule.** Display and choice numerals are italic, and running text is roman. Times, prices and plates use tabular numerals.

**The One Family Rule.** Saira is the only typeface. Hierarchy comes from width, weight and slant, never from a second family or a system display face.

## Layout

The public link is a single column, at most 640px wide, with a fluid gutter (`gutter-public`). It moves step by step: services, then day and time, then details. Each step is separated by a gold hairline rule that fades at both ends (60% opacity), with 26px above and 32px below inside the step. On phones, days scroll horizontally with snap, bleeding to the screen edge, and the month name runs vertically between them. Slots sit in an auto-fill grid with a minimum width of 88px. At 1000px and up the page splits into 5fr / 6fr columns (max 1240px, 48px inline padding, column gap `clamp(48px, 7vw, 112px)`). The logo, address and a sign-style weekly hours board stay sticky on the left, and the steps run on the right. The day list wraps instead of scrolling.

The panel is mobile-first, with a fixed 64px bottom tab bar of five tabs. Each view opens with the black band (22px padding, 30px top on desktop), then sections on the light sheet with full-bleed lists. At 1000px and up a 248px sticky black rail with the logo replaces the tabs, and the gutter becomes a fixed 32px. Lists and form groups become bordered 8px sheets, form groups cap at 760px, and the home view splits 3fr / 2fr. List rows use a container query and move their actions to a right-hand column once the list is 620px wide. The day board is one lane per bay across opening hours, with an hour scale underneath.

## Elevation & Depth

Depth comes from material, not from stacked shadows. Black lacquer carries a tiled procedural gold-flake grain (`flocos.svg`, a turbulence filter mapped to gold at 50% opacity) and a warm radial sheen from the top. Metal display type gets a thin, unblurred dark drop shade (`drop-shadow(0 0.05em 0 #000)`), the shade under the logo's own chrome letters. The round logo carries a soft gold glow (`drop-shadow(0 6px 22px rgb(248 184 10 / 0.18))`), echoing the ring's sparkle. On the panel the main split is between the black band and the silver-white sheet, and the sheet is otherwise flat, with hairline borders.

### Shadow Vocabulary
- **Gilt shade** (`filter: drop-shadow(0 0.045em 0 #000)`): under metal-gradient display text and the gold check marks.
- **Plate seat** (`box-shadow: 0 2px 0 #000, 0 12px 22px -12px rgb(0 0 0 / 0.9)`): under the public gold plate button only. It seats the plate on the lacquer.
- **Plate rim** (`box-shadow: inset 0 0 0 2.5px #14120e, 0 2px 0 rgb(0 0 0 / 0.3)`): the Mercosul search plate's black rim. The mini plates on the day board use `inset 0 0 0 1.5px` plus a 1px drop.
- **Menu lift** (`box-shadow: 0 12px 28px -10px rgb(0 0 0 / 0.35), 0 2px 6px rgb(0 0 0 / 0.08)`): the panel's action menu popover.
- **Toast lift** (`box-shadow: 0 10px 30px -8px rgb(0 0 0 / 0.55)`): the black undo toast.

### Named Rules
**The Material-Not-Shadow Rule.** Depth comes from metal, lacquer and the band/sheet split. Shadows are kept to the plate seat, the plate rims and the two transient popovers. Rows, sheets and cards on the panel are flat.

## Shapes

Corners stay tight. Lean shapes use 3px (`lean`), fields and service rows 4px (`field`), panel controls 6px (`control`), and sheets, the plate search and menus 8px (`sheet`). Fully round pills (`pill`) appear only on status chips, panel segments and the count badge. On the public link, choice and button shapes are a pseudo-element skewed by -10deg (`--inclinacao`) and inset 5–6px from the box, with the label left upright on top. Lines are hairlines: the gold rule fades at both ends to flank steps and labels, and dotted gold leaders run from service name to price. Panel lists use 1px neutral lines. Dashed borders mean free capacity on the day board and open slots in the panel form. A dashed outline with a struck-through numeral marks a closed day on the public link.

## Components

### Buttons
Public buttons are leaning plates. Panel buttons are upright 6px controls in black, gold or outline.
- **Gold plate (public primary):** Gold Plate fill on a -10deg skewed backing with the plate seat shadow, black italic 800 uppercase label at width 115% and 1.1875rem, full width, minimum 60px. Hover brightens the plate to 1.07. Active presses it 1px down. While busy, a black bar sweeps along the base. A silver-plate variant (white → silver gradient) is used for "Salvar na agenda".
- **Silver outline (public secondary):** a skewed 1.5px Silver Outline with an upright silver label at 600 and a gold icon, minimum 52px. Hover strengthens the outline and adds a faint white wash.
- **Black plate (panel primary):** Ink fill with a Logo Gold label, 700 at 0.9375rem, minimum 44px (38px for the small size). Hover lifts to #2a251b. Used for Concluir and form submits on the sheet.
- **Band gold / band outline (panel, on black):** the main band action ("Novo agendamento") is a Gold Plate fill with an Ink label. Secondary band actions use a 1.5px silver outline with a Lime White label.
- **Line / text / danger / WhatsApp (panel sheet):** Line is a Sheet fill with a Strong Line border. Text is a Bronze Accent label with a pale gold hover wash. Danger is a red-orange label with a red-orange wash on hover. WhatsApp is a green fill with a white label.

### Choices (days and slots)
- **Open:** a skewed 1.5px Silver Outline with an upright silver italic numeral (day number 800 at 1.75rem, slot time 700 at 1.125rem). Days are 74px wide and slots at least 52px tall.
- **Chosen:** the outline gives way to a Gold Plate fill with black text and Dark Bronze secondary text. Under no-preference motion it fades in over 0.3s.
- **Unavailable day:** a faint dashed outline with the numeral struck through.
- **Panel slots** in the new-appointment form follow the same grammar upright: dashed Bronze Accent border when open, Gold Plate fill with a solid border when chosen.

### Sign-board service row
This is the signature component of the public link. It is a full-width tappable row with the service name (Title) on the left, a dotted gold leader in the middle, and the price (Price) on the right. Below them sit duration and return cycle in small metadata caps. Rows are separated by Quiet Line hairlines. A chosen row becomes a Gold Plate with black text and shows its description.

### Chips
- **Status chips (panel):** pills with an icon and text, never color alone, 700 at 0.75rem. Done/notified use a neutral grey fill with a Bronze Accent label. No-show/overdue use red-orange on Pale Red. Today uses solid Logo Gold with Ink. Return uses Pale Gold Wash. Cancelled is grey with Ink 2.
- **Segments (panel, on black):** pill tabs in Soft Silver. The chosen one takes the Gold Plate fill.

### Cards / Containers
- **Public:** there are no cards. Content sits directly on the lacquer, divided by gold rules and quiet hairlines.
- **Panel lists and form groups:** Sheet fill with hairline Line borders, full-bleed on phones and 8px bordered sheets on desktop. Rows have 14px vertical padding and a 4.1rem time column.

### Inputs / Fields
- **Public (on black):** Field Black fill, 1.5px Field Rim border, 4px corners, minimum 52px, text 500 at 1.0625rem, gold caret. Hover lightens the rim. Focus turns the rim Logo Gold with a 2px translucent gold outline. Errors turn the rim Night Error and show an icon-led message.
- **Panel (on sheet):** white fill, 1.5px Strong Line border, 6px corners, minimum 48px. Focus turns the border Bronze Accent with a 3px translucent amber ring. Errors use red-orange text.

### Mercosul plate
The plate is literal: a white face, a blue "BRASIL" band, and a black rim. It is used for the plate search at the top of the panel band, the plate input on the public form, the mini plates in panel list rows, and the cars on the day board, which are mini plates sized to their booked time. Plate text is Saira condensed, 700, uppercase and tracked. Focus rings around the plate are gold on black.

### Day board (panel)
Each bay is one lane: a 34px dashed silver outline for free time, with booked cars drawn as mini plates positioned by time. A completed car fades to grey, and a no-show is an outline with its plate struck through. A 2px red-orange "now" line crosses all lanes. The lunch break is a diagonal silver hatch over the lanes (`repeating-linear-gradient(135deg, …)`). The detector flagged this hatch as an advisory, and it was kept on purpose because it marks closed time.

### Navigation
- **Panel, phone:** a bottom bar of five tabs on Sheet with icon and label, 600 at 0.75rem. The current tab turns Bronze Accent at 800 with a 3px bronze tab mark at the top. A red-orange count badge shows due returns.
- **Panel, desktop:** a black rail with the logo, and tabs in Soft Silver with a faint hover wash. The current tab is a Gold Plate with an Ink label.
- **Public:** there is no navigation. The logo heads the page and the footer carries the WhatsApp, Instagram and address links with gold icons.

### Confirmation ritual (public)
On confirm, the date is set in Display gold metal and the time in silver metal, revealed word by word (190ms stagger) while a single white polishing shine sweeps across them. The record, the actions and the return note fade in after it. With reduced motion, everything appears in its final state.

## Do's and Don'ts

### Do:
- **Do** use the logo raster (`logo-480.webp` / `logo-960.webp`, square, transparent) as the mark on black: 184px on phones, 320px on the desktop sidebar, 132px in the panel rail, 40px in the panel band. Never redraw it in type.
- **Do** keep the metal gradients to display lines (silver with gold rim for step titles and the confirmation date; gold for band titles and the confirmation time), with the dark shade underneath. Set prices and small text in solid Logo Gold.
- **Do** express choice as silver outline = open and solid Gold Plate = chosen, everywhere.
- **Do** lean public choices and buttons through a skewed shape behind them (-10deg) and keep their text upright.
- **Do** make the panel's primary action on the light sheet a black plate with a gold label. Reserve gold fill for the chosen state and the band's single main action.
- **Do** use Bronze Accent for accent text on the light sheet. Logo Gold fails contrast there.
- **Do** keep the Mercosul plate literal: white face, blue band, black rim, condensed tracked Saira.
- **Do** give every status chip an icon and words. Never rely on color alone.

### Don't:
- **Don't** set metal-gradient text below display size or on body copy, prices, codes or labels.
- **Don't** fill an unchosen choice with gold, or use a silver outline to mark a selection.
- **Don't** skew the text inside a leaning button or chip. Only its backing shape leans.
- **Don't** put gold-filled buttons on the light sheet as generic primary actions.
- **Don't** add a second typeface or fall back to a system display face for headings.
- **Don't** use WhatsApp green for anything that does not open WhatsApp.
- **Don't** tint the work surface warm or cream. It stays neutral silver-white (`chao`, `folha`).
- **Don't** add a glossy car photo, stock imagery, testimonials, ratings or client counts. Imagery is the logo and the procedural metal grain.
