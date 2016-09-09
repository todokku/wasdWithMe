function showSearchResults(query) {
    var results = document.querySelector(".results-box");

    if (!query || query.length < 3) {
        results.style.visibility = "hidden";
        return;
    }

    var request = new XMLHttpRequest();

    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200 && request.responseText.length > 2) {
            var json = JSON.parse(request.responseText);
            var html = "";

            for (var i = 0; i < json.length; i++){
                var result = json[i];
                html += "<a href='/" + result.type + "/" + result.name + "'>";
                html += "<div class='result'>";
                html += "<img src='" + result.image + "'/>";
                html += "<div class='info'><div class='name'>" + result.name + "</div>";
                html += "<div class='description'>" + result.description + "</div>";
                html += "</div></div></a>";
            }

            results.innerHTML = html;
            results.style.visibility = "visible";
        } else {
            results.style.visibility = "hidden";
        }
    };

    request.open("GET", "/api?q=" + query, true);
    request.send();
}

document.querySelector("html").onclick = function(e) {
    var results = document.querySelector(".results-box");
    var search = document.querySelector(".search-box");
    if (e.target === search){
        var query = search.value;
        if (!query || query.length < 3) {
            results.style.visibility = "hidden";
        } else {
            results.style.visibility = "visible";
        }
    } else if(e.target != results) {
        results.style.visibility = "hidden";
    }
};