"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionContent = exports.Section = void 0;
class Section {
    constructor(id, sectionContent) {
        this.id = id;
        this.sectionContent = sectionContent;
    }
}
exports.Section = Section;
class SectionContent {
    constructor(dept, id, avg, instructor, title, pass, fail, audit, uuid, year) {
        this.dept = dept;
        this.id = id;
        this.avg = avg;
        this.instructor = instructor;
        this.title = title;
        this.pass = pass;
        this.fail = fail;
        this.audit = audit;
        this.uuid = uuid;
        this.year = year;
        this.translationMap = new Map([["dept", dept], ["id", id], ["avg", avg], ["instructor", instructor], ["title", title], ["pass", pass],
            ["fail", fail], ["audit", audit], ["uuid", uuid], ["year", year]]);
    }
}
exports.SectionContent = SectionContent;
//# sourceMappingURL=Section.js.map