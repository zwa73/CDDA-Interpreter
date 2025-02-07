"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Compiler = void 0;
const ts_morph_1 = require("ts-morph");
const SourceFileProcess_1 = require("./SourceFileProcess");
function clearFormat(obj) {
    return obj.replace(/\\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\"\[/g, '[')
        .replace(/\]\"/g, ']')
        .replace(/"\{/g, '{')
        .replace(/\}"/g, '}');
}
function typeStringify(item) {
    if (typeof item == 'number' || typeof item == 'string' || typeof item == 'boolean')
        return item;
    return JSON.stringify(item);
}
function customStringify(obj) {
    let formattedData = JSON.stringify(obj, (key, value) => {
        if (key === 'effect' || key === 'false_effect') {
            return value.map((item) => {
                return typeStringify(item);
            });
        }
        if (key === 'condition' || key === 'deactivate_condition' ||
            key === 'recurrence')
            return typeStringify(value);
        return value;
    }, 2);
    //return formattedData;
    return clearFormat(formattedData);
}
class Compiler {
    /**未编译的来源文本 */
    sourceText = "";
    /**来源文件 基础代码块 */
    _sourceFile;
    _project = new ts_morph_1.Project();
    constructor(sourceText) {
        this.sourceText = sourceText;
        this._sourceFile = this._project.createSourceFile("temp.ts", sourceText);
    }
    build(projectName) {
        let sfd = new SourceFileProcess_1.SourceFileData(projectName);
        let result = (0, SourceFileProcess_1.default)(this._sourceFile, sfd);
        //let str = JSON.stringify(result.getRootArray(),null,"  ");
        let str = customStringify(result.rootArray);
        //let str =  JSON.stringify(result.getRootArray());
        sfd.setSerializedText(str);
        //str = str.replace(/\\/g, '').replace(/\"\[/g, '[').replace(/\]\"/g,']');
        //console.log(str);
        return sfd;
    }
}
exports.Compiler = Compiler;
exports.default = Compiler;
