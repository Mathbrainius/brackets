/*
 * Copyright (c) 2013 - present Adobe Systems Incorporated. All rights reserved.
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

/*eslint-env node */
/*jslint node: true */

"use strict";

var exec = require('child_process').execSync;

/**
 * Initialize the "fileWatcher" domain.
 * The fileWatcher domain handles watching and un-watching directories.
 */
function init(domainManager) {
    if (!domainManager.hasDomain("NPM")) {
        domainManager.registerDomain("NPM", {major: 0, minor: 1});
    }

    domainManager.registerCommand(
        "NPM",
        "start",
        function(projectDir){

            var commands = [
                'export PATH="/usr/local/share/npm/bin:/usr/local/bin:/usr/local/sbin:~/bin:$PATH"',
                'cd '+projectDir,
                'npm start'
            ];
            exec(commands.join(" && "));


        },
        false,
        "Call start script",
        [{
            name: "projectDir",
            type: "string",
            description: "project directory"
        }]
    );

    domainManager.registerCommand(
        "NPM",
        "stop",
        function(projectDir){

            var commands = [
                'export PATH="/usr/local/share/npm/bin:/usr/local/bin:/usr/local/sbin:~/bin:$PATH"',
                'cd '+projectDir,
                'npm stop'
            ];
            exec(commands.join(" && "));

        },
        false,
        "Call stop script",
        [{
            name: "projectDir",
            type: "string",
            description: "project directory"
        }]
    );

}

exports.init = init;