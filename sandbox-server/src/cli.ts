#!/usr/bin/env node

import { Command } from "commander";
import { startServer } from "~/index";

const program = new Command();

program
  .name("glyphy") //
  .description("A simple Node.js server")
  .version("1.0.0");

program
  .command("run")
  .description("Run the server")
  .action(async () => {
    await startServer();
  });

program.parse(process.argv);
