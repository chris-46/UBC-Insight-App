export class Room {
	public id: string;
	public roomContent: RoomContent;

	constructor(id: string, roomContent: RoomContent) {
		this.id = id;
		this.roomContent = roomContent;
	}
}

export class RoomContent {
	public fullname: string; // The department that offered the section.
	public shortname: string; // The course number (will be treated as a string (e.g., 499b)).
	public number: string; // The average of the section offering.
	public name: string; // The instructor teaching the section offering.
	public address: string; // The name of the course.
	public lat: number; // The number of students that passed the section offering.
	public lon: number; // The number of students that failed the section offering.
	public seats: number; // The number of students that audited the section offering.
	public type: string; // The unique id of a  section offering.
	public furniture: string; // The year the section offering ran. "Section": "overall" -> year : 1900. OK
	public href: string;
	public translationMap: Map<string, any>;

	constructor(
		fullname: string,
		shortname: string,
		number: string,
		name: string,
		address: string,
		lat: number,
		lon: number,
		seats: number,
		type: string,
		furniture: string,
		href: string) {
		this.fullname = fullname;
		this.shortname = shortname;
		this.number = number; // can't
		this.name = name;
		this.address = address;
		this.lat = lat; // geoloc
		this.lon = lon; // geoloc
		this.seats = seats; // parse diff file in rooms
		this.type = type; // -
		this.furniture = furniture; // -
		this.href = href;
		this.translationMap = new Map<string, any>(
			[["fullname", fullname],
			 ["shortname", shortname],
			 ["number", number],
			 ["name", name],
			 ["address", address],
			 ["lat", lat],
			 ["lon", lon],
			 ["seats", seats],
			 ["type", type],
			 ["furniture", furniture],
			 ["href", href]]);
	}
}
