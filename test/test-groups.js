/*\
title: $:/plugins/rimir/kind/test/test-groups.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for group kinds (kind.group-of): which fields offer a group, which
members a link adds (engine functions, kind.link-group, schema.groupMembers).

\*/
"use strict";

var schema = require("$:/plugins/rimir/kind/schema.js");

var PREFIX = "$:/test/kind-groups/";

var TYPES = {
	"kg-person": [{key: "caption", typed: "text"}],
	"kg-room": [{key: "caption", typed: "text"}],
	"kg-team": [
		{key: "caption", typed: "text"},
		{key: "members", typed: "ref", cardinality: "multi", "ref-types": ["kg-person", "kg-room"]}
	],
	"kg-meeting": [
		{key: "participants", typed: "ref", cardinality: "multi", "ref-types": ["kg-person"]},
		{key: "audience", typed: "ref", cardinality: "multi", "ref-types": ["kg-person", "kg-team"]},
		{key: "host", typed: "ref", cardinality: "single", "ref-types": ["kg-person"]},
		{key: "anything", typed: "ref", cardinality: "multi"}
	]
};

function typeTid(key) {
	return PREFIX + "type/" + key;
}

function inst(name) {
	return PREFIX + "inst/" + name;
}

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

function def(key) {
	return schema.fieldDef($tw.wiki, "kg-meeting", key);
}

describe("kind groups", function() {

	var TEAM = inst("Team A"), MEETING = inst("Kickoff");

	beforeEach(function() {
		$tw.utils.each(TYPES, function(fields, key) {
			$tw.wiki.addTiddler({title: typeTid(key), "kind.type": key, "kind.fields": JSON.stringify(fields)});
		});
		$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getTiddler(typeTid("kg-team")), {"kind.group-of": "members"}));
		["Anna", "Tom"].forEach(function(n) {
			$tw.wiki.addTiddler({title: inst(n), "kind.type": "kg-person"});
		});
		$tw.wiki.addTiddler({title: inst("Room 1"), "kind.type": "kg-room"});
		$tw.wiki.addTiddler({title: TEAM, "kind.type": "kg-team",
			members: $tw.utils.stringifyList([inst("Anna"), inst("Room 1"), inst("Tom")])});
		$tw.wiki.addTiddler({title: MEETING, "kind.type": "kg-meeting", participants: $tw.utils.stringifyList([inst("Tom")])});
	});

	afterEach(function() {
		$tw.wiki.filterTiddlers("[prefix[" + PREFIX + "]]").forEach(function(title) {
			$tw.wiki.deleteTiddler(title);
		});
	});

	it("offers groups only on multi fields that take the members but not the group kind", function() {
		var m = typeTid("kg-meeting");
		expect(list("[function[kind.ref-group-candidates],[" + m + "],[participants]]")).toBe("[[" + TEAM + "]]");
		expect(list("[function[kind.ref-group-candidates],[" + m + "],[audience]]")).toBe("");
		expect(list("[function[kind.ref-group-candidates],[" + m + "],[host]]")).toBe("");
		expect(list("[function[kind.ref-group-candidates],[" + m + "],[anything]]")).toBe("");
		expect(list("[function[kind.ref-candidates],[" + m + "],[participants]]")).not.toContain("Team A");
	});

	it("resolves the members the field accepts", function() {
		expect(list("[function[kind.group-members-for],[" + typeTid("kg-meeting") + "],[participants],[" + TEAM + "]]")).toBe(
			$tw.utils.stringifyList([inst("Anna"), inst("Tom")]));
		expect(list("[function[kind.group-member-note],[" + typeTid("kg-meeting") + "],[participants],[" + TEAM + "]]")).toBe("[[2 members]]");
	});

	it("links the members, not the group, without duplicates", function() {
		invoke("<$transclude $variable=\"kind.link-group\" type-tid=\"" + typeTid("kg-meeting") + "\" target-tid=\"" + MEETING +
			"\" field-key=\"participants\" group=\"" + TEAM + "\"/>");
		expect($tw.wiki.getTiddlerList(MEETING, "participants")).toEqual([inst("Tom"), inst("Anna")]);
	});

	it("schema.groupMembers follows the same rule", function() {
		expect(schema.groupMembers($tw.wiki, def("participants"), TEAM)).toEqual([inst("Anna"), inst("Tom")]);
		expect(schema.groupMembers($tw.wiki, def("audience"), TEAM)).toBeNull();
		expect(schema.groupMembers($tw.wiki, def("host"), TEAM)).toBeNull();
		expect(schema.groupMembers($tw.wiki, def("participants"), inst("Anna"))).toBeNull();
		expect(schema.accepts($tw.wiki, def("participants"), TEAM)).toBe(false);
	});
});
