import express from "express";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { searchRecursive, createYaml } from "./yamlHelper";
import fs from "fs";


const workDirectory = dotenv.config().parsed?.workDirectory ?? '';

const app = express();

const files = searchRecursive(workDirectory, '.yml')

app.get("/list", (_, res) => res.json(files));
app.get("/create", (_, res) => {

  const file = __dirname + '/test.yaml';

  fs.writeFile(file, createYaml(), (err) => {
    if (err)
      console.log(err);
    else {
      console.log("File written successfully\n");
      console.log("The written has the following contents:");
      console.log(fs.readFileSync(file, "utf8"));
    }
  });

  res.setHeader('Content-disposition', 'attachment; filename=test.yaml');
  res.setHeader('Content-type', "application/yaml");

  const filestream = fs.createReadStream(file);
  filestream.pipe(res);
})

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000...")
);
