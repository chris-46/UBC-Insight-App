"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const InsightFacade_1 = __importDefault(require("../controller/InsightFacade"));
const IInsightFacade_1 = require("../controller/IInsightFacade");
class Server {
    constructor(port) {
        console.info(`Server::<init>( ${port} )`);
        this.port = port;
        this.express = (0, express_1.default)();
        this.registerMiddleware();
        this.registerRoutes();
        this.express.use(express_1.default.static("./frontend/public"));
    }
    start() {
        return new Promise((resolve, reject) => {
            console.info("Server::start() - start");
            if (this.server !== undefined) {
                console.error("Server::start() - server already listening");
                reject();
            }
            else {
                this.server = this.express.listen(this.port, () => {
                    console.info(`Server::start() - server listening on port: ${this.port}`);
                    resolve();
                }).on("error", (err) => {
                    console.error(`Server::start() - server ERROR: ${err.message}`);
                    reject(err);
                });
            }
        });
    }
    stop() {
        console.info("Server::stop()");
        return new Promise((resolve, reject) => {
            if (this.server === undefined) {
                console.error("Server::stop() - ERROR: server not started");
                reject();
            }
            else {
                this.server.close(() => {
                    console.info("Server::stop() - server closed");
                    resolve();
                });
            }
        });
    }
    registerMiddleware() {
        this.express.use(express_1.default.json());
        this.express.use(express_1.default.raw({ type: "application/*", limit: "10mb" }));
        this.express.use((0, cors_1.default)());
    }
    registerRoutes() {
        let result = new InsightFacade_1.default();
        this.express.get("/echo/:msg", Server.echo);
        this.express.get("/datasets", (req, res) => {
            result.listDatasets().then((answer) => {
                res.status(200).json({ result: answer });
            }).catch((err) => {
                res.status(400).json({ error: err.message });
            });
        });
        this.express.delete("/datasets/:id", (req, res) => {
            result.removeDataset(req.params.id).then((answer) => {
                res.status(200).json({ result: answer });
            }).catch((err) => {
                if (err instanceof IInsightFacade_1.NotFoundError) {
                    res.status(404).json({ error: err.message });
                }
                if (err instanceof IInsightFacade_1.InsightError) {
                    res.status(400).json({ error: err.message });
                }
            });
        });
        this.express.post("/query", (req, res) => {
            let query = req.body;
            result.performQuery(query).then((answer) => {
                res.status(200).json({ result: answer });
            }).catch((err) => {
                res.status(400).json({ error: err.message });
            });
        });
        this.express.put("/dataset/:id/:kind", (req, res) => {
            let datasetBuffer = new Buffer(req.body);
            let dataset = datasetBuffer.toString("base64");
            result.addDataset(req.params.id, dataset, req.params.kind).then((answer) => {
                res.status(200).json({ result: answer });
            }).catch((err) => {
                res.status(400).json({ error: err.message });
            });
        });
    }
    static echo(req, res) {
        try {
            console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
            const response = Server.performEcho(req.params.msg);
            res.status(200).json({ result: response });
        }
        catch (err) {
            res.status(400).json({ error: err });
        }
    }
    static performEcho(msg) {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        }
        else {
            return "Message not provided";
        }
    }
}
exports.default = Server;
//# sourceMappingURL=Server.js.map