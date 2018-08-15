/*
 * Copyright (c) 2012 - present Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*global less */

/**
 * main integrates LiveDevelopment into Brackets
 *
 * This module creates two menu items:
 *
 *  "Go Live": open or close a Live Development session and visualize the status
 *  "Highlight": toggle source highlighting
 */
define(function main(require, exports, module) {
    "use strict";

    var DocumentManager     = require("document/DocumentManager"),
        Commands            = require("command/Commands"),
        AppInit             = require("utils/AppInit"),
        LiveDevelopment     = require("LiveDevelopment/LiveDevelopment"),
        Inspector           = require("LiveDevelopment/Inspector/Inspector"),
        CommandManager      = require("command/CommandManager"),
        PreferencesManager  = require("preferences/PreferencesManager"),
        Dialogs             = require("widgets/Dialogs"),
        DefaultDialogs      = require("widgets/DefaultDialogs"),
        UrlParams           = require("utils/UrlParams").UrlParams,
        Strings             = require("strings"),
        ExtensionUtils      = require("utils/ExtensionUtils"),
        StringUtils         = require("utils/StringUtils");

    var params = new UrlParams();
    var config = {
        experimental: false, // enable experimental features
        debug: true, // enable debug output and helpers
        autoconnect: false, // go live automatically after startup?
        highlight: true, // enable highlighting?
        highlightConfig: { // the highlight configuration for the Inspector
            borderColor:  {r: 255, g: 229, b: 153, a: 0.66},
            contentColor: {r: 111, g: 168, b: 220, a: 0.55},
            marginColor:  {r: 246, g: 178, b: 107, a: 0.66},
            paddingColor: {r: 147, g: 196, b: 125, a: 0.66},
            showInfo: true
        }
    };
    // Status labels/styles are ordered: error, not connected, progress1, progress2, connected.
    var _status = [
        { tooltip: Strings.LIVE_DEV_STATUS_TIP_NOT_CONNECTED, style: "warning" },
        { tooltip: Strings.LIVE_DEV_STATUS_TIP_NOT_CONNECTED, style: "" },
        { tooltip: Strings.LIVE_DEV_STATUS_TIP_PROGRESS1, style: "info" },
        { tooltip: Strings.LIVE_DEV_STATUS_TIP_CONNECTED, style: "success" },
        { tooltip: Strings.LIVE_DEV_STATUS_TIP_OUT_OF_SYNC, style: "out-of-sync" },
        { tooltip: Strings.LIVE_DEV_STATUS_TIP_SYNC_ERROR, style: "sync-error" },
        { tooltip: Strings.LIVE_DEV_STATUS_TIP_PROGRESS1, style: "info" },
        { tooltip: Strings.LIVE_DEV_STATUS_TIP_PROGRESS1, style: "info" }
    ];
    var _allStatusStyles = ["warning", "info", "success", "out-of-sync", "sync-error"].join(" ");

    var _$btnGoLive; // reference to the GoLive button

    // "livedev.multibrowser" preference
    var prefs = PreferencesManager.getExtensionPrefs("livedev");

    // "livedev.remoteHighlight" preference
    var PREF_REMOTEHIGHLIGHT = "remoteHighlight";
    var remoteHighlightPref = prefs.definePreference(PREF_REMOTEHIGHLIGHT, "object", {
        animateStartValue: {
            "background-color": "rgba(0, 162, 255, 0.5)",
            "opacity": 0
        },
        animateEndValue: {
            "background-color": "rgba(0, 162, 255, 0)",
            "opacity": 0.6
        },
        "paddingStyling": {
            "border-width": "1px",
            "border-style": "dashed",
            "border-color": "rgba(0, 162, 255, 0.5)"
        },
        "marginStyling": {
            "background-color": "rgba(21, 165, 255, 0.58)"
        },
        "borderColor": "rgba(21, 165, 255, 0.85)",
        "showPaddingMargin": true
    }, {
        description: Strings.DESCRIPTION_LIVE_DEV_HIGHLIGHT_SETTINGS
    });
    
    /** Toggles or sets the preference **/
    function _togglePref(key, value) {
        var val,
            oldPref = !!prefs.get(key);

        if (value === undefined) {
            val = !oldPref;
        } else {
            val = !!value;
        }

        // update menu
        if (val !== oldPref) {
            prefs.set(key, val);
        }

        return val;
    }

    /**
     * Change the appearance of a button. Omit text to remove any extra text; omit style to return to default styling;
     * omit tooltip to leave tooltip unchanged.
     */
    function _setLabel($btn, text, style, tooltip) {
        // Clear text/styles from previous status
        $("span", $btn).remove();
        $btn.removeClass(_allStatusStyles);

        // Set text/styles for new status
        if (text && text.length > 0) {
            $("<span class=\"label\">")
                .addClass(style)
                .text(text)
                .appendTo($btn);
        } else {
            $btn.addClass(style);
        }

        if (tooltip) {
            $btn.attr("title", tooltip);
        }
    }

    /**
     * Toggles LiveDevelopment and synchronizes the state of UI elements that reports LiveDevelopment status
     *
     * Stop Live Dev when in an active state (ACTIVE, OUT_OF_SYNC, SYNC_ERROR).
     * Start Live Dev when in an inactive state (ERROR, INACTIVE).
     * Do nothing when in a connecting state (CONNECTING, LOADING_AGENTS).
     */
    function _handleGoLiveCommand() {
        if(!LiveDevelopment.isRunning()){
            LiveDevelopment.open();
            _setLabel(_$btnGoLive, null, _status[3].style, _status[3].tooltip);
        } else{
            LiveDevelopment.close();
            _setLabel(_$btnGoLive, null, _status[1].style, _status[1].tooltip);
        }
    }

    /** Called on status change */
    function _showStatusChangeReason(reason) {
        // Destroy the previous twipsy (options are not updated otherwise)
        _$btnGoLive.twipsy("hide").removeData("twipsy");

        // If there was no reason or the action was an explicit request by the user, don't show a twipsy
        if (!reason || reason === "explicit_close") {
            return;
        }

        // Translate the reason
        var translatedReason = Strings["LIVE_DEV_" + reason.toUpperCase()];
        if (!translatedReason) {
            translatedReason = StringUtils.format(Strings.LIVE_DEV_CLOSED_UNKNOWN_REASON, reason);
        }

        // Configure the twipsy
        var options = {
            placement: "left",
            trigger: "manual",
            autoHideDelay: 5000,
            title: function () {
                return translatedReason;
            }
        };

        // Show the twipsy with the explanation
        _$btnGoLive.twipsy(options).twipsy("show");
    }

    /** Create the menu item "Go Live" */
    function _setupGoLiveButton() {
        if (!_$btnGoLive) {
            _$btnGoLive = $("#toolbar-go-live");
            _$btnGoLive.click(function onGoLive() {
                _handleGoLiveCommand();
            });
        }
    }

    /** Maintains state of the Live Preview menu item */
    function _setupGoLiveMenu() {
    }

    function _updateHighlightCheckmark() {
        CommandManager.get(Commands.FILE_LIVE_HIGHLIGHT).setChecked(config.highlight);
    }

    function _handlePreviewHighlightCommand() {
        config.highlight = !config.highlight;
        _updateHighlightCheckmark();
        PreferencesManager.setViewState("livedev.highlight", config.highlight);
    }

    /** force reload the live preview */
    function _handleReloadLivePreviewCommand() {
        if (LiveDevelopment.status >= LiveDevelopment.STATUS_ACTIVE) {
            LiveDevelopment.reload();
        }
    }

    /** Initialize LiveDevelopment */
    AppInit.appReady(function () {
        params.parse();
        config.remoteHighlight = prefs.get(PREF_REMOTEHIGHLIGHT);

        Inspector.init(config);
        LiveDevelopment.init(config);

        _updateHighlightCheckmark();
        _setupGoLiveButton();
        _setupGoLiveMenu();
    });

    // init prefs
    PreferencesManager.stateManager.definePreference("livedev.highlight", "boolean", true)
        .on("change", function () {
            config.highlight = PreferencesManager.getViewState("livedev.highlight");
            _updateHighlightCheckmark();
        });

    config.highlight = PreferencesManager.getViewState("livedev.highlight");

    // init commands
    CommandManager.register(Strings.CMD_LIVE_FILE_PREVIEW,  Commands.FILE_LIVE_FILE_PREVIEW, _handleGoLiveCommand);
    CommandManager.register(Strings.CMD_LIVE_HIGHLIGHT, Commands.FILE_LIVE_HIGHLIGHT, _handlePreviewHighlightCommand);
    CommandManager.register(Strings.CMD_RELOAD_LIVE_PREVIEW, Commands.CMD_RELOAD_LIVE_PREVIEW, _handleReloadLivePreviewCommand);

    CommandManager.get(Commands.FILE_LIVE_HIGHLIGHT).setEnabled(false);

    // Export public functions
});
