import { Router } from "../http/express-compat.js";
import { expireAssignments, processDispatchQueue } from "../services/dispatch-manager.service.js";
import { autoCloseExpiredCaptainAttendance } from "../services/requirements-11-29-runtime.service.js";
import { detectStuckOrders } from "../services/ops-31-47.service.js";

const router = Router();

function authorized(req:any):boolean {
  const secret=process.env.CRON_SECRET;
  if(!secret)return false;
  const header=req.get("authorization")||"";
  return header==="Bearer "+secret || req.get("x-cron-secret")===secret;
}

router.get("/run", async (req,res)=>{
  if(!authorized(req)){res.status(401).json({success:false,message:"Unauthorized cron request."});return;}

  try{
    await Promise.all([
      expireAssignments(),
      processDispatchQueue(),
      autoCloseExpiredCaptainAttendance(),
      detectStuckOrders(),
    ]);

    res.status(200).json({success:true,message:"Scheduled operations completed."});
  }catch(error){
    console.error("VERCEL CRON ERROR:",error);
    res.status(500).json({success:false,message:"Scheduled operations failed."});
  }
});

export default router;
