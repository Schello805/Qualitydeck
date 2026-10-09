import { PrismaClient } from '@prisma/client';
import { isoRequirements } from '../src/data/iso';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding requirements into DB...');
  
  for (const req of isoRequirements) {
    await prisma.requirement.upsert({
      where: { chapter: req.chapter },
      update: {
        title: req.title,
        description: req.description,
        category: req.category,
        originalText: req.originalText || null,
        departments: req.departments === 'all' ? 'all' : JSON.stringify(req.departments),
        roles: req.roles,
        isStandard: true
      },
      create: {
        chapter: req.chapter,
        title: req.title,
        description: req.description,
        category: req.category,
        originalText: req.originalText || null,
        departments: req.departments === 'all' ? 'all' : JSON.stringify(req.departments),
        roles: req.roles,
        isStandard: true
      }
    });
  }
  
  console.log(`Seeded ${isoRequirements.length} requirements.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
