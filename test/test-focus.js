/*\
title: $:/plugins/rimir/kind/test/test-focus.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for kind.focus: which children are opened, in which order, and the story write.

\*/
"use strict";

var PREFIX = "$:/test/kind-focus/";

function render(text) {
	return $tw.wiki.renderText("text/plain", "text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text);
}

function list(filter) {
	return render("<$text text={{{ " + filter + " +[format:titlelist[]join[ ]] }}}/>");
}

function invoke(text) {
	var parser = $tw.wiki.parseText("text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text),
		widget = $tw.wiki.makeWidget(parser, {document: $tw.fakeDocument});
	widget.render($tw.fakeDocument.createElement("div"), null);
	widget.invokeActions(widget, null);
}

describe("kind focus", function() {

	var HOST = PREFIX + "Topic", story;

	function child(name, modified, extra) {
		$tw.wiki.addTiddler($tw.utils.extend({title: PREFIX + name, parent: HOST, modified: $tw.utils.parseDate(modified)}, extra || {}));
	}

	beforeEach(function() {
		story = $tw.wiki.getTiddler("$:/StoryList");
		$tw.wiki.addTiddler({title: PREFIX + "type/kf-topic", "kind.type": "kf-topic", "kind.fields": "[]", "kind.focus": "yes"});
		$tw.wiki.addTiddler({title: HOST, "kind.type": "kf-topic", "stream-list": "[[" + PREFIX + "row]]"});
		child("old task", "20260101000000000");
		child("new note", "20261101000000000");
		child("row", "20261102000000000");
		$tw.wiki.addTiddler({title: PREFIX + "elsewhere", parent: PREFIX + "Other"});
	});

	afterEach(function() {
		$tw.wiki.filterTiddlers("[prefix[" + PREFIX + "]]").forEach(function(title) {
			$tw.wiki.deleteTiddler(title);
		});
		if(story) {
			$tw.wiki.addTiddler(story);
		} else {
			$tw.wiki.deleteTiddler("$:/StoryList");
		}
	});

	it("lists parent children latest first, without the host's own stream rows", function() {
		expect(list("[function[kind.focus-children],[" + HOST + "]]")).toBe("[[" + PREFIX + "new note]] [[" + PREFIX + "old task]]");
		expect(list("[function[kind.focus-on],[" + PREFIX + "type/kf-topic]]")).toBe("yes");
	});

	it("replaces the story with the host and its children", function() {
		$tw.wiki.addTiddler({title: "$:/StoryList", list: "Unrelated"});
		invoke("<$transclude $variable=\"kind.focus-actions\" host=\"" + HOST + "\"/>");
		expect($tw.wiki.getTiddlerList("$:/StoryList")).toEqual([HOST, PREFIX + "new note", PREFIX + "old task"]);
	});

	it("with add=yes (Shift-click) keeps the story and puts the children right after the host", function() {
		$tw.wiki.addTiddler({title: "$:/StoryList", list: $tw.utils.stringifyList(["Before", PREFIX + "old task", HOST, "After"])});
		invoke("<$transclude $variable=\"kind.focus-actions\" host=\"" + HOST + "\" add=\"yes\"/>");
		expect($tw.wiki.getTiddlerList("$:/StoryList")).toEqual(["Before", HOST, PREFIX + "new note", PREFIX + "old task", "After"]);
	});

	describe("with a rules tiddler", function() {

		var RULES = "$:/config/rimir/kind/focus/kf-topic";

		beforeEach(function() {
			$tw.wiki.addTiddler({title: PREFIX + "talk A", "kind.type": "kf-talk", about: "[[" + HOST + "]]", status: "active", modified: $tw.utils.parseDate("20260201000000000")});
			$tw.wiki.addTiddler({title: PREFIX + "talk B", "kind.type": "kf-talk", about: "[[" + HOST + "]] Other", modified: $tw.utils.parseDate("20260301000000000")});
			$tw.wiki.addTiddler({title: PREFIX + "talk C", "kind.type": "kf-talk", about: "[[" + HOST + "]]", status: "archived", modified: $tw.utils.parseDate("20261201000000000")});
			$tw.wiki.addTiddler({title: RULES, text: [
				"# talks about the host that are not archived",
				"[kind.type[kf-talk]contains:about<host>] :filter[get[status]else[active]match[active]]",
				"",
				"  # children, after the talks",
				"[function[kind.focus-parent],<host>]",
				"[[" + PREFIX + "talk A]]"
			].join("\n")});
		});

		afterEach(function() {
			$tw.wiki.deleteTiddler(RULES);
		});

		it("groups by rule in line order, latest first within a rule, without repeats", function() {
			expect(list("[function[kind.focus-children],[" + HOST + "]]")).toBe(
				"[[" + PREFIX + "talk B]] [[" + PREFIX + "talk A]] [[" + PREFIX + "new note]] [[" + PREFIX + "old task]]");
		});

		it("keeps a rule's :filter inside its own line", function() {
			// talk C is archived and dropped by the first rule only; the children rule is unaffected
			expect(list("[function[kind.focus-children],[" + HOST + "]]")).not.toContain("talk C");
			expect(list("[function[kind.focus-children],[" + HOST + "]]")).toContain("old task");
		});

		it("skips comment and blank lines", function() {
			expect(render("<$text text={{{ [function[kind.focus-rules],[" + HOST + "]count[]] }}}/>")).toBe("3");
		});
	});
});
