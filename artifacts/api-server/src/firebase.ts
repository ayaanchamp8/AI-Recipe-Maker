import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let firebaseConfig: any = {};
try {
  let currentDir = process.cwd();
  if (typeof __dirname !== 'undefined') {
    currentDir = __dirname;
  } else if (import.meta && import.meta.url) {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  }

  let configPath = '';
  while (currentDir !== '/' && currentDir !== '') {
    const check = path.join(currentDir, 'firebase-applet-config.json');
    if (fs.existsSync(check)) {
      configPath = check;
      break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  if (configPath) {
    console.log("Loading firebase config from", configPath);
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.warn("Could not find firebase-applet-config.json anywhere.");
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json", e);
}

if (!firebaseConfig.projectId) {
  console.error("firebaseConfig is missing projectId! Contents:", Object.keys(firebaseConfig));
  firebaseConfig = { projectId: "dummy-project" };
}

const app = initializeApp(firebaseConfig);
// @ts-ignore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
