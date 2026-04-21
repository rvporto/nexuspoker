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
  nickname: z.string().trim().min(2, "Nickname muito curto").max(30),
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

export const createGameSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  type: z.enum(["tournament", "cash"]),
  date: z.string().min(1, "Data obrigatória"),
  buyIn: z.coerce.number().min(0, "Buy-in inválido").max(100000),
  rebuyValue: z.coerce.number().min(0, "Rebuy inválido").max(100000),
  seasonYear: z.coerce.number().int().min(2020).max(2100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const tempPlayerSchema = z.object({
  nickname: z.string().trim().min(2, "Nickname muito curto").max(30),
  fullName: z.string().trim().max(100).optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
});
