chrome.runtime.sendMessage({name: "autocomplete"}, (response) => {

        const script = `${response}
                var input = document.getElementById('autocomplete_input');
                new google.maps.places.Autocomplete(input);
`
    console.log(script);
        document.getElementById("google_autocomplete").innerHTML = script;
    }
);
