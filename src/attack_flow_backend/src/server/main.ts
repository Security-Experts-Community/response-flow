import express from "express";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { searchRecursive, createYaml } from "./yamlHelper";
// import { searchRecursive } from "./yamlHelper";
import fs from "fs";
import cors from 'cors';
import bodyParser from "body-parser"

const app = express();
const actionDirectory = dotenv.config().parsed?.actionDirectory ?? '';
const resourceDirectory = dotenv.config().parsed?.resourceDirectory ?? '';
const jsonParser = bodyParser.json()

app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200
}));

app.get("/list", (_, res) => res.json({
  actions: searchRecursive(actionDirectory, '.yml'),
  resource: searchRecursive(resourceDirectory, '.yml'),
}));

app.post("/create", jsonParser,  (req, res) => {

  let data = {}

  if(req.body.type === "attack_flow.resource"){
    data = {
      ...req.body.data,
      mapping: req.body.data.mapping.split(";"),
      references: req.body.data.references.split(";"),
    }
  }

  if(req.body.type === "attack_flow.response"){
    data = {
      ...req.body.data,
      tags: req.body.data.tags ? req.body.data.tags.split(";") : "",
    }
  }

  fs.writeFile(req.body.path, createYaml(data), (err) => {
    if (err) {
      console.log(err);
    }
  })

  return res.json(req.body)
})

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000...")
);