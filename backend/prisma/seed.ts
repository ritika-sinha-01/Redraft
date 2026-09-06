import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  { name: "Classic", slug: "classic", thumbnail: "classic", isPremium: false, layoutConfig: JSON.stringify({ family: "serif" }) },
  { name: "Modern", slug: "modern", thumbnail: "modern", isPremium: false, layoutConfig: JSON.stringify({ family: "sans" }) },
  { name: "Minimal", slug: "minimal", thumbnail: "minimal", isPremium: false, layoutConfig: JSON.stringify({ family: "sans" }) },
  { name: "Professional", slug: "professional", thumbnail: "professional", isPremium: false, layoutConfig: JSON.stringify({ family: "navy" }) },
  { name: "Compact", slug: "compact", thumbnail: "compact", isPremium: false, layoutConfig: JSON.stringify({ family: "dense" }) },
  { name: "Serif", slug: "serif", thumbnail: "serif", isPremium: false, layoutConfig: JSON.stringify({ family: "editorial" }) },
  { name: "Executive", slug: "executive", thumbnail: "executive", isPremium: false, layoutConfig: JSON.stringify({ family: "navy" }) },
  { name: "Sidebar", slug: "sidebar", thumbnail: "sidebar", isPremium: false, layoutConfig: JSON.stringify({ family: "split" }) },
  { name: "Midnight", slug: "midnight", thumbnail: "midnight", isPremium: true, layoutConfig: JSON.stringify({ family: "dark" }) },
  { name: "Copper", slug: "copper", thumbnail: "copper", isPremium: true, layoutConfig: JSON.stringify({ family: "warm" }) },
  { name: "Editorial", slug: "editorial", thumbnail: "editorial", isPremium: true, layoutConfig: JSON.stringify({ family: "magazine" }) },
  { name: "Aurora", slug: "aurora", thumbnail: "aurora", isPremium: true, layoutConfig: JSON.stringify({ family: "gradient" }) },
];

async function main() {
  for (const t of templates) {
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: t,
      create: t,
    });
  }
  console.log(`Seeded ${templates.length} templates`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
