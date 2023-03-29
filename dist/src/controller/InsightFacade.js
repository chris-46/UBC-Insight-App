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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const jszip_1 = __importDefault(require("jszip"));
const fs = __importStar(require("fs-extra"));
const Query_1 = __importDefault(require("./Query"));
const Dataset_1 = require("./Dataset");
const Section_1 = require("./Section");
const Room_1 = require("./Room");
const AddRooms_1 = __importDefault(require("./AddRooms"));
class InsightFacade {
    constructor() {
        console.log("InsightFacadeImpl::init InsightFacade()");
        this.datasetsMap = new Map();
        this.roomMap = new Map();
        this.jszip = new jszip_1.default();
        let files = [];
        try {
            files = fs.readdirSync("data");
        }
        catch (e) {
            if (e) {
                console.log("No dataset added yet for new insight facade object.");
            }
        }
        if (!(files.length <= 0)) {
            files.forEach((fileName) => {
                let fileContent = fs.readFileSync(`data/${fileName}`).toString();
                let kind = fileName.split("_")[1] === "section" ? IInsightFacade_1.InsightDatasetKind.Sections :
                    IInsightFacade_1.InsightDatasetKind.Rooms;
                let dataset = new Dataset_1.Dataset(fileName.split("_")[0], kind, 0);
                if (kind === IInsightFacade_1.InsightDatasetKind.Sections) {
                    this.addSectionDataToMap(fileContent, fileName, dataset);
                }
                else {
                    this.addRoomDataToMap(fileContent, fileName, dataset);
                }
            });
        }
    }
    addRoomDataToMap(fileContent, fileName, dataset) {
        let roomsArray = [];
        const rooms = JSON.parse(fileContent);
        rooms.forEach((room) => {
            if (InsightFacade.validRoom(room, fileName.split("_")[0])) {
                let r = new Room_1.Room(fileName.split("_")[0], new Room_1.RoomContent(room.fullName, room.shortName, room.number, room.name, room.address, room.lat, room.lon, room.seats, room.type, room.furniture, room.href));
                dataset.addToRoomsList(r);
                roomsArray.push(room);
            }
        });
        dataset.numRows = roomsArray.length;
        this.datasetsMap.set(fileName.split("_")[0], dataset);
    }
    addSectionDataToMap(fileContent, fileName, dataset) {
        let sectionsArray = [];
        const sections = JSON.parse(fileContent);
        sections.forEach((section) => {
            if (InsightFacade.validSection(section, fileName)) {
                if (section.Section === "overall") {
                    section.Year = 1900;
                }
                let s = new Section_1.Section(section.id, new Section_1.SectionContent(section.Subject, section.Course, section.Avg, section.Professor, section.Title, section.Pass, section.Fail, section.Audit, section.id, section.Year));
                dataset.addToSectionsList(s);
                sectionsArray.push(section);
            }
        });
        dataset.numRows = sectionsArray.length;
        this.datasetsMap.set(fileName.split("_")[0], dataset);
    }
    static validRoom(room, id) {
        let properties = ["fullName", "shortName", "number", "name", "address", "lat", "lon", "seats", "type", "furniture",
            "href"];
        for (let p in properties) {
            if (Object.prototype.hasOwnProperty.call(room, `${id}_${p}`)) {
                return false;
            }
        }
        return true;
    }
    static validSection(section, id) {
        let properties = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
        for (let p in properties) {
            if (Object.prototype.hasOwnProperty.call(section, `${id}_${p}`)) {
                return false;
            }
        }
        return true;
    }
    async addDataset(id, content, kind) {
        this.jszip = new jszip_1.default();
        if (id.includes("_") || id.trim() === "") {
            return Promise.reject(new IInsightFacade_1.InsightError("Please add a dataset with a valid ID (doesn’t contain underscores" +
                ", " +
                "and is not just a sequence of whitespaces.)"));
        }
        if (this.datasetsMap.has(id)) {
            return Promise.reject(new IInsightFacade_1.InsightError("The section dataset you are trying to add already exists, " +
                "no new dataset added."));
        }
        let zip = await this.jszip.loadAsync(content, { base64: true });
        let dataset;
        if (kind === IInsightFacade_1.InsightDatasetKind.Sections) {
            dataset = await this.addSectionsDataset(id, zip);
        }
        else if (kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
            let addRoomSolver = new AddRooms_1.default(zip);
            dataset = await addRoomSolver.addRoom(id);
        }
        else {
            return Promise.reject(new IInsightFacade_1.InsightError("Please add valid kind"));
        }
        this.datasetsMap.set(id, dataset);
        return Promise.resolve(Array.from(this.datasetsMap.keys()));
    }
    async addSectionsDataset(id, zip) {
        if (zip.folder(/courses/).length <= 0) {
            return Promise.reject(new IInsightFacade_1.InsightError(`The dataset ${id} has no valid sections and has therefore ` +
                "not been added."));
        }
        let promises = [];
        let sectionsArray = [];
        let dataset = new Dataset_1.Dataset(id, IInsightFacade_1.InsightDatasetKind.Sections, 0);
        zip.folder("courses")?.forEach((relativepath, file) => {
            const promise = file.async("string").then((result) => {
                const sections = JSON.parse(result).result;
                for (const section of sections) {
                    if (InsightFacade.validSection(section, id)) {
                        if (section.Section === "overall") {
                            section.Year = 1900;
                        }
                        let s = new Section_1.Section(section.id, new Section_1.SectionContent(section.Subject, section.Course, section.Avg, section.Professor, section.Title, section.Pass, section.Fail, section.Audit, section.id, section.Year));
                        dataset.addToSectionsList(s);
                        sectionsArray.push(section);
                    }
                }
            });
            promises.push(promise);
        });
        await Promise.all(promises);
        dataset.numRows = sectionsArray.length;
        if (dataset.numRows === 0) {
            return Promise.reject(new IInsightFacade_1.InsightError(`The dataset ${id} has no valid sections and has therefore ` +
                "not been added."));
        }
        const path = `./data/${id}` + "_section";
        await fs.outputFile(path, JSON.stringify(sectionsArray));
        return Promise.resolve(dataset);
    }
    performQuery(query) {
        return new Query_1.default(this).performQuery(query);
    }
    removeDataset(id) {
        if (id.includes("_") || (id.trim() === "")) {
            return Promise.reject(new IInsightFacade_1.InsightError("Invalid ID"));
        }
        else if (!this.datasetsMap.has(id)) {
            return Promise.reject(new IInsightFacade_1.NotFoundError("ID not found"));
        }
        else {
            let kind = this.datasetsMap.get(id)?.kind === IInsightFacade_1.InsightDatasetKind.Sections ? "section" : "room";
            this.datasetsMap.delete(id);
            fs.removeSync(`./data/${id}_${kind}`);
            return Promise.resolve(id);
        }
    }
    listDatasets() {
        let listOfDatasets = [];
        Array.from(this.datasetsMap.values()).forEach((val, index) => {
            listOfDatasets.push({
                id: val.id,
                kind: val.kind,
                numRows: val.numRows
            });
        });
        return Promise.resolve(listOfDatasets);
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map