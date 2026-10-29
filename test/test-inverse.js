/*\
title: $:/plugins/rimir/kind/test/test-inverse.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for inverse ref fields (inverse.js), on a private wiki with the change
listener attached the same way inverse-startup.js does it.

\*/
"use strict";

var InverseSync = require("$:/plugins/rimir/kind/inverse.js").InverseSync;

var CONVERSATION = [
	{key: "participants", typed: "ref", cardinality: "multi", "ref-types": ["person"], inverse: "conversations"},
	{key: "lead", typed: "ref", cardinality: "single", "ref-types": ["person"], inverse: "leads"}
];
var PERSON = [
	{key: "conversations", typed: "ref", cardinality: "multi", "ref-types": ["conversation"], inverse: "participants"},
	{key: "leads", typed: "ref", cardinality: "multi", "ref-types": ["conversation"]}
];

// Change events are dispatched on nextTick; mirrored writes cause another round
function settle(done) {
	setTimeout(function() { setTimeout(function() { setTimeout(done, 0); }, 0); }, 0);
}

describe("kind inverse ref fields", function() {

	var wiki;

	function type(key, fields) {
		wiki.addTiddler({title: "type/" + key, "kind.type": key, "kind.fields": JSON.stringify(fields)});
	}
	function get(title, field) {
		return wiki.getTiddler(title).fields[field];
	}
	function list(title, field) {
		return wiki.getTiddlerList(title, field);
	}

	beforeEach(function(done) {
		wiki = new $tw.Wiki();
		type("conversation", CONVERSATION);
		type("person", PERSON);
		wiki.addTiddler({title: "Anna Berger", "kind.type": "person"});
		wiki.addTiddler({title: "Tom Weiss", "kind.type": "person", conversations: "Old"});
		wiki.addTiddler({title: "Budget", "kind.type": "conversation"});
		var sync = new InverseSync(wiki);
		wiki.addEventListener("change", function(changes) { sync.handleChanges(changes); });
		settle(done);
	});

	it("adds the source to the target's inverse field", function(done) {
		wiki.addTiddler(new $tw.Tiddler(wiki.getTiddler("Budget"), {participants: "[[Anna Berger]] [[Tom Weiss]]"}));
		settle(function() {
			expect(list("Anna Berger", "conversations")).toEqual(["Budget"]);
			expect(list("Tom Weiss", "conversations")).toEqual(["Old", "Budget"]);
			done();
		});
	});

	it("removes the source again when the link goes", function(done) {
		wiki.addTiddler(new $tw.Tiddler(wiki.getTiddler("Budget"), {participants: "[[Anna Berger]] [[Tom Weiss]]"}));
		settle(function() {
			wiki.addTiddler(new $tw.Tiddler(wiki.getTiddler("Budget"), {participants: "[[Tom Weiss]]"}));
			settle(function() {
				expect(list("Anna Berger", "conversations")).toEqual([]);
				expect(list("Tom Weiss", "conversations")).toEqual(["Old", "Budget"]);
				done();
			});
		});
	});

	it("works from the other end of a two-way pair without echoing", function(done) {
		wiki.addTiddler(new $tw.Tiddler(wiki.getTiddler("Anna Berger"), {conversations: "Budget"}));
		settle(function() {
			expect(list("Budget", "participants")).toEqual(["Anna Berger"]);
			expect(list("Anna Berger", "conversations")).toEqual(["Budget"]);
			done();
		});
	});

	it("moves a single-valued link to the new target", function(done) {
		wiki.addTiddler(new $tw.Tiddler(wiki.getTiddler("Budget"), {lead: "Anna Berger"}));
		settle(function() {
			expect(list("Anna Berger", "leads")).toEqual(["Budget"]);
			wiki.addTiddler(new $tw.Tiddler(wiki.getTiddler("Budget"), {lead: "Tom Weiss"}));
			settle(function() {
				expect(list("Anna Berger", "leads")).toEqual([]);
				expect(list("Tom Weiss", "leads")).toEqual(["Budget"]);
				done();
			});
		});
	});

	it("keeps titles with spaces whole in single-valued fields", function(done) {
		wiki.addTiddler(new $tw.Tiddler(wiki.getTiddler("Budget"), {lead: "Anna Berger"}));
		settle(function() {
			expect(get("Anna Berger", "leads")).toBe("Budget");
			expect(wiki.getTiddler("Anna")).toBeUndefined();
			done();
		});
	});

	it("releases the targets when the source is deleted", function(done) {
		wiki.addTiddler(new $tw.Tiddler(wiki.getTiddler("Budget"), {participants: "[[Anna Berger]]"}));
		settle(function() {
			wiki.deleteTiddler("Budget");
			settle(function() {
				expect(list("Anna Berger", "conversations")).toEqual([]);
				done();
			});
		});
	});

	it("does not touch targets whose type lacks the inverse field", function(done) {
		wiki.addTiddler({title: "Note", "kind.type": "note"});
		wiki.addTiddler(new $tw.Tiddler(wiki.getTiddler("Budget"), {participants: "Note"}));
		settle(function() {
			expect(get("Note", "conversations")).toBeUndefined();
			done();
		});
	});

	it("ignores drafts until they are saved", function(done) {
		wiki.addTiddler({title: "Draft of 'Budget'", "draft.of": "Budget", "kind.type": "conversation", participants: "[[Anna Berger]]"});
		settle(function() {
			expect(get("Anna Berger", "conversations")).toBeUndefined();
			done();
		});
	});

	it("does not write to existing data when a type gains an inverse", function(done) {
		wiki.addTiddler({title: "Retro", "kind.type": "conversation", participants: "[[Anna Berger]]"});
		settle(function() {
			var before = list("Anna Berger", "conversations").slice(0);
			type("conversation", CONVERSATION.concat([{key: "extra", typed: "ref", inverse: "x"}]));
			settle(function() {
				expect(list("Anna Berger", "conversations")).toEqual(before);
				done();
			});
		});
	});
});
