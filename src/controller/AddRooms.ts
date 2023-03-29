import {defaultTreeAdapter, parse} from "parse5";
import JSZip from "jszip";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {Document, Element, TextNode} from "parse5/dist/tree-adapters/default";
import * as http from "http";
import {GeoResponse} from "./GeoResponse";
import {Dataset} from "./Dataset";
import {Room, RoomContent} from "./Room";
import * as fs from "fs-extra";

export default class AddRooms {
	private zip: JSZip;
	constructor(zip: JSZip) {
		this.zip = zip;
	}

	private isRoomNumber(node: Element): boolean {
		return this.checkValidity(node, "views-field-field-room-number");
	}

	private isRoomCapacity(node: Element): boolean {
		return this.checkValidity(node, "views-field-field-room-capacity");
	}

	private isRoomFurniture(node: Element): boolean {
		return this.checkValidity(node, "views-field-field-room-furniture");
	}

	private isRoomType(node: Element): boolean {
		return this.checkValidity(node, "views-field-field-room-type");
	}

	private isRoomNothing(node: Element): boolean {
		return this.checkValidity(node, "views-field-nothing");
	}

	private checkValidity(node: Element, className: string) {
		for (let attr of defaultTreeAdapter.getAttrList(node)) {
			if (attr.name === "class") {
				if (attr.value.includes(className)) {
					return true;
				}
			}
		}
		return false;
	}

	private recurseOverChildren(result: Document): Array<Map<string, any>> {
		let dataArray: Array<Map<string, any>> = [];
		if (result.childNodes) {
			// iteration problem solved by using Object.values using help from https://stackoverflow.com/questions/72102970/why-is-this-not-iterable
			for (let child of Object.values(result.childNodes)) {
				let array = this.searchBuildingForRoomData(child as unknown as Document);
				if (array.length !== 0) {
					dataArray = dataArray.concat(array);
				}
			}
		}
		return dataArray;
	}

	private searchBuildingForRoomData(result: Document): Array<Map<string, any>> {
		if (result === undefined) {
			return [];
		} else {
			let data: Map<string, any> = new Map<string, any>();
			let dataArray: Array<Map<string, any>> = [];
			if (result.nodeName as string === "tr" && result.childNodes !== undefined) {
				let childNodes = result.childNodes as unknown as Element[];
				for (let node of childNodes) {
					if (node.nodeName === "td") {
						if (this.isRoomNumber(node)) {
							let aTag = node.childNodes[1] as Element;
							let aTagText = aTag.childNodes[0] as TextNode;
							data.set("number", aTagText.value);
						}
						if (this.isRoomCapacity(node)) {
							let roomCapacityText = node.childNodes[0] as TextNode;
							data.set("seats", parseInt(roomCapacityText.value.trim(), 10));
						}
						if (this.isRoomFurniture(node)) {
							let furnitureText = node.childNodes[0] as TextNode;
							let answer: string = furnitureText.value.trim();
							data.set("furniture", answer);
						}
						if (this.isRoomType(node)) {
							let typeText = node.childNodes[0] as TextNode;
							let answer: string = typeText.value.trim();
							data.set("type", answer);
						}

						if (this.isRoomNothing(node)) {
							let aTag = node.childNodes[1] as Element;
							let link = aTag.attrs[0].value;
							data.set("href", link);
						}
					}
				}
				if (data.size !== 0) {
					dataArray.push(data);
				}
				return dataArray;
			} else {
				return this.recurseOverChildren(result);
			}
		}
	}

	private isBuildingTitle(node: Element): boolean {
		for (let attr of defaultTreeAdapter.getAttrList(node)) {
			if (attr.name === "class") {
				if (attr.value.includes("views-field-title")) {
					return true;
				}
			}
		}
		return false;
	}

	private isBuildingCode(node: Element): boolean {
		for (let attr of defaultTreeAdapter.getAttrList(node)) {
			if (attr.name === "class") {
				if (attr.value.includes("views-field-field-building-code")) {
					return true;
				}
			}
		}
		return false;
	}

	private isBuildingAddress(node: Element): boolean {
		for (let attr of defaultTreeAdapter.getAttrList(node)) {
			if (attr.name === "class") {
				if (attr.value.includes("views-field-field-building-address")) {
					return true;
				}
			}
		}
		return false;
	}

	private getLocation(address: string): Promise<GeoResponse> {
		let temp = "";
		let finalData = {};
		let options = {
			host: "cs310.students.cs.ubc.ca",
			method: "GET",
			port: 11316
		};
		// handled the asynchronity problems with the help of https://stackoverflow.com/questions/38533580/nodejs-how-to-promisify-http-request-reject-got-called-two-times
		return new Promise((resolved, reject) => {
			http.get(`http://cs310.students.cs.ubc.ca:11316/api/v1/project_team186/${address}`,
				options,
				(res) => {
					res.on("data", (dataString) => {
						let data = dataString.toString();
						temp += data;
					});
					res.on("end", () => {
						// console.log(JSON.parse(temp));
						resolved(JSON.parse(temp) as GeoResponse);
					}).on("error", (e) => {
						reject({error: e.message} as GeoResponse);
					});
				});
		});
	}

	private async findRoomsAndReturnData(result: Document, zip: JSZip): Promise<Array<Map<string, any>>> {
		if (result === undefined) {
			return [];
		} else {
			let dataArray: Array<Map<string, any>> = [];
			let data = new Map<string, any>();
			let location: GeoResponse = {};
			if (result.nodeName as string === "tr" && result.childNodes !== undefined) {
				let childNodes = result.childNodes as unknown as Element[];
				let promises: Array<Promise<void> | undefined> = new Array<Promise<void> | undefined>();
				let promises2: Array<Promise<void | GeoResponse>> = new Array<Promise<void | GeoResponse>>();
				let roomData: Array<Map<string, any>> = new Array<Map<string, any>>();
				for (let node of childNodes) {
					if (node.nodeName === "td") {
						if (this.isBuildingTitle(node)) {
							let title = ((node.childNodes[1] as Element).childNodes[0] as unknown as TextNode).value;
							data.set("fullname", title);
							let roomLink = defaultTreeAdapter.getAttrList(node.childNodes[1] as Element)[0].value.
								substring(2);
							let promise1: Promise<void> | undefined = zip.folder("rooms")?.files[roomLink]?.
								async("string")
								.then((res) => {
									roomData = this.searchBuildingForRoomData(parse(res));
								});
							promises.push(promise1);
						}
						this.getBuildingShortname(node, data);
						if (this.isBuildingAddress(node)) {
							let addressText = node.childNodes[0] as TextNode;
							data.set("address", addressText.value.trim());
							let address = addressText.value.trim().replace(/\s/g, "%20");
							const promise2: Promise<void | GeoResponse> = this.getLocation(address).
								then((res: GeoResponse) => {
									location = res;
								});
							promises2.push(promise2);
						}
					}
				}
				await Promise.allSettled(promises2);
				this.setLocation(location, data);
				await Promise.allSettled(promises);
				this.addDataIfNonEmpty(data, dataArray);
				return this.checkValidRoomDataAndDoFinalProcess(roomData, data);
			} else {
				dataArray = await this.handleRecursiveCas(result, zip, dataArray);
			}
			return Promise.resolve(dataArray);
		}
	}

	private addDataIfNonEmpty(data: Map<string, any>, dataArray: Array<Map<string, any>>) {
		if (data.size !== 0) {
			dataArray.push(data);
		}
	}

	private setLocation(location: GeoResponse, data: Map<string, any>) {
		if (location !== {}) {
			if (!location.error) {
				data.set("lat", location.lat);
				data.set("lon", location.lon);
			}
		}
	}

	private checkValidRoomDataAndDoFinalProcess(roomData: Array<Map<string, any>>, data: Map<string, any>) {
		if (roomData.length !== 0) {
			let finalData = new Array<Map<string, any>>();
			// the map merging logic was written with the help of https://bobbyhadz.com/blog/javascript-merge-maps#:~:text=To%20merge%20Maps%2C%20use%20the,from%20all%20provided%20Map%20objects.
			roomData.forEach((roomMap) => {
				roomMap.set("name", data.get("shortname") + " " + roomMap.get("number"));
				roomMap = new Map([...data, ...roomMap]);
				finalData.push(roomMap);
			});
			return finalData;
		} else {
			return [];
		}
	}

	private getBuildingShortname(node: Element, data: Map<string, any>) {
		if (this.isBuildingCode(node)) {
			let codeText = node.childNodes[0] as TextNode;
			let code = codeText.value.trim();
			data.set("shortname", code);
		}
	}

	private async handleRecursiveCas(result: Document, zip: JSZip, dataArray: Array<Map<string, any>>) {
		let promises: Array<Promise<void>> = [];
		result.childNodes?.forEach((child) => {
			const promise: Promise<void> =
				this.findRoomsAndReturnData(child as unknown as Document, zip).then((res) => {
					dataArray = dataArray.concat(res);
				});
			promises.push(promise);
		});
		await Promise.allSettled(promises);
		return dataArray;
	}

	public async addRoom(id: string): Promise<Dataset> { // should return Promise<Dataset>
		if (this.zip.folder(/rooms/).length <= 0) { // check if folder courses exists, else return insight err, source: https://stackoverflow.com/questions/39939644/jszip-checking-if-a-zip-folder-contains-a-specific-file
			return Promise.reject(new InsightError("Folder rooms does not exist."));
		}
		let result = await this.zip.folder("rooms")?.files["index.htm"]?.async("string");
		let answer: Document = parse(result as string);
		let roomData: Array<Map<string, any>> = await this.findRoomsAndReturnData(answer, this.zip);
		// console.log(roomData);
		let dataset = new Dataset(id, InsightDatasetKind.Rooms, roomData.length);
		let roomsJSON: JSON[] = [];
		roomData.forEach((room) => {
			let roomJson: JSON = JSON.parse(JSON.stringify(Object.fromEntries(room)));
			let roomFinal = new Room(id, new RoomContent(room.get("fullname"), room.get("shortname"),
				room.get("number"), room.get("name"),room.get("address"), room.get("lat"), room.get("lon"),
				room.get("seats"), room.get("type"), room.get("furniture"), room.get("href")));
			dataset.addToRoomsList(roomFinal);
			roomsJSON.push(roomJson);
		});
		const path = `./data/${id}` + "_room";
		await fs.outputFile(path,JSON.stringify(roomsJSON));
		return Promise.resolve(dataset);
	}
}

