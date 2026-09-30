import { IncomingMessage, ServerResponse, createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { parse as parseQuery } from "node:querystring";

export type NextFunction = (error?: unknown) => void;
export interface Request extends IncomingMessage {
  body: any; cookies: Record<string,string>; params: Record<string,string>;
  query: Record<string,any>; ip: string; path: string; originalUrl: string;
  user?: any; files?: any; file?: any; get(name:string): string|undefined;
}
export interface Response extends ServerResponse {
  status(code:number):Response; json(value:unknown):Response; send(value:unknown):Response;
  cookie(name:string,value:string,options?:CookieOptions):Response;
  clearCookie(name:string,options?:CookieOptions):Response;
}
export type Handler=(req:Request,res:Response,next:NextFunction)=>unknown;
type Layer={method?:string;path:string;handlers:Handler[];exact:boolean};
type CookieOptions={httpOnly?:boolean;secure?:boolean;sameSite?:"strict"|"lax"|"none";path?:string;maxAge?:number;expires?:Date};

function normalizePath(value:string):string {
  if(!value)return "/";
  const clean=value.split("?")[0]||"/";
  return clean.length>1?clean.replace(/\/+$/,""):clean;
}
function compilePath(pattern:string,exact:boolean) {
  const normalized=normalizePath(pattern); const names:string[]=[];
  if(normalized==="/") return {names,match:(value:string)=>exact?normalizePath(value)==="/":true};
  const segments=normalized.split("/").filter(Boolean);
  const regexParts=segments.map(segment=>{
    if(segment==="*"){names.push("0");return "(.*)";}
    if(segment.startsWith(":")){names.push(segment.slice(1));return "([^/]+)";}
    return segment.replace(/[.*+?^()|[\]\\]/g,"\\$&");
  });
  const regex=new RegExp("^/"+regexParts.join("/")+ (exact?"/?$":"(?:/|$)"));
  return {names,match(value:string){
    const result=regex.exec(normalizePath(value)); if(!result)return false;
    return {params:Object.fromEntries(names.map((name,index)=>[name,decodeURIComponent(result[index+1]||"")]))};
  }};
}
function parseCookies(header:string|undefined):Record<string,string>{
  const cookies:Record<string,string>={}; if(!header)return cookies;
  for(const item of header.split(";")){
    const index=item.indexOf("="); if(index<0)continue;
    const key=item.slice(0,index).trim(),value=item.slice(index+1).trim(); if(!key)continue;
    try{cookies[key]=decodeURIComponent(value);}catch{cookies[key]=value;}
  } return cookies;
}
function serializeCookie(name:string,value:string,options:CookieOptions={}):string{
  let output=name+"="+encodeURIComponent(value);
  if(options.maxAge!==undefined)output+="; Max-Age="+Math.max(0,Math.floor(options.maxAge/1000));
  if(options.expires)output+="; Expires="+options.expires.toUTCString();
  output+="; Path="+(options.path??"/");
  if(options.httpOnly)output+="; HttpOnly"; if(options.secure)output+="; Secure";
  if(options.sameSite)output+="; SameSite="+options.sameSite[0].toUpperCase()+options.sameSite.slice(1);
  return output;
}
function appendSetCookie(res:ServerResponse,value:string){
  const existing=res.getHeader("Set-Cookie");
  if(!existing){res.setHeader("Set-Cookie",[value]);return;}
  const values=Array.isArray(existing)?existing.map(String):[String(existing)];
  values.push(value);res.setHeader("Set-Cookie",values);
}
function enhanceResponse(raw:ServerResponse):Response{
  const res=raw as Response;
  res.status=function(code){this.statusCode=code;return this;};
  res.json=function(value){if(!this.headersSent)this.setHeader("Content-Type","application/json; charset=utf-8");this.end(JSON.stringify(value));return this;};
  res.send=function(value){if(Buffer.isBuffer(value)||typeof value==="string")this.end(value);else{this.setHeader("Content-Type","application/json; charset=utf-8");this.end(JSON.stringify(value));}return this;};
  res.cookie=function(name,value,options={}){appendSetCookie(this,serializeCookie(name,value,options));return this;};
  res.clearCookie=function(name,options={}){appendSetCookie(this,serializeCookie(name,"",{...options,expires:new Date(0),maxAge:0}));return this;};
  return res;
}
async function parseBody(req:Request):Promise<void>{
  if(req.body!==undefined)return;
  const method=String(req.method||"GET").toUpperCase();
  if(method==="GET"||method==="HEAD"||method==="OPTIONS"){req.body={};return;}
  const contentType=String(req.headers["content-type"]||"").toLowerCase();
  if(contentType.startsWith("multipart/form-data")){req.body={};return;}
  const chunks:Buffer[]=[];
  await new Promise<void>((resolve,reject)=>{req.on("data",chunk=>chunks.push(Buffer.from(chunk)));req.on("end",()=>resolve());req.on("error",reject);});
  const raw=Buffer.concat(chunks).toString("utf8"); if(!raw){req.body={};return;}
  try{
    if(contentType.includes("application/json")){req.body=JSON.parse(raw);return;}
    if(contentType.includes("application/x-www-form-urlencoded")){req.body=parseQuery(raw);return;}
    req.body=raw;
  }catch{const error=new SyntaxError("Invalid JSON");(error as any).type="entity.parse.failed";throw error;}
}
function enhanceRequest(raw:IncomingMessage):Request{
  const req=raw as Request; const originalUrl=raw.url||"/"; req.originalUrl=originalUrl;
  const url=new URL(originalUrl,"http://"+(raw.headers.host||"localhost"));
  req.path=url.pathname;req.query=Object.fromEntries(url.searchParams.entries());req.params={};req.body=undefined;req.cookies=parseCookies(raw.headers.cookie);
  const forwarded=raw.headers["x-forwarded-for"];
  req.ip=typeof forwarded==="string"?forwarded.split(",")[0].trim():raw.socket.remoteAddress||"unknown";
  req.get=name=>raw.headers[name.toLowerCase()] as string|undefined; return req;
}
async function runHandlers(handlers:Handler[],req:Request,res:Response):Promise<void>{
  let index=0;
  const dispatch=async(error?:unknown):Promise<void>=>{
    const handler=handlers[index++]; if(!handler){if(error!==undefined)throw error;return;}
    const isErrorHandler=handler.length===4;
    if(error!==undefined&&!isErrorHandler)return dispatch(error);
    if(error===undefined&&isErrorHandler)return dispatch();
    await new Promise<void>((resolve,reject)=>{
      let settled=false;
      const next:NextFunction=nextError=>{if(settled)return;settled=true;dispatch(nextError).then(resolve,reject);};
      try{
        const result=error!==undefined?(handler as any)(error,req,res,next):handler(req,res,next);
        Promise.resolve(result).then(()=>{if(!settled)resolve();},handlerError=>{if(!settled){settled=true;reject(handlerError);}});
      }catch(handlerError){reject(handlerError);}
    });
  };
  await dispatch();
}
export class Router{
  private readonly layers:Layer[]=[];
  use(pathOrHandler:string|Handler,...handlers:Handler[]):this{
    if(typeof pathOrHandler==="function")this.layers.push({path:"/",handlers:[pathOrHandler,...handlers],exact:false});
    else this.layers.push({path:pathOrHandler,handlers,exact:false});
    return this;
  }
  private add(method:string,path:string,handlers:Handler[]):this{this.layers.push({method,path,handlers,exact:true});return this;}
  get(path:string,...handlers:Handler[]){return this.add("GET",path,handlers);}
  post(path:string,...handlers:Handler[]){return this.add("POST",path,handlers);}
  put(path:string,...handlers:Handler[]){return this.add("PUT",path,handlers);}
  patch(path:string,...handlers:Handler[]){return this.add("PATCH",path,handlers);}
  delete(path:string,...handlers:Handler[]){return this.add("DELETE",path,handlers);}
  async handle(rawReq:IncomingMessage,rawRes:ServerResponse):Promise<void>{
    const req=enhanceRequest(rawReq),res=enhanceResponse(rawRes);
    try{await this.dispatch(req,res);}catch{if(!res.headersSent){res.statusCode=500;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify({success:false,message:"تعذر إتمام العملية حاليًا."}));}}
  }
  private async dispatch(req:Request,res:Response):Promise<void>{
    const method=String(req.method||"GET").toUpperCase(),originalUrl=req.url||"/";const matching:Layer[]=[];
    for(const layer of this.layers){if(layer.method&&layer.method!==method)continue;if(compilePath(layer.path,layer.exact).match(originalUrl))matching.push(layer);}
    await parseBody(req);
    if(!matching.length){if(!res.headersSent)res.status(404).json({success:false,message:"البيانات المطلوبة غير موجودة."});return;}
    const handlers:Handler[]=[];
    for(const layer of matching){const match=compilePath(layer.path,layer.exact).match(originalUrl);if(typeof match==="object")Object.assign(req.params,match.params);handlers.push(...layer.handlers);}
    await runHandlers(handlers,req,res);
  }
}
function jsonParser():Handler{return async(req,_res,next)=>{await parseBody(req);next();};}
function staticMiddleware(root:string):Handler{return async(req,res,next)=>{
  if(req.method!=="GET"&&req.method!=="HEAD"){next();return;}
  const relative=decodeURIComponent((req.url||"/").split("?")[0]);const rootPath=path.resolve(root);const filePath=path.resolve(root,"."+relative);
  if(filePath!==rootPath&&!filePath.startsWith(rootPath+path.sep)){next();return;}
  try{const stat=await fs.promises.stat(filePath);if(!stat.isFile()){next();return;}
    const types:Record<string,string>={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",".pdf":"application/pdf",".json":"application/json"};
    res.setHeader("Content-Type",types[path.extname(filePath).toLowerCase()]||"application/octet-stream");
    if(req.method==="HEAD"){res.end();return;}res.end(await fs.promises.readFile(filePath));
  }catch{next();}
};}
function expressFactory(){
  const app=new Router() as Router&{listen:(port:number,callback?:()=>void)=>ReturnType<typeof createServer>;disable:(...args:unknown[])=>void};
  app.disable=()=>undefined;
  app.listen=(port,callback)=>{const server=createServer((req,res)=>void app.handle(req,res));server.listen(port,callback);return server;};
  return app;
}
const express=Object.assign(expressFactory,{json:jsonParser,static:staticMiddleware});
export {express}; export default express;
