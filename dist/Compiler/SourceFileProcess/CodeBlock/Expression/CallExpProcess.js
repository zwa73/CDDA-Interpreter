"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallExpProcess = void 0;
const ts_morph_1 = require("ts-morph");
const EPInterface_1 = require("./EPInterface");
const Functions_1 = require("../../Functions");
const CalcExpProcess_1 = require("./CalcExpProcess");
const CondExpProcess_1 = require("./CondExpProcess");
//特殊函数
let _processFunc = {
    "eobj": EObjProcess,
    "earr": EArrProcess,
    //"u_val" :DefaultProcess     ,//内置函数 转为字符串
    "and": AndProcess,
    "or": OrProcess,
    "not": NotProcess,
    "required_event": FieldAddProcess,
    "recurrence": FieldAddProcess,
    "deactivate_condition": CondFieldAddProcess,
    "condition": CondFieldAddProcess,
    "global": FieldAddProcess,
    "run_for_npcs": FieldAddProcess,
    "eoc_type": FieldAddProcess,
};
/** 字段添加函数 */
function FieldAddProcess(node) {
    (0, Functions_1.checkKind)(node, ts_morph_1.SyntaxKind.CallExpression);
    let cb = this.codeBlock;
    let id = node.getExpression().getText();
    let text = node.getArguments()[0].getText();
    //自动给OBJ括号
    if (text[0] == "{" && text[text.length - 1] == "}")
        text = "(" + text + ")";
    let tokenObj = eval(text);
    cb.addEocField(id, tokenObj);
    return new EPInterface_1.ExpPReturn();
}
/** 条件字段添加函数 */
function CondFieldAddProcess(node) {
    (0, Functions_1.checkKind)(node, ts_morph_1.SyntaxKind.CallExpression);
    let cb = this.codeBlock;
    let id = node.getExpression().getText();
    let cond = node.getArguments()[0];
    cb.addEocField(id, CalcExpProcess_1.CalcExpProcess.bind(this)(cond).token);
    return new EPInterface_1.ExpPReturn();
}
/** 调用函数 */
function CallExpProcess(node) {
    (0, Functions_1.checkKind)(node, ts_morph_1.SyntaxKind.CallExpression);
    let out = new EPInterface_1.ExpPReturn();
    let id = node.getExpression().getText();
    //特殊函数
    let spFunc = _processFunc[id];
    if (spFunc != null) {
        let spReturn = spFunc.bind(this)(node);
        //console.log(spReturn.getToken())
        return spReturn;
    }
    let gfunc = this.getSfd().getGlobalFunction(id);
    //预留内置函数
    if (gfunc == null)
        return DefaultProcess.bind(this)(node);
    //全局函数处理
    //处理并替换传入参数
    let args = node.getArguments().map(val => this.getLocalVal(val.getText()));
    //动态创建代码块
    let cb = gfunc.getCodeBlock(args);
    out.preFuncs.push({ "run_eocs": gfunc.getId(args) });
    let returnid = gfunc.getReturnID(args);
    if (returnid != null)
        out.token = returnid;
    return out;
}
exports.CallExpProcess = CallExpProcess;
/**特殊函数EToken */
function EObjProcess(node) {
    (0, Functions_1.checkKind)(node, ts_morph_1.SyntaxKind.CallExpression);
    let out = new EPInterface_1.ExpPReturn();
    let text = node.getArguments()[0].getText();
    //自动给OBJ括号
    if (text[0] == "{" && text[text.length - 1] == "}")
        text = "(" + text + ")";
    //console.log(text)
    //替换变量
    let argMap = this.getLocalValMap();
    let preText = "";
    for (let orig in argMap) {
        let val = argMap[orig];
        let re = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
        if (val != null && re.test(val))
            val = `'${val}'`;
        preText += "let " + orig + "=" + val + ";\n";
    }
    text = preText + text;
    //console.log(text)
    let tokenObj = eval(text);
    out.token = tokenObj;
    out.preFuncs.push(tokenObj);
    out.setRtnNofuncReq();
    return out;
}
/**特殊函数EToken */
function EArrProcess(node) {
    (0, Functions_1.checkKind)(node, ts_morph_1.SyntaxKind.CallExpression);
    let out = new EPInterface_1.ExpPReturn();
    let text = node.getArguments()[0].getText();
    //替换变量
    let argMap = this.getLocalValMap();
    let preText = "";
    for (let orig in argMap) {
        let val = argMap[orig];
        let re = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
        if (val != null && re.test(val))
            val = `'${val}'`;
        preText += "let " + orig + "=" + val + ";\n";
    }
    text = preText + text;
    let tokenArr = eval(text);
    out.preFuncs.push(...tokenArr);
    return out;
}
/**处理内置函数或eoc */
function DefaultProcess(node) {
    (0, Functions_1.checkKind)(node, ts_morph_1.SyntaxKind.CallExpression);
    let out = new EPInterface_1.ExpPReturn();
    //替换参数然后输出 字符串类型的本地变量参数数组
    //node.getArguments();
    //全局函数处理
    //处理并替换传入参数
    let args = node.getArguments().map(val => this.getLocalVal(val.getText()));
    //console.log(args)
    let id = node.getExpression().getText();
    //将括号内的文本匹配并替换
    let text = node.getText();
    let argsText = "";
    for (let arg of args) {
        if (argsText != "")
            argsText += ",";
        argsText += arg;
    }
    //将捕获部分替换成 本地变量参数字符串
    let regex = /.*?\((.*)\)/;
    text = text.replace(regex, (match, p1) => {
        //console.log(id,match,p1)
        return match.replace(p1, argsText);
    });
    out.preFuncs.push({ "run_eocs": id });
    out.token = text;
    out.setRtnNofuncReq();
    return out;
}
function AndProcess(node) {
    (0, Functions_1.checkKind)(node, ts_morph_1.SyntaxKind.CallExpression);
    let out = new EPInterface_1.ExpPReturn();
    let arr = [];
    let args = node.getArguments();
    for (let arg of args) {
        //let result = this.process(arg);
        let result = CondExpProcess_1.condExpProcess.bind(this)(arg);
        out.mergePreFuncList(result);
        arr.push(result.token);
    }
    out.token = { and: arr };
    return out;
}
function OrProcess(node) {
    (0, Functions_1.checkKind)(node, ts_morph_1.SyntaxKind.CallExpression);
    let out = new EPInterface_1.ExpPReturn();
    let arr = [];
    let args = node.getArguments();
    for (let arg of args) {
        //let result = this.process(arg);
        let result = CondExpProcess_1.condExpProcess.bind(this)(arg);
        out.mergePreFuncList(result);
        arr.push(result.token);
    }
    out.token = { or: arr };
    return out;
}
function NotProcess(node) {
    (0, Functions_1.checkKind)(node, ts_morph_1.SyntaxKind.CallExpression);
    let out = new EPInterface_1.ExpPReturn();
    let arg = node.getArguments()[0];
    //let result = this.process(arg);
    let result = CondExpProcess_1.condExpProcess.bind(this)(arg);
    out.mergePreFuncList(result);
    out.token = { not: result.token };
    return out;
}
