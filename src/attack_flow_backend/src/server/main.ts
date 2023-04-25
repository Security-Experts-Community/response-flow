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

app.get("/create", (req, res) => {

  const data: string = String(req.query?.data) || '{}'
  const path: string = String(req.query?.path) || ''

  fs.writeFile(path, createYaml(JSON.parse(data)), (err) => {
    if (err) {
      console.log(err);
    }
  })

  return res.sendStatus(200)
})

ViteExpress.listen(app, 3001, () =>
  console.log("Server is listening on port 3001...")
);