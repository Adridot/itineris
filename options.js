let table = document.getElementById("table");
let table_body = document.getElementById("table_body");
let no_address_message = document.getElementById("no_address_message");
let add_button = document.getElementById("add_button");


function clearTable() {
    table_body.innerHTML = "";
}


function addressToHTML(address_elem) {
    let row = document.createElement("tr");
    let name_cell = document.createElement("td");
    let address_cell = document.createElement("td");
    let delete_button_cell = document.createElement("td");
    name_cell.innerText = address_elem.name;
    address_cell.innerText = address_elem.address;
    delete_button_cell.innerHTML = `
        <button id='delete_${address_elem.id}' class='delete_button button is-danger is-outlined'>
            <span>Delete</span>
            <span class='icon is-small'>
            <i class='fa-solid fa-trash'></i>
            </span>
        </button>`;
    delete_button_cell.classList.add("has-text-right");
    row.appendChild(name_cell);
    row.appendChild(address_cell);
    row.appendChild(delete_button_cell);
    table_body.appendChild(row);
}


function addToStorage(name, address) {
    let address_elem = {
        id: Date.now(),
        name: name,
        address: address
    };
    chrome.storage.sync.get("address_list", ({address_list}) => {
        address_list.push(address_elem);
        chrome.storage.sync.set({address_list: address_list});
        constructTable();
    });
}

function addAddress() {
    // Get the name and address from the input fields
    let name = document.getElementById("name_input").value;
    let address = document.getElementById("address_input").value;
    if (name === "" || address === "") {
        alert("Please fill in all the fields");
        return;
    }

    // Add to storage
    addToStorage(name, address);

    // Clear the input fields
    document.getElementById("name_input").value = "";
    document.getElementById("address_input").value = "";
}

add_button.addEventListener("click", () => {
    addAddress();
});


function deleteFromStorage(id) {
    chrome.storage.sync.get("address_list", ({address_list}) => {
        let new_address_list = address_list.filter(address_elem => address_elem.id !== id);
        chrome.storage.sync.set({address_list: new_address_list});
        constructTable();
    });
}

function handleDeleteButton() {
    chrome.storage.sync.get("address_list", ({address_list}) => {
        for (let address_elem of address_list) {
            document.getElementById(`delete_${address_elem.id}`).addEventListener("click", () => {
                deleteFromStorage(address_elem.id);
            });
        }
    });
}


function constructTable() {
    clearTable();
    chrome.storage.sync.get("address_list", ({address_list}) => {
        if (address_list.length === 0) {
            no_address_message.classList.remove('is-hidden');
            table.classList.add('is-hidden');
        } else {
            no_address_message.classList.add('is-hidden');
            table.classList.remove('is-hidden');
            for (let address_elem of address_list) {
                addressToHTML(address_elem);
            }
        }
    });
    handleDeleteButton();
}

constructTable();