import bcrypt from 'bcryptjs';

const run = async () => {
  const hash = await bcrypt.hash("chayma777", 10);
  console.log("HASH:", hash);
};

run();