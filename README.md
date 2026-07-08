# kind

> Lightweight schema engine for TiddlyWiki — one tiddler per type, namespaced, hand-rolled UI

Define a type's fields, constraints, title formula, and namespace memberships all on a single tiddler. Spawn, edit, view, and validate typed instances through hand-rolled UIs with zero plugin dependencies.

## Key features

* **One tiddler per type** -- the type's full schema lives in fields and a JSON-encoded `kind.fields` array on a single tiddler. Body stays free for prose documentation.
* **Namespaces** -- types declare `kind.namespaces` (multi-membership). A namespace switcher restricts what's visible to the active scope.
* **Auto-computed titles** -- types declare a `kind.title-formula` filter; new instances get their title computed from sibling fields (e.g. `parent/abbrev`).
* **Live validation + bulk validator** -- inline errors as you edit; wiki-wide scan report on the validator tab.
* **Typeahead refs** -- filterable search input + filtered dropdown + selected pills with × remove; scales to large option sets.
* **Configurable stream-river view** -- each type chooses which fields appear in its in-river field bar; empty = bar hidden.
* **Type picker / assign** -- the field bar's leading type icon is a button: click it to change the instance's kind or remove the type. Tiddlers with no kind can show an optional *+ type* dropdown under the title to assign one -- toggled by `$:/config/rimir/kind/type-selector-enable` (default on) and scoped by a qualifying filter, both in Settings.
* **Instances Overview graph** -- the *Kind: Instances Overview* tiddler renders a whole-wiki graph of every instance, coloured per type, with toggleable per-ref-field edges and per-type show/hide; drag nodes to lay them out and positions persist. The hover tooltip offers per-node *edit* (live field editor in a modal), *delete* (confirm dialog; disabled with a hint while the node still has `parent`-field children) and *Add child* buttons for every kind whose `parent` field accepts the node's type -- the create form opens with the parent pre-filled and the same validation as the Creator. Needs a graph engine (see Prerequisites).
* **Context preview** -- a cascade-palette side-preview (shown for any instance) that draws just the instance's neighbourhood in the `parent` tree, reusing the Instances Overview layout/positions. Pills pick direction (*Descendants* / *Ancestors*), how many *levels* (1-5) to show, which *edges* to draw (multi-select), and which *types* to show (colour-coded chips -- click to hide); all four persist globally. Edges are colour- and stroke-coded per relationship and labelled when more than one is shown. Needs a graph engine plus the bimlas kin-filter plugin (see Prerequisites).
* **Per-kind cockpit views** -- optional story-river panels for `person` (everything referencing the person, grouped and ranked, with role + status filters) and `conversation` (Participants, editable Minutes, referring Notes) instances, sharing a click-to-open/split detail pane.
* **Hand-rolled UI** -- zero dependency on other rimir plugins (theme/components/typed). Optional soft dependency on doc-template for the branded documentation hub.

## Prerequisites

No external prerequisites for the core schema/UI. Optional: `rimir/doc-template` for the documentation hub; `flibbles/graph` plus a rendering engine (`flibbles/vis-network` or `rimir/cytoscape-engine`) for the *Instances Overview* graph (it shows an install hint if absent). The *Context* side-preview additionally needs `bimlas/kin-filter` (it walks the `parent` tree to a chosen depth).

## Quick start

1. Open the **type-builder** tab and define a new type (key, caption, icon, namespaces, title-formula, fields).
2. Open the **creator** tab, pick the type, fill the fields, click Create.
3. Open the resulting tiddler in the story river — the stream-view field bar appears at the top.
4. Use the **validator** tab for a wiki-wide constraint scan.

## Plugin Library

This plugin is part of the [rimir-cc tw-plugin-library](https://rimir-cc.github.io/tw-plugin-library/).
