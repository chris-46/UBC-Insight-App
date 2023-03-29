"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const parse5_1 = require("parse5");
const IInsightFacade_1 = require("./IInsightFacade");
const http = __importStar(require("http"));
const Dataset_1 = require("./Dataset");
const Room_1 = require("./Room");
const fs = __importStar(require("fs-extra"));
class AddRooms {
    constructor(zip) {
        this.zip = zip;
    }
    isRoomNumber(node) {
        return this.checkValidity(node, "views-field-field-room-number");
    }
    isRoomCapacity(node) {
        return this.checkValidity(node, "views-field-field-room-capacity");
    }
    isRoomFurniture(node) {
        return this.checkValidity(node, "views-field-field-room-furniture");
    }
    isRoomType(node) {
        return this.checkValidity(node, "views-field-field-room-type");
    }
    isRoomNothing(node) {
        return this.checkValidity(node, "views-field-nothing");
    }
    checkValidity(node, className) {
        for (let attr of parse5_1.defaultTreeAdapter.getAttrList(node)) {
            if (attr.name === "class") {
                if (attr.value.includes(className)) {
                    return true;
                }
            }
        }
        return false;
    }
    recurseOverChildren(result) {
        let dataArray = [];
        if (result.childNodes) {
            for (let child of Object.values(result.childNodes)) {
                let array = this.searchBuildingForRoomData(child);
                if (array.length !== 0) {
                    dataArray = dataArray.concat(array);
                }
            }
        }
        return dataArray;
    }
    searchBuildingForRoomData(result) {
        if (result === undefined) {
            return [];
        }
        else {
            let data = new Map();
            let dataArray = [];
            if (result.nodeName === "tr" && result.childNodes !== undefined) {
                let childNodes = result.childNodes;
                for (let node of childNodes) {
                    if (node.nodeName === "td") {
                        if (this.isRoomNumber(node)) {
                            let aTag = node.childNodes[1];
                            let aTagText = aTag.childNodes[0];
                            data.set("number", aTagText.value);
                        }
                        if (this.isRoomCapacity(node)) {
                            let roomCapacityText = node.childNodes[0];
                            data.set("seats", parseInt(roomCapacityText.value.trim(), 10));
                        }
                        if (this.isRoomFurniture(node)) {
                            let furnitureText = node.childNodes[0];
                            let answer = furnitureText.value.trim();
                            data.set("furniture", answer);
                        }
                        if (this.isRoomType(node)) {
                            let typeText = node.childNodes[0];
                            let answer = typeText.value.trim();
                            data.set("type", answer);
                        }
                        if (this.isRoomNothing(node)) {
                            let aTag = node.childNodes[1];
                            let link = aTag.attrs[0].value;
                            data.set("href", link);
                        }
                    }
                }
                if (data.size !== 0) {
                    dataArray.push(data);
                }
                return dataArray;
            }
            else {
                return this.recurseOverChildren(result);
            }
        }
    }
    isBuildingTitle(node) {
        for (let attr of parse5_1.defaultTreeAdapter.getAttrList(node)) {
            if (attr.name === "class") {
                if (attr.value.includes("views-field-title")) {
                    return true;
                }
            }
        }
        return false;
    }
    isBuildingCode(node) {
        for (let attr of parse5_1.defaultTreeAdapter.getAttrList(node)) {
            if (attr.name === "class") {
                if (attr.value.includes("views-field-field-building-code")) {
                    return true;
                }
            }
        }
        return false;
    }
    isBuildingAddress(node) {
        for (let attr of parse5_1.defaultTreeAdapter.getAttrList(node)) {
            if (attr.name === "class") {
                if (attr.value.includes("views-field-field-building-address")) {
                    return true;
                }
            }
        }
        return false;
    }
    getLocation(address) {
        let temp = "";
        let finalData = {};
        let options = {
            host: "cs310.students.cs.ubc.ca",
            method: "GET",
            port: 11316
        };
        return new Promise((resolved, reject) => {
            http.get(`http://cs310.students.cs.ubc.ca:11316/api/v1/project_team186/${address}`, options, (res) => {
                res.on("data", (dataString) => {
                    let data = dataString.toString();
                    temp += data;
                });
                res.on("end", () => {
                    resolved(JSON.parse(temp));
                }).on("error", (e) => {
                    reject({ error: e.message });
                });
            });
        });
    }
    async findRoomsAndReturnData(result, zip) {
        if (result === undefined) {
            return [];
        }
        else {
            let dataArray = [];
            let data = new Map();
            let location = {};
            if (result.nodeName === "tr" && result.childNodes !== undefined) {
                let childNodes = result.childNodes;
                let promises = new Array();
                let promises2 = new Array();
                let roomData = new Array();
                for (let node of childNodes) {
                    if (node.nodeName === "td") {
                        if (this.isBuildingTitle(node)) {
                            let title = node.childNodes[1].childNodes[0].value;
                            data.set("fullname", title);
                            let roomLink = parse5_1.defaultTreeAdapter.getAttrList(node.childNodes[1])[0].value.
                                substring(2);
                            let promise1 = zip.folder("rooms")?.files[roomLink]?.
                                async("string")
                                .then((res) => {
                                roomData = this.searchBuildingForRoomData((0, parse5_1.parse)(res));
                            });
                            promises.push(promise1);
                        }
                        this.getBuildingShortname(node, data);
                        if (this.isBuildingAddress(node)) {
                            let addressText = node.childNodes[0];
                            data.set("address", addressText.value.trim());
                            let address = addressText.value.trim().replace(/\s/g, "%20");
                            const promise2 = this.getLocation(address).
                                then((res) => {
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
            }
            else {
                dataArray = await this.handleRecursiveCas(result, zip, dataArray);
            }
            return Promise.resolve(dataArray);
        }
    }
    addDataIfNonEmpty(data, dataArray) {
        if (data.size !== 0) {
            dataArray.push(data);
        }
    }
    setLocation(location, data) {
        if (location !== {}) {
            if (!location.error) {
                data.set("lat", location.lat);
                data.set("lon", location.lon);
            }
        }
    }
    checkValidRoomDataAndDoFinalProcess(roomData, data) {
        if (roomData.length !== 0) {
            let finalData = new Array();
            roomData.forEach((roomMap) => {
                roomMap.set("name", data.get("shortname") + " " + roomMap.get("number"));
                roomMap = new Map([...data, ...roomMap]);
                finalData.push(roomMap);
            });
            return finalData;
        }
        else {
            return [];
        }
    }
    getBuildingShortname(node, data) {
        if (this.isBuildingCode(node)) {
            let codeText = node.childNodes[0];
            let code = codeText.value.trim();
            data.set("shortname", code);
        }
    }
    async handleRecursiveCas(result, zip, dataArray) {
        let promises = [];
        result.childNodes?.forEach((child) => {
            const promise = this.findRoomsAndReturnData(child, zip).then((res) => {
                dataArray = dataArray.concat(res);
            });
            promises.push(promise);
        });
        await Promise.allSettled(promises);
        return dataArray;
    }
    async addRoom(id) {
        if (this.zip.folder(/rooms/).length <= 0) {
            return Promise.reject(new IInsightFacade_1.InsightError("Folder rooms does not exist."));
        }
        let result = await this.zip.folder("rooms")?.files["index.htm"]?.async("string");
        let answer = (0, parse5_1.parse)(result);
        let roomData = await this.findRoomsAndReturnData(answer, this.zip);
        let dataset = new Dataset_1.Dataset(id, IInsightFacade_1.InsightDatasetKind.Rooms, roomData.length);
        let roomsJSON = [];
        roomData.forEach((room) => {
            let roomJson = JSON.parse(JSON.stringify(Object.fromEntries(room)));
            let roomFinal = new Room_1.Room(id, new Room_1.RoomContent(room.get("fullname"), room.get("shortname"), room.get("number"), room.get("name"), room.get("address"), room.get("lat"), room.get("lon"), room.get("seats"), room.get("type"), room.get("furniture"), room.get("href")));
            dataset.addToRoomsList(roomFinal);
            roomsJSON.push(roomJson);
        });
        const path = `./data/${id}` + "_room";
        await fs.outputFile(path, JSON.stringify(roomsJSON));
        return Promise.resolve(dataset);
    }
}
exports.default = AddRooms;
//# sourceMappingURL=AddRooms.js.map