---
name: Muro de letreiro
description: The detailing shop's own hand-painted wall, carried from the public booking link into the owner's panel.
colors:
  muro-cobalt: "#1f3a9e"
  muro-fundo: "#19318a"
  placa-azul: "#1c3e9c"
  canario: "#f5c400"
  canario-escuro: "#e0b200"
  canario-fundo: "#fff2b8"
  zarcao: "#e2471d"
  zarcao-texto: "#b5330e"
  zarcao-fundo: "#fbe4dc"
  cal: "#f3f5f1"
  cal-suave: "#c9d3f2"
  giz: "rgb(243 245 241 / 0.78)"
  giz-traco: "rgb(243 245 241 / 0.5)"
  giz-guia: "rgb(243 245 241 / 0.1)"
  tinta: "#121624"
  tinta-suave: "#3b4670"
  tinta-2: "#444d6e"
  tinta-3: "#5b6380"
  chao: "#e7eae1"
  folha: "#f3f5f1"
  folha-hover: "#eceee6"
  linha: "#d4d8cc"
  linha-forte: "#8a917f"
  whats: "#137a43"
  whats-escuro: "#0f6637"
  fita: "#e9d9a4"
typography:
  display:
    fontFamily: "'Londrina Solid', 'Arial Narrow', sans-serif"
    fontSize: "clamp(3.4rem, 17vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "0.005em"
  headline:
    fontFamily: "'Londrina Solid', 'Arial Narrow', sans-serif"
    fontSize: "clamp(2rem, 9vw, 2.5rem)"
    fontWeight: 900
    lineHeight: 1
  title:
    fontFamily: "'Londrina Solid', 'Arial Narrow', sans-serif"
    fontSize: "clamp(1.45rem, 6.4vw, 1.75rem)"
    fontWeight: 900
    lineHeight: 1.02
  script:
    fontFamily: "'Yellowtail', 'Brush Script MT', cursive"
    fontSize: "clamp(1.9rem, 8.5vw, 2.6rem)"
    fontWeight: 400
    lineHeight: 1.1
  section:
    fontFamily: "'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.3
  plate:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 82"
rounded:
  xs: "3px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  gutter-link: "clamp(16px, 5vw, 40px)"
  gutter-panel: "clamp(16px, 4.5vw, 32px)"
components:
  placa-botao:
    backgroundColor: "{colors.canario}"
    textColor: "{colors.tinta}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "12px 18px 13px"
    height: "60px"
  placa-botao-hover:
    backgroundColor: "{colors.canario-escuro}"
  placa-botao-cal:
    backgroundColor: "{colors.cal}"
    textColor: "{colors.muro-cobalt}"
  button-primary:
    backgroundColor: "{colors.muro-cobalt}"
    textColor: "{colors.cal}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "9px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.muro-fundo}"
  button-whats:
    backgroundColor: "{colors.whats}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "9px 16px"
    height: "44px"
  button-whats-hover:
    backgroundColor: "{colors.whats-escuro}"
  button-linha:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "9px 16px"
    height: "44px"
  slot-giz:
    backgroundColor: "transparent"
    textColor: "{colors.cal}"
    rounded: "{rounded.sm}"
    height: "52px"
  slot-giz-chosen:
    backgroundColor: "{colors.cal}"
    textColor: "{colors.muro-cobalt}"
  slot-panel:
    backgroundColor: "transparent"
    textColor: "{colors.muro-cobalt}"
    rounded: "{rounded.md}"
    height: "46px"
  slot-panel-chosen:
    backgroundColor: "{colors.muro-cobalt}"
    textColor: "{colors.cal}"
  input-wall:
    backgroundColor: "{colors.cal}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "52px"
  input-panel:
    backgroundColor: "#ffffff"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "48px"
  busca-placa:
    backgroundColor: "{colors.cal}"
    textColor: "{colors.tinta}"
    typography: "{typography.plate}"
    rounded: "{rounded.lg}"
    height: "52px"
  placa-mini:
    backgroundColor: "#ffffff"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xs}"
    padding: "4px 6px 0"
  selo-hoje:
    backgroundColor: "{colors.canario}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  selo-atraso:
    backgroundColor: "{colors.zarcao-fundo}"
    textColor: "{colors.zarcao-texto}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Design System: Muro de letreiro

## Overview

**Creative North Star: "The Shop's Painted Wall"**

Everything is lettered onto the cobalt plaster wall of a real car-detailing shop, the way a sign painter would do it: big brush capitals in lime-white with a near-black block shadow and a red-lead edge, prices in canary yellow, and a looping script line underneath. What is still open is sketched in chalk; what has been decided is painted solid. That one material grammar (chalk = undecided, paint = committed) carries selection, availability and booking state on both surfaces.

The public booking link is the whole wall: textured cobalt from edge to edge, one narrow column on phones, a sticky signboard on the left and the working table on the right from 1000px. The owner's panel keeps the wall as a band at the top (painted date, plate-shaped search, today's bay board, and a cobalt rail on desktop) and drops onto a pale lime-wash work surface for lists and forms, where Archivo does the reading and Londrina appears only for the date and page titles.

Size carries hierarchy, not decoration. There are no photos, no gradients-as-mood, no glass, and no generic calendar grid: availability is shown as chalk boxes on the wall and lanes on a board.

**Key Characteristics:**
- Cobalt plaster ground (procedural `reboco.svg` texture over the base cobalt) on every wall surface.
- Brush capitals (Londrina Solid 900, uppercase) with the stacked painted shadow; canary for prices and the main action.
- Chalk outline for open/free, solid lime-white paint for chosen/booked.
- Brazilian Mercosul plate as a recurring object: the plate field, the panel search, the row plate tag and the board blocks.
- Hand-cut, slightly irregular corners rather than a uniform radius.
- Lime-wash work surface with hairline rows for the panel's dense lists.

## Colors

A sign-painter's short palette: one saturated wall color, one lime-white letter color, one yellow, one red lead, plus chalk as translucent lime-white.

### Primary
- **Muro Cobalt** (muro-cobalt): the wall. Page ground on the link, the band and primary buttons on the panel, the `theme-color`, and the text color of anything painted lime-white over it. Deeper **Muro Fundo** (muro-fundo) is the desktop rail and primary-button hover.
- **Plate Blue** (placa-azul): reserved for the top band of every Mercosul plate (plate field, search, plate tag, board blocks). Never a general accent.

### Secondary
- **Canary Sign Yellow** (canario): prices, the brush script line, the main "Confirmar agendamento" plate button, focus rings on the wall, "vence hoje" badges, text selection. **Canary Dark** (canario-escuro) is its hover; **Canary Wash** (canario-fundo) backs future-return badges and the just-created row flash.

### Tertiary
- **Zarcão Red Lead** (zarcao): the outermost edge of the painted shadow, the caret, the "now" line on the day board, the tab counter, error borders on the wall. On the light surface it shifts to **Zarcão Text** (zarcao-texto) over **Zarcão Wash** (zarcao-fundo) for late items, errors and danger actions, to keep contrast.
- **WhatsApp Green** (whats, hover whats-escuro): only on actions that open WhatsApp.

### Neutral
- **Cal Lime-White** (cal): letter paint on the wall, the fill of chosen slots and pressed service rows, field fill on the link.
- **Cal Soft** (cal-suave): secondary copy on cobalt (addresses, durations, help text, board hour ticks).
- **Chalk** (giz, giz-traco, giz-guia): translucent lime-white at three strengths: chalk text, chalk strokes and dotted leaders, and the faint painter's guide rows.
- **Tinta Ink** (tinta): block-shadow color, body text on light surfaces, plate outlines, the toast. **Tinta Soft / 2 / 3** step it down for text on painted chips and secondary/tertiary copy on the work surface.
- **Chão Lime-Wash** (chao): panel page ground. **Folha** (folha) is the row/list/form-group surface on it, **Folha Hover** its hover. **Linha** (linha) hairlines between rows; **Linha Forte** (linha-forte) field and outline-button borders.
- **Masking Tape** (fita): only the tilted "example data" tape.

### Named Rules
**The Chalk-and-Paint Rule.** Free, open or undecided is chalk outline on transparent ground; chosen, booked or committed is solid paint. A selected thing never stays an outline, and a free thing is never filled.

**The Plate-Blue Rule.** Plate Blue appears only as the band across the top of a plate. Cobalt is the wall and the action color.

**The Green-Means-WhatsApp Rule.** Green is used only for buttons that open WhatsApp.

## Typography

**Display Font:** Londrina Solid 900 (with Arial Narrow, sans-serif)
**Script Font:** Yellowtail 400 (with Brush Script MT, cursive)
**Body Font:** Archivo variable, 100-900 weight, 62-125% width (with system-ui)

**Character:** Londrina is the sign painter's brush capital, chunky and always uppercase. Yellowtail is the one looping line of script beneath it. Archivo carries everything read at small size, and its narrowed width (80-85%) is used for plate characters.

### Hierarchy
- **Display** (900, clamp(3.4rem, 17vw, 6rem), 0.94): the shop name on the link, and the booked weekday on the confirmation. Uppercase, painted shadow.
- **Headline** (900, clamp(2rem, 9vw, 2.5rem), 1): step titles on the link ("Serviços", "Quando", "Seus dados"); the panel's painted date uses clamp(2.1rem, 9vw, 2.75rem).
- **Title** (900, clamp(1.45rem, 6.4vw, 1.75rem), 1.02): service names and prices in the table, the plate button label (1.5rem), confirmation code. Short shadow.
- **Script** (Yellowtail 400, clamp(1.9rem, 8.5vw, 2.6rem), 1.1): tagline under the shop name, rotated -4 to -5deg, in canary; also "manhã/tarde" and the month label beside the day strip.
- **Section** (Archivo 800, 1.1875rem, 1.3): panel section headings on the work surface.
- **Body** (Archivo 400, 1rem, 1.5): running copy; descriptions capped near 60ch.
- **Label** (Archivo 700, 0.9375rem, 1.3): field labels, buttons. Durations use `all-small-caps` with tabular numerals; weekday stubs on day boxes use 0.75rem uppercase with 0.04em tracking.
- **Plate** (Archivo 700, ~1.3rem, 80-85% width, 0.08em tracking, uppercase): plate input, search, plate tags and board blocks.

### Named Rules
**The Brush-Only-When-Big Rule.** Londrina is used only at title size and above, always uppercase. Anything read at small size is Archivo.

**The One Script Line Rule.** Yellowtail marks at most one short line per block (a tagline, a time-of-day group, a month), always in canary with the short shadow.

**The Tabular Time Rule.** Times, durations, counts and prices in Archivo use tabular numerals.

## Layout

The link is a single column (max 640px, gutter clamp(16px, 5vw, 40px)) on phones. From 1000px it becomes a two-column wall (5fr / 6fr, gap clamp(48px, 7vw, 112px), max 1240px): the signboard sticks on the left and gains a painted hours board, and the steps run on the right. Steps are separated by a hand-drawn chalk rule (an irregular dashed line, 3px tall), not boxes. Service rows are a three-column price-list grid (name, dotted chalk leader, price) with meta on a second line.

The panel is a mobile-first work tool: a cobalt band at the top (padding 22px gutter, 30px block on desktop), then sections on the lime-wash ground with full-bleed list surfaces (folha with top/bottom hairlines) on phones. A fixed five-tab bar (64px) sits at the bottom on phones; from 1000px it becomes a 248px cobalt rail on the left, and lists and form groups become 8px-rounded bordered panels. Rows lay out as time column (4.1rem) + body, and move actions to a third column when the list container is 620px or wider.

The spacing rhythm is small and even: 4 / 8 / 12 / 16 / 24px, with 6, 10, 14, 18 and 22 used for optical adjustments. Touch targets are at least 44px (52-60px for primary wall controls).

**The Guide-Row Rule.** The shop name is painted over the painter's chalk guide lines (baseline and cap height, giz-guia), extended to the full width of the wall. They are part of the world, not a defect.

## Elevation & Depth

The wall is flat paint on plaster. Depth comes from paint, not from layered cards. Lettering is lifted by the stacked painted text shadow. Plates and the main button sit slightly proud of the wall with a 2px contact lip. Real floating shadows are reserved for the few things that actually float: the dropdown menu, the toast and the masking tape. The panel's work surface is tonal: folha rows on chao ground, separated by hairlines, with no card shadows.

### Shadow Vocabulary
- **Painted letter shadow** (`text-shadow: 0.03em 0.03em 0 #121624, 0.06em 0.06em 0 #121624, 0.09em 0.09em 0 #e2471d`): shop name, step titles, panel date, rail mark. The sign painter's block shadow with a red-lead edge.
- **Short letter shadow** (`text-shadow: 0.04em 0.05em 0 #121624`): service names, prices, script lines, check marks.
- **Plate lip** (`box-shadow: 0 2px 0 rgb(0 0 0 / 0.3), 0 8px 16px -8px rgb(0 0 0 / 0.5)`): the canary plate button; the search plate uses `inset 0 0 0 2.5px #121624, 0 2px 0 rgb(0 0 0 / 0.3)`.
- **Menu float** (`box-shadow: 0 12px 28px -10px rgb(18 22 36 / 0.35), 0 2px 6px rgb(18 22 36 / 0.08)`): action menus.
- **Toast float** (`box-shadow: 0 10px 30px -8px rgb(18 22 36 / 0.55)`): the undo toast.
- **Tape** (`box-shadow: 0 2px 6px rgb(0 0 0 / 0.3)`): the tilted example-data tape only.

### Named Rules
**The Paint-Not-Cards Rule.** Nothing on the wall is a floating card. Chosen things are painted onto the wall, open things are chalked onto it.

## Shapes

Corners are hand-cut. Painted fills use slightly unequal radii per corner (for example `6px 4px 7px 5px / 5px 7px 4px 6px` on the plate button, `5px 3px 6px 4px / 4px 6px 3px 5px` on a pressed service row, 3-6px on slots and day boxes), so nothing looks die-cut. Chalk outlines are drawn as an irregular, slightly wobbly stroked SVG path stretched over the box (`giz-caixa`: lime-white at about 60% opacity, 2px, uneven dash), never a CSS border on the wall. On the light panel surface the same idea becomes a 1.5px dashed cobalt border; the board's bay lanes use a 1.5px dashed chalk border. Plates are 3-8px rounded rectangles with a dark inset outline and a blue top band. Status badges and segmented tabs are pills (999px). Panel controls use a regular 6px; lists and form groups 8px on desktop.

## Components

### Buttons
Painted signs on the wall, plain tools on the work surface.
- **Plate button (wall primary):** canary fill, ink Londrina capitals at 1.5rem, min height 60px, full width, hand-cut corners, plate lip. Hover deepens to canary dark; active presses down 1px. While booking, an ink brush stroke runs along the bottom inside the button. **Lime-white variant** (cal fill, cobalt text) for secondary painted actions.
- **Chalk button (wall secondary):** transparent, chalk-box outline, lime-white Archivo 700, 52px; hover adds an 8% lime-white wash. **Chalk link:** underlined with a dashed underline.
- **Panel primary:** cobalt fill, lime-white Archivo 700 0.9375rem, 44px (38px small), 6px radius, hover muro-fundo. **WhatsApp:** green fill, white text, WhatsApp only. **Outline:** folha fill, 1.5px linha-forte border. **Text:** cobalt text, light cobalt-wash hover. **Danger:** zarcão-text color with zarcão-wash hover. **Chalk** and **lime-white** variants appear inside the cobalt band.
- **Focus:** 3px canary outline on the wall and inside the band or rail; 3px cobalt outline on the light surface.

### Chips (Status Badges)
- **Style:** pill, Archivo 700 0.75rem, 2px 8px, always icon plus text, never color alone.
- **Variants:** done/notified (light cobalt wash, cobalt text); no-show/late (zarcão wash, zarcão text); cancelled (grey-green wash); due today (solid canary); upcoming return (canary wash); auto (bare tertiary text).

### Cards / Containers
- No cards on the wall. On the panel, lists are folha strips with hairline dividers, full-bleed on phones and bordered 8px panels from 1000px. Form groups follow the same pattern, max 760px wide.

### Inputs / Fields
- **Wall field:** lime-white fill, ink text, 52px, 4px radius, 2px transparent border that turns zarcão on error; zarcão caret; 3px canary focus outline. Error text is canary, bold, with an icon.
- **Panel field:** white fill, 1.5px linha-forte border (tinta-3 on hover), 6px radius, 48px; focus turns the border cobalt plus a 3px translucent cobalt ring.
- **Plate field:** the Mercosul plate. Lime-white plate, 2px ink inset outline, blue "BRASIL" band with 0.32em tracking, centered narrow uppercase characters.

### Navigation
- **Phone:** fixed bottom bar of five tabs on folha with a top hairline; icon over label (0.75rem/600). Active is cobalt 800 with a 3px cobalt tab mark on top; a zarcão counter badge shows due returns.
- **Desktop:** 248px cobalt rail on plaster, painted shop mark at the top, tabs as 46px rows in cal-suave. Active tab is painted lime-white with cobalt text, following the paint-means-chosen grammar.
- **Segmented tabs** inside the band: pills, cal-suave text, active painted lime-white with cobalt text.

### Signature: Service Price Row
A painted price-list line: Londrina service name (max 13ch), a dotted chalk leader, canary price with a small "a partir de" qualifier, and small-caps duration/return cadence below. The whole row is the button. Pressed, the row is painted lime-white, text turns cobalt and ink, and the description opens.

### Signature: Chalk Day and Time Slots
Days are 66px chalk boxes (weekday, Londrina number, open count) in a horizontal snap strip with a vertical script month label. Closed days get a single chalk strike-through. Times sit in an auto-fill grid (min 86px) of chalk boxes, grouped under script "manhã/tarde". Choosing a slot paints it lime-white left to right (0.32s clip wipe).

### Signature: Search Plate
The panel's search is a full-width Mercosul plate: lime-white body, 2.5px ink outline, blue "BRASIL" band, search icon, narrow uppercase 1.3rem characters. Focus puts a canary ring around the whole plate.

### Signature: Day Board
One dashed chalk lane per bay, from opening to closing time. Booked cars are mini plates (blue 5px top band over a lime-white body, ink inset outline) showing the plate, shortening to a code or nothing as the block narrows. Done cars dim to cal-suave; no-shows revert to a struck-through chalk outline. The lunch break is a diagonal chalk hatch across the lanes, and a 2px zarcão line marks now.

### Plate Tag
Inline mini plate (blue 4px top band, white body, 1.5px ink border, 3px radius, narrow 0.75rem uppercase) beside the car name in every row.

### Painted Confirmation
On booking, the weekday and hour paint on stroke by stroke (clip reveal, 210ms stagger), the shadow settles last, then the details and actions fade in. Respects `prefers-reduced-motion`.

### Demo Tape
A tilted (-0.8 to -1.2deg) masking-tape strip labels example data. It exists only while data is placeholder and should go when real data arrives.

## Do's and Don'ts

### Do:
- **Do** show open/free things in chalk outline and chosen/booked things in solid lime-white paint (The Chalk-and-Paint Rule).
- **Do** set wall lettering in Londrina Solid 900 uppercase with the painted shadow (`0.03em/0.06em` ink, `0.09em` zarcão), and prices in canary.
- **Do** render any plate number as a Mercosul plate: blue top band, ink outline, narrowed uppercase Archivo.
- **Do** use the cobalt plaster texture for every wall surface (link page, panel band, desktop rail).
- **Do** keep reading text in Archivo, with tabular numerals for times, durations and prices.
- **Do** pair every status color with an icon and a word.
- **Do** keep touch targets at least 44px, and 52-60px for primary wall controls.
- **Do** honor `prefers-reduced-motion`. Motion uses the out-ease `cubic-bezier(0.22, 1, 0.36, 1)` at 0.15-0.62s.

### Don't:
- **Don't** fill a free slot or leave a chosen one as an outline.
- **Don't** use WhatsApp green on anything that does not open WhatsApp.
- **Don't** use Plate Blue as a general accent; it only bands plates.
- **Don't** set Londrina below title size, or in lowercase.
- **Don't** float wall content on shadowed cards; the wall is painted, not stacked.
- **Don't** replace the bay board or slot grid with a generic calendar-grid widget.
- **Don't** add photos, testimonials, ratings or client counts the shop does not have.
