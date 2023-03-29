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
const chai_1 = __importStar(require("chai"));
const chai_as_promised_1 = __importDefault(require("chai-as-promised"));
const InsightFacade_1 = __importDefault(require("../../src/controller/InsightFacade"));
const IInsightFacade_1 = require("../../src/controller/IInsightFacade");
const TestUtil_1 = require("../TestUtil");
const mocha_1 = require("mocha");
const folder_test_1 = require("@ubccpsc310/folder-test");
chai_1.default.use(chai_as_promised_1.default);
describe("InsightFacade", function () {
    let courses;
    let rooms;
    before(function () {
        (0, TestUtil_1.clearDisk)();
        rooms = (0, TestUtil_1.getContentFromArchives)("rooms.zip");
        courses = (0, TestUtil_1.getContentFromArchives)("courses.zip");
    });
    describe("performQuery", function () {
        let facade;
        before(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
            return facade.addDataset("sections", courses, IInsightFacade_1.InsightDatasetKind.Sections).then(() => {
                return facade.addDataset("rooms", rooms, IInsightFacade_1.InsightDatasetKind.Rooms);
            });
        });
        (0, folder_test_1.folderTest)("Perform Query Folder Tests", (input) => {
            return facade.performQuery(input);
        }, "./test/resources/json", {
            errorValidator: (error) => error === "InsightError" || error === "ResultTooLargeError",
            assertOnError: ((actual, expected) => {
                if (expected === "InsightError") {
                    (0, chai_1.expect)(actual).to.be.instanceof(IInsightFacade_1.InsightError);
                }
                else if (expected === "ResultTooLargeError") {
                    (0, chai_1.expect)(actual).to.be.instanceof(IInsightFacade_1.ResultTooLargeError);
                }
                else {
                    chai_1.expect.fail("UNEXPECTED ERROR");
                }
            })
        });
    });
    describe("validateDataset", function () {
        let facade;
        (0, mocha_1.beforeEach)(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        it("doesn't have courses directory", function () {
            let notCourses = (0, TestUtil_1.getContentFromArchives)("notCourses.zip");
            const result = facade.addDataset("sections", notCourses, IInsightFacade_1.InsightDatasetKind.Sections);
            return (0, chai_1.expect)(result).to.eventually.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("no valid sections", function () {
            let content = (0, TestUtil_1.getContentFromArchives)("noValidSections.zip");
            const result = facade.addDataset("sections", content, IInsightFacade_1.InsightDatasetKind.Sections);
            return (0, chai_1.expect)(result).to.eventually.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("invalid json", function () {
            let content = (0, TestUtil_1.getContentFromArchives)("invalidJsonDataset.zip");
            const result = facade.addDataset("sections", content, IInsightFacade_1.InsightDatasetKind.Sections);
            return (0, chai_1.expect)(result).to.eventually.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("skip over invalid file", function () {
            let content = (0, TestUtil_1.getContentFromArchives)("skipCpsc304.zip");
            facade.addDataset("sections", content, IInsightFacade_1.InsightDatasetKind.Sections);
            return facade.listDatasets()
                .then((insightDatasets) => {
                (0, chai_1.expect)(insightDatasets).to.not.deep.equal([{
                        id: "sections",
                        kind: IInsightFacade_1.InsightDatasetKind.Sections,
                        numRows: 64612
                    }]);
            });
        });
    });
    describe("removeDataset", function () {
        let facade;
        const expectedDatasets = [
            {
                id: "courses",
                kind: IInsightFacade_1.InsightDatasetKind.Sections,
                numRows: 64612
            }
        ];
        (0, mocha_1.beforeEach)(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        it("should remove one dataset", function () {
            return facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections)
                .then(() => facade.listDatasets())
                .then((insightDatasets) => (0, chai_1.expect)(insightDatasets).to.have.deep.members(expectedDatasets))
                .then(() => facade.removeDataset("courses"))
                .then(() => facade.listDatasets())
                .then((insightDatasets) => (0, chai_1.expect)(insightDatasets).to.not.have.deep.members(expectedDatasets));
        });
        it("should remove multiple datasets", function () {
            const expectedDatasets2 = [
                {
                    id: "courses",
                    kind: IInsightFacade_1.InsightDatasetKind.Sections,
                    numRows: 64612
                },
                {
                    id: "courses-2",
                    kind: IInsightFacade_1.InsightDatasetKind.Sections,
                    numRows: 64612
                }
            ];
            return facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections)
                .then(() => facade.addDataset("courses-2", courses, IInsightFacade_1.InsightDatasetKind.Sections))
                .then(() => facade.listDatasets())
                .then((insightDatasets) => (0, chai_1.expect)(insightDatasets).to.have.deep.members(expectedDatasets2))
                .then(() => facade.removeDataset("courses"))
                .then(() => facade.removeDataset("courses-2"))
                .then(() => facade.listDatasets())
                .then((insightDatasets) => (0, chai_1.expect)(insightDatasets).to.not.have.deep.members(expectedDatasets2));
        });
        it("should fail to remove dataset not found", function () {
            const removeResult = facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections)
                .then(() => facade.removeDataset("courses-27"));
            return (0, chai_1.expect)(removeResult).eventually.to.be.rejectedWith(IInsightFacade_1.NotFoundError);
        });
        it("should fail to remove invalid id - whitespace", function () {
            const removeResult = facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections)
                .then(() => facade.removeDataset(" "));
            return (0, chai_1.expect)(removeResult).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should fail to remove invalid id - underscore", function () {
            const removeResult = facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections)
                .then(() => facade.removeDataset("courses_27"));
            return (0, chai_1.expect)(removeResult).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
    });
    describe("addDataset", function () {
        let facade;
        const expectedDatasets = [
            {
                id: "courses",
                kind: IInsightFacade_1.InsightDatasetKind.Sections,
                numRows: 64612
            }
        ];
        (0, mocha_1.beforeEach)(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        it("should add one dataset", function () {
            return facade.listDatasets().then((insightDatasets) => (0, chai_1.expect)(insightDatasets).to.not.have.deep.members(expectedDatasets))
                .then(() => facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections))
                .then(() => facade.listDatasets())
                .then((insightDatasets) => (0, chai_1.expect)(insightDatasets).to.have.deep.members(expectedDatasets));
        });
        it("should add multiple datasets", function () {
            const expectedDataset2 = [
                {
                    id: "courses",
                    kind: IInsightFacade_1.InsightDatasetKind.Sections,
                    numRows: 64612
                },
                {
                    id: "courses-2",
                    kind: IInsightFacade_1.InsightDatasetKind.Sections,
                    numRows: 64612
                }
            ];
            return facade.listDatasets().then((insightDatasets) => (0, chai_1.expect)(insightDatasets).to.not.have.deep.members(expectedDataset2))
                .then(() => facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections))
                .then(() => facade.addDataset("courses-2", courses, IInsightFacade_1.InsightDatasetKind.Sections))
                .then(() => facade.listDatasets())
                .then((insightDatasets) => {
                (0, chai_1.expect)(insightDatasets).to.have.deep.members(expectedDataset2);
                (0, chai_1.expect)(insightDatasets).to.have.length(2);
            });
        });
        it("should fail add existing dataset", function () {
            const result = facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections)
                .then(() => facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections));
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should fail add invalid dataset - whitespace id", function () {
            const result = facade.addDataset(" ", courses, IInsightFacade_1.InsightDatasetKind.Sections);
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should fail add invalid dataset - underscore", function () {
            const result = facade.addDataset("abc_123", courses, IInsightFacade_1.InsightDatasetKind.Sections);
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
    });
    describe("listDatasets", function () {
        let facade;
        (0, mocha_1.beforeEach)(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        it("should list no datasets", function () {
            return facade.listDatasets().then((insightDatasets) => {
                (0, chai_1.expect)(insightDatasets).to.deep.equal([]);
            });
        });
        it("should list one dataset", function () {
            return facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections)
                .then((addedIds) => facade.listDatasets())
                .then((insightDatasets) => {
                (0, chai_1.expect)(insightDatasets).to.deep.equal([{
                        id: "courses",
                        kind: IInsightFacade_1.InsightDatasetKind.Sections,
                        numRows: 64612
                    }]);
            });
        });
        it("should list multiple dataset", function () {
            return facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Sections)
                .then(() => facade.addDataset("courses-2", courses, IInsightFacade_1.InsightDatasetKind.Sections))
                .then(() => facade.listDatasets())
                .then((insightDatasets) => {
                const expectedDatasets = [
                    {
                        id: "courses",
                        kind: IInsightFacade_1.InsightDatasetKind.Sections,
                        numRows: 64612
                    },
                    {
                        id: "courses-2",
                        kind: IInsightFacade_1.InsightDatasetKind.Sections,
                        numRows: 64612
                    }
                ];
                (0, TestUtil_1.clearDisk)();
                (0, chai_1.expect)(insightDatasets).to.have.deep.members(expectedDatasets);
                (0, chai_1.expect)(insightDatasets).to.have.length(2);
            });
        });
    });
    describe("addDatasetRooms", function () {
        let facade;
        (0, mocha_1.beforeEach)(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        it("should add one dataset", async function () {
            await facade.addDataset("rooms", rooms, IInsightFacade_1.InsightDatasetKind.Rooms);
        });
    });
});
//# sourceMappingURL=InsightFacade.spec.js.map