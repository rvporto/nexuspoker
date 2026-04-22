import avatarMale from "@/assets/avatar-male.jpg";
import avatarFemale from "@/assets/avatar-female.jpg";
import avatarNeutral from "@/assets/avatar-neutral.jpg";

export type Gender = "male" | "female" | "other" | null | undefined;

/**
 * Retorna o avatar padrão de acordo com o sexo. Se não houver gênero definido,
 * sorteia entre masculino/feminino para dar variedade visual ao roster.
 */
export function getDefaultAvatar(gender: Gender): string {
  if (gender === "male") return avatarMale;
  if (gender === "female") return avatarFemale;
  if (gender === "other") return avatarNeutral;
  // Sem definição: aleatório entre os dois principais
  return Math.random() < 0.5 ? avatarMale : avatarFemale;
}

export const DEFAULT_AVATARS = {
  male: avatarMale,
  female: avatarFemale,
  other: avatarNeutral,
} as const;
