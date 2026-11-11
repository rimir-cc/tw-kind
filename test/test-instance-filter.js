/*\
title: $:/plugins/rimir/kind/test/test-instance-filter.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the wiki-level instance filter ($:/config/rimir/kind/instance-filter
+ /apply-to) on kind's instance lists: ref pickers, group candidates, palette
keep-linked lists, cockpit incoming rows, overview — and that linked values
stay visible.

\*/
"use strict";

var PREFIX = "$:/test/kind-if/";
var CFG = "$:/config/rimir/kind/instance-filter";
var APPLY = "$:/config/rimir/kind/instance-filter/apply-to";
var GLOBAL = PREFIX + "globals";

function render(text, globals) {
	var head = "\\import $:/plugins/rimir/kind/engine\n";
	if(globals) {
		// what the page template does: import $:/tags/Global (+ Macro) tiddlers
		head = "\\import [subfilter{$:/core/config/GlobalImportFilter}]\n" + head;
	}
	return $tw.wiki.renderText("text/plain", "text/vnd.tiddlywiki", head + text);
}

function list(filter, globals) {
	return render("<$text text={{{ " + filter + " +[sort[]join[|]] }}}/>", globals);
}

function t(name) {
	return PREFIX + name;
}

describe("kind instance filter", function() {

	var TASK = "[function[kind.ref-candidates],[" + t("type/if-task") + "],[parent]]";

	beforeEach(function() {
		$tw.wiki.addTiddler({title: t("type/if-topic"), "kind.type": "if-topic", "kind.fields": "[]"});
		$tw.wiki.addTiddler({title: t("type/if-person"), "kind.type": "if-person", "kind.fields": "[]"});
		$tw.wiki.addTiddler({title: t("type/if-team"), "kind.type": "if-team", "kind.group-of": "members",
			"kind.fields": JSON.stringify([{key: "members", typed: "ref", cardinality: "multi", "ref-types": ["if-person"]}])});
		$tw.wiki.addTiddler({title: t("type/if-task"), "kind.type": "if-task", "kind.fields": JSON.stringify([
			{key: "parent", typed: "ref", cardinality: "single", "ref-types": ["if-topic"]},
			{key: "people", typed: "ref", cardinality: "multi", "ref-types": ["if-person"]}
		])});
		$tw.wiki.addTiddler({title: t("Live"), "kind.type": "if-topic"});
		$tw.wiki.addTiddler({title: t("Old"), "kind.type": "if-topic", status: "archived"});
		$tw.wiki.addTiddler({title: t("Anna"), "kind.type": "if-person"});
		$tw.wiki.addTiddler({title: t("Team A"), "kind.type": "if-team", members: t("Anna")});
		$tw.wiki.addTiddler({title: t("Team B"), "kind.type": "if-team", members: t("Anna"), status: "archived"});
		$tw.wiki.addTiddler({title: t("Task"), "kind.type": "if-task", parent: t("Old")});
		$tw.wiki.addTiddler({title: t("Task 2"), "kind.type": "if-task", parent: t("Live")});
	});

	afterEach(function() {
		$tw.wiki.filterTiddlers("[prefix[" + PREFIX + "]]").forEach(function(title) {
			$tw.wiki.deleteTiddler(title);
		});
		$tw.wiki.deleteTiddler(CFG);
		$tw.wiki.deleteTiddler(APPLY);
	});

	it("without the config tiddler changes nothing", function() {
		expect(list(TASK)).toBe(t("Live") + "|" + t("Old"));
		expect(list("[[a]] [[b]] +[function[kind.visible],[pickers]]")).toBe("a|b");
	});

	it("an empty config tiddler changes nothing", function() {
		$tw.wiki.addTiddler({title: CFG, text: "  \n"});
		expect(list(TASK)).toBe(t("Live") + "|" + t("Old"));
	});

	describe("with [!status[archived]]", function() {

		beforeEach(function() {
			$tw.wiki.addTiddler({title: CFG, text: "[!status[archived]]"});
		});

		it("drops archived instances from ref pickers and group candidates", function() {
			expect(list(TASK)).toBe(t("Live"));
			expect(list("[function[kind.ref-group-candidates],[" + t("type/if-task") + "],[people]]")).toBe(t("Team A"));
			expect(list("[function[kind.ref-candidates-all],[" + t("type/if-task") + "],[parent]]")).toBe(t("Live") + "|" + t("Old"));
		});

		it("keeps an already linked archived value in the palette lists and the editor pill", function() {
			expect(list("[function[kind.ref-candidates-keep],[" + t("type/if-task") + "],[parent],[" + t("Task") + "]]")).toBe(t("Live") + "|" + t("Old"));
			expect(list("[function[kind.ref-candidates-keep],[" + t("type/if-task") + "],[parent],[" + t("Task 2") + "]]")).toBe(t("Live"));
			var html = render("<$let type-tid=\"" + t("type/if-task") + "\" target-tid=\"" + t("Task") + "\" field-key=\"parent\"><$transclude $tiddler=\"$:/plugins/rimir/kind/field-input\"/></$let>");
			expect(html).toContain(t("Old"));
		});

		it("applies to the surfaces named in apply-to only (shipped: pickers)", function() {
			var incoming = "[function[kind.cockpit-incoming],[" + t("Old") + "],[" + t("type/if-task") + "],[parent]]";
			expect(list(incoming)).toBe(t("Task"));
			expect(list("[[" + t("Old") + "]] +[function[kind.visible],[overview]]")).toBe(t("Old"));
			$tw.wiki.addTiddler({title: APPLY, text: "cockpit overview"});
			$tw.wiki.addTiddler({title: t("Task"), "kind.type": "if-task", parent: t("Old"), status: "archived"});
			expect(list(incoming)).toBe("");
			expect(list("[[" + t("Old") + "]] +[function[kind.visible],[overview]]")).toBe("");
			expect(list(TASK)).toBe(t("Live") + "|" + t("Old"));
		});
	});

	it("settings offer the filter and one checkbox per surface", function() {
		var html = $tw.wiki.renderTiddler("text/html", "$:/plugins/rimir/kind/settings");
		expect(html).toContain("Instance filter");
		expect((html.match(/type="checkbox"/g) || []).length).toBeGreaterThan(3);
		var row = html.slice(html.indexOf("Applies to:"));
		expect(row.match(/<input checked="true" type="checkbox"><span>pickers/)).not.toBeNull();
		expect(row.match(/<input type="checkbox"><span>cockpit/)).not.toBeNull();
		expect(row.match(/<input type="checkbox"><span>overview/)).not.toBeNull();
	});

	it("runs a filter that calls a $:/tags/Global function", function() {
		// the FAQ example: archived, or below an archived parent
		$tw.wiki.addTiddler({title: GLOBAL, tags: "$:/tags/Global", text: "\\function if.live() [!status[archived]] :filter[get[parent]status[archived]count[]match[0]]\n"});
		$tw.wiki.addTiddler({title: t("Sub"), "kind.type": "if-topic", parent: t("Old")});
		$tw.wiki.addTiddler({title: t("Sub live"), "kind.type": "if-topic", parent: t("Live")});
		$tw.wiki.addTiddler({title: CFG, text: "[if.live[]]"});
		expect(list(TASK, true)).toBe(t("Live") + "|" + t("Sub live"));
	});
});
