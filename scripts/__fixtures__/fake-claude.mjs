#!/usr/bin/env node
// Faux binaire "claude" pour le test d'intégration de build-lead.
// Simule claude : spawn un sous-process long-vivant (comme npm/vercel/chrome que
// claude lance pendant un build), expose les deux PIDs sur stdout, puis reste en
// vie jusqu'à être tué — pour vérifier que le kill se propage à TOUTE l'arbo.
import { spawn } from "node:child_process";

const grandchild = spawn("sleep", ["600"], { stdio: "ignore" });

process.stdout.write(
  JSON.stringify({ fakePid: process.pid, grandchildPid: grandchild.pid }) + "\n",
);

// Reste vivant comme claude pendant un build (jusqu'au signal de kill).
setInterval(() => {}, 1 << 30);
