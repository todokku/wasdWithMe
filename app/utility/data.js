var unirest = require('unirest');
var async   = require('async');
var Logger  = require('../utility/logger');
var User    = require('../models/user');
var Game    = require('../models/game');
var config  = require('../config');
var fs      = require('fs');

//returns a search request object to be used in the search function
function makeSearchRequest(query, page, users, games){
    var searchRequest = {
        query: query, //text that is being searched for
        page: page, //what page offset do they want
        users: users, //boolean defining whether or not to include games
        games: games //boolean defining whether or not to include users
    };
    return searchRequest;
}

//returns an object containing functions to be called asynchronously and in parallel
function getAsyncFunctions(searchRequest){
    var query = searchRequest.query.toLowerCase();

    var asyncFunctions = {};

    if (searchRequest.users) {
        var userQuery = {
            "username": {
                $regex: query + ".*"
            }
        };
        asyncFunctions.users = function (cb){
            User.find(userQuery).exec(cb);
        };
    }

    if (searchRequest.games){
        var gameQuery = {
            "name": {
                $regex : query + ".*"
            }
        };
        asyncFunctions.games = function (cb){
            Game.find(gameQuery).exec(cb);
        };
    }

    return asyncFunctions;
}

//calls the callback function with results accumulated using
//the information inside the searchRequest object
function search(searchRequest, req, res, callback){

    //if the query is too short, return
    if (searchRequest.query.length < 3){
        callback(req, res, searchRequest, null);
        return;
    }

    console.log("Query: " + searchRequest.query);

    //get the functions to be called asynchronously
    var asyncRequest = getAsyncFunctions(searchRequest);

    //call asynchronous functions
    async.parallel(asyncRequest, function(err, result){

        if (err){
            Logger.log("Querying database during search failed.", err);
            callback(req, res, searchRequest, null);
            return;
        }

        var users = result.users;
        var games = result.games;

        //the results to return
        var results = [];

        //if users returned, populate results
        if (users) {
            for (var i = 0; i < users.length; i++) {
                var name = users[i].display_name;
                var image = getProfilePic(users[i]);
                var text = users[i].bio === undefined ? "" : users[i].bio;
                addToResults(results, "user", name, image, text);
            }
            console.log("Users: " + users.length);
        }

        //if games returned, populate results
        if (games) {
            for (var i = 0; i < games.length; i++) {
                var name = games[i].display_name;
                var image = games[i].boxart;
                var text = games[i].description;
                addToResults(results, "game", name, image, text);
            }
            console.log("Games: " + games.length);

            //if games are requested but none returned from the database
            //use the api to populate the results
            if (games.length < 1){
                callApi(req, res, searchRequest, results, callback);
                return;
            }
        }

        //call the callback function with the results
        callback(req, res, searchRequest, results);
    });
}

//returns the fields when searching for games via the api
function getFields(){
    var fields = ["name", "summary", "release_dates", "cover", "rating", "screenshots", "videos", "developers", "publishers"];
    return encodeURI(fields.join());
}

//makes a call to IGDB via their api to search through their databases for games
function callApi(req, res, searchRequest, results, callback){

    var api = {
        fields: "?fields=" + getFields(),
        limit:  "&limit="  + config.api_max_per_query,
        offset: "&offset=" + searchRequest.page * config.results_per_page,
        query:  "&search=" + searchRequest.query,
        filter: "&filter[category][eq]=0"
    };

    var request = config.api_url + api.fields + api.limit + api.offset + api.query + api.filter;

    unirest
        .get(request)
        .header("X-Mashape-Key", config.api_key)
        .header("Accept", "application/json")
        .timeout(config.api_timeout)
        .end(function (result) {

            //if something went wrong, call callback
            if (result.status != 200){
                callback(req, res, searchRequest, results);
                return;
            }

            //otherwise iterate through all the games and
            //add it to our results and database
            result.body.forEach(function(game){
                var name = game.name;
                var image = getBoxArt(game);
                var text = 'summary' in game ? game.summary : "";
                addToResults(results, "game", name, image, text);
                addToDatabase(game);
            });

            //finally, call callback with all the results
            callback(req, res, searchRequest, results);
        }
    );
}

//adds a new game to the database for further use in the future
function addToDatabase(game){
    var new_game = {
        id: game.id,
        name: getCleanedGameName(game),
        display_name: game.name,
        description : 'summary' in game ? game.summary : "",
        boxart: getBoxArt(game)
    };

    var date = getReleaseDate(game);
    if (date > 0){
        new_game.release_date = new Date(date);
    }

    var rating = getRating(game);
    if (rating > 0){
        new_game.rating = rating;
    }

    var screens = getScreenshots(game);
    if (screens){
        new_game.screenshots = screens;
    }

    var videos = getVideos(game);
    if (videos){
        new_game.videos = videos;
    }

    var query = {
        id: game.id
    };

    var uspert = {
        upsert: true
    };

    Game.findOneAndUpdate(query, new_game, uspert,
        function (err, doc) {
            if (err){
                Logger.log("Failed to add " + game.name + " from API.", err);
                return;
            }
            console.log("Added " + game.name + ".");
        }
    );
}

function getCleanedGameName(game){
    var name = game.name
        .toLowerCase()
        .replace('é', 'e')
        .replace('&', 'and');
    return name;
}

function getBoxArt(game){
    if ('cover' in game){
        return "https://res.cloudinary.com/igdb/image/upload/t_cover_big/" + game.cover.cloudinary_id + ".jpg";
    } else {
        return config.game_not_found_boxart;
    }
}

function getScreenshots(game){
    try {
        var screenshots = [];
        game.screenshots.forEach(function(screen){
            screenshots.push(screen.cloudinary_id);
        });
        return screenshots;
    } catch (err) {
        return null;
    }
}

function getVideos(game){
    try {
        var videos = [];
        game.videos.forEach(function(video){
            videos.push({
                title: video.name,
                link: video.video_id
            });
        });
        return videos;
    } catch (err) {
        return null;
    }
}

function getReleaseDate(game){
    try {
        return game.release_dates[0].date;
    } catch (err){
        return 0;
    }
}

function getRating(game){
    try {
        return game.rating;
    } catch (err){
        return 0;
    }
}

function addToResults(results, type, name, image, description){
    var item = {
        type: type,
        name: name,
        image: image,
        description: description
    };
    results.push(item);
}

//returns profile pic of user if an image was uploaded, placeholder if none exists
function getProfilePic(owner){
    var path = "/images/profile/" + owner.display_name + ".png";
    try {
        fs.accessSync(path, fs.F_OK);
        return path;
    } catch (e) {
    }
    return "/images/placeholder.png";
}

module.exports = {
    callApi: callApi,
    search: search,
    makeSearchRequest: makeSearchRequest
};
