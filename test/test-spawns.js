/*\
title: $:/plugins/rimir/kind/test/test-spawns.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for kind.spawns: entry parsing and the prefilled create draft
(kind.gm-create-linked copy=yes), including group expansion.

\*/
"use strict";

var PREFIX = "$:/test/kind-spawns/";
var DRAFT = "$:/state/rimir/kind/graph-modal/draft";

var TYPES = {
	"ks-person": [{key: "caption", typed: "text"}],
	"ks-team": [
		{key: "caption", typed: "text"},
		{key: "members", typed: "ref", cardinality: "multi", "ref-types": ["ks-person"]}
	],
	"ks-jf": [
		{key: "caption", typed: "text"},
		{key: "participants", typed: "ref", cardinality: "multi", "ref-types": ["ks-person", "ks-team"]},
		{key: "location", typed: "text"},
		{key: "cadence", typed: "text"}
	],
	"ks-meeting": [
		{key: "caption", typed: "text", "default": "[get[parent]get[caption]addsuffix[ meeting]]"},
		{key: "parent", typed: "ref", cardinality: "single", "ref-types": ["ks-jf"]},
		{key: "participants", typed: "ref", cardinality: "multi", "ref-types": ["ks-person"]},
		{key: "location", typed: "text"}
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

describe("kind spawns", function() {

	var JF = inst("Weekly");

	beforeEach(function() {
		$tw.utils.each(TYPES, function(fields, key) {
			$tw.wiki.addTiddler({title: typeTid(key), "kind.type": key, "kind.fields": JSON.stringify(fields)});
		});
		$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getTiddler(typeTid("ks-team")), {"kind.group-of": "members"}));
		$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getTiddler(typeTid("ks-jf")), {"kind.spawns": "ks-meeting ks-person:buddy"}));
		["Anna", "Tom", "Eve"].forEach(function(n) {
			$tw.wiki.addTiddler({title: inst(n), "kind.type": "ks-person"});
		});
		$tw.wiki.addTiddler({title: inst("Crew"), "kind.type": "ks-team", members: $tw.utils.stringifyList([inst("Anna"), inst("Tom")])});
		$tw.wiki.addTiddler({title: JF, "kind.type": "ks-jf", caption: "Weekly", location: "Room 4", cadence: "Tue 10:00",
			participants: $tw.utils.stringifyList([inst("Eve"), inst("Crew"), inst("Tom")])});
	});

	afterEach(function() {
		$tw.wiki.filterTiddlers("[prefix[" + PREFIX + "]] [prefix[$:/state/rimir/kind/graph-modal]]").forEach(function(title) {
			$tw.wiki.deleteTiddler(title);
		});
	});

	it("parses kind and link field of each entry", function() {
		expect(list("[function[kind.spawn-entries],[" + typeTid("ks-jf") + "]] :map[function[kind.spawn-kind],<currentTiddler>]")).toBe("ks-meeting ks-person");
		expect(list("[function[kind.spawn-entries],[" + typeTid("ks-jf") + "]] :map[function[kind.spawn-field],<currentTiddler>]")).toBe("parent buddy");
	});

	it("copies shared fields except the link and defaulted ones", function() {
		expect(list("[function[kind.spawn-copy-keys],[" + typeTid("ks-meeting") + "],[" + JF + "],[parent]]")).toBe("participants location");
	});

	it("prefills the draft: link set, groups expanded, defaults applied", function() {
		invoke("<$transclude $variable=\"kind.gm-create-linked\" type-tid=\"" + typeTid("ks-meeting") + "\" host-tid=\"" + JF +
			"\" field-key=\"parent\" dir=\"in\" copy=\"yes\"/>");
		var draft = $tw.wiki.getTiddler(DRAFT).fields;
		expect(draft.parent).toBe(JF);
		expect($tw.wiki.getTiddlerList(DRAFT, "participants")).toEqual([inst("Eve"), inst("Anna"), inst("Tom")]);
		expect(draft.location).toBe("Room 4");
		expect(draft.cadence).toBeUndefined();
		expect(draft.caption).toBe("Weekly meeting");
	});

	it("copies nothing without copy=yes", function() {
		invoke("<$transclude $variable=\"kind.gm-create-linked\" type-tid=\"" + typeTid("ks-meeting") + "\" host-tid=\"" + JF +
			"\" field-key=\"parent\" dir=\"in\"/>");
		expect($tw.wiki.getTiddler(DRAFT).fields.participants).toBeUndefined();
	});
});
