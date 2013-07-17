#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var EventEmitter = require('events').EventEmitter;
//var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtmlFile = function(htmlfile, checksfile, ready) {
    $ = cheerioHtmlFile(htmlfile);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    ready.emit('ready', out);
};

var checkHtmlUrl = function(htmlurl, checksfile, ready) {
    rest.get(htmlurl).on('complete', function(result) {
       if (result instanceof Error) {
            console.log('Error: ' + result.message);
            process.exit(1);
        } else {
            $ = cheerio.load(result);
            var checks = loadChecks(checksfile).sort();
            var out = {};
            for(var ii in checks) {
                var present = $(checks[ii]).length > 0;
                out[checks[ii]] = present;
            }
            ready.emit('ready', out);
        }
    });
}


var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if(require.main == module) {
    program
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists))//, HTMLFILE_DEFAULT)
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-u, --url <url>', 'URL to html file')
        .parse(process.argv);

    if(program.file != null && program.url != null) {
	console.log("Incompatile options, use either -f or -u not both.");
	process.exit(1)
    }
    var outputReady = new EventEmitter();
    var checkJson = null;
    if(program.url != null) {
        checkHtmlUrl(program.url, program.checks, outputReady);
    } else {
	checkHtmlFile(program.file, program.checks, outputReady);
    }

    outputReady.on('ready', function(checkJson) {
	var outJson = JSON.stringify(checkJson, null, 4);
	console.log(outJson);
    });
} else {
    exports.checkHtmlFile = checkHtmlFile;
    exports.checkHtmlUrl = checkHtmlUrl;
}
