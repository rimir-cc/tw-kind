/*\
title: $:/plugins/rimir/kind/test/test-date-input.js
type: application/javascript
tags: [[$:/tags/test-spec]]

The date/datetime inputs of field-input hand the right storage format to the
datepicker's $edit-date: date = YYYYMMDD (8 chars, like the cascade palette),
datetime = the datepicker default (17-char TW timestamp). The kixam datepicker
is not loaded in the test edition, so a stub edit-date records its attributes.

\*/
"use strict";

var PREFIX = "$:/test/kind-date/";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

// Stand-in for kixam's edit-date: records the attributes it is given
var seen = [];
function StubEditDate(parseTreeNode, options) {
	this.initialise(parseTreeNode, options);
}
StubEditDate.prototype = new Widget();
StubEditDate.prototype.render = function(parent, nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	seen.push($tw.utils.extend({}, this.attributes));
};

function editDateAttributes(fieldKey) {
	seen = [];
	var parser = $tw.wiki.parseText("text/vnd.tiddlywiki",
			"<$let type-tid=\"" + PREFIX + "type\" target-tid=\"" + PREFIX + "inst\" field-key=\"" + fieldKey + "\"><$transclude $tiddler=\"$:/plugins/rimir/kind/field-input\"/></$let>"),
		widget = $tw.wiki.makeWidget(parser, {document: $tw.fakeDocument});
	widget.render($tw.fakeDocument.createElement("div"), null);
	return seen.length === 1 ? seen[0] : null;
}

describe("kind date inputs", function() {

	var original;

	beforeEach(function() {
		original = Widget.prototype.widgetClasses["edit-date"];
		Widget.prototype.widgetClasses["edit-date"] = StubEditDate;
		$tw.wiki.addTiddler({title: PREFIX + "type", "kind.type": "kd-thing", "kind.fields": JSON.stringify([
			{key: "due", typed: "date"},
			{key: "at", typed: "datetime"}
		])});
		$tw.wiki.addTiddler({title: PREFIX + "inst", "kind.type": "kd-thing", due: "20261111"});
	});

	afterEach(function() {
		if(original) {
			Widget.prototype.widgetClasses["edit-date"] = original;
		} else {
			delete Widget.prototype.widgetClasses["edit-date"];
		}
		$tw.wiki.filterTiddlers("[prefix[" + PREFIX + "]]").forEach(function(title) {
			$tw.wiki.deleteTiddler(title);
		});
	});

	it("saves a date as YYYYMMDD", function() {
		var attrs = editDateAttributes("due");
		expect(attrs).not.toBeNull();
		expect(attrs.fieldFormat).toBe("YYYYMMDD");
		expect(attrs.showTime).toBeUndefined();
	});

	it("leaves a datetime at the datepicker's 17-char default", function() {
		var attrs = editDateAttributes("at");
		expect(attrs).not.toBeNull();
		expect(attrs.fieldFormat).toBeUndefined();
		expect(attrs.showTime).toBe("yes");
	});
});
