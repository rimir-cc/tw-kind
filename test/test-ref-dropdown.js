/*\
title: $:/plugins/rimir/kind/test/test-ref-dropdown.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the ref field dropdown of field-input: one entry list
(kind.ref-menu: candidates, then groups), keyboard handling (kind.ref-key:
ArrowDown / ArrowUp / Enter / Escape) and the shared pick (kind.ref-pick).

\*/
"use strict";

var PREFIX = "$:/test/kind-rd/";
var SEARCH = PREFIX + "search";
var HI = SEARCH + "/hi";

function t(name) {
	return PREFIX + name;
}

function render(text) {
	return $tw.wiki.renderText("text/plain", "text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text);
}

function invoke(text) {
	var parser = $tw.wiki.parseText("text/vnd.tiddlywiki", "\\import $:/plugins/rimir/kind/engine\n" + text),
		widget = $tw.wiki.makeWidget(parser, {document: $tw.fakeDocument});
	widget.render($tw.fakeDocument.createElement("div"), null);
	widget.invokeActions(widget, null);
}

function key(target, field, k, prefix) {
	invoke((prefix || "") + "<$transclude $variable=\"kind.ref-key\" type-tid=\"" + t("type/rd-task") + "\" target-tid=\"" + target +
		"\" field-key=\"" + field + "\" search-state=\"" + SEARCH + "\" key=\"" + k + "\"/>");
}

function menuOf(field) {
	return render("<$text text={{{ [function[kind.ref-menu],[" + t("type/rd-task") + "],[" + field + "],[Ann]] +[join[|]] }}}/>").split("|");
}

function text(title) {
	return $tw.wiki.getTiddlerText(title, "");
}

describe("kind ref dropdown", function() {

	beforeEach(function() {
		$tw.wiki.addTiddler({title: t("type/rd-person"), "kind.type": "rd-person", "kind.fields": "[]"});
		$tw.wiki.addTiddler({title: t("type/rd-team"), "kind.type": "rd-team", "kind.group-of": "members",
			"kind.fields": JSON.stringify([{key: "members", typed: "ref", cardinality: "multi", "ref-types": ["rd-person"]}])});
		$tw.wiki.addTiddler({title: t("type/rd-task"), "kind.type": "rd-task", "kind.fields": JSON.stringify([
			{key: "owner", typed: "ref", cardinality: "single", "ref-types": ["rd-person"]},
			{key: "people", typed: "ref", cardinality: "multi", "ref-types": ["rd-person"]}
		])});
		$tw.wiki.addTiddler({title: t("Anna"), "kind.type": "rd-person"});
		$tw.wiki.addTiddler({title: t("Ann-Kathrin"), "kind.type": "rd-person"});
		$tw.wiki.addTiddler({title: t("Ben"), "kind.type": "rd-person"});
		$tw.wiki.addTiddler({title: t("Annex team"), "kind.type": "rd-team", members: "[[" + t("Ben") + "]]"});
		$tw.wiki.addTiddler({title: t("Task"), "kind.type": "rd-task"});
	});

	afterEach(function() {
		$tw.wiki.filterTiddlers("[prefix[" + PREFIX + "]]").forEach(function(title) {
			$tw.wiki.deleteTiddler(title);
		});
	});

	it("lists candidates first, then groups (multi fields only)", function() {
		var menu = function(field) {
			return render("<$text text={{{ [function[kind.ref-menu],[" + t("type/rd-task") + "],[" + field + "],[Ann]] +[join[|]] }}}/>");
		};
		var people = menu("people").split("|"), owner = menu("owner").split("|");
		expect(people.length).toBe(3);
		expect(people.slice(0, 2).sort()).toEqual([t("Ann-Kathrin"), t("Anna")].sort());
		expect(people[2]).toBe(t("Annex team"));
		expect(owner.sort()).toEqual([t("Ann-Kathrin"), t("Anna")].sort());
	});

	it("moves the highlight with ArrowDown / ArrowUp, clamped to the list", function() {
		$tw.wiki.addTiddler({title: SEARCH, text: "Ann"});
		key(t("Task"), "owner", "ArrowUp");
		expect(text(HI)).toBe("1");
		key(t("Task"), "owner", "ArrowDown");
		key(t("Task"), "owner", "ArrowDown");
		key(t("Task"), "owner", "ArrowDown");
		expect(text(HI)).toBe("2");
		key(t("Task"), "owner", "ArrowUp");
		expect(text(HI)).toBe("1");
	});

	it("Enter links the highlighted entry and closes the search", function() {
		$tw.wiki.addTiddler({title: SEARCH, text: "Ann"});
		$tw.wiki.addTiddler({title: HI, text: "2"});
		key(t("Task"), "owner", "Enter");
		expect($tw.wiki.getTiddler(t("Task")).fields.owner).toBe(menuOf("owner")[1]);
		expect($tw.wiki.tiddlerExists(SEARCH)).toBe(false);
		expect($tw.wiki.tiddlerExists(HI)).toBe(false);
	});

	it("Enter without a highlight takes the first entry; on a group it adds the members", function() {
		$tw.wiki.addTiddler({title: SEARCH, text: "Ann"});
		key(t("Task"), "people", "Enter");
		var first = menuOf("people")[0];
		expect($tw.wiki.getTiddlerList(t("Task"), "people")).toEqual([first]);
		$tw.wiki.addTiddler({title: SEARCH, text: "Ann"});
		$tw.wiki.addTiddler({title: HI, text: "3"});
		key(t("Task"), "people", "Enter");
		expect($tw.wiki.getTiddlerList(t("Task"), "people")).toEqual([first, t("Ben")]);
	});

	it("does nothing on an empty search except Escape, which runs kind.esc-outer", function() {
		key(t("Task"), "owner", "Enter");
		key(t("Task"), "owner", "ArrowDown");
		expect($tw.wiki.getTiddler(t("Task")).fields.owner).toBeUndefined();
		expect($tw.wiki.tiddlerExists(HI)).toBe(false);
		key(t("Task"), "owner", "Escape", "\\procedure kind.esc-outer() <$action-setfield $tiddler=\"" + t("closed") + "\" text=\"yes\"/>\n");
		expect(text(t("closed"))).toBe("yes");
	});

	it("Escape on a search clears it and does not run kind.esc-outer", function() {
		$tw.wiki.addTiddler({title: SEARCH, text: "Ann"});
		$tw.wiki.addTiddler({title: HI, text: "1"});
		key(t("Task"), "owner", "Escape", "\\procedure kind.esc-outer() <$action-setfield $tiddler=\"" + t("closed") + "\" text=\"yes\"/>\n");
		expect($tw.wiki.tiddlerExists(SEARCH)).toBe(false);
		expect($tw.wiki.tiddlerExists(HI)).toBe(false);
		expect($tw.wiki.tiddlerExists(t("closed"))).toBe(false);
	});

	it("renders the highlighted row with kind-dropdown-hi", function() {
		var state = "$:/state/rimir/kind/ta/" + t("Task") + "/people";
		$tw.wiki.addTiddler({title: state, text: "Ann"});
		$tw.wiki.addTiddler({title: state + "/hi", text: "3"});
		var html = $tw.wiki.renderText("text/html", "text/vnd.tiddlywiki",
			"\\import $:/plugins/rimir/kind/engine\n<$let type-tid=\"" + t("type/rd-task") + "\" target-tid=\"" + t("Task") + "\" field-key=\"people\"><$transclude $tiddler=\"$:/plugins/rimir/kind/field-input\"/></$let>");
		$tw.wiki.deleteTiddler(state);
		$tw.wiki.deleteTiddler(state + "/hi");
		var rows = html.split("kind-dropdown-item").slice(1);
		expect(rows.length).toBe(3);
		expect(rows[2]).toContain("kind-dropdown-hi");
		expect(rows[2]).toContain("kind-dropdown-group");
		expect(rows[0]).not.toContain("kind-dropdown-hi");
	});
});
