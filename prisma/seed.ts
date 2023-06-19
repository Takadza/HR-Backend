import { faker } from '@faker-js/faker';
import { Prisma, PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { DepStatus } from '../src/models/department';
import { EmpStatus } from '../src/models/employee';

const prisma = new PrismaClient()

let PASSWORD = '';

function createUser() {
  return {
    username: faker.internet.userName(),
    password: PASSWORD,
  } as const;
}

function createEmployee() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.imei(),
    email: faker.internet.email(),
    status: EmpStatus.Active,
    user: {
      create: createUser()
    }
  }
}

function createEmployees(numRecords: number) {
  return [...Array(numRecords).keys()].map(_ => ({
    employee: {
      create: createEmployee(),
    }
  }));
}

function createDepartments(numRecords: number) {
  return [...Array(numRecords).keys()].map(_ => ({
    name: faker.company.buzzNoun(),
    status: DepStatus.Active,
  }));
}

async function main() {
  console.log(`Start seeding ...`);

  await prisma.department.deleteMany();
  await prisma.employeeManager.deleteMany();
  await prisma.manager.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  PASSWORD = await hash('bach@8901', 10);

  await prisma.user.create({
    data: {
      username: 'hradmin@test.com',
      password: await hash('TestPass1234', 10),
    }
  });

  for (let i = 0; i < 5; i++) {
    await prisma.manager.create({
      data: {
        ownEmployeeDetails: {
          create: createEmployee(),
        },
        departments: {
          create: createDepartments(5),
        },
        employees: {
          create: createEmployees(5),
        }
      }
    })
  }

  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
