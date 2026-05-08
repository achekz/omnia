// Role du fichier: contient la logique du module hash.
import bcrypt from 'bcryptjs';

const run = async () => {
  const hash = await bcrypt.hash("khawla12", 10);
  console.log("HASH:", hash);
};

run();