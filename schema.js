/*\
title: $:/plugins/rimir/kind/schema.js
type: application/javascript
module-type: library

Schema access for JS modules (inverse.js, other plugins such as rimir/ports).
Wikitext uses the equivalent functions in engine.tid.

\*/

"use strict";

var TYPE_FILTER = "[all[shadows+tiddlers]has[kind.type]has[kind.fields]]";

/*
Field definitions of the kind with key `typeKey`, as an array ([] when the kind
is unknown or its kind.fields is not a JSON array).
*/
exports.fieldDefs = function(wiki, typeKey) {
	var title = wiki.filterTiddlers(TYPE_FILTER).filter(function(t) {
		return wiki.getTiddler(t).fields["kind.type"] === typeKey;
	})[0];
	return title ? exports.parseFields(wiki.getTiddler(title)) : [];
};

exports.parseFields = function(typeTiddler) {
	var defs;
	try {
		defs = JSON.parse(typeTiddler.fields["kind.fields"]);
	} catch(e) {
		return [];
	}
	return $tw.utils.isArray(defs) ? defs.filter(function(def) { return def && def.key; }) : [];
};

exports.fieldDef = function(wiki, typeKey, key) {
	return exports.fieldDefs(wiki, typeKey).filter(function(def) { return def.key === key; })[0] || null;
};

// True for a kind instance (has kind.type, is not itself a type, not a draft)
exports.isInstance = function(tiddler) {
	return !!(tiddler && tiddler.fields["kind.type"] && tiddler.fields["kind.fields"] === undefined && !tiddler.fields["draft.of"]);
};

/*
Current values of a field as an array of titles. Multi fields are title lists;
a single field is one title, kept whole even when it contains spaces.
*/
exports.values = function(tiddler, def) {
	var raw = tiddler ? tiddler.fields[def.key] : undefined;
	if(raw === undefined || raw === "") {
		return [];
	}
	if($tw.utils.isArray(raw)) {
		return raw.slice(0);
	}
	return def.cardinality === "multi" ? $tw.utils.parseStringArray(raw) : [raw];
};

// The field value that results from adding / removing `title`
exports.withValue = function(tiddler, def, title, add) {
	var current = exports.values(tiddler, def);
	if(def.cardinality === "multi") {
		var list = current.filter(function(t) { return t !== title; });
		if(add) {
			list.push(title);
		}
		return $tw.utils.stringifyList(list);
	}
	return add ? title : (current[0] === title ? "" : (current[0] || ""));
};

// Whether `target` may be referenced by the ref field `def`
exports.accepts = function(wiki, def, target) {
	var tiddler = wiki.getTiddler(target);
	if(!exports.isInstance(tiddler)) {
		return false;
	}
	var types = def["ref-types"] || [];
	return !types.length || types.indexOf(tiddler.fields["kind.type"]) !== -1;
};

exports.TYPE_FILTER = TYPE_FILTER;
