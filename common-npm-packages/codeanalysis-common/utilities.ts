
import * as fs from "fs";
import * as tl from 'azure-pipelines-task-lib/task';
import * as path from "path";
import * as xml2js from "xml2js";
import * as fse from "fs-extra";
import stripbom from "strip-bom";

tl.setResourcePath(path.join(__dirname, 'module.json'), true);

export interface GetOrCreateResult<T> {
    created: boolean;
    result: T;
}

// returns a substring that is common from first. For example, for "abcd" and "abdf", "ab" is returned.
export function sharedSubString(string1: string, string2: string): string {
    let ret = "";
    let index = 1;
    while (string1.substring(0, index) === string2.substring(0, index)) {
        ret = string1.substring(0, index);
        index++;
    }
    return ret;
}
/**
 * sorts string array in ascending order
 */
export function sortStringArray(list: string[]): string[] {
    const sortedFiles: string[] = list.sort((a, b) => {
        if (a > b) {
            return 1;
        } else if (a < b) {
            return -1;
        }
        return 0;
    });
    return sortedFiles;
}

/**
*returns true if path exists and it is a directory else false
*/
export function isDirectoryExists(path: string): boolean {
    try {
        return tl.stats(path).isDirectory();
    } catch (error) {
        tl.error(error)
        return false;
    }
}

// returns true if path exists and it is a file else false.
export function isFileExists(path: string): boolean {
    try {
        return tl.stats(path).isFile();
    } catch (error) {
        return false;
    }
}

// returns true if given string is null or whitespace.
export function isNullOrWhitespace(input) {
    if (typeof input === "undefined" || input == null) {
        return true;
    }
    return input.replace(/\s/g, "").length < 1;
}

// returns empty string if the given value is undefined or null.
export function trimToEmptyString(input) {
    if (typeof input === "undefined" || input == null) {
        return "";
    }
    return input.trim();
}

// prepends given text to start of file.
export function prependTextToFileSync(filePath: string, fileContent: string) {
    if (isFileExists(filePath)) {
        let data = fs.readFileSync(filePath); // read existing contents into data
        let fd = fs.openSync(filePath, "w+");
        let buffer = Buffer.from(fileContent);
        fs.writeSync(fd, buffer, 0, buffer.length, 0); // write new data
        fs.writeSync(fd, data, 0, data.length, 0); // append old data
        fs.close(fd, (err) => {
            if (err) {
                tl.error(err.message);
            }
        });
    }
}

// single utility for appending text and prepending text to file.
export function insertTextToFileSync(filePath: string, prependFileContent?: string, appendFileContent?: string) {
    if (isFileExists(filePath) && (prependFileContent || appendFileContent)) {
        let existingData = fs.readFileSync(filePath); // read existing contents into data
        let fd = fs.openSync(filePath, "w+");
        let preTextLength = prependFileContent ? prependFileContent.length : 0;

        if (prependFileContent) {
            let prependBuffer = new Buffer(prependFileContent);
            fs.writeSync(fd, prependBuffer, 0, prependBuffer.length, 0); // write new data
        }
        fs.writeSync(fd, existingData, 0, existingData.length, preTextLength); // append old data
        if (appendFileContent) {
            let appendBuffer = new Buffer(appendFileContent);
            fs.writeSync(fd, appendBuffer, 0, appendBuffer.length, existingData.length + preTextLength);
        }
        fs.close(fd, (err) => {
            if (err) {
                tl.error(err.message);
            }
        });
    }
}

export async function readXmlFileAsJson(filePath: string): Promise<any> {
    tl.debug("Reading XML file: " + filePath);

    try {
        console.log('starting reading a file')
        const xml = await readFile(filePath, "utf-8")
        tl.debug('file was readed successfully')
        console.log('xml: ' + xml)
        const json = await convertXmlStringToJson(xml)
        tl.debug('json: ' + JSON.stringify(json))
        return json
    }
    catch (err) {
        tl.debug('error when reading xml file')
        tl.debug(err);
    }
}

async function readFile(filePath: string, encoding: string) {

    tl.debug('Reading file at path ' + filePath)

    return new Promise<string>((resolve, reject) =>
        fs.readFile(filePath, (err, data) => {
            console.dir({ data })
            resolve(data.toString(encoding))
        })
    )
}

export async function convertXmlStringToJson(xmlContent: string) {
    tl.debug("Converting XML file to JSON");
    const cleanXml = stripbom(xmlContent)

    return await new Promise<any>((resolve) =>
        xml2js.parseString(cleanXml, (err, result) => {
            tl.debug('Result after parsing the converting xml to json ' + result)
            resolve(result)
        })
    )
}

export async function writeJsonAsXmlFile(filePath: string, jsonContent: any) {
    const builder = new xml2js.Builder();
    tl.debug("Writing JSON as XML file: " + filePath);
    let xml = builder.buildObject(jsonContent);
    xml = xml.replace(/&#xD;/g, "");
    tl.debug('Result xml: ' + xml)
    return writeFile(filePath, xml);
}

export async function writeFile(filePath: string, fileContent: string): Promise<void> {
    tl.debug("Creating dir if not exists: " + path.dirname(filePath));
    fse.mkdirpSync(path.dirname(filePath));
    tl.debug("Check dir: " + fs.existsSync(path.dirname(filePath)));
    return fs.writeFile(filePath, fileContent, { encoding: "utf-8" }, () => { tl.debug('Content was written') });
}

export function addPropToJson(obj: any, propName: string, value: any): void {
    tl.debug("Adding property to JSON: " + propName);
    if (typeof obj === "undefined") {
        obj = {};
    }

    if (obj instanceof Array) {
        let propNode = obj.find(o => o[propName]);
        if (propNode) {
            obj = propNode;
        }
    }

    if (propName in obj) {
        if (obj[propName] instanceof Array) {
            obj[propName].push(value);
        } else if (typeof obj[propName] !== "object") {
            obj[propName] = [obj[propName], value];
        }
    } else if (obj instanceof Array) {
        let prop = {};
        prop[propName] = value;
        obj.push(prop);
    } else {
        obj[propName] = value;
    }
}
