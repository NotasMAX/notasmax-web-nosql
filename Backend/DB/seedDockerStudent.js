import "dotenv/config.js";
import bcrypt from "bcryptjs";
import Usuario from "../Models/Usuario.js";
import mongoose, { connectDatabase } from "./conn.js";

const TEST_STUDENT = {
  nome: "Aluno Teste Docker",
  email: "aluno.docker@notamax.test",
  telefone_contato: "11900000000",
  tipo_usuario: "aluno",
};
const TEST_PASSWORD = process.env.DOCKER_TEST_STUDENT_PASSWORD || "123";

async function seedDockerStudent() {
  if (process.env.ALLOW_TEST_USER_SEED !== "true") {
    throw new Error("Set ALLOW_TEST_USER_SEED=true to create the Docker test account.");
  }

  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to create the Docker test account.");
  }

  await connectDatabase(mongoUri);

  const existingStudent = await Usuario.findOne({ email: TEST_STUDENT.email }).select("+senha");
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  if (existingStudent) {
    if (existingStudent.nome !== TEST_STUDENT.nome || existingStudent.tipo_usuario !== "aluno") {
      throw new Error("The test email already belongs to a different user; no changes were made.");
    }

    existingStudent.senha = passwordHash;
    existingStudent.usa_senha_inicial = true;
    existingStudent.telefone_contato = TEST_STUDENT.telefone_contato;
    await existingStudent.save();
    console.log(`Updated Docker test student ${TEST_STUDENT.email}.`);
    return;
  }

  await Usuario.create({
    ...TEST_STUDENT,
    senha: passwordHash,
    usa_senha_inicial: true,
  });
  console.log(`Created Docker test student ${TEST_STUDENT.email}.`);
}

try {
  await seedDockerStudent();
} catch {
  console.error("Docker test student setup failed. Check the seed opt-in and MongoDB connection.");
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
