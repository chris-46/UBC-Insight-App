"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const Transformation_1 = __importDefault(require("./Transformation"));
const RESULT_SIZE_LIMIT = 5000;
let datasetQueried = "";
let orderByColumn = [];
let dir = 1;
class Query {
    constructor(insightFacade) {
        this.insightFacade = insightFacade;
    }
    performQuery(query) {
        datasetQueried = "";
        let queryJson;
        try {
            queryJson = JSON.parse(JSON.stringify(query));
        }
        catch (e) {
            return Promise.reject(new IInsightFacade_1.InsightError("Invalid query string"));
        }
        let whereResult = queryJson.WHERE;
        if (whereResult === undefined) {
            return Promise.reject(new IInsightFacade_1.InsightError("Invalid query: Missing WHERE portion."));
        }
        else if (Object.keys(whereResult).length > 1) {
            return Promise.reject(new IInsightFacade_1.InsightError("Invalid query: WHERE has multiple keys."));
        }
        let optionsResult = queryJson.OPTIONS;
        if (optionsResult === undefined) {
            return Promise.reject(new IInsightFacade_1.InsightError("Invalid query: Missing OPTIONS portion."));
        }
        let optionsColumnsResult = queryJson.OPTIONS.COLUMNS;
        if (optionsColumnsResult === undefined || optionsColumnsResult.length === 0) {
            return Promise.reject(new IInsightFacade_1.InsightError("Invalid query: Missing or empty COLUMNS in OPTIONS portion."));
        }
        for (let c in optionsColumnsResult) {
            if (!this.isValidKey(optionsColumnsResult[c], false)) {
                return Promise.reject(new IInsightFacade_1.InsightError(`Invalid query: Invalid column key ${optionsColumnsResult[c]}`));
            }
        }
        let result = this.insightResultSetup(optionsColumnsResult);
        result = this.filter(queryJson.WHERE, result);
        orderByColumn = queryJson.OPTIONS?.ORDER?.keys;
        if (orderByColumn) {
            dir = (queryJson.OPTIONS?.ORDER?.dir) === "UP" ? 1 : -1;
            if (orderByColumn.length === 0) {
                return Promise.reject(new IInsightFacade_1.InsightError("Empty keys for order by column."));
            }
            for (let o of orderByColumn) {
                if (this.isValidKey(o, false)) {
                    result = this.orderResults(result);
                }
                else {
                    return Promise.reject(new IInsightFacade_1.InsightError(`Invalid column to order by: ${o}`));
                }
            }
        }
        let t = new Transformation_1.default(queryJson?.TRANSFORMATIONS, result);
        result = t.processTransform();
        if (result.length > RESULT_SIZE_LIMIT) {
            return Promise.reject(new IInsightFacade_1.ResultTooLargeError());
        }
        return Promise.resolve(result);
    }
    filter(filterQuery, insightResult) {
        if (!filterQuery) {
            return insightResult;
        }
        if (filterQuery
            && Object.keys(filterQuery).length === 0
            && Object.getPrototypeOf(filterQuery) === Object.prototype) {
            return insightResult;
        }
        else {
            if (filterQuery["GT"] !== undefined) {
                return insightResult.filter((section) => {
                    return this.isValid("GT", filterQuery, section);
                });
            }
            else if (filterQuery["LT"] !== undefined) {
                return insightResult.filter((section) => {
                    return this.isValid("LT", filterQuery, section);
                });
            }
            else if (filterQuery["EQ"] !== undefined) {
                return insightResult.filter((section) => {
                    return this.isValid("EQ", filterQuery, section);
                });
            }
            else if (filterQuery["IS"] !== undefined) {
                return insightResult.filter((section) => {
                    return this.isValid("IS", filterQuery, section);
                });
            }
            else if (filterQuery["AND"] !== undefined) {
                return this.filterQueryAnd(filterQuery, insightResult);
            }
            else if (filterQuery["OR"] !== undefined) {
                return this.filterQueryOr(filterQuery, insightResult);
            }
            else if (filterQuery["NOT"] !== undefined) {
                return this.filterQueryNot(filterQuery, insightResult);
            }
            else {
                throw new IInsightFacade_1.InsightError("No valid query operators found.");
            }
        }
    }
    filterQueryNot(filterQuery, insightResult) {
        let answer = [];
        let result = this.filter(filterQuery.NOT, insightResult);
        let count = 0;
        for (let section of insightResult) {
            count++;
            if (!result.includes(section)) {
                answer.push(section);
            }
        }
        return answer;
    }
    filterQueryOr(filterQuery, insightResult) {
        let result = [];
        if (Object.keys(filterQuery.OR).length === 0) {
            throw new IInsightFacade_1.InsightError("OR must be a non-empty array.");
        }
        for (let filterElem of filterQuery.OR) {
            result = result.concat(this.filter(filterElem, insightResult));
        }
        let resultSet = new Set(result);
        return Array.from(resultSet);
    }
    filterQueryAnd(filterQuery, insightResult) {
        let result = insightResult;
        if (filterQuery.AND.length > 1) {
            for (let filterElem of filterQuery.AND) {
                result = this.filter(filterElem, result);
            }
        }
        else {
            result = this.filter(filterQuery.AND, result);
        }
        return result;
    }
    isValid(parameter, filterQuery, section) {
        if (parameter === "GT" || parameter === "LT" || parameter === "EQ") {
            if (Object.keys(filterQuery[parameter]).length !== 1) {
                throw new IInsightFacade_1.InsightError("Expected only one key");
            }
            if (typeof filterQuery[parameter][Object.keys(filterQuery[parameter])[0]] !== "number") {
                throw new IInsightFacade_1.InsightError("GT, LT, and EQ expect a number");
            }
        }
        else {
            if (typeof filterQuery[parameter][Object.keys(filterQuery[parameter])[0]] !== "string") {
                throw new IInsightFacade_1.InsightError("IS expects a string");
            }
        }
        if (parameter === "GT") {
            if (filterQuery["GT"]) {
                let array = Object.keys(filterQuery["GT"]);
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
            return this.isValidIs(filterQuery, section);
        }
        return false;
    }
    isValidIs(filterQuery, section) {
        if (filterQuery["IS"]) {
            let array = Object.keys(filterQuery["IS"]);
            let stringKey = filterQuery["IS"][array[0]];
            let str = section[`${datasetQueried}_${array[0].split("_")[1]}`];
            if (stringKey.startsWith("*")) {
                if (stringKey.length <= 1) {
                    return true;
                }
                else if (stringKey.endsWith("*") && typeof str === "string") {
                    if (stringKey.substring(1, stringKey.length - 1).includes("*")) {
                        throw new IInsightFacade_1.InsightError("Only two asterisks allowed, at start and end");
                    }
                    return str.includes(stringKey.substring(1, stringKey.length - 1));
                }
                else if (typeof str === "string") {
                    if (stringKey.substring(1, stringKey.length).includes("*")) {
                        throw new IInsightFacade_1.InsightError("Only two asterisks allowed, at start and end");
                    }
                    return str.endsWith(stringKey.substring(1, stringKey.length));
                }
            }
            else if (stringKey.endsWith("*") && typeof str === "string") {
                if (stringKey.substring(0, stringKey.length - 1).includes("*")) {
                    throw new IInsightFacade_1.InsightError("Only two asterisks allowed, at start and end");
                }
                return str.startsWith(stringKey.substring(0, stringKey.length - 1));
            }
            else if (section[`${datasetQueried}_${array[0].split("_")[1]}`] !== filterQuery["IS"][array[0]]) {
                return false;
            }
        }
        return true;
    }
    compare(a, b) {
        let done = false;
        let orderIter = 0;
        while (!done) {
            if (orderIter >= orderByColumn.length) {
                break;
            }
            let prop = orderByColumn[orderIter];
            if (a[prop] > b[prop]) {
                orderIter = 0;
                return dir;
            }
            else if (a[prop] < b[prop]) {
                orderIter = 0;
                return -1 * dir;
            }
            orderIter += 1;
        }
        return 0;
    }
    orderResults(result) {
        result = result.sort(this.compare);
        return result;
    }
    insightResultSetup(optionsColumnsResult) {
        let datasetID = optionsColumnsResult[0].split("_")[0];
        let result = [];
        let dataset = this.insightFacade.datasetsMap.get(datasetID);
        if (!dataset || (dataset.sectionsList.length === 0 && dataset.roomsList.length === 0)) {
            return [];
        }
        let listOfSections = dataset.sectionsList;
        let listOfRooms = dataset.roomsList;
        let listOfObjects = dataset?.kind === IInsightFacade_1.InsightDatasetKind.Sections ? listOfSections : listOfRooms;
        for (const obj of listOfObjects) {
            let element = {};
            for (const column of optionsColumnsResult) {
                let cName = column.split("_")[1];
                if (dataset.kind === IInsightFacade_1.InsightDatasetKind.Sections) {
                    element[`${datasetQueried}_${cName}`] = obj.sectionContent.translationMap.get(cName);
                }
                else {
                    element[`${datasetQueried}_${cName}`] = obj.roomContent.translationMap.get(cName);
                }
            }
            if (!result.includes(element)) {
                result.push(element);
            }
        }
        return result;
    }
    isValidKey(key, query) {
        let datasetName = (key.includes("_")) ? key.split("_")[0] : datasetQueried;
        let keyProperty = key.split("_")[1];
        if (datasetQueried === "") {
            datasetQueried = datasetName;
        }
        if (datasetQueried !== datasetName || key.trim() === "") {
            return false;
        }
        let sProperties = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
        let rProps = ["lat", "lon", "seats", "fullname", "shortname",
            "number", "name", "address", "type", "furniture", "href"];
        let legalColumn = (datasetName === "rooms" && rProps.includes(keyProperty)) ||
            (datasetName === "sections" && sProperties.includes(keyProperty)) || !(key.includes("_"));
        if (query) {
            return this.insightFacade.datasetsMap.has(datasetName) &&
                legalColumn;
        }
        else {
            return legalColumn;
        }
    }
}
exports.default = Query;
//# sourceMappingURL=Query.js.map