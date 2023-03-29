import * as fs from "fs-extra";

const persistDir = "./data";
const getContentFromArchives = (name: string) => {
	return fs.readFileSync(`test/resources/archives/${name}`).toString("base64");
}; // only one statement, don't need return (same with braces)

const clearDisk = () => {
	fs.removeSync(persistDir);
};

export {getContentFromArchives,persistDir,clearDisk};
