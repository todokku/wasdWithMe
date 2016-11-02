var router = require('express').Router();

var data   = require('../utility/data');
var alert  = require('../utility/alert');
var config = require('../config');

//handles search results
router.get('/', function (req, res, next) {
    var query = req.query.query;
    var type = req.query.type;
    var page = req.query.page ? req.query.page : 1;

    var ageMin = req.query.agemin;
    var ageMax = req.query.agemax;
    var gender = req.query.gender;

    var availability = req.query.availability;
    var availabilityObject = getAvailabilityObject(availability);

    //In any of these cases, we should return an alert
    if (page < 1 || !query || query.length < 3){
        alert.send(req, res, 'Empty search results', "We did not find any results for '" + query + "'.");
        return;
    }

    var users = type === "all" || type === "users";
    var games = type === "all" || type === "games";
    var searchRequest = data.makeSearchRequest(req, res, query, page, users, games);

    data.search(searchRequest, sendResults);
});

function getAvailabilityObject(value){
    var availability = {
        weekdays: {
            morning: (value & (1 << 0)) != 0,
            day:     (value & (1 << 1)) != 0,
            night:   (value & (1 << 2)) != 0,
            never:   (value & (1 << 3)) != 0
        },
        weekends: {
            morning: (value & (1 << 4)) != 0,
            day:     (value & (1 << 5)) != 0,
            night:   (value & (1 << 6)) != 0,
            never:   (value & (1 << 7)) != 0
        }
    };
    return availability;
}

//renders the search results
var sendResults = function(searchRequest, results) {

    var pagination = getPagination(searchRequest, results);

    //slice the results so we only display what we need
    var lower = (searchRequest.page - 1) * config.results_per_page;
    var upper = lower + config.results_per_page;
    results = results.slice(lower, upper);

    if (results.length < 1){
        alert.send(searchRequest.req, searchRequest.res, 'Empty search results', "We did not find any results for '" + searchRequest.query + "'.");
        return;
    }

    searchRequest.res.render('search', {
        title: 'Search Results',
        layout: 'primary',
        file: 'search',
        user: searchRequest.req.user,
        query: searchRequest.query,
        type: getType(searchRequest),
        results: results,
        pages: pagination,
        js: ["/javascript/search"]
    });
};

function getType(searchRequest){
    if (searchRequest.games && searchRequest.users){
        return "all";
    } else if (searchRequest.users){
        return "users";
    } else if (searchRequest.games){
        return "games";
    }
}

function getPagination(searchRequest, results){
    var total = results.length / config.results_per_page; //total number of pages
    var pages = [];
    for (var i = 1; i <= total; i++){
        var page = {
            page_id: i,
            current: i == searchRequest.page
        };
        pages.push(page);
    }
    return pages;
}

module.exports = router;
