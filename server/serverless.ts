import serverless from "serverless-http";
import { createServer } from "./index";

const app = createServer();

const handler = serverless(app as any);

export default async function (req: any, res: any) {
  // serverless-http returns a handler that expects (req,res)
  // Call it and return its result
  return handler(req, res);
}
