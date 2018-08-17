define(function LiveDevelopment(require, exports, module) {
    "use strict";

    var NativeApp            = require("utils/NativeApp"),
        FileUtils           = require("file/FileUtils"),
        ProjectManager       = require("project/ProjectManager"),
        NodeDomain          = require("utils/NodeDomain");


    var _bracketsPath   = FileUtils.getNativeBracketsDirectoryPath(),
        _modulePath     = FileUtils.getNativeModuleDirectoryPath(module),
        _npmPath        = [_bracketsPath, _modulePath, "Node/npm"].join("/"),
        _npm            = new NodeDomain("NPM", _npmPath);

    var _baseUrl;
    var _running = false;

    function init() {
        _baseUrl = ProjectManager.getProjectRoot().fullPath;
    }
        
    function open() {
        _npm.exec("start", _baseUrl).done(function (err) {
            _running = true;

            setTimeout(function(){
                NativeApp.openLiveBrowser(
                    'localhost:8000',
                    true // enable remote debugging
                );
            }, 2000)
        });
    }

    function close() {
        _npm.exec("stop", _baseUrl).done(function (err) {
            _running = false;
        });
    }

    function isRunning() {
        return _running;
    }

    function on() {}

    // Export public functions
    exports.open                = open;
    exports.close               = close;
    exports.isRunning           = isRunning;

    exports.init                = init;
    exports.on                  = on;
});
