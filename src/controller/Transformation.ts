import {InsightResult} from "./IInsightFacade";
export default class Transformation {
	public result: InsightResult[];
	public transJson: any;
	public groupArr: any;
	public applyArr: any;
	public groupingMap: any;
	constructor(transJson: any, result: InsightResult[]) {
		this.transJson = transJson;
		this.result = result;
	}

	public processTransform(): InsightResult[] {
		if(!this.transJson || !this.transJson?.GROUP || !this?.transJson.APPLY) {
			return this.result;
		} else {
			this.groupArr = this.transJson.GROUP;
			this.applyArr = this.transJson.APPLY;
			this.processGroup();
			this.processApply();
		}
		return this.result;
	}

	private processGroup() {
		let groupingMap = new Map<string|number,Set<InsightResult>>();
		let seenGroupValues = new Set();
		let groupResult = new Set();
		let elemSet = new Set<InsightResult>();
		for(let elem of this.result) {
			elemSet.add(elem);
		}
		groupingMap.set("all",elemSet); // Map(Set Set Set)
		for(let groupKey of this.groupArr) {
			seenGroupValues = new Set();
			let workingMap = groupingMap;
			groupingMap = new Map<string|number,Set<InsightResult>>();
			for (let setKey of workingMap.keys()) { // Get the list of keys, iterate
				let set = workingMap.get(setKey); // get the corresponding set.
				if(set){
					for (let elem of set) { // each elem is InsightResult
						let groupingValue = elem[groupKey];
						if(!seenGroupValues.has(groupingValue)) { // new thing to group, add new set
							seenGroupValues.add(groupingValue); // add to seen
							groupingMap.set(groupingValue,new Set());
						}
						groupingMap.get(groupingValue)?.add(elem); // put into group.
					}
				}
			}
		}
		this.groupingMap = groupingMap;
	}

	private processApply() {
		let finalResult: InsightResult[] = [];
		this.result = finalResult; // final answer is insight result array.
	}
}
enum TransformationOp {
	MAX = 1,
	MIN,
	AVG,
	COUNT,
	SUM
}

