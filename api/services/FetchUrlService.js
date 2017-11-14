'use strict';

let Promise = require('bluebird');
let request = require('request-promise');
let Constants = require('./Constants.js')
let StringHelper = require('./helpers/StringHelper')

let parseHtml = function(html, parser) {
    return new Promise(function(resolve, reject) {
        let p = parser.getParser(function(result) {
            html = null;
            p = null;
            resolve(result);
        })
        p.write(html);
        p.end();
    })
}

let self = module.exports = {
    retrieveContent: function(url, parser) {
        return self.retrieveContentWithIsoEncoding(url, false, parser);
    },

    retrieveContentWithIsoEncoding: function(url, isIsoEncoding, parser) {
        return self.retrieveContentWithAttempt(url, isIsoEncoding, 0, parser);
    },

    retrieveContentWithAttempt: function(url, isIsoEncoding, attemptNumber, parser) {
        let settings = {
            url: url,
            encoding: isIsoEncoding ? 'binary' : 'utf8',
            method: 'GET',
            timeout: 15000
        }
        return request(settings)
        .then(function(content) {
            if (content === undefined || content.length < 1000) {
                console.log('content : ' + content);
                if (content && content.startsWith('<head><title>Object moved</title></head>')) {
                    let index = content.indexOf('\'');
                    if (index > 0) {
                        let newUrl = content.substring(index + 1);
                        index = newUrl.indexOf('\'');
                        newUrl = Constants.BASE_URL + newUrl.substring(0, index);
                        return self.retrieveContentWithAttempt(newUrl, isIsoEncoding, 0, parser);
                    }
                } else if (content > 100) {
                    console.log('--- RETRY : ' + url)
                    attemptNumber++;
                    return self.retrieveContentWithAttempt(url, isIsoEncoding, attemptNumber, parser);
                } else {
                    attemptNumber++;
                    console.log('--- RETRY (no content) : ' + url)
                    if (attemptNumber < 3) {
                        return self.retrieveContentWithAttempt(url, isIsoEncoding, attemptNumber, parser);
                    }
                }
            } else {
                return parseHtml(StringHelper.cleanHtml(content), parser);
            }
        })
        .catch(function(err) {
            console.log(err);
        });
    }
}
