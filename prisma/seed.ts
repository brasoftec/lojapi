import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Admin master
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      name: 'Admin Master',
      email: 'admin@sistema.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`✅ Admin criado: ${admin.email}`);

  // Loja de exemplo
  const storePassword = await bcrypt.hash('Loja@123', 12);

  const store = await prisma.store.upsert({
    where: { slug: 'loja-demo' },
    update: {},
    create: {
      name: 'Loja Demo',
      slug: 'loja-demo',
      email: 'contato@lojademo.com',
      phone: '(11) 99999-9999',
      description: 'Loja de demonstração do sistema',
      plan: 'PRO',
      storeUsers: {
        create: {
          name: 'Dono da Loja',
          email: 'owner@lojademo.com',
          password: storePassword,
          role: 'OWNER',
        },
      },
      categories: {
        create: [
          { name: 'Eletrônicos', slug: 'eletronicos' },
          { name: 'Roupas', slug: 'roupas' },
          { name: 'Acessórios', slug: 'acessorios' },
        ],
      },
    },
  });

  console.log(`✅ Loja criada: ${store.name} (slug: ${store.slug})`);
  console.log(`   API Key: ${store.apiKey}`);
  console.log('\n📋 Credenciais:');
  console.log('   Admin: admin@sistema.com / Admin@123');
  console.log('   Loja Owner: owner@lojademo.com / Loja@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
