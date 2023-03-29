"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Transformation {
    constructor(transJson, result) {
        this.transJson = transJson;
        this.result = result;
    }
    processTransform() {
        if (!this.transJson || !this.transJson?.GROUP || !this?.transJson.APPLY) {
            return this.result;
        }
        else {
            this.groupArr = this.transJson.GROUP;
            this.applyArr = this.transJson.APPLY;
            this.processGroup();
            this.processApply();
        }
        return this.result;
    }
    processGroup() {
        let groupingMap = new Map();
        let seenGroupValues = new Set();
        let groupResult = new Set();
        let elemSet = new Set();
        for (let elem of this.result) {
            elemSet.add(elem);
        }
        groupingMap.set("all", elemSet);
        for (let groupKey of this.groupArr) {
            seenGroupValues = new Set();
            let workingMap = groupingMap;
            groupingMap = new Map();
            for (let setKey of workingMap.keys()) {
                let set = workingMap.get(setKey);
                if (set) {
                    for (let elem of set) {
                        let groupingValue = elem[groupKey];
                        if (!seenGroupValues.has(groupingValue)) {
                            seenGroupValues.add(groupingValue);
                            groupingMap.set(groupingValue, new Set());
                        }
                        groupingMap.get(groupingValue)?.add(elem);
                    }
                }
            }
        }
        this.groupingMap = groupingMap;
    }
    processApply() {
        let finalResult = [];
        this.result = finalResult;
    }
}
exports.default = Transformation;
var TransformationOp;
(function (TransformationOp) {
    TransformationOp[TransformationOp["MAX"] = 1] = "MAX";
    TransformationOp[TransformationOp["MIN"] = 2] = "MIN";
    TransformationOp[TransformationOp["AVG"] = 3] = "AVG";
    TransformationOp[TransformationOp["COUNT"] = 4] = "COUNT";
    TransformationOp[TransformationOp["SUM"] = 5] = "SUM";
})(TransformationOp || (TransformationOp = {}));
//# sourceMappingURL=Transformation.js.map