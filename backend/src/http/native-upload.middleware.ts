import Busboy from "@fastify/busboy";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Handler } from "./express-compat.js";

type FileInfo = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  filename: string;
  path: string;
  destination: string;
  size: number;
};

type UploadOptions = {
  fieldName: string;
  destination: string;
  prefix: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  allowedMimeTypes?: string[];
};

function safeExtension(filename:string):string {
  const extension=path.extname(filename).toLowerCase();
  return [".jpg",".jpeg",".png",".webp"].includes(extension) ? extension : ".jpg";
}

export function multipartUpload(options:UploadOptions):Handler {
  const maxSize=options.maxSize??4*1024*1024;
  const maxFiles=options.maxFiles??1;

  return (req:any,_res:any,next:any)=>{
    const type=String(req.headers["content-type"]||"").toLowerCase();
    if(!type.startsWith("multipart/form-data")){next();return;}

    fs.mkdirSync(options.destination,{recursive:true});

    let fileCount=0;
    let rejected=false;
    const writes:Promise<void>[]=[];
    const files:Record<string,FileInfo[]>= {};
    const fields:Record<string,string>={};

    let bb:any;
    try{bb=Busboy({headers:req.headers,limits:{fileSize:maxSize,files:maxFiles}});}
    catch(error){next(error);return;}

    bb.on("field",(name:string,value:string)=>{fields[name]=value;});

    bb.on("file",(name:string,stream:any,info:any)=>{
      const {filename,mimeType,encoding}=info;

      if(name!==options.fieldName && !options.multiple){
        stream.resume();return;
      }

      fileCount++;
      const outputName=options.prefix+"-"+Date.now()+"-"+crypto.randomBytes(5).toString("hex")+safeExtension(filename);
      const outputPath=path.join(options.destination,outputName);

      const file:FileInfo={
        fieldname:name,originalname:filename,encoding,mimetype:mimeType,
        filename:outputName,path:outputPath,destination:options.destination,size:0,
      };

      files[name]??=[];
      files[name].push(file);

      const output=fs.createWriteStream(outputPath);
      const write=new Promise<void>((resolve,reject)=>{
        stream.on("data",(chunk:Buffer)=>{file.size+=chunk.length;});
        stream.on("limit",()=>{rejected=true;output.destroy();void fs.promises.rm(outputPath,{force:true}).finally(()=>reject(new Error("حجم الملف أكبر من الحد المسموح.")));});
        stream.on("error",reject);
        output.on("error",reject);
        output.on("close",resolve);
      });

      writes.push(write);
      stream.pipe(output);
    });

    bb.on("filesLimit",()=>{rejected=true;next(new Error("تم تجاوز عدد الملفات المسموح به."));});
    bb.on("error",(error:any)=>{rejected=true;next(error);});
    bb.on("finish",async()=>{
      try{
        await Promise.all(writes);
        if(rejected)return;
        req.body={...(req.body||{}),...fields};
        req.files=files;
        const selected=files[options.fieldName]?.[0];
        if(selected)req.file=selected;
        next();
      }catch(error){next(error);}
    });

    req.pipe(bb);
  };
}
