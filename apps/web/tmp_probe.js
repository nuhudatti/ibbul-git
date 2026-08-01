const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.$connect();
    const row = await prisma.studentProfile.findUnique({
      where: { matric: 'U22/FNS/CSC/1101' },
    });
    console.log(JSON.stringify(row, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
