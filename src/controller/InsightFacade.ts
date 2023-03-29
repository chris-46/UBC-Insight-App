import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import Query from "./Query";
import {Dataset} from "./Dataset";
import {Section, SectionContent} from "./Section";
import {Room, RoomContent} from "./Room";
import AddRooms from "./AddRooms";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 */

export default class InsightFacade implements IInsightFacade {
	public datasetsMap: Map<string, Dataset>;
	public roomMap: Map<string, Room>;
	public jszip: JSZip;
	constructor() {
		console.log("InsightFacadeImpl::init InsightFacade()");
		this.datasetsMap = new Map<string, Dataset>();
		this.roomMap = new Map<string, Room>();
		this.jszip = new JSZip();
		let files: string[] = [];
		try {
			files = fs.readdirSync("data");
		} catch (e) {
			if (e as Error) {
	 			console.log("No dataset added yet for new insight facade object.");
			}
		}
		if (!(files.length <= 0)) { // Get pre-added datasets in data folder.
			files.forEach((fileName) => {
				let fileContent = fs.readFileSync(`data/${fileName}`).toString();
				let kind = fileName.split("_")[1] === "section" ? InsightDatasetKind.Sections :
					InsightDatasetKind.Rooms;
				let dataset = new Dataset(fileName.split("_")[0], kind, 0); // initialize with 0 rows to start, we'll add to it.
				if (kind === InsightDatasetKind.Sections) {
					this.addSectionDataToMap(fileContent, fileName, dataset);
				} else {
					this.addRoomDataToMap(fileContent, fileName, dataset);
				}
			});
		}
	}

	private addRoomDataToMap(fileContent: string, fileName: string, dataset: Dataset) { // only pre-add
		let roomsArray: string[] = [];
		const rooms = JSON.parse(fileContent);
		rooms.forEach((room: any) => { // check if room valid
			if (InsightFacade.validRoom(room, fileName.split("_")[0])) {
				let r = new Room(fileName.split("_")[0],
					new RoomContent(
						room.fullName, room.shortName, room.number, room.name, room.address, room.lat, room.lon,
						room.seats, room.type, room.furniture, room.href));
				dataset.addToRoomsList(r);
				roomsArray.push(room);
			}
		});
		dataset.numRows = roomsArray.length;
		this.datasetsMap.set(fileName.split("_")[0], dataset);
	}

	private addSectionDataToMap(fileContent: string, fileName: string, dataset: Dataset) { // only pre-add
		let sectionsArray: string[] = [];
		const sections = JSON.parse(fileContent);
		sections.forEach((section: any) => { // check if section valid
			if (InsightFacade.validSection(section, fileName)) {
				if (section.Section === "overall") {
					section.Year = 1900;
				}
				let s = new Section(section.id,
					new SectionContent(
						section.Subject, section.Course, section.Avg, section.Professor, section.Title,
						section.Pass, section.Fail, section.Audit, section.id, section.Year));
				dataset.addToSectionsList(s);
				sectionsArray.push(section);
			}
		});
		dataset.numRows = sectionsArray.length;
		this.datasetsMap.set(fileName.split("_")[0], dataset);
	}

	public static validRoom(room: any, id: string): boolean {
		let properties = ["fullName","shortName","number","name","address","lat","lon","seats","type","furniture",
			"href"];
		for (let p in properties) {
			if (Object.prototype.hasOwnProperty.call(room,`${id}_${p}`)) {
				return false;
			}
		}
		return true;
	}

	public static validSection(section: any, id: string): boolean {
		let properties = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
		for (let p in properties) {
			if (Object.prototype.hasOwnProperty.call(section, `${id}_${p}`)) {
				return false;
			}
		}
		return true;
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		this.jszip = new JSZip();
		if (id.includes("_") || id.trim() === "")  {
			return Promise.reject(new InsightError("Please add a dataset with a valid ID (doesn’t contain underscores" +
				", " +
				"and is not just a sequence of whitespaces.)"));
		}
		if (this.datasetsMap.has(id)) {
			return Promise.reject(new InsightError("The section dataset you are trying to add already exists, " +
				"no new dataset added."));
		}
		let zip = await this.jszip.loadAsync(content, {base64: true});
		let dataset: Dataset;
		if(kind === InsightDatasetKind.Sections) {
			dataset = await this.addSectionsDataset(id,zip);
		} else if (kind === InsightDatasetKind.Rooms) { //  kind === InsightDatasetKind.Rooms
			let addRoomSolver = new AddRooms(zip);
			dataset = await addRoomSolver.addRoom(id);
		} else {
			return Promise.reject(new InsightError("Please add valid kind"));
		}
		this.datasetsMap.set(id, dataset); // valid dataset is added to list. // uncomment after line 210 done.
		return Promise.resolve(Array.from(this.datasetsMap.keys()));
	}

	public async addSectionsDataset(id: string, zip: JSZip): Promise<Dataset> {
		if(zip.folder(/courses/).length <= 0) { // check if folder courses exists, else return insight err, source: https://stackoverflow.com/questions/39939644/jszip-checking-if-a-zip-folder-contains-a-specific-file
			return Promise.reject(new InsightError(`The dataset ${id} has no valid sections and has therefore ` +
				"not been added."));
		}
		let promises: Array<Promise<void>> = [];
		let sectionsArray: string[] = [];
		let dataset = new Dataset(id,InsightDatasetKind.Sections,0); // initialize with 0 rows to start, we'll add to it
		zip.folder("courses")?.forEach((relativepath, file) => {
			const promise: Promise<void> = file.async("string").then((result) => {
				const sections = JSON.parse(result).result;
				for (const section of sections) { // check if section valid
					if (InsightFacade.validSection(section, id)) {
						if(section.Section === "overall") {
							section.Year = 1900;
						}
						let s = new Section(section.id,
							new SectionContent(
								section.Subject, section.Course, section.Avg, section.Professor, section.Title,
								section.Pass, section.Fail, section.Audit, section.id, section.Year));
						dataset.addToSectionsList(s);
						sectionsArray.push(section);
					}
				}
			});
			promises.push(promise);
		});
		await Promise.all(promises);
		dataset.numRows = sectionsArray.length; // update number of rows.
		if(dataset.numRows === 0) { // No valid sections, promise reject with insight error.
			return Promise.reject(new InsightError(`The dataset ${id} has no valid sections and has therefore ` +
				"not been added."));
		}
		// Below: persist valid sections of a valid dataset into file.
		const path = `./data/${id}` + "_section";
		await fs.outputFile(path,JSON.stringify(sectionsArray));
		return Promise.resolve(dataset);
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Query(this).performQuery(query);
	}

	// Gets an ID, checks if it's valid (contains underscore or whitespace results in promise reject insight err)
	// Then, for a valid ID, checks the dataset map to find if it exists and removes if it does.
	// Else promise rejects with not found error
	public removeDataset(id: string): Promise<string> {
		if (id.includes("_") || (id.trim() === "")) {
			return Promise.reject(new InsightError("Invalid ID"));
		} else if (!this.datasetsMap.has(id)) {
			return Promise.reject(new NotFoundError("ID not found"));
		} else {
			let kind = this.datasetsMap.get(id)?.kind === InsightDatasetKind.Sections ? "section" : "room";
			this.datasetsMap.delete(id);
			fs.removeSync(`./data/${id}_${kind}`);
			return Promise.resolve(id);
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let listOfDatasets: InsightDataset[] = [];
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
