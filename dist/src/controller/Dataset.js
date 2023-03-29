"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dataset = void 0;
class Dataset {
    constructor(id, kind, numRows) {
        console.log("InsightDataset::init Dataset()");
        this.id = id;
        this.kind = kind;
        this.numRows = numRows;
        this.sectionsList = [];
        this.roomsList = [];
    }
    addToSectionsList(section) {
        this.sectionsList.push(section);
    }
    addToRoomsList(room) {
        this.roomsList.push(room);
    }
}
exports.Dataset = Dataset;
//# sourceMappingURL=Dataset.js.map