import { z } from "zod";

export const emailSchema = z.string().trim().email("Email inválido").max(255);
export const passwordSchema = z
  .string()
  .min(6, "Senha deve ter no mínimo 6 caracteres")
  .max(100, "Senha muito longa");

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2, "Nome muito curto").max(100),
});

export const completeProfileSchema = z.object({
  nickname: z.string().trim().min(2, "Nickname muito curto").max(30),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
});
