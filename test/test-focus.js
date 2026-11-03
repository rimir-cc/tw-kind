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
});
