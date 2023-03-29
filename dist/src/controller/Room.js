"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomContent = exports.Room = void 0;
class Room {
    constructor(id, roomContent) {
        this.id = id;
        this.roomContent = roomContent;
    }
}
exports.Room = Room;
class RoomContent {
    constructor(fullname, shortname, number, name, address, lat, lon, seats, type, furniture, href) {
        this.fullname = fullname;
        this.shortname = shortname;
        this.number = number;
        this.name = name;
        this.address = address;
        this.lat = lat;
        this.lon = lon;
        this.seats = seats;
        this.type = type;
        this.furniture = furniture;
        this.href = href;
        this.translationMap = new Map([["fullname", fullname],
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
exports.RoomContent = RoomContent;
//# sourceMappingURL=Room.js.map