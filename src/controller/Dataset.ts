import {InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {Room} from "./Room";
import {Section} from "./Section";

export class Dataset implements InsightDataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;
	public sectionsList: Section[];
	public roomsList: Room[];

	constructor(id: string, kind: InsightDatasetKind, numRows: number) {
		console.log("InsightDataset::init Dataset()");
		this.id = id;
		this.kind = kind;
		this.numRows = numRows;
		this.sectionsList = [];
		this.roomsList = [];
	}

	public addToSectionsList(section: Section) {
		this.sectionsList.push(section);
	}

	public addToRoomsList(room: Room) {
		this.roomsList.push(room);
	}
}
