import express from "express";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { searchRecursive, createYaml } from "./yamlHelper";
import fs from "fs";

const app = express();
const actionDirectory = dotenv.config().parsed?.actionDirectory ?? '';
const responseDirectory = dotenv.config().parsed?.responseDirectory ?? '';

app.get("/list", (_, res) => res.json({
  actions: searchRecursive(actionDirectory, '.yml'),
  response: searchRecursive(responseDirectory, '.yml'),
}));

app.get("/create", (_, res) => {

  const file = __dirname + '/test.yaml';

  fs.writeFile(file, createYaml(), (err) => {
    if (err) {
      console.log(err);
    }
    res.setHeader('Content-disposition', 'attachment; filename=test.yaml');
    res.setHeader('Content-type', "application/yaml");
    const filestream = fs.createReadStream(file);
    filestream.pipe(res);
  });

  
})

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000...")
);
