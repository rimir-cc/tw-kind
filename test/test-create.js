/*\
title: $:/plugins/rimir/kind/test/test-create.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the create flow: which field of the create form gets the cursor
(kind.focus-key) and which kinds the create popup's search keeps (kind.label-matches).

\*/
"use strict";

var TYPE = "$:/test/kind-editor-focus/type";

function render(filter) {
	return $tw.wiki.renderText("text/plain", "text/vnd.tiddlywiki",
		"\\import $:/plugins/rimir/kind/engine\n<$text text={{{ " + filter + " }}}/>");
}

function focusKey(fields) {
	$tw.wiki.addTiddler({title: TYPE, "kind.type": "kef", "kind.fields": JSON.stringify(fields)});
	return render("[function[kind.focus-key],[" + TYPE + "]]");
}

describe("kind editor focus", function() {

	afterEach(function() {
		$tw.wiki.deleteTiddler(TYPE);
	});

	it("is the first field", function() {
		expect(focusKey([{key: "caption", typed: "text"}, {key: "notes", typed: "longtext"}])).toBe("caption");
	});

	it("counts a field without typed as text", function() {
		expect(focusKey([{key: "caption"}, {key: "notes", typed: "longtext"}])).toBe("caption");
	});

	it("skips computed fields and inputs that take no cursor", function() {
		expect(focusKey([
			{key: "title", typed: "$title"}, {key: "age", typed: "$calculated"},
			{key: "due", typed: "date"}, {key: "at", typed: "datetime"}, {key: "state", typed: "enum"},
			{key: "owner", typed: "ref"}
		])).toBe("owner");
	});

	it("is empty when no field takes the cursor", function() {
		expect(focusKey([{key: "due", typed: "date"}])).toBe("");
	});

	describe("create popup search", function() {

		function matches(q) {
			return render("[function[kind.label-matches],[" + TYPE + "],[" + q + "]]");
		}

		it("matches the caption anywhere, in any case", function() {
			$tw.wiki.addTiddler({title: TYPE, "kind.type": "kef", "kind.caption": "Meeting Note"});
			expect(matches("")).toBe("yes");
			expect(matches("note")).toBe("yes");
			expect(matches("TING n")).toBe("yes");
			expect(matches("person")).toBe("");
		});

		it("matches the type key when there is no caption", function() {
			$tw.wiki.addTiddler({title: TYPE, "kind.type": "aaa"});
			expect(matches("aa")).toBe("yes");
		});
	});
});
