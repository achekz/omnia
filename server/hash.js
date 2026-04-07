import bcrypt from 'bcryptjs';

const run = async () => {
  const hash = await bcrypt.hash("khawla12", 10);
  console.log("HASH:", hash);
};

run();