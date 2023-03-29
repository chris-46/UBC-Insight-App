import chai, {expect} from "chai";
import chaiAsPromised from "chai-as-promised";
import InsightFacade from "../../src/controller/InsightFacade";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {beforeEach} from "mocha";
import {folderTest} from "@ubccpsc310/folder-test";

chai.use(chaiAsPromised);

// Setup code for this was from the given cpsc310 c0 youtube video https:// www.youtube.com// watch?v=D5efhwmJTKc&ab_channel=Katharine
// Also, the listDatasets mutant killing code was given for free.
type Input = unknown;
type Output = Promise<InsightResult[]>;
type Error = "InsightError" | "ResultTooLargeError";


describe("InsightFacade", function () {

	let courses: string;
	let rooms: string;

	before(function () {
		clearDisk();
		rooms = getContentFromArchives("rooms.zip");
		courses = getContentFromArchives("courses.zip");
	});

	describe("performQuery", function () {
		let facade: IInsightFacade;

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			return facade.addDataset("sections", courses, InsightDatasetKind.Sections).then(() => {
				return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			});
		});

		folderTest<Input, Output, Error>(
			"Perform Query Folder Tests",
			(input: Input): Output => {// facade.addDataset("courses",courses,InsightDatasetKind.Sections)
				return facade.performQuery(input);
			},
			"./test/resources/json",
			{
				errorValidator: (error): error is Error =>
					error === "InsightError" || error === "ResultTooLargeError",
				assertOnError: ((actual, expected) => {
					if (expected === "InsightError") {
						expect(actual).to.be.instanceof(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						// this should be unreachable
						expect.fail("UNEXPECTED ERROR");
					}
				})
			}
		);
	});

	describe("validateDataset", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("doesn't have courses directory", function () {
			let notCourses = getContentFromArchives("notCourses.zip");
			const result = facade.addDataset("sections", notCourses, InsightDatasetKind.Sections);
			return expect(result).to.eventually.rejectedWith(InsightError);
		});

		it("no valid sections", function () {
			let content = getContentFromArchives("noValidSections.zip");
			const result = facade.addDataset("sections", content, InsightDatasetKind.Sections);
			return expect(result).to.eventually.rejectedWith(InsightError);
		});

		it("invalid json", function () {
			let content = getContentFromArchives("invalidJsonDataset.zip");
			const result = facade.addDataset("sections", content, InsightDatasetKind.Sections);
			return expect(result).to.eventually.rejectedWith(InsightError);
		});

		it("skip over invalid file", function () {
			let content = getContentFromArchives("skipCpsc304.zip");
			facade.addDataset("sections", content, InsightDatasetKind.Sections);
			return facade.listDatasets()
				.then((insightDatasets) => {
					expect(insightDatasets).to.not.deep.equal([{ // no longer equivalent, we skipped over 304. Also, not error.
						id: "sections",
						kind: InsightDatasetKind.Sections,
						numRows: 64612
					}]);
				});
		});

	});
	// remove then dataset is gone
	describe("removeDataset", function () {

		let facade: IInsightFacade;

		const expectedDatasets: InsightDataset[] = [
			{
				id: "courses",
				kind: InsightDatasetKind.Sections,
				numRows: 64612
			}
		];

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		// remove one
		it("should remove one dataset", function () {

			return facade.addDataset("courses", courses, InsightDatasetKind.Sections)
				.then(() => facade.listDatasets())
				.then((insightDatasets) =>
					expect(insightDatasets).to.have.deep.members(expectedDatasets))
				.then(() => facade.removeDataset("courses"))
				.then(() => facade.listDatasets())
				.then((insightDatasets) =>
					expect(insightDatasets).to.not.have.deep.members(expectedDatasets));
		});

		// remove multiple
		it("should remove multiple datasets", function () {
			const expectedDatasets2: InsightDataset[] = [
				{
					id: "courses",
					kind: InsightDatasetKind.Sections,
					numRows: 64612
				},
				{
					id: "courses-2",
					kind: InsightDatasetKind.Sections,
					numRows: 64612
				}
			];
			return facade.addDataset("courses", courses, InsightDatasetKind.Sections)
				.then(() => facade.addDataset("courses-2", courses, InsightDatasetKind.Sections))
				.then(() => facade.listDatasets())
				.then((insightDatasets) =>
					expect(insightDatasets).to.have.deep.members(expectedDatasets2))
				.then(() => facade.removeDataset("courses"))
				.then(() => facade.removeDataset("courses-2"))
				.then(() => facade.listDatasets())
				.then((insightDatasets) =>
					expect(insightDatasets).to.not.have.deep.members(expectedDatasets2));
		});

		// not found
		it("should fail to remove dataset not found", function () {

			const removeResult = facade.addDataset("courses", courses, InsightDatasetKind.Sections)// just so we know not found is thrown not because it's empty
				.then(() => facade.removeDataset("courses-27"));

			return expect(removeResult).eventually.to.be.rejectedWith(NotFoundError);
		});

		// dataset for remove invalid id (whitespace only or underscore)
		it("should fail to remove invalid id - whitespace", function () {

			const removeResult = facade.addDataset("courses", courses, InsightDatasetKind.Sections) // just so we know not found is thrown not because it's empty
				.then(() => facade.removeDataset(" "));
			return expect(removeResult).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to remove invalid id - underscore", function () {

			const removeResult = facade.addDataset("courses", courses, InsightDatasetKind.Sections) // just so we know not found is thrown not because it's empty
				.then(() => facade.removeDataset("courses_27"));
			return expect(removeResult).eventually.to.be.rejectedWith(InsightError);
		});

	});

	describe("addDataset", function () {
		// test add one, add multiple, add existing, add invalid id
		// test by list, check, add, then list and check again

		let facade: IInsightFacade;

		const expectedDatasets: InsightDataset[] = [
			{
				id: "courses",
				kind: InsightDatasetKind.Sections,
				numRows: 64612
			}
		];

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		// add one
		it("should add one dataset", function () {

			return facade.listDatasets().then((insightDatasets) =>
				expect(insightDatasets).to.not.have.deep.members(expectedDatasets))
				.then(() => facade.addDataset("courses", courses, InsightDatasetKind.Sections))
				.then(() => facade.listDatasets())
				.then((insightDatasets) =>
					expect(insightDatasets).to.have.deep.members(expectedDatasets));
		});

		// add multiple
		it("should add multiple datasets", function () {

			const expectedDataset2: InsightDataset[] = [
				{
					id: "courses",
					kind: InsightDatasetKind.Sections,
					numRows: 64612
				},
				{
					id: "courses-2",
					kind: InsightDatasetKind.Sections,
					numRows: 64612
				}
			];
			return facade.listDatasets().then((insightDatasets) =>
				expect(insightDatasets).to.not.have.deep.members(expectedDataset2))
				.then(() => facade.addDataset("courses", courses, InsightDatasetKind.Sections))
				.then(() => facade.addDataset("courses-2", courses, InsightDatasetKind.Sections))
				.then(() => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.have.deep.members(expectedDataset2);
					expect(insightDatasets).to.have.length(2);
				});
		});

	 	// add Id fail arleady exists
		// if this wrong add somehow succeeded, there would be two of the same Id in the result of list datasets.
		it("should fail add existing dataset", function () {
			const result = facade.addDataset("courses", courses, InsightDatasetKind.Sections)
				.then(() => facade.addDataset("courses", courses, InsightDatasetKind.Sections));
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		// add Id invalid contain whitespace only
		it("should fail add invalid dataset - whitespace id", function () {

			const result = facade.addDataset(" ", courses, InsightDatasetKind.Sections);

			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		// add Id invalid contain whitespace only
		it("should fail add invalid dataset - underscore", function () {

			const result = facade.addDataset("abc_123", courses, InsightDatasetKind.Sections);

			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
	});

	describe("listDatasets", function () {

		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should list no datasets", function () {
			// return promise so it effectively waits to run this
			return facade.listDatasets().then((insightDatasets) => {
				expect(insightDatasets).to.deep.equal([]);
				// Could also do:
				// expect(insightDatasets).to.be.an.instanceof(Array);
				// expects(insightDatasets).to.have.length(0);
			});
		});

		it("should list one dataset", function () {
			// 1. Add a dataset
			return facade.addDataset("courses", courses, InsightDatasetKind.Sections)
				.then((addedIds) => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([{
						id: "courses",
						kind: InsightDatasetKind.Sections,
						numRows: 64612
					}]);
				});
			// 2. list datasets again

		});

		it("should list multiple dataset", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Sections)
				.then(() => facade.addDataset("courses-2", courses, InsightDatasetKind.Sections))
				.then(() => facade.listDatasets())
				.then((insightDatasets) => {
					const expectedDatasets: InsightDataset[] = [
						{
							id: "courses",
							kind: InsightDatasetKind.Sections,
							numRows: 64612
						},
						{
							id: "courses-2",
							kind: InsightDatasetKind.Sections,
							numRows: 64612
						}
					];
					clearDisk();
					expect(insightDatasets).to.have.deep.members(expectedDatasets);
					expect(insightDatasets).to.have.length(2);
				});
		});
	});

	describe("addDatasetRooms", function () {
		// test add one, add multiple, add existing, add invalid id
		// test by list, check, add, then list and check again
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		// add one
		it("should add one dataset", async function () {
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
		});
	});

});
