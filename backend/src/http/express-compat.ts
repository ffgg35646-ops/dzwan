import { IncomingMessage, ServerResponse, createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { parse as parseQuery } from "node:querystring";

export type NextFunction = (error?: unknown) => void;
export interface Request extends IncomingMessage {
  body:any; cookies:Record<string,string>; params:Record<string,string>; query:Record<string,any>;
  ip:string; path:string; originalUrl:string; user?:any; files?:any; file?:any;
  get(name:string):string|undefined;
}
export interface Response extends ServerResponse {
  status(code:number):Response; json(value:unknown):Response; send(value:unknown):Response;
  cookie(name:string,value:string,options?:CookieOptions):Response;
  clearCookie(name:string,options?:CookieOptions):Response;
}
export type Handler=(...args:any[])=>unknown;
type CookieOptions={httpOnly?:boolean;secure?:boolean;sameSite?:"strict"|"lax"|"none";path?:string;maxAge?:number;expires?:Date};
type Layer={method?:string;path:string;handlers:Handler[];exact:boolean};

export interface RouterInstance extends Handler {
  use(pathOrHandler:string|Handler,...handlers:Handler[]):RouterInstance;
  get(path:string,...handlers:Handler[]):RouterInstance;
  post(path:string,...handlers:Handler[]):RouterInstance;
  put(path:string,...handlers:Handler[]):RouterInstance;
  patch(path:string,...handlers:Handler[]):RouterInstance;
  delete(path:string,...handlers:Handler[]):RouterInstance;
  handle(req:IncomingMessage,res:ServerResponse):Promise<void>;
  listen(port:number,callback?:()=>void):ReturnType<typeof createServer>;
  disable(...args:unknown[]):void;
}

function normalizePath(value:string):string {
  if(!value)return "/";
  const clean=value.split("?")[0]||"/";
  return clean.length>1?clean.replace(/\/+$/,""):clean;
}
function compilePath(pattern:string,exact:boolean){
  const normalized=normalizePath(pattern);const names:string[]=[];
  if(normalized==="/")return{names,match:(value:string)=>exact?normalizePath(value)==="/":true};
  const segments=normalized.split("/").filter(Boolean);
  const parts=segments.map(segment=>{
    if(segment==="*"){names.push("0");return "(.*)";}
    if(segment.startsWith(":")){names.push(segment.slice(1));return "([^/]+)";}
    return segment.replace(/[.*+?^()|[\]\\]/g,"\\$&");
  });
  const regex=new RegExp("^/"+parts.join("/")+ (exact?"/?$":"(?:/|$)"));
  return{names,match(value:string){
    const result=regex.exec(normalizePath(value));if(!result)return false;
    return{params:Object.fromEntries(names.map((name,i)=>[name,decodeURIComponent(result[i+1]||"")]))};
  }};
}
function parseCookies(header:string|undefined):Record<string,string>{
  const out:Record<string,string>={};if(!header)return out;
  for(const item of header.split(";")){const i=item.indexOf("=");if(i<0)continue;const k=item.slice(0,i).trim(),v=item.slice(i+1).trim();if(!k)continue;try{out[k]=decodeURIComponent(v);}catch{out[k]=v;}}
  return out;
}
function serializeCookie(name:string,value:string,o:CookieOptions={}):string{
  let s=name+"="+encodeURIComponent(value);
  if(o.maxAge!==undefined)s+="; Max-Age="+Math.max(0,Math.floor(o.maxAge/1000));
  if(o.expires)s+="; Expires="+o.expires.toUTCString();
  s+="; Path="+(o.path??"/");if(o.httpOnly)s+="; HttpOnly";if(o.secure)s+="; Secure";
  if(o.sameSite)s+="; SameSite="+o.sameSite[0].toUpperCase()+o.sameSite.slice(1);return s;
}
function addCookie(res:ServerResponse,value:string){
  const old=res.getHeader("Set-Cookie");const list=old?(Array.isArray(old)?old.map(String):[String(old)]):[];
  list.push(value);res.setHeader("Set-Cookie",list);
}
function enhanceResponse(raw:ServerResponse):Response{
  const res=raw as Response;
  res.status=function(code){this.statusCode=code;return this;};
  res.json=function(value){if(!this.headersSent)this.setHeader("Content-Type","application/json; charset=utf-8");this.end(JSON.stringify(value));return this;};
  res.send=function(value){if(Buffer.isBuffer(value)||typeof value==="string")this.end(value);else{this.setHeader("Content-Type","application/json; charset=utf-8");this.end(JSON.stringify(value));}return this;};
  res.cookie=function(name,value,o={}){addCookie(this,serializeCookie(name,value,o));return this;};
  res.clearCookie=function(name,o={}){addCookie(this,serializeCookie(name,"",{...o,maxAge:0,expires:new Date(0)}));return this;};
  return res;
}
async function parseBody(req:Request):Promise<void>{
  if(req.body!==undefined)return;
  const method=String(req.method||"GET").toUpperCase();
  if(method==="GET"||method==="HEAD"||method==="OPTIONS"){req.body={};return;}
  const type=String(req.headers["content-type"]||"").toLowerCase();
  if(type.startsWith("multipart/form-data")){req.body={};return;}
  const chunks:Buffer[]=[];
  await new Promise<void>((resolve,reject)=>{req.on("data",c=>chunks.push(Buffer.from(c)));req.on("end",()=>resolve());req.on("error",reject);});
  const raw=Buffer.concat(chunks).toString("utf8");if(!raw){req.body={};return;}
  try{
    if(type.includes("application/json")){req.body=JSON.parse(raw);return;}
    if(type.includes("application/x-www-form-urlencoded")){req.body=parseQuery(raw);return;}
    req.body=raw;
  }catch{const e=new SyntaxError("Invalid JSON");(e as any).type="entity.parse.failed";throw e;}
}
function enhanceRequest(raw:IncomingMessage):Request{
  const req=raw as Request;const original=raw.url||"/";const u=new URL(original,"http://"+(raw.headers.host||"localhost"));
  req.originalUrl=req.originalUrl||original;req.path=u.pathname;req.query=Object.fromEntries(u.searchParams.entries());req.params=req.params||{};req.body=req.body;
  req.cookies=req.cookies||parseCookies(raw.headers.cookie);
  const f=raw.headers["x-forwarded-for"];req.ip=typeof f==="string"?f.split(",")[0].trim():raw.socket.remoteAddress||"unknown";
  req.get=name=>raw.headers[name.toLowerCase()] as string|undefined;return req;
}
async function run(handlers:Handler[],req:Request,res:Response,initialError?:unknown):Promise<void>{
  let i=0;
  const dispatch=async(error?:unknown):Promise<void>=>{
    const h=handlers[i++];if(!h){if(error!==undefined)throw error;return;}
    const isErr=h.length===4;if(error!==undefined&&!isErr)return dispatch(error);if(error===undefined&&isErr)return dispatch();
    await new Promise<void>((resolve,reject)=>{
      let settled=false;const next:NextFunction=e=>{if(settled)return;settled=true;dispatch(e).then(resolve,reject);};
      try{const result=error!==undefined?(h as any)(error,req,res,next):h(req,res,next);Promise.resolve(result).then(()=>{if(!settled)resolve();},e=>{if(!settled){settled=true;reject(e);}});}catch(e){reject(e);}
    });
  };
  await dispatch(initialError);
}
function stripMount(req:Request,mount:string){
  if(mount==="/")return ()=>{};
  const oldUrl=req.url||"/",oldPath=req.path;
  const u=new URL(oldUrl,"http://"+(req.headers.host||"localhost"));
  let pathname=u.pathname.slice(mount.length);if(!pathname)pathname="/";if(!pathname.startsWith("/"))pathname="/"+pathname;
  req.url=pathname+(u.search||"");req.path=pathname;
  return ()=>{req.url=oldUrl;req.path=oldPath;};
}
function createRouter():RouterInstance{
  const layers:Layer[]=[];
  const router=((req:Request,res:Response,next:NextFunction)=>{
    void dispatch(req,res,next);
  }) as RouterInstance;

  router.use=(p:string|Handler,...hs:Handler[])=>{
    if(typeof p==="function")layers.push({path:"/",handlers:[p,...hs],exact:false});
    else layers.push({path:p,handlers:hs,exact:false});
    return router;
  };
  const add=(method:string,p:string,...hs:Handler[])=>{layers.push({method,path:p,handlers:hs,exact:true});return router;};
  router.get=(p,...hs)=>add("GET",p,...hs);router.post=(p,...hs)=>add("POST",p,...hs);
  router.put=(p,...hs)=>add("PUT",p,...hs);router.patch=(p,...hs)=>add("PATCH",p,...hs);router.delete=(p,...hs)=>add("DELETE",p,...hs);
  router.handle=async(rawReq,rawRes)=>{const req=enhanceRequest(rawReq),res=enhanceResponse(rawRes);await dispatch(req,res);};
  router.listen=(port,callback)=>{const server=createServer((req,res)=>void router.handle(req,res).catch(error=>{if(!res.headersSent){res.statusCode=500;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify({success:false,message:"تعذر إتمام العملية حاليًا."}));}}));server.listen(port,callback);return server;};
  router.disable=()=>undefined;

  async function dispatch(req:Request,res:Response,next?:NextFunction):Promise<void>{
    const method=String(req.method||"GET").toUpperCase(),url=req.url||"/";const handlers:Handler[]=[];
    for(const layer of layers){
      if(layer.method&&layer.method!==method)continue;
      const match=compilePath(layer.path,layer.exact).match(url);if(!match)continue;
      if(typeof match==="object")Object.assign(req.params,match.params);
      for(const h of layer.handlers){
        if (h.length === 4) {
          const wrapped: Handler = (error:any,a:any,b:any,c:any) => {
            const restore=stripMount(a,layer.exact?"/":layer.path);
            const result=(h as any)(error,a,b,(e?:unknown)=>{restore();c(e);});
            if(result&&typeof result.then==="function")return result.finally(restore);
            restore();return result;
          };
          handlers.push(wrapped);
        } else {
          const wrapped: Handler = (a:any,b:any,c:any) => {
            const restore=stripMount(a,layer.exact?"/":layer.path);
            const result=(h as any)(a,b,(e?:unknown)=>{restore();c(e);});
            if(result&&typeof result.then==="function")return result.finally(restore);
            restore();return result;
          };
          handlers.push(wrapped);
        }
      }
    }
    if(!handlers.length){if(next){next();return;}if(!res.headersSent)res.status(404).json({success:false,message:"البيانات المطلوبة غير موجودة."});return;}
    let bodyError: unknown;
    try { await parseBody(req); } catch (error) { bodyError = error; }
    await run(handlers,req,res,bodyError);
  }
  return router;
}
function jsonParser(_options?:{limit?:string}):Handler{return async(req,_res,next)=>{await parseBody(req);next();};}
function staticMiddleware(root:string):Handler{return async(req,res,next)=>{
  if(req.method!=="GET"&&req.method!=="HEAD"){next();return;}
  const rel=decodeURIComponent((req.url||"/").split("?")[0]);const rootPath=path.resolve(root);const filePath=path.resolve(root,"."+rel);
  if(filePath!==rootPath&&!filePath.startsWith(rootPath+path.sep)){next();return;}
  try{const st=await fs.promises.stat(filePath);if(!st.isFile()){next();return;}
    const types:Record<string,string>={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",".pdf":"application/pdf",".json":"application/json"};
    res.setHeader("Content-Type",types[path.extname(filePath).toLowerCase()]||"application/octet-stream");
    if(req.method==="HEAD"){res.end();return;}res.end(await fs.promises.readFile(filePath));
  }catch{next();}
};}
export const Router = createRouter;
const express=Object.assign(createRouter,{json:jsonParser,static:staticMiddleware});
export {express};export default express;
