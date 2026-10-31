/*\
title: $:/plugins/rimir/kind/test/test-title-fixed.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for `kind.title-fixed`: a kind whose title is set once at creation
(e.g. a timestamp surrogate) is not reported as a title mismatch.

\*/
"use strict";

var PREFIX = "$:/test/kind-title-fixed/";
var FORMULA_TS = "[<now \"[UTC]YYYY0MM0DD0hh0mm0ss0XXX\">]";

function render(text) {
	return $tw.wiki.renderText("text/plain", "text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text);
}

function filter(f) {
	return render("<$text text={{{ " + f + " +[join[|]] }}}/>");
}

function addType(key, extra) {
	$tw.wiki.addTiddler(new $tw.Tiddler({
		title: PREFIX + "type/" + key,
		"kind.type": key,
		"kind.fields": JSON.stringify([{key: "caption", typed: "text"}])
	}, extra || {}));
	return PREFIX + "type/" + key;
}

function addInstance(title, key) {
	$tw.wiki.addTiddler(new $tw.Tiddler({title: title, "kind.type": key, caption: "Alice"}));
	return title;
}

describe("kind: kind.title-fixed", function() {

	afterEach(function() {
		$tw.wiki.filterTiddlers("[prefix[" + PREFIX + "]]").forEach(function(t) {
			$tw.wiki.deleteTiddler(t);
		});
	});

	it("reports a mismatch for a regular formula kind", function() {
		var type = addType("ktf-plain", {"kind.title-formula": FORMULA_TS}),
			inst = addInstance(PREFIX + "20200101000000000", "ktf-plain");
		expect(filter("[function[kind.viol-title],[" + type + "],[" + inst + "]]")).not.toBe("");
	});

	it("does not report a mismatch when kind.title-fixed is yes", function() {
		var type = addType("ktf-fixed", {"kind.title-formula": FORMULA_TS, "kind.title-fixed": "yes"}),
			inst = addInstance(PREFIX + "20200101000000000", "ktf-fixed");
		expect(filter("[function[kind.viol-title],[" + type + "],[" + inst + "]]")).toBe("");
	});

	it("still evaluates the formula for the create title of a fixed kind", function() {
		var type = addType("ktf-fixed2", {"kind.title-formula": FORMULA_TS, "kind.title-fixed": "yes"});
		expect(filter("[function[kind.create-title],[" + type + "],[" + PREFIX + "draft]]")).toMatch(/^\d{17}$/);
	});

	it("labels the title preview by mode", function() {
		var plain = addType("ktf-l1", {"kind.title-formula": FORMULA_TS}),
			fixed = addType("ktf-l2", {"kind.title-formula": FORMULA_TS, "kind.title-fixed": "yes"});
		expect(filter("[function[kind.title-preview-label],[" + plain + "]]")).toBe("computed title");
		expect(filter("[function[kind.title-preview-label],[" + fixed + "]]")).toBe("title on save");
	});
});
