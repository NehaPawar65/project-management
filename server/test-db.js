import { prisma } from "./config/prisma.js";

try {
    const result = await prisma.$queryRaw`SELECT NOW()`;

    console.log("DATABASE CONNECTION SUCCESSFUL");
    console.log(result);

} catch (error) {
    console.error("DATABASE CONNECTION FAILED");
    console.error(error);

} finally {
    await prisma.$disconnect();
}