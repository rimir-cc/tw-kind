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
* **Hand-rolled UI** -- zero dependency on other rimir plugins (theme/components/typed). Optional soft dependency on doc-template for the branded documentation hub.

## Prerequisites

No external prerequisites. Optional: `rimir/doc-template` for the documentation hub.

## Quick start

1. Open the **type-builder** tab and define a new type (key, caption, icon, namespaces, title-formula, fields).
2. Open the **creator** tab, pick the type, fill the fields, click Create.
3. Open the resulting tiddler in the story river — the stream-view field bar appears at the top.
4. Use the **validator** tab for a wiki-wide constraint scan.

## Plugin Library

This plugin is part of the [rimir-cc tw-plugin-library](https://rimir-cc.github.io/tw-plugin-library/).
