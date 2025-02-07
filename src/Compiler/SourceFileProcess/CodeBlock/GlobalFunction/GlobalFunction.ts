import { FunctionDeclaration, Node, SyntaxKind } from "ts-morph";
import { checkKind, throwLog } from "../../Functions";
import { SourceFileData } from "../../Interfaces";
import CodeBlock from "../CodeBlock";



export class GlobalFunction{
    _node:FunctionDeclaration;
    sfd:SourceFileData;
    _params:Array<string>=[];
    //动态生成的不同参数函数代码块
    _dynamicCodeBlockTable:Record<string,CodeBlock|null>={}

    constructor(node:Node,sfd:SourceFileData){
        checkKind(node,SyntaxKind.FunctionDeclaration);
        this._node = node;
        this.sfd = sfd;
        this._params = node.getParameters().map((value)=> value.getText());
    }
    getNode(){
        return this._node;
    }
    getRawName(){
        return this.getNode().getNameOrThrow();
    }
    /**获取全局函数ID
     * @param args 参数
     */
    getId(args?:Array<string>){
        //let base = this.getSfd().getId();+"_"+this.getRawName();
        let base = this.getRawName();

        if(args!=null){
            for(let arg of args)
                base+="_"+arg;
        }
        base = base.replace(/[+\-*/><']/g,"");
        return base;
    }
    getCodeBlock(args?:Array<string>){
        let cid = this.getId(args);

        if(this._dynamicCodeBlockTable[cid]!=null)
            return this._dynamicCodeBlockTable[cid];

        let funcid = this.getId(args);
        let codeBody = this.getNode().getBodyOrThrow();
        let cb = new CodeBlock(funcid,codeBody,this.sfd);

        //传参
        if(args==null)
            args=[];
        if(args.length!=this._params.length)
            throw throwLog(this._node,"传入参数个数不等于定义个数");
        for(let i in args)
            cb.addPassArgs(this._params[i],args[i]);

        //let cb = new CodeBlock(codeBody,this._sfd,this._cbd.genSubBlock());
        cb.build();
        this._dynamicCodeBlockTable[cid] = cb;
        return cb;
    }
    getParams(){
        return this._params;
    }
    /**获取全局函数返回值ID
     * @param rawFuncName
     */
    getReturnID(args?:Array<string>){
        //let cid = this.getId(args);
        //return this.getSfd().getId()+"_"+this.getRawName()+"_"+cid+"_return";
        return this.getCodeBlock(args)?.getReturnId();
    }
}