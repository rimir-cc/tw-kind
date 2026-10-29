/*\
title: $:/plugins/rimir/kind/inverse-startup.js
type: application/javascript
module-type: startup

Keeps `inverse` ref fields in sync (see inverse.js). Browser only: the server
receives the mirrored writes through the normal sync, so running it there too
would only race the browser for the same edits.

\*/

"use strict";

exports.name = "kind-inverse";
exports.platforms = ["browser"];
exports.after = ["startup"];
exports.synchronous = true;

exports.startup = function() {
	var InverseSync = require("$:/plugins/rimir/kind/inverse.js").InverseSync,
		sync = new InverseSync($tw.wiki);
	$tw.wiki.addEventListener("change", function(changes) {
		sync.handleChanges(changes);
	});
};
