/**
 * GEBAT 360° ERP — Script de Seed de Démonstration Base de Données SQL (Prisma ORM)
 * Alimentation complète des entités avec données réalistes BTP et cohérence des règles métier.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage de l\'alimentation de la base de données (Seed GEBAT 360°)...');

  // 1. SOCIÉTÉ
  const company = await prisma.company.upsert({
    where: { code: 'GEBAT-SA' },
    update: {},
    create: {
      id: 'comp-gebat-01',
      code: 'GEBAT-SA',
      name: 'GEBAT SA — Génie Bâtiment & Travaux Publics',
      country: "Côte d'Ivoire",
      address: 'Boulevard Latrille, Cocody, Abidjan',
    },
  });
  console.log(`✅ Société créée : ${company.name}`);

  // 2. UTILISATEURS DE DÉMONSTRATION (3 rôles BTP)
  const user1 = await prisma.user.upsert({
    where: { email: 'admin@gebat360.ci' },
    update: {},
    create: {
      id: 'usr-admin-01',
      name: 'Yacouba Mohamed',
      email: 'admin@gebat360.ci',
      role: 'SUPER_ADMIN',
      avatar: 'YM',
      company: company.name,
      passwordHash: '$2b$10$e8F5d.gK2026gebatSecureHashAdminKey',
      status: 'ACTIF',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'alphonse.sea@gebat360.ci' },
    update: {},
    create: {
      id: 'usr-cond-02',
      name: 'SEA Alphonse',
      email: 'alphonse.sea@gebat360.ci',
      role: 'CONDUCTEUR_TRAVAUX',
      avatar: 'SA',
      company: company.name,
      passwordHash: '$2b$10$e8F5d.gK2026gebatSecureHashCondKey',
      status: 'ACTIF',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'cost.controller@gebat360.ci' },
    update: {},
    create: {
      id: 'usr-cost-03',
      name: 'Kouassi Jean',
      email: 'cost.controller@gebat360.ci',
      role: 'COST_CONTROLLER',
      avatar: 'KJ',
      company: company.name,
      passwordHash: '$2b$10$e8F5d.gK2026gebatSecureHashCostKey',
      status: 'ACTIF',
    },
  });
  console.log('✅ 3 Utilisateurs créés (Super Admin, Conducteur, Cost Controller)');

  // 3. PROJETS (2 Projets BTP)
  const p1 = await prisma.project.upsert({
    where: { code: 'CVI-2026-HYD-001' },
    update: {},
    create: {
      id: 'prj-bingerville-01',
      code: 'CVI-2026-HYD-001',
      domainCode: 'HYD',
      name: 'STATION DE TRAITEMENT BINGERVILLE',
      companyId: company.id,
      company: company.name,
      client: 'ONAD — Office National de l\'Assainissement et du Drainage',
      country: "Côte d'Ivoire",
      location: 'Bingerville, Abidjan',
      activity: 'Construction d\'une usine de dépollution et réservoirs',
      manager: user2.name,
      contractRef: 'CT-2026-ONAD-042',
      contractAmount: 500000000,
      currency: 'XOF',
      signatureDate: new Date('2026-01-10'),
      startDate: new Date('2026-01-15'),
      durationMonths: 18,
      endDate: new Date('2027-07-15'),
      initialBudget: 400000000,
      revisedBudget: 400000000,
      progress: 44.0,
      status: 'EN_COURS',
      risk: 'FAIBLE',
    },
  });

  const p2 = await prisma.project.upsert({
    where: { code: 'CIV-2026-ASS-001' },
    update: {},
    create: {
      id: 'prj-assainissement-02',
      code: 'CIV-2026-ASS-001',
      domainCode: 'ASS',
      name: 'RÉSEAU D\'ASSAINISSEMENT PLUVIAL ABIDJAN NORD',
      companyId: company.id,
      company: company.name,
      client: 'Ministère de l\'Hydraulique et de l\'Assainissement',
      country: "Côte d'Ivoire",
      location: 'Abobo / Yopougon, Abidjan',
      activity: 'Pose de collecteurs béton DN1000 et dalots pluviaux',
      manager: user2.name,
      contractRef: 'CT-2026-MHA-108',
      contractAmount: 750000000,
      currency: 'XOF',
      signatureDate: new Date('2026-02-01'),
      startDate: new Date('2026-02-10'),
      durationMonths: 24,
      endDate: new Date('2028-02-10'),
      initialBudget: 600000000,
      revisedBudget: 600000000,
      progress: 15.0,
      status: 'EN_COURS',
      risk: 'MODERE',
    },
  });
  console.log(`✅ 2 Projets créés : ${p1.name} & ${p2.name}`);

  // 4. ARBORESCENCE WBS 4 NIVEAUX (Lot 03 / Sous-lot 02 / Activité 004 Béton Armé)
  const wbsAct = await prisma.wbsNode.upsert({
    where: { id: 'wbs-act-004' },
    update: {},
    create: {
      id: 'wbs-act-004',
      projectId: p1.id,
      code: 'CVI-2026-HYD-001/03/02/004',
      name: 'Béton armé d\'ouvrages',
      description: 'Coulage béton armé dosé à 350kg/m3 avec aciers HA',
      unit: 'm3',
      plannedQty: 1000,
      unitCost: 40000,
      contractUnitPrice: 50000,
      contractAmount: 50000000,
      initialBudget: 40000000,
      revisedBudget: 40000000,
      committed: 23000000,
      actualCost: 22000000,
      forecast: 20000000,
      eac: 42000000,
      progress: 44.0,
      nature: 'MAT',
      manager: user2.name,
      level: 'ACTIVITE',
      type: 'ACTIVITE',
      status: 'EN_COURS',
    },
  });
  console.log(`✅ Arborescence WBS créée : ${wbsAct.code} — ${wbsAct.name}`);

  // 5. FOURNISSEUR ET ACHATS (DA + BC)
  const supplier = await prisma.supplier.upsert({
    where: { code: 'FRN-LAFARGE' },
    update: {},
    create: {
      id: 'sup-lafarge-01',
      code: 'FRN-LAFARGE',
      name: 'LafargeHolcim Ciments Côte d\'Ivoire',
      category: 'Matériaux de construction',
      contactPerson: 'Koffi Paul',
      phone: '+225 07 08 09 10',
      email: 'commandes@lafarge.ci',
      taxNumber: 'NC-1234567-A',
    },
  });

  const da = await prisma.purchaseRequest.upsert({
    where: { code: 'DA-2026-004' },
    update: {},
    create: {
      id: 'da-004',
      code: 'DA-2026-004',
      projectId: p1.id,
      projectName: p1.name,
      wbsId: wbsAct.id,
      wbsCode: wbsAct.code,
      wbsName: wbsAct.name,
      nature: 'MAT',
      itemDescription: 'Approvisionnement Ciment CPJ 42.5 en sacs 50kg',
      quantity: 500,
      unit: 'Sacs',
      estimatedUnitPrice: 4500,
      estimatedTotal: 2250000,
      desiredDate: new Date('2026-03-01'),
      urgency: 'Normale',
      justification: 'Achèvement du coulage du radier supérieur',
      createdBy: user2.name,
      status: 'ORDERED',
    },
  });

  const po = await prisma.purchaseOrder.upsert({
    where: { code: 'BC-2026-004' },
    update: {},
    create: {
      id: 'po-004',
      code: 'BC-2026-004',
      daId: da.id,
      supplierId: supplier.id,
      totalAmount: 2250000,
      issueDate: new Date('2026-02-15'),
      status: 'ORDERED',
    },
  });
  console.log(`✅ Fournisseur & Commande créés : ${po.code} (${supplier.name})`);

  // 6. ENTREPÔT, ARTICLES STOCK ET MOUVEMENTS
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'DEP-BING' },
    update: {},
    create: {
      id: 'wh-bing-01',
      code: 'DEP-BING',
      name: 'Magasin Central Chantier Bingerville',
      location: 'Zone Base Vie Bingerville',
      manager: 'Ouattara Dramane',
    },
  });

  const stockItem = await prisma.stockItem.upsert({
    where: { code: 'STK-CIM-CPJ' },
    update: {},
    create: {
      id: 'stk-cim-01',
      code: 'STK-CIM-CPJ',
      name: 'Ciment CPJ 42.5 Lafarge (Sac 50kg)',
      category: 'Liants & Matériaux',
      unit: 'Sac',
      warehouseId: warehouse.id,
      warehouse: warehouse.name,
      minThreshold: 100,
      currentStock: 450,
      averageUnitPrice: 4500,
      totalValue: 2025000,
    },
  });

  await prisma.stockMovement.upsert({
    where: { code: 'MVT-IN-001' },
    update: {},
    create: {
      id: 'mvt-001',
      code: 'MVT-IN-001',
      movementType: 'IN',
      type: 'ENTREE',
      itemId: stockItem.id,
      itemName: stockItem.name,
      warehouseId: warehouse.id,
      warehouse: warehouse.name,
      quantity: 500,
      unit: 'Sac',
      unitCost: 4500,
      totalCost: 2250000,
      projectId: p1.id,
      wbsId: wbsAct.id,
      wbsCode: wbsAct.code,
      wbsName: wbsAct.name,
      reference: 'BL-2026-089',
      sourceDoc: 'BL-2026-089',
      createdBy: 'Ouattara Dramane',
      user: 'Ouattara Dramane',
    },
  });
  console.log(`✅ Stock & Mouvement transactionnel créés : ${stockItem.name}`);

  // 7. RAPPORT JOURNALIER PRODUCTION CHANTIER
  await prisma.productionReport.upsert({
    where: { code: 'RAP-JOUR-014' },
    update: {},
    create: {
      id: 'rap-014',
      code: 'RAP-JOUR-014',
      date: new Date('2026-02-18'),
      projectId: p1.id,
      projectName: p1.name,
      wbsId: wbsAct.id,
      wbsCode: wbsAct.code,
      activityName: wbsAct.name,
      weather: 'Ensoleillé',
      plannedQty: 25,
      realizedQty: 24,
      unit: 'm3',
      workersCount: 14,
      hoursWorked: 8,
      notes: 'Coulage effectué avec succès sans incident technique.',
      status: 'Validé',
      createdBy: user2.name,
      productivity: 96.0,
    },
  });
  console.log('✅ Rapport Journalier de Production créé (RAP-JOUR-014)');

  // 8. AUDIT TRAIL HISTORIQUE INALTÉRABLE
  await prisma.auditLog.create({
    data: {
      id: `AUD-SEED-${Date.now()}`,
      userId: user3.id,
      user: user3.name,
      role: 'Cost Controller',
      action: 'INITIALISATION_BDD_SEED',
      module: 'SYSTEM',
      objectRef: p1.code,
      newValue: 'Alimentation des données de démonstration avec cohérence des règles métier',
      justification: 'Déploiement initial de la base de données MySQL GEBAT 360°',
    },
  });

  console.log('🎉 Seed de démonstration terminé avec succès !');
}

main()
  .catch(e => {
    console.error('❌ Erreur lors de l\'exécution du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
