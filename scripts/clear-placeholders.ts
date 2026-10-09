import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearPlaceholders() {
  const reqs = await prisma.requirement.findMany();
  let count = 0;
  
  for (const req of reqs) {
    if (req.originalText && req.originalText.includes('vollumfänglich erfüllt und aufrechterhalten werden.')) {
      await prisma.requirement.update({
        where: { id: req.id },
        data: { originalText: '' }
      });
      count++;
    }
  }
  
  console.log(`Cleared placeholders for ${count} requirements.`);
}

clearPlaceholders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
