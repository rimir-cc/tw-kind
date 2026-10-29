/*\
title: $:/plugins/rimir/kind/test/test-cockpit.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the cockpit relation functions and the linked create flow
(kind.gm-create-linked + kind.finalize-create + kind.gm-link-created).

\*/
"use strict";

var schema = require("$:/plugins/rimir/kind/schema.js");

var PREFIX = "$:/test/kind-cockpit/";
var GM = "$:/state/rimir/kind/graph-modal";
var DRAFT = GM + "/draft";

var TYPES = {
	"kc-conv": [
		{key: "caption", typed: "text"},
		{key: "participants", typed: "ref", cardinality: "multi", "ref-types": ["kc-person"], inverse: "conversations"}
	],
	"kc-person": [
		{key: "caption", typed: "text"},
		{key: "conversations", typed: "ref", cardinality: "multi", "ref-types": ["kc-conv"], inverse: "participants"},
		{key: "buddies", typed: "ref", cardinality: "multi", "ref-types": ["kc-person"]}
	],
	"kc-note": [
		{key: "caption", typed: "text"},
		{key: "about", typed: "ref", cardinality: "single", "ref-types": ["kc-person"]}
	]
};

function typeTid(key) {
	return PREFIX + "type/" + key;
}

function render(text) {
	return $tw.wiki.renderText("text/plain", "text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text);
}

function list(filter) {
	return render("<$text text={{{ " + filter + " +[format:titlelist[]join[ ]] }}}/>");
}

// Render a wikitext action string and fire it, as a button click would
function invoke(text) {
	var parser = $tw.wiki.parseText("text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text),
		widget = $tw.wiki.makeWidget(parser, {document: $tw.fakeDocument});
	widget.render($tw.fakeDocument.createElement("div"), null);
	widget.invokeActions(widget, null);
}

function createLinked(kind, host, field, dir, caption) {
	invoke("<$transclude $variable=\"kind.gm-create-linked\" type-tid=\"" + typeTid(kind) + "\" host-tid=\"" + host + "\" field-key=\"" + field + "\" dir=\"" + dir + "\"/>");
	$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getTiddler(DRAFT), {caption: caption}));
	invoke("<$transclude $variable=\"kind.finalize-create\" kind-tid=\"" + typeTid(kind) + "\" kind-type-key=\"" + kind + "\" draft-tid=\"" + DRAFT + "\" savetitle=\"" + PREFIX + "saved\" after-create={{{ [[" + GM + "]get[after-create]] }}}/>");
	return PREFIX + "inst/" + caption;
}

describe("kind cockpit", function() {

	var HOST = PREFIX + "inst/Anna Berger";

	beforeEach(function() {
		$tw.utils.each(TYPES, function(fields, key) {
			$tw.wiki.addTiddler({title: typeTid(key), "kind.type": key, "kind.fields": JSON.stringify(fields),
				"kind.title-formula": "[[" + PREFIX + "inst/]] [get[caption]] +[join[]]"});
		});
		$tw.wiki.addTiddler({title: HOST, "kind.type": "kc-person", caption: "Anna Berger"});
	});

	afterEach(function() {
		$tw.wiki.filterTiddlers("[prefix[" + PREFIX + "]] [prefix[" + GM + "]]").forEach(function(title) {
			$tw.wiki.deleteTiddler(title);
		});
	});

	it("lists outgoing ref fields and their target kinds", function() {
		expect(list("[function[kind.out-fields],[" + typeTid("kc-person") + "]]")).toBe("conversations buddies");
		expect(list("[function[kind.field-target-kinds],[" + typeTid("kc-note") + "],[about]]")).toBe("kc-person");
	});

	it("lists incoming relations, minus those mirrored by an outgoing inverse field", function() {
		expect(list("[function[kind.in-sources],[" + typeTid("kc-person") + "]]")).toBe(
			$tw.utils.stringifyList([typeTid("kc-person"), typeTid("kc-note")].sort()));
		expect(list("[function[kind.in-fields],[" + typeTid("kc-person") + "],[" + typeTid("kc-conv") + "]]")).toBe("");
		expect(list("[function[kind.in-fields],[" + typeTid("kc-person") + "],[" + typeTid("kc-note") + "]]")).toBe("about");
	});

	it("creates an outgoing link and seeds the inverse field into the form", function() {
		var conv = createLinked("kc-conv", HOST, "conversations", "out", "Kickoff");
		expect($tw.wiki.getTiddler(conv).fields.participants).toBe("[[" + HOST + "]]");
		expect($tw.wiki.getTiddlerList(HOST, "conversations")).toEqual([conv]);
	});

	it("appends to a multi field without an inverse", function() {
		$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getTiddler(HOST), {buddies: "Old"}));
		var buddy = createLinked("kc-person", HOST, "buddies", "out", "Tom Weiss");
		expect($tw.wiki.getTiddlerList(HOST, "buddies")).toEqual(["Old", buddy]);
		expect($tw.wiki.getTiddler(buddy).fields.buddies).toBeUndefined();
	});

	it("creates an incoming link through the new instance's own field", function() {
		var note = createLinked("kc-note", HOST, "about", "in", "Remark");
		expect($tw.wiki.getTiddler(note).fields.about).toBe(HOST);
		expect($tw.wiki.getTiddler(HOST).fields.about).toBeUndefined();
	});

	it("saves a kind without title-formula under its caption, not the draft title", function() {
		$tw.wiki.addTiddler({title: typeTid("kc-memo"), "kind.type": "kc-memo", "kind.caption": PREFIX + "Memo",
			"kind.fields": JSON.stringify([{key: "about", typed: "ref", cardinality: "single", "ref-types": ["kc-person"]}])});
		createLinked("kc-memo", HOST, "about", "in", "ignored");
		createLinked("kc-memo", HOST, "about", "in", "ignored");
		expect(list("[function[kind.instances-of],[kc-memo]]")).toBe(PREFIX + "Memo [[" + PREFIX + "Memo 1]]");
	});

	it("does not treat the create-form draft as an instance", function() {
		createLinked("kc-note", HOST, "about", "in", "Remark");
		invoke("<$transclude $variable=\"kind.gm-create-linked\" type-tid=\"" + typeTid("kc-note") + "\" host-tid=\"" + HOST + "\" field-key=\"about\" dir=\"in\"/>");
		expect($tw.wiki.getTiddler(DRAFT).fields["kind.type"]).toBe("kc-note");
		expect(schema.isInstance($tw.wiki.getTiddler(DRAFT))).toBe(false);
		expect(list("[function[kind.instances-of],[kc-note]]")).toBe(PREFIX + "inst/Remark");
	});
});
