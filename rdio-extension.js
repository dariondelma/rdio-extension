var debug = false;
function log() {
    if (debug) {
	console.log.apply(console, arguments);
    }
}

function track(args) {
    chrome.extension.sendRequest({type: "track", data: args});
}

document.head.addEventListener('DOMNodeInserted', function(event) {
    if (event.target && event.target.text
	&& event.target.text == 'var track = "add-album-to-playlist";') {
	track(['_trackEvent', 'usage', 'menu', 
	       'add-album-to-playlist']);
    }
});

track(["_trackPageview", "/rdio-extension.js"]);

function codeToString(f) {
    args = [];
    log(arguments);
    for (var i = 1; i < arguments.length; ++i) {
	args.push(JSON.stringify(arguments[i]));
    }
    return "(" + f.toString() + ")(" + args.join(",") + ");";
}

function injectedJs() {
    function track(event) {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.text = 'var track = "' + event + '";';
	document.head.appendChild(script);
    }
    jQuery.fn.origAutoSuspenders = jQuery.fn.autoSuspenders;
    jQuery.fn.autoSuspenders = function(data, item) {
	jQuery.fn.currentData = data;
	var result = jQuery.fn.origAutoSuspenders.call(this, data, item);
	delete jQuery.fn.currentData;
	return result;
    };
    jQuery.fn.origSuspenders = jQuery.fn.suspenders;
    jQuery.fn.suspenders = function (item) {
	if (item.menu_items) {
	    var data = jQuery.fn.currentData;
	    item.menu_items.splice(7, 0,
				   {title: "Add Album to Playlist",
				    visible: function() {
					return data.key.indexOf('a') == 0;
				    },
				    action: function() {
					var copy = jQuery.extend(true, {}, data);
					copy.key = data.trackKeys;
					R.Playlists.showAddToPlaylistDialog(copy);
					track('add-album-to-playlist');
					return false;
				    }});
	}
	return jQuery.fn.origSuspenders.call(this, item);
    };
    jQuery.fn.suspenders.defaults = jQuery.fn.origSuspenders.defaults;
    R.Api.origRequest = R.Api.request;
    R.Api.request = function() {
	var args = arguments[0];
	if (args.method == 'addToPlaylist') {
	    var tracks = args.content.tracks;
	    if (tracks.length == 1 && tracks[0] instanceof Array) {
		R.Api.request({method: "addToPlaylist", 
			       content: { playlist: args.content.playlist, 
					  tracks: tracks[0] }, 
			       success: function() { 
			       }});
		return;
	    }
	}
	return R.Api.origRequest.apply(this, arguments);
    };
}

var script = document.createElement("script");
script.type = "text/javascript";
script.text = codeToString(injectedJs);
document.body.appendChild(script);
