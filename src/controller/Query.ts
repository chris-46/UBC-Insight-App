import {
	InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError
} from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import Transformation from "./Transformation";
import {Section} from "./Section";
import {Room} from "./Room";

const RESULT_SIZE_LIMIT = 5000;
let datasetQueried: string = "";
let orderByColumn: string[] = [];
let dir: number = 1;
export default class Query {
	public insightFacade: InsightFacade;
	constructor(insightFacade: InsightFacade) {
		this.insightFacade = insightFacade;
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		datasetQueried = ""; // reset every query.
		let queryJson;
		try{
			queryJson = JSON.parse(JSON.stringify(query));
		} catch (e) { // check whether the JSON is correct or not
			return Promise.reject(new InsightError("Invalid query string"));
		}
		let whereResult = queryJson.WHERE;
		if(whereResult === undefined) { // must have a where section, empty is fine
			return Promise.reject(new InsightError("Invalid query: Missing WHERE portion."));
		} else if(Object.keys(whereResult).length > 1) { // must have a where section, empty is fine
			return Promise.reject(new InsightError("Invalid query: WHERE has multiple keys."));
		}
		let optionsResult = queryJson.OPTIONS;
		if(optionsResult === undefined) { // must have an options section.
			return Promise.reject(new InsightError("Invalid query: Missing OPTIONS portion."));
		}
		let optionsColumnsResult = queryJson.OPTIONS.COLUMNS;
		if(optionsColumnsResult === undefined || optionsColumnsResult.length === 0) { // must have a columns section in options, it can"t be empty either.
			return Promise.reject(new InsightError("Invalid query: Missing or empty COLUMNS in OPTIONS portion."));
		}
		for(let c in optionsColumnsResult) {
			if(!this.isValidKey(optionsColumnsResult[c],false)) { // keys should be of the correct format
				return Promise.reject(new InsightError(`Invalid query: Invalid column key ${optionsColumnsResult[c]}`));
			}
		}
		let result = this.insightResultSetup(optionsColumnsResult);
		result = this.filter(queryJson.WHERE,result);
		orderByColumn = queryJson.OPTIONS?.ORDER?.keys; // array of columns
		if(orderByColumn) {
			dir = (queryJson.OPTIONS?.ORDER?.dir) === "UP" ? 1 : -1;
			if(orderByColumn.length === 0) {
				return Promise.reject(new InsightError("Empty keys for order by column."));
			}
			for(let o of orderByColumn){
				if(this.isValidKey(o,false)){ // Makes sure each column name makes sense
					result = this.orderResults(result);
				} else {
					return Promise.reject(new InsightError(`Invalid column to order by: ${o}`));
				}
			}
		}
		let t = new Transformation(queryJson?.TRANSFORMATIONS, result);
		result = t.processTransform();
		if(result.length > RESULT_SIZE_LIMIT) {
			return Promise.reject(new ResultTooLargeError());
		}
		return Promise.resolve(result);
	}

	private filter(filterQuery: any, insightResult: InsightResult[]): InsightResult[] {
		if (!filterQuery) {
			return insightResult;
		}
		if (filterQuery
			&& Object.keys(filterQuery).length === 0
			&& Object.getPrototypeOf(filterQuery) === Object.prototype) {
			return insightResult;
		} else {
			if (filterQuery["GT"] !== undefined) { // assuming GT is not empty
				return insightResult.filter((section) => {
					return this.isValid("GT",filterQuery, section);
				});
			} else if (filterQuery["LT"] !== undefined) { // assuming GT is not empty
				return insightResult.filter((section) => {
					return this.isValid("LT",filterQuery, section);
				});
			} else if (filterQuery["EQ"] !== undefined) { // assuming GT is not empty
				return insightResult.filter((section) => {
					return this.isValid("EQ",filterQuery, section);
				});
			} else if (filterQuery["IS"] !== undefined) { // assuming GT is not empty
				return insightResult.filter((section) => {
					return this.isValid("IS",filterQuery, section);
				});
			} else if (filterQuery["AND"] !== undefined) {
				return this.filterQueryAnd(filterQuery,insightResult);
			} else if (filterQuery["OR"] !== undefined) {
				return this.filterQueryOr(filterQuery,insightResult);
			} else if (filterQuery["NOT"] !== undefined) { // might need to validate each filter
				return this.filterQueryNot(filterQuery,insightResult);
			} else {
				throw new InsightError("No valid query operators found.");
			}
		}
	}

	private filterQueryNot(filterQuery: any, insightResult: InsightResult[]): InsightResult[] {
		let answer: InsightResult[] = [];
		let result = this.filter(filterQuery.NOT,insightResult);
		let count = 0;
		for (let section of insightResult) {
			count++;
			if (!result.includes(section)) {
				answer.push(section);
			}
		}
		return answer;
	}

	private filterQueryOr(filterQuery: any, insightResult: InsightResult[]): InsightResult[] {
		let result: InsightResult[] = [];
		if(Object.keys(filterQuery.OR).length === 0) {
			throw new InsightError("OR must be a non-empty array.");
		}
		for(let filterElem of filterQuery.OR) {
			result = result.concat(this.filter(filterElem,insightResult));
		}
		let resultSet = new Set(result);
		return Array.from(resultSet);
	}

	private filterQueryAnd(filterQuery: any, insightResult: InsightResult[]): InsightResult[] {
		let result = insightResult;
		if(filterQuery.AND.length > 1) {
			for (let filterElem of filterQuery.AND) {
				 result = this.filter(filterElem, result);
			}
		} else {
			result = this.filter(filterQuery.AND, result);
		}
		return result;
	}

	private isValid (parameter: string, filterQuery: any, section: InsightResult): boolean {
		if(parameter === "GT" || parameter === "LT" || parameter === "EQ"){
			if (Object.keys(filterQuery[parameter]).length !== 1) {
				throw new InsightError("Expected only one key");
			}
			if (typeof filterQuery[parameter][Object.keys(filterQuery[parameter])[0]] !== "number") {
				throw new InsightError("GT, LT, and EQ expect a number");
			}
		} else {
			if (typeof filterQuery[parameter][Object.keys(filterQuery[parameter])[0]] !== "string") {
				throw new InsightError("IS expects a string");
			}
		}
		if (parameter === "GT") {
			if (filterQuery["GT"]) {
				let array = Object.keys(filterQuery["GT"]); // array[0] gives "section_avg", we split to get "avg"
				if (section[`${datasetQueried}_${array[0].split("_")[1]}`] <= filterQuery["GT"][array[0]]) {
					return false;
				}
			}
			return true;
		}
		if (parameter === "LT") {
			if (filterQuery["LT"]) {
				let array = Object.keys(filterQuery["LT"]);
				if (section[`${datasetQueried}_${array[0].split("_")[1]}`] >= filterQuery["LT"][array[0]]) {
					return false;
				}
			}
			return true;
		}
		if (parameter === "EQ") {
			if (filterQuery["EQ"]) {
				let array = Object.keys(filterQuery["EQ"]);
				if (section[`${datasetQueried}_${array[0].split("_")[1]}`] !== filterQuery["EQ"][array[0]]) {
					return false;
				}
			}
			return true;
		}
		if (parameter === "IS") {
			return this.isValidIs(filterQuery,section);
		}
		return false;
	}

	private isValidIs (filterQuery: any, section: InsightResult): boolean {
		if (filterQuery["IS"]) {
			let array = Object.keys(filterQuery["IS"]);
			let stringKey = filterQuery["IS"][array[0]];
			let str = section[`${datasetQueried}_${array[0].split("_")[1]}`];
			if(stringKey.startsWith("*")) { // contains only star
				if(stringKey.length <= 1) {
					return true;
				} else if(stringKey.endsWith("*") && typeof str === "string") { // starts and ends with *, *abcd*
					if(stringKey.substring(1,stringKey.length - 1).includes("*")) {
						throw new InsightError("Only two asterisks allowed, at start and end");
					}
					return str.includes(stringKey.substring(1,stringKey.length - 1));
				} else if(typeof str === "string") { // starts with *, *abcd
					if(stringKey.substring(1,stringKey.length).includes("*")) {
						throw new InsightError("Only two asterisks allowed, at start and end");
					}
					return str.endsWith(stringKey.substring(1,stringKey.length));
				}
			} else if(stringKey.endsWith("*") && typeof str === "string") { // ends with *, abcd*
				if(stringKey.substring(0,stringKey.length - 1).includes("*")) {
					throw new InsightError("Only two asterisks allowed, at start and end");
				}
				return str.startsWith(stringKey.substring(0,stringKey.length - 1));
			}else if (section[`${datasetQueried}_${array[0].split("_")[1]}`] !== filterQuery["IS"][array[0]]) {
				return false;
			}
		}
		return true;
	}

	private compare(a: any,b: any): number {
		let done = false;
		let orderIter: number = 0;
		while(!done) {
			if(orderIter >= orderByColumn.length){
				break;
			}
			let prop = orderByColumn[orderIter];
			if(a[prop] > b[prop]) {
				orderIter = 0;
				return dir;
			} else if(a[prop] < b[prop]) {
				orderIter = 0;
				return -1 * dir;
			}
			orderIter += 1; // move to next column.
		}
		return 0;
	}

	private orderResults(result: InsightResult[]): InsightResult[] {
		result = result.sort(this.compare);
		return result;
	}

	private insightResultSetup(optionsColumnsResult: any): InsightResult[] {
		let datasetID: string = optionsColumnsResult[0].split("_")[0];
		let result: InsightResult[] = [];
		let dataset = this.insightFacade.datasetsMap.get(datasetID);
		if(!dataset || (dataset.sectionsList.length === 0 && dataset.roomsList.length === 0)) {
			return [];
		}
		let listOfSections: Section[] = dataset.sectionsList;
		let listOfRooms: Room[] = dataset.roomsList;
		let listOfObjects = dataset?.kind === InsightDatasetKind.Sections ? listOfSections : listOfRooms;
		for (const obj of listOfObjects) { // add columns of each element to new array
			let element = {} as InsightResult;
			for (const column of optionsColumnsResult) {
				let cName: string = column.split("_")[1];
				if(dataset.kind === InsightDatasetKind.Sections) {
					element[`${datasetQueried}_${cName}`] = (obj as Section).sectionContent.translationMap.get(cName);
				} else {
					element[`${datasetQueried}_${cName}`] = (obj as Room).roomContent.translationMap.get(cName);
				}
			}
			if(!result.includes(element)) { // don"t add duplicate elements
				result.push(element);
			}
		}
		return result;
	}

	private isValidKey(key: string, query: boolean): boolean {
		let datasetName: string = (key.includes("_")) ? key.split("_")[0] : datasetQueried;
		let keyProperty = key.split("_")[1];
		if(datasetQueried === "") {
			datasetQueried = datasetName;
		}
		if(datasetQueried !== datasetName || key.trim() === "") {
			return false; // reference multiple datasets or empty column.
		}
		let sProperties = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
		let rProps = ["lat", "lon", "seats", "fullname", "shortname",
			"number", "name", "address", "type", "furniture", "href"];
		let legalColumn = (datasetName === "rooms" && rProps.includes(keyProperty)) ||
			(datasetName === "sections" && sProperties.includes(keyProperty)) || !(key.includes("_"));
		if(query) { // we can check if the datset has been added.
			return this.insightFacade.datasetsMap.has(datasetName) && // dataset name exists
				legalColumn;
		} else { // trying to add dataset, we only check legal columns.
			return legalColumn;
		}
	}
}
