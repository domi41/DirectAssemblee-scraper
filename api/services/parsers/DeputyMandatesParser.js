// http://www2.assemblee-nationale.fr/deputes/fiche/OMC_PA1012#autres
var Promise = require("bluebird");
var htmlparser = require('htmlparser2');

const DATE_REGEX = /((0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4})/i;

var currentMandatesParser = function(callback) {
  var mandates = [];
  var parsedItem = {};

  var expectedType = "";

  var expectMandates = false;
  var retrieveMandate = false;
  var previousDeputyMandatesRetrieved = false;
  var reallyExpectPreviousDeputiesMandates = false;

  const TAG_CURRENT_MANDATE = "fonctions-an";
  const TAG_OTHERS = "autres";
  const TAG_PAST_DEPUTY_MANDATES = "mandats-an-historique";
  const TAG_PAST_OTHER_GOUV_MISSIONS = "mandats-nationaux-historique";
  const TAG_PAST_INTL_MISSIONS = "internationales-judiciaires-historique";

  return new htmlparser.Parser({
    onopentag: function(tagname, attribs) {
      if (tagname === 'div' && attribs.id == TAG_CURRENT_MANDATE) {
        expectedType = attribs.id;
      } else if (tagname === 'div' && (attribs.id == TAG_OTHERS || attribs.id == TAG_PAST_DEPUTY_MANDATES || attribs.id == TAG_PAST_OTHER_GOUV_MISSIONS || attribs.id == TAG_PAST_INTL_MISSIONS)) {
        mandates = [];
        expectedType = attribs.id;
        expectMandates = true;
      } else if (expectedType === TAG_PAST_DEPUTY_MANDATES || expectedType === TAG_PAST_INTL_MISSIONS) {
        if (reallyExpectPreviousDeputiesMandates) {
          if (attribs.class === "fonctions-liste-attributs") {
            retrieveMandate = true;
          } else if (tagname === "h4") {
            reallyExpectPreviousDeputiesMandates = false;
            retrieveMandate = false;
          }
        } else if (tagname === "span") {
          reallyExpectPreviousDeputiesMandates = true;
        }
      } else if (expectMandates && tagname === "li") {
        retrieveMandate = true;
      } else if (expectMandates && tagname === "h4") {
        retrieveMandate = false;
      }
    },
    ontext: function(text) {
      if (expectedType === TAG_CURRENT_MANDATE) {
        var trimmed = text.trim()
        if (trimmed) {
          var startingDateMatched = trimmed.match(DATE_REGEX);
          if (startingDateMatched) {
            parsedItem.currentMandateStartDate = startingDateMatched[1];
            expectedType = null;
          }
        }
      } else if (expectedType === TAG_PAST_DEPUTY_MANDATES) {
        if (text === "Mandat de député") {
          reallyExpectPreviousDeputiesMandates = true;
        }
      }
      if (retrieveMandate) {
        var trimmed = text.trim()
        if (trimmed) {
          mandates.push(trimmed);
        }
      }
    },
    onclosetag: function(tagname) {
      if (tagname === "div" && expectMandates) {
        if (expectedType === TAG_OTHERS) {
          parsedItem.otherCurrentMandates = mandates;
        } else if (expectedType === TAG_PAST_DEPUTY_MANDATES) {
          parsedItem.pastDeputyMandates = mandates;
        } else if (expectedType === TAG_PAST_OTHER_GOUV_MISSIONS) {
          parsedItem.otherPastGouvMissions = mandates;
        } else if (expectedType === TAG_PAST_INTL_MISSIONS) {
          parsedItem.otherPastInternationalMissions = mandates;
        }
        expectMandates = false;
        retrieveMandate = false;
      } else if (tagname === "h4" || tagname === "h3") {
        retrieveMandate = false;
      } else if (tagname === "html") {
        callback(parsedItem);
      }
    }
  }, {decodeEntities: true});
}

module.exports = {
  parse: function(content) {
    return new Promise(function(resolve, reject) {
      var parser = currentMandatesParser(function(mandates) {
        resolve(mandates);
      });
      parser.write(content);
      parser.end();
    })
  }
}

var print = function(parsedItem) {
  console.log("------------- ");
  console.log(parsedItem);
  console.log("------------- ");
}
