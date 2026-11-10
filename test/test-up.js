/*\
title: $:/plugins/rimir/kind/test/test-up.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the parent toolbar button: kind.up-target picks the parent to open,
kind.up-actions puts it right above the instance in the story.

\*/
"use strict";

var PREFIX = "$:/test/kind-up/";

function render(text) {
	return $tw.wiki.renderText("text/plain", "text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text);
}

function target(host) {
	return render("<$text text={{{ [function[kind.up-target],[" + host + "]] }}}/>");
}

function invoke(text) {
	var parser = $tw.wiki.parseText("text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text),
		widget = $tw.wiki.makeWidget(parser, {document: $tw.fakeDocument});
	widget.render($tw.fakeDocument.createElement("div"), null);
	widget.invokeActions(widget, null);
}

describe("kind parent button", function() {

	var PARENT = PREFIX + "My Topic", HOST = PREFIX + "Task", story;

	beforeEach(function() {
		story = $tw.wiki.getTiddler("$:/StoryList");
		$tw.wiki.addTiddler({title: PARENT, "kind.type": "ku-topic"});
		$tw.wiki.addTiddler({title: HOST, "kind.type": "ku-task", parent: PARENT});
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

	it("targets the parent of a kind instance (title with spaces)", function() {
		expect(target(HOST)).toBe(PARENT);
	});

	it("takes the first entry of a title-list parent", function() {
		$tw.wiki.addTiddler({title: HOST, "kind.type": "ku-task", parent: "[[" + PARENT + "]] " + PREFIX + "Other"});
		expect(target(HOST)).toBe(PARENT);
	});

	it("has no target without parent, with a missing parent, on itself or on non-instances", function() {
		$tw.wiki.addTiddler({title: PREFIX + "orphan", "kind.type": "ku-task"});
		$tw.wiki.addTiddler({title: PREFIX + "dangling", "kind.type": "ku-task", parent: PREFIX + "gone"});
		$tw.wiki.addTiddler({title: PREFIX + "self", "kind.type": "ku-task", parent: PREFIX + "self"});
		$tw.wiki.addTiddler({title: PREFIX + "node", parent: PARENT});
		$tw.wiki.addTiddler({title: PREFIX + "type", "kind.type": "ku-task", "kind.fields": "[]", parent: PARENT});
		expect(target(PREFIX + "orphan")).toBe("");
		expect(target(PREFIX + "dangling")).toBe("");
		expect(target(PREFIX + "self")).toBe("");
		expect(target(PREFIX + "node")).toBe("");
		expect(target(PREFIX + "type")).toBe("");
	});

	it("opens the parent right above the instance, keeping the rest", function() {
		$tw.wiki.addTiddler({title: "$:/StoryList", list: $tw.utils.stringifyList(["Before", HOST, "After"])});
		invoke("<$transclude $variable=\"kind.up-actions\" host=\"" + HOST + "\"/>");
		expect($tw.wiki.getTiddlerList("$:/StoryList")).toEqual(["Before", PARENT, HOST, "After"]);
	});

	it("moves an already open parent right above the instance", function() {
		$tw.wiki.addTiddler({title: "$:/StoryList", list: $tw.utils.stringifyList(["Before", HOST, "After", PARENT])});
		invoke("<$transclude $variable=\"kind.up-actions\" host=\"" + HOST + "\"/>");
		expect($tw.wiki.getTiddlerList("$:/StoryList")).toEqual(["Before", PARENT, HOST, "After"]);
	});

	it("renders the toolbar button only when there is a parent to open", function() {
		function button(tid) {
			return $tw.wiki.renderText("text/html", "text/vnd.tiddlywiki",
				"<$let currentTiddler=\"" + tid + "\" tv-config-toolbar-text=\"yes\"><$transclude $tiddler=\"$:/plugins/rimir/kind/parent-button\"/></$let>");
		}
		$tw.wiki.addTiddler({title: PREFIX + "orphan", "kind.type": "ku-task"});
		expect(button(HOST)).toContain("Open parent above: " + PARENT);
		expect(button(HOST)).toContain(">parent</span>");
		expect(button(PREFIX + "orphan")).not.toContain("<button");
	});

	it("leaves the story alone when there is no parent", function() {
		$tw.wiki.addTiddler({title: PREFIX + "orphan", "kind.type": "ku-task"});
		$tw.wiki.addTiddler({title: "$:/StoryList", list: $tw.utils.stringifyList(["Before", PREFIX + "orphan"])});
		invoke("<$transclude $variable=\"kind.up-actions\" host=\"" + PREFIX + "orphan\"/>");
		expect($tw.wiki.getTiddlerList("$:/StoryList")).toEqual(["Before", PREFIX + "orphan"]);
	});
});
