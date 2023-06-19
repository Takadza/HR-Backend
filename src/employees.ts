import { Prisma, PrismaClient } from '@prisma/client'
import express from 'express';
import { z } from "zod";
import { EmpStatus } from './models/employee';
import { hash } from 'bcryptjs';
import { RecordIdSchema, getValidatedId } from './models/core';

export function createEmployeeRoutes(app: express.Express, prisma: PrismaClient<Prisma.PrismaClientOptions, never, Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>) {

  const CreateEmployeeSchema = z.object({
    firstName: z.string().min(3),
    lastName: z.string().min(3),
    phone: z.string().min(6),
    email: z.string().email(),
    managerId: RecordIdSchema,
  });

  app.post(`/api/employees/create`, async (req, res) => {
    console.log("req.body", req.body);
    const result = CreateEmployeeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid input" });
    }
    const details = result.data;

    await prisma.employee.create({
      data: {
        firstName: details.firstName,
        lastName: details.lastName,
        phone: details.phone,
        email: details.email,
        status: EmpStatus.Active,
        managers: {
          create: [
            { managerId: details.managerId },
          ]
        },
        user: {
          create: {
            username: details.email,
            password: await hash('Password123#', 10),
          }
        }
      }
    });

    res.json({ success: true });
  });

  const EditEmployeeSchema = CreateEmployeeSchema.merge(z.object({
    status: z.enum(['Active', 'Inactive']),
  }));

  app.post(`/api/employees/:id/edit`, async (req, res) => {
    console.log("req.body", req.body);

    const id = await getValidatedId(req.params.id);

    const result = EditEmployeeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid input" });
    }
    const details = result.data;

    await prisma.employee.update({
      where: {
        id,
      },
      data: {
        firstName: details.firstName,
        lastName: details.lastName,
        phone: details.phone,
        email: details.email,
        managers: {
          updateMany: {
            where: {
              employeeId: id,
            },
            data: {
              managerId: details.managerId,
            }
          }
        }
      },
    });

    res.json({ success: true });
  });
  
  app.post(`/api/employees/:id/toggle-status`, async (req, res) => {
    console.log("req.body", req.body);

    const id = await getValidatedId(req.params.id);

    const record = await prisma.employee.findUnique({
      where: { id },
    });
    if (!record) {
      return res.status(400).json({ message: "Record not found" });
    }

    await prisma.employee.update({
      where: {
        id,
      },
      data: {
        status: record.status === 'Active' ? 'Inactive' : 'Active',
      },
    });

    res.json({ success: true });
  });

  app.get('/api/employees', async (req, res) => {
    const records = await prisma.employee.findMany({
      // where: {
      //   ownManagerDetails: null,
      // },
      include: {
        ownManagerDetails: true,
        managers: {
          include: {
            employee: true,
            manager: {
              include: {
                ownEmployeeDetails: true,
                departments: true,
              }
            }
          }
        }
      }
    });

    const employees = records.filter(r => r.managers.length);

    const preppedEmployees = employees.map(record => {
      const managerId = record.managers[0].managerId;
      const employee = record.managers[0].manager.ownEmployeeDetails;
      const dep = record.managers[0].manager.departments[0];
      return {
        id: record.id,
        firstName: record.firstName,
        lastName: record.lastName,
        phone: record.phone,
        email: record.email,
        managerId: managerId,
        manager: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
        status: record.status,
        depId: dep?.id || 0,
        depName: dep?.name || ''
      }
    });

    return res.json(preppedEmployees);
  });

  app.get('/api/managers', async (req, res) => {
    const records = await prisma.manager.findMany({
      include: {
        ownEmployeeDetails: true,
      }
    });

    const prepped = records.map(record => {
      return {
        id: record.id,
        firstName: record.ownEmployeeDetails.firstName,
        lastName: record.ownEmployeeDetails.lastName,
        phone: record.ownEmployeeDetails.phone,
        email: record.ownEmployeeDetails.email,
        status: record.ownEmployeeDetails.status,
      }
    });

    return res.json(prepped);
  });

}