---
version: 1
slug: "public-painel-index-html"
primary_target: "public/painel/index.html"
related_targets: ["public/index.html"]
---

# Painel da estética

Scope: the owner's panel at /painel/ (home with search, week agenda, return queue, services, settings, new appointment). Visitor mode: Operate. Inherits the "Muro de letreiro" world from the public link (see public-index-html surface brief).

Audience: the shop owner, on a phone between cars in a bright workshop, sometimes at the front-desk computer. Tasks: find a car fast (plate, name or WhatsApp), see today's cars, mark done / no-show, send due return messages with one tap, edit services and hours. Constraints: placeholder data in the browser, no login yet, WhatsApp via wa.me only.

Memorable moment: today's board on the cobalt band, where booked cars are painted lime plates on their bay lanes and free time is chalk outline, with a zarcão "now" line.

Unresolved: real login, multi-device sync (needs backend).

## Direction contract

THESIS: The panel starts from the plate, not from a menu: one search on the painted wall finds car, client, slot or return and acts on it. It refuses the category default of a calendar grid as the home screen.

OWN-WORLD: Cobalt wall band carries the shop's painted date, the search plate and the day board; below it a lime-wash work surface with hairline rows, Archivo throughout, Londrina only for page titles and the date. Cobalt is the primary action, canary marks today and due items, zarcão marks late, WhatsApp green only on WhatsApp actions. Free capacity in chalk, booked time in paint.

STORY: The owner opens the panel, sees how full today is at a glance, types three letters of a plate to pull up a car, taps Concluir when a car leaves (the return is planted), and clears the day's return queue with one WhatsApp tap each.

FIRST VIEWPORT: Phone 390 wide. Cobalt band: painted weekday and date, shop name small, full-width search plate, today's bay board (one lane per bay, 8h to 18h). Below: "Hoje" list rows with time, car, plate, service, and a Concluir action; the return count sits under it. Bottom tab bar: Início, Agenda, Retornos, Serviços, Ajustes.

FORM: Surface structure 7 of 7 ("Busca primeiro"), surface seed key c893a252, inside world db644ca5.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
