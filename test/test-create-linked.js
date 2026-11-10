/*\
title: $:/plugins/rimir/kind/test/test-create-linked.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the optional seed / after-link / ctx-a / ctx-b parameters of
kind.gm-create-linked (+ the after-link step of kind.gm-link-created).

\*/
"use strict";

var PREFIX = "$:/test/kind-cl/";
var DRAFT = "$:/state/rimir/kind/graph-modal/draft";
var GM = "$:/state/rimir/kind/graph-modal";
var OUT = "$:/temp/t-after";

var TYPES = {
	"cl-person": [{key: "caption", typed: "text"}],
	"cl-note": [
		{key: "caption", typed: "text"},
		{key: "note", typed: "text", "default": "[[from-default]]"},
		{key: "owner", typed: "ref", cardinality: "single", "ref-types": ["cl-person"]},
		{key: "people", typed: "ref", cardinality: "multi", "ref-types": ["cl-person"]}
	],
	"cl-host": [
		{key: "caption", typed: "text"},
		{key: "note", typed: "text"},
		{key: "notes", typed: "ref", cardinality: "multi", "ref-types": ["cl-note"]}
	]
};

function typeTid(key) {
	return PREFIX + "type/" + key;
}

function inst(name) {
	return PREFIX + "inst/" + name;
}

function invoke(text) {
	var parser = $tw.wiki.parseText("text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text),
		widget = $tw.wiki.makeWidget(parser, {document: $tw.fakeDocument});
	widget.render($tw.fakeDocument.createElement("div"), null);
	widget.invokeActions(widget, null);
}

function q(s) {
	// attribute value as a triple-quoted-safe string
	return "\"\"\"" + s + "\"\"\"";
}

function createLinked(extra, dir, copy) {
	invoke("<$transclude $variable=\"kind.gm-create-linked\" type-tid=\"" + typeTid("cl-note") + "\" host-tid=\"" + inst("H") +
		"\" field-key=\"" + (dir === "in" ? "owner" : "notes") + "\" dir=\"" + (dir || "out") + "\"" + (copy ? " copy=\"yes\"" : "") + " " + (extra || "") + "/>");
}

function finalize(caption) {
	$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getTiddler(DRAFT), {caption: caption}));
	invoke("\\import [[" + PREFIX + "after]]\n<$transclude $variable=\"kind.finalize-create\" kind-tid=\"" + typeTid("cl-note") + "\" kind-type-key=\"cl-note\" draft-tid=\"" + DRAFT +
		"\" savetitle=\"" + PREFIX + "saved\" after-create={{{ [[" + GM + "]get[after-create]] }}}/>");
	return inst(caption);
}

describe("kind create-linked extras", function() {

	beforeEach(function() {
		$tw.utils.each(TYPES, function(fields, key) {
			$tw.wiki.addTiddler({title: typeTid(key), "kind.type": key, "kind.fields": JSON.stringify(fields),
				"kind.title-formula": "[[" + PREFIX + "inst/]] [get[caption]] +[join[]]"});
		});
		$tw.wiki.addTiddler({title: inst("P One"), "kind.type": "cl-person", caption: "P One"});
		$tw.wiki.addTiddler({title: inst("H"), "kind.type": "cl-host", caption: "H", note: "from-host"});
		$tw.wiki.addTiddler({title: PREFIX + "after", tags: "$:/tags/Global", type: "text/vnd.tiddlywiki", text:
			"\\procedure t.after()\n<$action-setfield $tiddler=\"" + OUT + "\" text={{{ [<createTiddler-title>] [<ctx-a>] [<ctx-b>] [[" + inst("H") + "]get[notes]addprefix[linked:]] +[join[|]] }}}/>\n\\end\n"});
		$tw.wiki.addTiddler({title: OUT, text: "untouched"});
	});

	afterEach(function() {
		$tw.wiki.filterTiddlers("[prefix[" + PREFIX + "]] [prefix[" + GM + "]] [[" + OUT + "]]").forEach(function(title) {
			$tw.wiki.deleteTiddler(title);
		});
	});

	it("seeds a text field and a single ref", function() {
		createLinked("seed=" + q("{\"note\":\"hello\",\"owner\":\"" + inst("P One") + "\"}"));
		var draft = $tw.wiki.getTiddler(DRAFT).fields;
		expect(draft.note).toBe("hello");
		expect(draft.owner).toBe(inst("P One"));
	});

	it("seeds a multi ref as a title list", function() {
		createLinked("seed=" + q("{\"people\":\"" + inst("P One") + "\"}"));
		expect($tw.wiki.getTiddler(DRAFT).fields.people).toBe("[[" + inst("P One") + "]]");
	});

	it("seed overrides a copied value and beats the default", function() {
		createLinked("seed=" + q("{\"note\":\"seeded\"}"), "in", true);
		// dir=in uses field owner as the link; note is copied from host, has a default
		expect($tw.wiki.getTiddler(DRAFT).fields.note).toBe("seeded");
	});

	it("ignores unknown keys, blank values and invalid JSON", function() {
		createLinked("seed=" + q("{\"nope\":\"x\",\"note\":\"\"}"));
		var withSeed = $tw.wiki.getTiddler(DRAFT).fields;
		expect(withSeed.nope).toBeUndefined();
		expect(withSeed.note).toBe("from-default");
		createLinked("seed=\"not json\"");
		var bad = $tw.wiki.getTiddler(DRAFT).fields;
		expect(bad.nope).toBeUndefined();
		expect(bad.note).toBe("from-default");
	});

	it("stores after-link and ctx on the modal state", function() {
		createLinked("after-link=\"t.after\" ctx-a=\"A\" ctx-b=\"B\"");
		var st = $tw.wiki.getTiddler(GM).fields;
		expect(st["after-link"]).toBe("t.after");
		expect(st["ctx-a"]).toBe("A");
		expect(st["ctx-b"]).toBe("B");
	});

	it("runs after-link once after the link with the new title", function() {
		createLinked("after-link=\"t.after\" ctx-a=\"A\" ctx-b=\"B\"");
		var title = finalize("N1");
		expect($tw.wiki.getTiddler(OUT).fields.text).toBe(title + "|A|B|linked:" + title);
	});

	it("a plain gm-create after a create-linked does not run after-link", function() {
		createLinked("after-link=\"t.after\" ctx-a=\"A\" ctx-b=\"B\"");
		invoke("<$transclude $variable=\"kind.gm-create\" type-tid=\"" + typeTid("cl-note") + "\" host-tid=\"\"/>");
		finalize("N2");
		expect($tw.wiki.getTiddler(OUT).fields.text).toBe("untouched");
	});
});
