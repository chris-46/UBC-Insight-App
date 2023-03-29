"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Server_1 = __importDefault(require("../../src/rest/Server"));
const InsightFacade_1 = __importDefault(require("../../src/controller/InsightFacade"));
const chai_1 = require("chai");
const chai_http_1 = __importDefault(require("chai-http"));
describe("Server", function () {
    let facade;
    let server;
    (0, chai_1.use)(chai_http_1.default);
    before(function () {
        facade = new InsightFacade_1.default();
        server = new Server_1.default(4321);
    });
    after(function () {
    });
    beforeEach(function () {
    });
    afterEach(function () {
    });
});
//# sourceMappingURL=Server.spec.js.map