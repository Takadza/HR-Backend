import { Prisma, PrismaClient } from '@prisma/client';
import express from 'express';
import { z } from "zod";
import { RecordIdSchema, getValidatedId } from './models/core';
import { DepStatus } from './models/department';

export function createDepartmentRoutes(app: express.Express, prisma: PrismaClient<Prisma.PrismaClientOptions, never, Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>) {

  const CreateDepartmentSchema = z.object({
    name: z.string().min(3),
    managerId: RecordIdSchema,
  });

  app.post(`/api/departments/create`, async (req, res) => {
    console.log("req.body", req.body);
    const result = CreateDepartmentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid input" });
    }
    const details = result.data;

    await prisma.department.create({
      data: {
        name: details.name,
        status: DepStatus.Active,
        managerId: details.managerId,
      }
    });

    res.json({ success: true });
  });

  const EditDepartmentSchema = CreateDepartmentSchema.merge(z.object({
    status: z.enum(['Active', 'Inactive']),
  }));

  app.post(`/api/departments/:id/edit`, async (req, res) => {
    console.log("req.body", req.body);

    const id = await getValidatedId(req.params.id);

    const result = EditDepartmentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid input" });
    }
    const details = result.data;

    await prisma.department.update({
      where: {
        id,
      },
      data: {
        name: details.name,
        status: details.status,
        managerId: details.managerId,
      },
    });

    res.json({ success: true });
  });

  app.post(`/api/departments/:id/toggle-status`, async (req, res) => {
    console.log("req.body", req.body);

    const id = await getValidatedId(req.params.id);

    const record = await prisma.department.findUnique({
      where: { id },
    });
    if (!record) {
      return res.status(400).json({ message: "Record not found" });
    }

    await prisma.department.update({
      where: {
        id,
      },
      data: {
        status: record.status === 'Active' ? 'Inactive' : 'Active',
      },
    });

    res.json({ success: true });
  });

  app.get('/api/departments', async (req, res) => {
    const records = await prisma.department.findMany({
      include: {
        manager: {
          include: {
            ownEmployeeDetails: true
          }
        }
      }
    });

    const preppedDepartments = records.map(record => {
      return {
        id: record.id,
        name: record.name,
        managerId: record.managerId,
        manager: record.manager.ownEmployeeDetails.firstName + " " + record.manager.ownEmployeeDetails.lastName,
        status: record.status,
      }
    });

    return res.json(preppedDepartments);
  });

}