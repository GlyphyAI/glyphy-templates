const { spawn } = require("child_process");
const { glob } = require("glob");
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post("/run", (_, res) => {
  const dartProcess = spawn("dart", ["run", "bin/main.dart"], {
    cwd: "/workspace",
  });

  let output = "";
  let error = "";

  dartProcess.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
    output += data;
  });

  dartProcess.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
    error += data;
  });

  dartProcess.on("close", (code) => {
    console.log(`Dart process exited with code ${code}`);
    res.json({
      output,
      error,
      code,
    });
  });
});

app.get("/files", async (req, res) => {
  const { patterns } = req.query;
  const directoryPath = "/workspace";
  const ignoreList = [
    "node_modules/**",
    ".git/**",
    ".github/**",
    ".devcontainer/**",
    ".glyphy/**",
    ".vscode/**",
    ".idea/**",
    "build/**",
  ];

  let globPatterns = [];
  if (patterns) {
    try {
      globPatterns = JSON.parse(patterns);
    } catch (e) {
      return res.status(400).send("Invalid patterns format. Must be a JSON array of glob strings.");
    }
  }

  if (globPatterns.length === 0) {
    return res.status(400).send("Patterns array cannot be empty.");
  }

  try {
    const matches = new Set();
    for (const pattern of globPatterns) {
      const files = await glob(pattern, { cwd: directoryPath, ignore: ignoreList, nodir: true });
      files.forEach((file) => matches.add(path.join(directoryPath, file)));
    }

    const fileList = Array.from(matches).map((file) => ({
      path: file,
      name: path.basename(file),
    }));

    res.json(fileList);
  } catch (err) {
    res.status(500).send(`Unable to scan directory: ${err}`);
  }
});

app.post("/files", (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files)) {
    return res.status(400).send("Payload must be an array of file objects");
  }

  const writePromises = files.map((file) => {
    const { filePath, content } = file;
    if (!filePath || !content) {
      return Promise.reject(`Missing filePath or content for file ${filePath}`);
    }

    return fs.promises.writeFile(filePath, content, "utf8");
  });

  Promise.all(writePromises)
    .then(() => res.send("Files updated successfully"))
    .catch((err) => res.status(500).send(`Unable to write files: ${err}`));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
