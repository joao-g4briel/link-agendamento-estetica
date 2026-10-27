---
version: 1
slug: "public-painel-index-html"
primary_target: "public/painel/index.html"
related_targets: ["public/index.html"]
---

# Painel da estética

Scope: the owner's panel at /painel/ (home with search, week agenda, return queue, services, settings, new appointment). Visitor mode: Operate. Inherits the public link's world (see public-index-html surface brief), now the owner-pinned HC brand.

Audience: the shop owner, on a phone between cars in a bright workshop, sometimes at the front-desk computer. Tasks: find a car fast (plate, name or WhatsApp), see today's cars, mark done / no-show, send due return messages with one tap, edit services and hours. Constraints: placeholder data in the browser, no login yet, WhatsApp via wa.me only.

Memorable moment: today's board on the black band, where booked cars are mini Mercosul plates on their bay lanes and free time is silver outline, with a red "now" line.

Unresolved: real login, multi-device sync (needs backend).

## Direction contract

THESIS: The panel starts from the plate, not from a menu: one search shaped like a Mercosul plate finds car, client, slot or return and acts on it. It refuses the category default of a calendar grid as the home screen.

OWN-WORLD: Black lacquer band carrying the HC logo, the gold italic date, the plate search and the day board; below it a neutral silver-white work surface (#ececeb ground, #f9f9f8 sheets), from the logo's silver, with hairline rows, Saira throughout, gold-metal italic only for band titles. Primary actions on the light surface are black plates with gold labels (the logo's own pairing); gold fill marks the chosen state and the band's main action; bronze is accent text on the light surface, red-orange marks late and "now", WhatsApp green only on WhatsApp actions. Free capacity in silver outline, booked time as plates.

STORY: The owner opens the panel, sees how full today is at a glance, types three letters of a plate to pull up a car, taps Concluir when a car leaves (the return is planted), and clears the day's return queue with one WhatsApp tap each.

FIRST VIEWPORT: Phone 390 wide. Black band: gold italic weekday and date, small logo, full-width plate search, example-data note while demo data is loaded, today's bay board (one lane per bay, 8h to 18h). Below: "Hoje" list rows with time, car, plate, service, and a black-and-gold Concluir action. Bottom tab bar: Início, Agenda, Retornos, Serviços, Ajustes.

FORM: Surface structure 7 of 7 ("Busca primeiro"), surface seed key c893a252, inside world db644ca5 translated to the pinned HC brand.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
