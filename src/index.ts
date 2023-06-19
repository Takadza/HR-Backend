import bcrypt, { hash } from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client'
import express from 'express'
import { createEmployeeRoutes } from './employees';
import { createDepartmentRoutes } from './departments';
import { z } from 'zod';

const prisma = new PrismaClient()
const app = express()

app.use(express.json());

createEmployeeRoutes(app, prisma);
createDepartmentRoutes(app, prisma);

interface IsValidPasswordProps {
  inputPassword: string;
  hashedPassword: string;
}
export function isValidPassword(props: IsValidPasswordProps) {
  const { inputPassword, hashedPassword } = props;
  return bcrypt.compare(inputPassword, hashedPassword);
}

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string(),
});

app.post(`/api/login`, async (req, res) => {
  console.log("req.body", req.body);
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Invalid input" });
  }
  const details = result.data;

  const user = await prisma.user.findFirst({
    where: {
      username: details.username,
    }
  });
  if (!user) {
    return res.status(200).json({ message: "Incorrect credentials" });
  }

  const isValid = await isValidPassword({
    inputPassword: details.password,
    hashedPassword: user.password,
  });
  if (!isValid) {
    return res.status(200).json({ message: "Incorrect credentials" });
  }
  req.headers['set-cookie'] = [JSON.stringify(user)];

  res.json({ success: true });
});

const server = app.listen(4000, () =>
  console.log(`
🚀 Server ready at: http://localhost:4000
⭐️ See sample requests: http://pris.ly/e/ts/rest-express#3-using-the-rest-api`),
)
