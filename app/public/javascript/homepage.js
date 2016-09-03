function showSearchResults(str) {
    var results = document.querySelector(".results");

    if (!str || str.length < 3) {
        results.innerHTML = "";
        results.style.visibility = "hidden";
        return;
    }

    var request = new XMLHttpRequest();

    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200 && request.responseText.length > 0) {
            console.log(request.responseText);
            var json = JSON.parse(request.responseText);
            var html = "";

            for (var i = 0; i < json.length; i++){
                var result = json[i]
                html += "<div class='result'>";
                html += "<img src='" + result.image + "'/>";
                html += "<div class='info'><div class='name'>" + result.name + "</div>";
                html += "<div class='description'>" + result.description + "</div>";
                html += "</div></div>";
            }

            results.innerHTML = html;
            results.style.visibility = "visible";
        } else {
            results.innerHTML = "";
            results.style.visibility = "hidden";
        }
    };

    request.open("GET", "/api?q=" + str, true);
    request.send();
}