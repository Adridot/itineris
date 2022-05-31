let table = document.getElementById("table");
let table_body = document.getElementById("table_body");
let no_address_message = document.getElementById("no_address_message");

function constructTable() {
    chrome.storage.sync.get("address_list", ({address_list}) => {
        if (address_list.length === 0) {
            no_address_message.classList.remove('is-hidden');
            table.classList.add('is-hidden');
        } else {
            no_address_message.classList.add('is-hidden');
            table.classList.remove('is-hidden');
            for (let address_elem of address_list) {
                addAddress(address_elem);
            }
        }
    });
}

function addAddress(address_elem) {
    let row = document.createElement("tr");
    let name_cell = document.createElement("td");
    let address_cell = document.createElement("td");
    let delete_button_cell = document.createElement("td");
    name_cell.innerText = address_elem.name;
    address_cell.innerText = address_elem.address;
    delete_button_cell.innerHTML =
        "<button class=\"button is-danger is-outlined\">\n" +
        "                <span>Delete</span>\n" +
        "                <span class=\"icon is-small\">\n" +
        "                    <i class=\"fa-solid fa-trash\"></i>\n" +
        "                </span>\n" +
        "            </button>";
    row.appendChild(name_cell);
    row.appendChild(address_cell);
    row.appendChild(delete_button_cell);
    table_body.appendChild(row);
}

constructTable();

//
// let page = document.getElementById("buttonDiv");
// let selectedClassName = "current";
// const presetButtonColors = ["#3aa757", "#e8453c", "#f9bb2d", "#4688f1"];
//
// // Reacts to a button click by marking the selected button and saving
// // the selection
// function handleButtonClick(event) {
//     // Remove styling from the previously selected color
//     let current = event.target.parentElement.querySelector(
//         `.${selectedClassName}`
//     );
//     if (current && current !== event.target) {
//         current.classList.remove(selectedClassName);
//     }
//
//     // Mark the button as selected
//     let color = event.target.dataset.color;
//     event.target.classList.add(selectedClassName);
//     chrome.storage.sync.set({color});
// }
//
// // Add a button to the page for each supplied color
// function constructOptions(buttonColors) {
//     chrome.storage.sync.get("color", (data) => {
//         let currentColor = data.color;
//         // For each color we were provided…
//         for (let buttonColor of buttonColors) {
//             // …create a button with that color…
//             let button = document.createElement("button");
//             button.dataset.color = buttonColor;
//             button.style.backgroundColor = buttonColor;
//
//             // …mark the currently selected color…
//             if (buttonColor === currentColor) {
//                 button.classList.add(selectedClassName);
//             }
//
//             // …and register a listener for when that button is clicked
//             button.addEventListener("click", handleButtonClick);
//             page.appendChild(button);
//         }
//     });
// }
//
// // Initialize the page by constructing the color options
// constructOptions(presetButtonColors);
