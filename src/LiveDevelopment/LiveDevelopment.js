define(function LiveDevelopment(require, exports, module) {
    "use strict";

    var NativeApp            = require("utils/NativeApp"),
        FileUtils           = require("file/FileUtils"),
        ProjectManager       = require("project/ProjectManager"),
        NodeDomain          = require("utils/NodeDomain");


    var _bracketsPath   = FileUtils.getNativeBracketsDirectoryPath(),
        _modulePath     = FileUtils.getNativeModuleDirectoryPath(module),
        _foreverPath     = [_bracketsPath, _modulePath, "node/Forever"].join("/"),
        _forever        = new NodeDomain("forever", _foreverPath);

    var _baseUrl;
    var _running = false;

    function init() {
        _baseUrl = ProjectManager.getProjectRoot().fullPath;
    }
        
    function open() {
        _forever.exec("start", _baseUrl+'/dev/app.js').done(function () {
            _running = true;
            NativeApp.openLiveBrowser(
                'localhost:8000',
                true // enable remote debugging
            );
        });

    }

    function close() {
        _forever.exec("stop").done(function (value) {
            _running = false;
        });

        // $result.fail(function (err) {
        //     // the command failed; act accordingly!
        //     console.log(err);
        // });
    }

    function isRunning() {
        return _running;
    }

    function on() {

    }

    // Export public functions
    exports.open                = open;
    exports.close               = close;
    exports.isRunning           = isRunning;

    exports.init                = init;
    exports.on                  = on;
});
