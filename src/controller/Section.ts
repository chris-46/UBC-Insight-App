export class Section {
	public id: string;
	public sectionContent: SectionContent;

	constructor(id: string, sectionContent: SectionContent) {
		this.id = id;
		this.sectionContent = sectionContent;
	}
}

export class SectionContent {
	public dept: string; // The department that offered the section.
	public id: string; // The course number (will be treated as a string (e.g., 499b)).
	public avg: number; // The average of the section offering.
	public instructor: string; // The instructor teaching the section offering.
	public title: string; // The name of the course.
	public pass: number; // The number of students that passed the section offering.
	public fail: number; // The number of students that failed the section offering.
	public audit: number; // The number of students that audited the section offering.
	public uuid: string; // The unique id of a  section offering.
	public year: number; // The year the section offering ran. "Section": "overall" -> year : 1900. OK
	public translationMap: Map<string, any>;

	constructor(
		dept: string,
		id: string,
		avg: number,
		instructor: string,
		title: string,
		pass: number,
		fail: number,
		audit: number,
		uuid: string,
		year: number) {
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
		this.translationMap = new Map<string, any>(
			[["dept", dept], ["id", id], ["avg", avg], ["instructor", instructor], ["title", title], ["pass", pass],
				["fail", fail], ["audit", audit], ["uuid", uuid], ["year", year]]);
	}

}
