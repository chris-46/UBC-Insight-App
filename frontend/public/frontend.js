document.getElementById("click-me-button").addEventListener("click", handleClickMe);
document.getElementById("List-data").addEventListener("click", listData);

let count = 0;

async function listData() {
	if (count === 0) {
		let response = await fetch("/datasets", {method: "Get"})
		let result = JSON.parse(JSON.stringify(await response.json())).result;
		result.forEach((data) => {
			document.getElementById("listOfDataset").innerHTML += "<li>" + data.id + "</li>";
		})
	}

	if (count % 2 === 0) {
		document.getElementById("listContainer").style.visibility = "visible";
	} else {
		document.getElementById("listContainer").style.visibility = "hidden";
	}
	count++;
}

async function handleClickMe() {
	//code written with help of https://stackoverflow.com/questions/36067767/how-do-i-upload-a-file-with-the-js-fetch-api
	let options = {
		method: "PUT",
		body: document.querySelector(`input[type="file"]`).files[0]
	}

	let text = document.getElementById("ID").value
	let response = await fetch(`/dataset/${text}/sections`,options)
	let result;
	// logic of handling status 400 done with help of https://stackoverflow.com/questions/38235715/fetch-reject-promise-and-catch-the-error-if-status-is-not-ok
	if (!response.ok) {
		result = JSON.parse(await response.text());
	} else {
		let json = await response.json();
		result = JSON.parse(JSON.stringify(json)).result;
		// add to list code written with the help of https://stackoverflow.com/questions/20673959/how-to-add-new-li-to-ul-onclick-with-javascript
		document.getElementById("listOfDataset").innerHTML += "<li>" + result[result.length - 1] + "</li>";
		alert(`Valid sections of SectionDataset ${text} have been successfully added`);
	}
	if (result.error !== undefined) {
		if (result.error) {
			console.log(result.error);
			alert(result.error);
		}
	}
}
