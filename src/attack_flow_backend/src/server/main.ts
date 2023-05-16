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

  try{
    let name = ""
    let path = ""

    if(req.body.type === "attack_flow.resource"){
      name = req.body.data.id.slice(0,1) + "_" + req.body.data.id.slice(1) + "_" + req.body.data.title.toLowerCase().split(" ").join("_")
      path = '/' + name

      if (!fs.existsSync(resourceDirectory + path)){
          fs.mkdirSync(resourceDirectory + path);
      }

      fs.writeFile(resourceDirectory + path + `/${name}.yml`, createYaml(data), (err) => {
        if (err) {
          console.log(err);
        }
      })
    }

    if(req.body.type === "attack_flow.response"){
      name = req.body.data.title.split(" ").join("_")
      path = '/' + name

      if (!fs.existsSync(actionDirectory + path)){
        fs.mkdirSync(actionDirectory + path);
      }

      fs.writeFile(actionDirectory + path + `/${name}.yml`, createYaml(data), (err) => {
        if (err) {
          console.log(err);
        }
      })
    }

    console.log(req.body)
    res.status(200).send()
  }catch(e){
    console.log(e)

    res.status(500).send()
  }
})

app.post("/update", jsonParser,  (req, res) => {

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