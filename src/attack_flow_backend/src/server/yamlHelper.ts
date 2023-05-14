import fs from "fs";
import path from "path";
import YAML from "yaml"

export function searchRecursive(dir: string, pattern: string) {
    let results: any[] = []
  
    fs.readdirSync(dir).forEach(function (dirInner) {
  
      dirInner = path.resolve(dir, dirInner)
  
      const stat = fs.statSync(dirInner)
  
      if (stat.isDirectory()) {
        results = results.concat(searchRecursive(dirInner, pattern))
      }
  
      if (stat.isFile() && dirInner.endsWith(pattern)) {
        results.push({path: dirInner, data: YAML.parse(fs.readFileSync(dirInner, 'utf8'))})
      }
    })
    return results
}

export function createYaml(data: Record<string, any>){
  return YAML.stringify(data)
}