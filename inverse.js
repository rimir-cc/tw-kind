/*\
title: $:/plugins/rimir/kind/inverse.js
type: application/javascript
module-type: library

Inverse ref fields. A `ref` field definition may carry `"inverse": "<field>"`:
whenever an instance gains a target in that field, the instance is added to the
target's `<field>`; when it loses one, it is removed there again.

Driven by wiki change events, so every write path (field editors, palette
actions, saved drafts, drag-to-connect, manual edits) is covered without the
writers knowing about inverses. Old values come from a per-instance snapshot.
A write that changes nothing is skipped, which ends the A -> B -> A echo of a
two-way pair.

\*/

"use strict";

var schema = require("$:/plugins/rimir/kind/schema.js");

function InverseSync(wiki) {
	this.wiki = wiki;
	this.rebuild();
}

/*
Re-read every type's field definitions and snapshot the current ref values of
all instances. Called at startup and whenever a type tiddler changes.
*/
InverseSync.prototype.rebuild = function() {
	var self = this;
	this.types = {}; // type-key -> {fields: {key: def}, relations: [def with inverse]}
	this.typeTitles = {};
	this.wiki.filterTiddlers(schema.TYPE_FILTER).forEach(function(title) {
		var tiddler = self.wiki.getTiddler(title),
			entry = {fields: {}, relations: []};
		self.typeTitles[title] = true;
		schema.parseFields(tiddler).forEach(function(def) {
			entry.fields[def.key] = def;
			if(def.typed === "ref" && def.inverse) {
				entry.relations.push(def);
			}
		});
		self.types[tiddler.fields["kind.type"]] = entry;
	});
	this.snapshots = {};
	this.wiki.each(function(tiddler, title) {
		self.snapshot(title, tiddler);
	});
};

InverseSync.prototype.relationsOf = function(tiddler) {
	if(!schema.isInstance(tiddler)) {
		return [];
	}
	var entry = this.types[tiddler.fields["kind.type"]];
	return entry ? entry.relations : [];
};

InverseSync.prototype.snapshot = function(title, tiddler) {
	var self = this,
		relations = this.relationsOf(tiddler);
	if(!relations.length) {
		delete this.snapshots[title];
		return;
	}
	var snap = {};
	relations.forEach(function(def) {
		snap[def.key] = {inverse: def.inverse, values: schema.values(tiddler, def)};
	});
	this.snapshots[title] = snap;
};

/*
Add or remove `source` in `target`'s field `key`. Only writes when the target
is an instance whose type defines that field, and only when the value changes.
A single-valued target field is replaced on add and cleared on remove.
*/
InverseSync.prototype.mirror = function(target, key, source, add) {
	var tiddler = this.wiki.getTiddler(target);
	if(!tiddler || tiddler.fields["draft.of"]) {
		return;
	}
	var entry = this.types[tiddler.fields["kind.type"]],
		def = entry && entry.fields[key];
	if(!def) {
		return;
	}
	if(add === (schema.values(tiddler, def).indexOf(source) !== -1)) {
		return;
	}
	var update = {};
	update[key] = schema.withValue(tiddler, def, source, add);
	this.wiki.addTiddler(new $tw.Tiddler(tiddler, update, this.wiki.getModificationFields()));
};

InverseSync.prototype.handleChanges = function(changes) {
	var self = this,
		titles = Object.keys(changes);
	// A changed, added or deleted type redefines the relations; resnapshot without mirroring
	if(titles.some(function(title) {
		var tiddler = self.wiki.getTiddler(title);
		return self.typeTitles[title] || (tiddler && tiddler.fields["kind.fields"] !== undefined);
	})) {
		this.rebuild();
		return;
	}
	titles.forEach(function(title) {
		var before = self.snapshots[title] || {},
			tiddler = changes[title].deleted ? null : self.wiki.getTiddler(title),
			relations = self.relationsOf(tiddler),
			seen = {};
		relations.forEach(function(def) {
			var now = schema.values(tiddler, def),
				old = before[def.key] && before[def.key].inverse === def.inverse ? before[def.key].values : [];
			old.forEach(function(target) {
				if(now.indexOf(target) === -1) {
					self.mirror(target, def.inverse, title, false);
				}
			});
			now.forEach(function(target) {
				if(old.indexOf(target) === -1) {
					self.mirror(target, def.inverse, title, true);
				}
			});
			seen[def.key] = true;
		});
		// Relations that disappeared (instance deleted or retyped) release their targets
		$tw.utils.each(before, function(rel, key) {
			if(!seen[key]) {
				rel.values.forEach(function(target) {
					self.mirror(target, rel.inverse, title, false);
				});
			}
		});
		self.snapshot(title, tiddler);
	});
};

exports.InverseSync = InverseSync;
